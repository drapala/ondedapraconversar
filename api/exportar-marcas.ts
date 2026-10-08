// Exportação das marcações de "Vou conversar por aqui", com o mesmo acesso do
// painel (/dash). Só leitura. Para cada região: os aparelhos marcados (o hash,
// encurtado) e desde quando; e o registro de cada marcação e desmarcação.
// Marcas feitas antes de o registro existir aparecem sem hora.
//
// Autor: Matheus C. Pestana

import { exigirAcesso } from "./_acesso.js";
import { redis } from "./_redis.js";

type Evento = { quando: string; regiao: string; aparelho: string; acao: string };

function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

async function chavesDeRegiao(): Promise<string[]> {
  const chaves: string[] = [];
  let cursor = "0";
  do {
    const [proximo, lote] = await redis().scan(cursor, { match: "marcas:*", count: 1000 });
    chaves.push(...lote);
    cursor = String(proximo);
  } while (cursor !== "0" && chaves.length < 50_000);
  return chaves;
}

export async function GET(request: Request): Promise<Response> {
  const barrado = await exigirAcesso(request);
  if (barrado) return barrado;
  try {
    const chaves = await chavesDeRegiao();
    const respostas: unknown[] = [];
    for (let i = 0; i < chaves.length; i += 250) {
      const fila = redis().pipeline();
      for (const chave of chaves.slice(i, i + 250)) {
        fila.smembers(chave);
        fila.hgetall(`marcas-quando:${chave.slice("marcas:".length)}`);
      }
      respostas.push(...((await fila.exec()) as unknown[]));
    }
    const marcas = chaves.flatMap((chave, i) => {
      const regiao = chave.slice("marcas:".length);
      const membros = (respostas[i * 2] as string[] | null) ?? [];
      const horas = (respostas[i * 2 + 1] as Record<string, number | string> | null) ?? {};
      return membros.map((hash) => {
        const ms = Number(horas[hash]);
        return { regiao, aparelho: hash.slice(0, 12), desde: Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null };
      });
    });
    const brutos = (await redis().zrange("marcas-registro", 0, -1)) as (string | Evento)[];
    const eventos = brutos.map((e) => (typeof e === "string" ? (JSON.parse(e) as Evento) : e));
    return json(200, { ok: true, agora: new Date().toISOString(), marcas, eventos });
  } catch (erro) {
    return json(500, { ok: false, motivo: String(erro) });
  }
}
