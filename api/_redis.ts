// Conexão com o Redis (Upstash, pela Vercel) e contadores de uso do site.
// Contadores são só totais por dia; nada identifica quem abriu ou marcou.
//
// Autor: Matheus C. Pestana

import { Redis } from "@upstash/redis";

const GUARDAR_DIAS = 90;

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
