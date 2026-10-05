// Conexão com o Redis (Upstash, pela Vercel) e contadores de uso do site.
// Contadores são só totais por dia; nada identifica quem abriu ou marcou.
// Visitantes únicos usam HyperLogLog: o Redis guarda só uma estimativa
// estatística, não a lista de quem passou, e o hash não volta a ser IP.
//
// Autor: Matheus C. Pestana

import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

const GUARDAR_DIAS = 90;
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

/**
 * Conta uma abertura do mapa e o visitante (aproximado) no dia, no total e na
 * origem. Quem abre de fora do Brasil conta também no país (código ISO de duas
 * letras). Devolve o total de visitas desde o primeiro dia, ou null se o Redis falhar.
 */
export async function contarAbertura(request: Request, origem: string, pais?: string): Promise<number | null> {
  try {
    const d = dia();
    const visitante = createHash("sha256")
      .update(`${SAL}|${ipDe(request)}|${request.headers.get("user-agent") ?? ""}`)
      .digest("hex")
      .slice(0, 16);
    const validade = GUARDAR_DIAS * 86400;
    const fila = redis().pipeline();
    fila.incr("uso:aberturas:total");
    fila.hincrby(`uso:aberturas:${d}`, origem, 1);
    fila.expire(`uso:aberturas:${d}`, validade);
    fila.pfadd(`uso:visitantes:${d}`, visitante);
    fila.expire(`uso:visitantes:${d}`, validade);
    fila.pfadd(`uso:visitantes:${d}:${origem}`, visitante);
    fila.expire(`uso:visitantes:${d}:${origem}`, validade);
    if (pais && /^[A-Z]{2}$/.test(pais)) {
      fila.hincrby(`uso:paises:${d}`, pais, 1);
      fila.expire(`uso:paises:${d}`, validade);
      fila.pfadd(`uso:visitantes:${d}:pais:${pais}`, visitante);
      fila.expire(`uso:visitantes:${d}:pais:${pais}`, validade);
    }
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
    fila.expire(chave, GUARDAR_DIAS * 86400);
    await fila.exec();
  } catch {
    // Contador de uso nunca pode derrubar o pedido principal.
  }
}
