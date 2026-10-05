// Contagem de quem vai conversar em cada região, na Vercel.
// Mesmas regras do servidor/servidor.mjs: um aparelho conta uma vez por região,
// o identificador do aparelho fica guardado só como hash, e a marcação fecha
// fora da janela de conversa.
//
// Autor: Matheus C. Pestana

import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { faseEm, podeMarcar } from "../src/calendario.js";

const SAL = process.env.SAL_MARCAS ?? "onde-da-pra-conversar";
const LIBERAR = process.env.LIBERAR_JANELA === "1";

let cliente: Redis | null = null;
function redis(): Redis {
  cliente ??= new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "",
  });
  return cliente;
}

type RegiaoCelula = { id: string; votos?: unknown };
const celulas = new Map<string, RegiaoCelula[]>();

function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function ipDe(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "sem-ip";
}

async function dentroDoLimite(ip: string, tipo: string, maximo: number, janelaS: number): Promise<boolean> {
  const chave = `limite:${tipo}:${ip}:${Math.floor(Date.now() / 1000 / janelaS)}`;
  const total = await redis().incr(chave);
  if (total === 1) await redis().expire(chave, janelaS);
  return total <= maximo;
}

async function regiaoDeConversa(request: Request, id: string): Promise<boolean> {
  const partes = /^([a-z]{2})-(\d{5})-(-?\d+\.\d{4})-(-?\d+\.\d{4})$/.exec(id);
  if (!partes) return false;
  const chave = `${Math.floor(Number(partes[3]) / 0.25)}_${Math.floor(Number(partes[4]) / 0.25)}`;
  if (!celulas.has(chave)) {
    const resp = await fetch(new URL(`/dados/celulas/${chave}.json`, request.url));
    celulas.set(chave, resp.ok ? ((await resp.json()) as RegiaoCelula[]) : []);
  }
  const regiao = celulas.get(chave)?.find((r) => r.id === id);
  return Boolean(regiao?.votos);
}

export async function GET(request: Request): Promise<Response> {
  if (!(await dentroDoLimite(ipDe(request), "ler", 600, 60))) {
    return json(429, { motivo: "Muitos pedidos. Espere um minuto." });
  }
  const ids = (new URL(request.url).searchParams.get("regioes") ?? "").split(",").filter(Boolean).slice(0, 400);
  if (!ids.length) return json(200, {});
  const fila = redis().pipeline();
  for (const id of ids) fila.scard(`marcas:${id}`);
  const totais = (await fila.exec()) as number[];
  return json(200, Object.fromEntries(ids.map((id, i) => [id, totais[i] ?? 0])));
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
  if (vou) await redis().sadd(chave, hash);
  else await redis().srem(chave, hash);
  return json(200, { total: await redis().scard(chave) });
}

export function POST(request: Request): Promise<Response> {
  return mudar(request, true);
}

export function DELETE(request: Request): Promise<Response> {
  return mudar(request, false);
}
