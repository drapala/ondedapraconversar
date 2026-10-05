// Contagem de quem vai conversar em cada região, na Vercel.
// Mesmas regras do servidor/servidor.mjs: um aparelho conta uma vez por região,
// o identificador do aparelho fica guardado só como hash, e a marcação fecha
// fora da janela de conversa.
//
// Cada marcação e desmarcação também entra no registro (marcas-registro, com a
// hora) e a hora da marca vigente fica em marcas-quando:{região}, para a
// exportação em /api/exportar-marcas. Os nomes não começam com "marcas:" para
// não se misturar aos conjuntos marcas:{região}.
//
// A busca lê o hash marcas-contagem (um comando por busca, não um por região) e
// a resposta fica 60 segundos na CDN: quem busca o mesmo lugar logo depois não
// gasta comando nenhum.
//
// Autor: Matheus C. Pestana

import { createHash } from "node:crypto";
import { faseEm, podeMarcar } from "../src/calendario.js";
import { CONTAGENS, contarUso, garantirContagens, ipDe, redis } from "./_redis.js";

const SAL = process.env.SAL_MARCAS ?? "onde-da-pra-conversar";
const LIBERAR = process.env.LIBERAR_JANELA === "1";

type RegiaoCelula = { id: string; votos?: unknown };
const celulas = new Map<string, RegiaoCelula[]>();

function json(status: number, corpo: unknown, cache = "no-store"): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": cache },
  });
}

async function dentroDoLimite(ip: string, tipo: string, maximo: number, janelaS: number): Promise<boolean> {
  const chave = `limite:${tipo}:${ip}:${Math.floor(Date.now() / 1000 / janelaS)}`;
  const total = await redis().incr(chave);
  if (total === 1) await redis().expire(chave, janelaS);
  return total <= maximo;
}

let porGrau: Promise<number> | null = null;

/** Células por grau do mapa, lidas uma vez do indice.json publicado (10 = 0,1 grau). */
function celulasPorGrau(request: Request): Promise<number> {
  porGrau ??= fetch(new URL("/dados/indice.json", request.url))
    .then((r) => r.json() as Promise<{ celula?: number; celulasPorGrau?: number }>)
    .then((i) => i.celulasPorGrau ?? Math.round(1 / (i.celula ?? 0.1)))
    .catch(() => {
      porGrau = null;
      return 10;
    });
  return porGrau;
}

async function celula(request: Request, chave: string): Promise<RegiaoCelula[]> {
  if (!celulas.has(chave)) {
    const resp = await fetch(new URL(`/dados/celulas/${chave}.json`, request.url));
    celulas.set(chave, resp.ok && resp.headers.get("content-type")?.includes("json") ? ((await resp.json()) as RegiaoCelula[]) : []);
  }
  return celulas.get(chave) ?? [];
}

async function regiaoDeConversa(request: Request, id: string): Promise<boolean> {
  const partes = /^([a-z]{2})-(\d{5})-(-?\d+\.\d{4})-(-?\d+\.\d{4})$/.exec(id);
  if (!partes) return false;
  // O id leva a coordenada com 4 casas e a região guarda 5: perto da divisa, as duas
  // caem em células vizinhas. Procura na célula do id e nas oito em volta.
  const grau = await celulasPorGrau(request);
  const i = Math.floor(Number(partes[3]) * grau);
  const j = Math.floor(Number(partes[4]) * grau);
  for (const di of [0, -1, 1]) {
    for (const dj of [0, -1, 1]) {
      const regiao = (await celula(request, `${i + di}_${j + dj}`)).find((r) => r.id === id);
      if (regiao) return Boolean(regiao.votos);
    }
  }
  return false;
}

async function registrar(regiao: string, hash: string, vou: boolean): Promise<void> {
  try {
    const agora = Date.now();
    const fila = redis().pipeline();
    fila.zadd("marcas-registro", {
      score: agora,
      member: JSON.stringify({ quando: new Date(agora).toISOString(), regiao, aparelho: hash.slice(0, 12), acao: vou ? "marcou" : "desmarcou" }),
    });
    if (vou) fila.hset(`marcas-quando:${regiao}`, { [hash]: agora });
    else fila.hdel(`marcas-quando:${regiao}`, hash);
    await fila.exec();
  } catch {
    // O registro é para acompanhamento; a marca já está feita.
  }
}

export async function GET(request: Request): Promise<Response> {
  const ids = (new URL(request.url).searchParams.get("regioes") ?? "").split(",").filter(Boolean).slice(0, 400);
  if (!ids.length) return json(200, {});
  await garantirContagens();
  const totais = ((await redis().hmget(CONTAGENS, ...ids)) ?? {}) as Record<string, number | string | null>;
  return json(
    200,
    Object.fromEntries(ids.map((id) => [id, Number(totais[id] ?? 0)])),
    "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  );
}

async function mudar(request: Request, vou: boolean): Promise<Response> {
  if (!(await dentroDoLimite(ipDe(request), "marcar", 120, 3600))) {
    return json(429, { motivo: "Muitas marcas deste aparelho na última hora." });
  }
  if (!LIBERAR && !podeMarcar(faseEm(Date.now()))) {
    return json(403, { motivo: "A marcação está fechada agora." });
  }
  const texto = await request.text();
  if (texto.length > 2000) return json(400, { motivo: "Pedido malformado." });
  let corpo: { regiao?: unknown; aparelho?: unknown };
  try {
    corpo = JSON.parse(texto);
  } catch {
    return json(400, { motivo: "Pedido malformado." });
  }
  const { regiao, aparelho } = corpo ?? {};
  if (typeof aparelho !== "string" || !/^[0-9a-f-]{36}$/.test(aparelho)) {
    return json(400, { motivo: "Aparelho inválido." });
  }
  if (typeof regiao !== "string" || !(await regiaoDeConversa(request, regiao))) {
    return json(400, { motivo: "Essa região não está na lista de conversa." });
  }
  const hash = createHash("sha256").update(`${SAL}|${aparelho}`).digest("hex").slice(0, 32);
  const chave = `marcas:${regiao}`;
  const mudou = vou ? await redis().sadd(chave, hash) : await redis().srem(chave, hash);
  const total = await redis().scard(chave);
  if (mudou) {
    // O hash guarda o valor do conjunto, não um +1: se algo sair do lugar, a próxima marca corrige.
    await redis().hset(CONTAGENS, { [regiao]: total });
    await contarUso(vou ? "marcacoes" : "desmarcacoes", regiao.slice(0, 2).toUpperCase());
    await registrar(regiao, hash, vou);
  }
  return json(200, { total });
}

export function POST(request: Request): Promise<Response> {
  return mudar(request, true);
}

export function DELETE(request: Request): Promise<Response> {
  return mudar(request, false);
}
