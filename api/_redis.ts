// Conexão com o Redis (Upstash, pela Vercel) e contadores de uso do site.
// Contadores são só totais por dia; nada identifica quem abriu ou marcou.
// Visitantes únicos usam HyperLogLog: o Redis guarda só uma estimativa
// estatística, não a lista de quem passou, e o hash não volta a ser IP.
//
// A Upstash cobra por comando, inclusive dentro de pipeline. Por isso as
// chaves de uso não levam EXPIRE a cada pedido (são poucas por dia e podem ser
// apagadas de uma vez depois da eleição), e a contagem de quem vai conversar
// em cada região fica num hash só, lido com um comando por busca.
//
// Autor: Matheus C. Pestana

import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

const SAL = process.env.SAL_MARCAS ?? "onde-da-pra-conversar";

let cliente: Redis | null = null;
export function redis(): Redis {
  cliente ??= new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "",
  });
  return cliente;
}

/** Dia no horário de Brasília, AAAA-MM-DD. */
export function dia(deslocamentoDias = 0): string {
  return new Date(Date.now() - 3 * 3600_000 - deslocamentoDias * 86400_000).toISOString().slice(0, 10);
}

/** Hora no horário de Brasília, "00" a "23". */
export function horaBrasilia(): string {
  return new Date(Date.now() - 3 * 3600_000).toISOString().slice(11, 13);
}

/** Do dia em que o site entrou no ar até o segundo turno. */
export const PRIMEIRO_DIA = "2026-10-04";
export const ULTIMO_DIA = "2026-10-25";

export function diasDoPeriodo(): string[] {
  const dias: string[] = [];
  for (let t = Date.parse(PRIMEIRO_DIA); t <= Date.parse(ULTIMO_DIA); t += 86400_000) {
    dias.push(new Date(t).toISOString().slice(0, 10));
  }
  return dias;
}

export function ipDe(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "sem-ip";
}

/** Conta o pedido na janela (em segundos) e diz se ainda está dentro do máximo. */
export async function dentroDoLimite(ip: string, tipo: string, maximo: number, janelaS: number): Promise<boolean> {
  const chave = `limite:${tipo}:${ip}:${Math.floor(Date.now() / 1000 / janelaS)}`;
  const total = await redis().incr(chave);
  if (total === 1) await redis().expire(chave, janelaS);
  return total <= maximo;
}

/** User-Agents de robôs e de ferramentas de linha de comando: abertura assim não é visita e não gasta comando. */
const ROBO = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|python|curl\/|wget|java\/|okhttp|go-http|axios|node-fetch|scrapy|httpclient|libwww/i;

/**
 * De fora do Brasil entra uma abertura em cada AMOSTRA_FORA, contada pelo peso:
 * é o grosso do volume (mais de 70% das aberturas até 8/10) e, em boa parte, robô.
 * Essas aberturas ficam de fora do total público e dos visitantes únicos do dia.
 */
const AMOSTRA_FORA = 20;

/**
 * Conta uma abertura do mapa e o visitante (aproximado) no dia, no total e na
 * origem. Robô não conta. Quem abre de fora do Brasil (código ISO de duas letras
 * em `pais`) entra só por amostra, só no país e no dia. Devolve o total público
 * de visitas desde o primeiro dia, ou null se não contou ou se o Redis falhar.
 */
export async function contarAbertura(request: Request, origem: string, pais?: string): Promise<number | null> {
  try {
    const agente = request.headers.get("user-agent") ?? "";
    if (!agente || ROBO.test(agente) || /^whatsapp\//i.test(agente)) return null;
    const d = dia();
    const visitante = createHash("sha256")
      .update(`${SAL}|${ipDe(request)}|${agente}`)
      .digest("hex")
      .slice(0, 16);
    const fila = redis().pipeline();
    if (pais && /^[A-Z]{2}$/.test(pais)) {
      if (Math.random() >= 1 / AMOSTRA_FORA) return null;
      fila.hincrby(`uso:aberturas:${d}`, origem, AMOSTRA_FORA);
      fila.hincrby(`uso:paises:${d}`, pais, AMOSTRA_FORA);
      fila.pfadd(`uso:visitantes:${d}:pais:${pais}`, visitante);
      await fila.exec();
      return null;
    }
    fila.incr("uso:aberturas:total");
    fila.hincrby(`uso:aberturas:${d}`, origem, 1);
    fila.hincrby(`uso:horas:${d}`, horaBrasilia(), 1);
    fila.pfadd(`uso:visitantes:${d}`, visitante);
    fila.pfadd(`uso:visitantes:${d}:${origem}`, visitante);
    const [total] = (await fila.exec()) as number[];
    return Number(total);
  } catch {
    // Contador de uso nunca pode derrubar o pedido principal.
    return null;
  }
}

export async function contarUso(nome: string, campo?: string): Promise<void> {
  try {
    const chave = `uso:${nome}:${dia()}`;
    const fila = redis().pipeline();
    if (campo) fila.hincrby(chave, campo, 1);
    else fila.incr(chave);
    await fila.exec();
  } catch {
    // Contador de uso nunca pode derrubar o pedido principal.
  }
}

/** Hash com quantos aparelhos marcaram cada região: campo = id da região. */
export const CONTAGENS = "marcas-contagem";
const CONTAGENS_PRONTAS = "marcas-contagem:pronta";

let contagensProntas: Promise<void> | null = null;

/**
 * Na primeira vez, monta o hash de contagens a partir dos conjuntos marcas:{região}
 * que já existiam. Cada instância da função confere isso uma vez só (um GET).
 */
export function garantirContagens(): Promise<void> {
  contagensProntas ??= (async () => {
    if ((await redis().get(CONTAGENS_PRONTAS)) === "1") return;
    const chaves: string[] = [];
    let cursor = "0";
    do {
      const [proximo, lote] = await redis().scan(cursor, { match: "marcas:*", count: 1000 });
      chaves.push(...lote);
      cursor = String(proximo);
    } while (cursor !== "0");
    for (let i = 0; i < chaves.length; i += 500) {
      const parte = chaves.slice(i, i + 500);
      const fila = redis().pipeline();
      for (const chave of parte) fila.scard(chave);
      const totais = (await fila.exec()) as number[];
      const campos = Object.fromEntries(parte.map((chave, j) => [chave.slice("marcas:".length), totais[j] ?? 0]));
      if (Object.keys(campos).length) await redis().hset(CONTAGENS, campos);
    }
    await redis().set(CONTAGENS_PRONTAS, "1");
  })().catch((erro) => {
    contagensProntas = null;
    throw erro;
  });
  return contagensProntas;
}
