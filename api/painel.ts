// Números de uso do site para a página /dash: marcações de "Vou conversar por
// aqui" e aberturas do mapa por dia. Tudo agregado, nada por pessoa.
//
// Autor: Matheus C. Pestana

import { dia, redis } from "./_redis.js";

const DIAS = 21;

type PorCampo = Record<string, number>;

function somar(alvo: PorCampo, origem: PorCampo | null): void {
  for (const [campo, n] of Object.entries(origem ?? {})) alvo[campo] = (alvo[campo] ?? 0) + Number(n);
}

async function marcas() {
  const chaves: string[] = [];
  let cursor = "0";
  do {
    const [proximo, lote] = await redis().scan(cursor, { match: "marcas:*", count: 1000 });
    chaves.push(...lote);
    cursor = String(proximo);
  } while (cursor !== "0" && chaves.length < 50_000);
  const totais: number[] = [];
  for (let i = 0; i < chaves.length; i += 500) {
    const fila = redis().pipeline();
    for (const chave of chaves.slice(i, i + 500)) fila.scard(chave);
    totais.push(...((await fila.exec()) as number[]));
  }
  const regioes = chaves.map((chave, i) => ({ id: chave.slice("marcas:".length), pessoas: totais[i] ?? 0 }));
  const porUf: Record<string, { regioes: number; pessoas: number }> = {};
  for (const r of regioes) {
    const uf = r.id.slice(0, 2).toUpperCase();
    porUf[uf] ??= { regioes: 0, pessoas: 0 };
    porUf[uf].regioes += 1;
    porUf[uf].pessoas += r.pessoas;
  }
  return {
    regioes: regioes.length,
    pessoas: regioes.reduce((s, r) => s + r.pessoas, 0),
    porUf,
    maisGente: regioes.sort((a, b) => b.pessoas - a.pessoas).slice(0, 20),
  };
}

async function uso() {
  const dias = Array.from({ length: DIAS }, (_, i) => dia(i));
  const fila = redis().pipeline();
  for (const d of dias) {
    fila.hgetall(`uso:aberturas:${d}`);
    fila.hgetall(`uso:marcacoes:${d}`);
    fila.hgetall(`uso:desmarcacoes:${d}`);
  }
  const respostas = (await fila.exec()) as (PorCampo | null)[];
  const total = { aberturas: {} as PorCampo, marcacoes: {} as PorCampo, desmarcacoes: {} as PorCampo };
  const porDia = dias.map((d, i) => {
    const [aberturas, marcacoes, desmarcacoes] = respostas.slice(i * 3, i * 3 + 3);
    somar(total.aberturas, aberturas);
    somar(total.marcacoes, marcacoes);
    somar(total.desmarcacoes, desmarcacoes);
    const soma = (x: PorCampo | null) => Object.values(x ?? {}).reduce((s, n) => s + Number(n), 0);
    return { dia: d, aberturas: soma(aberturas), marcacoes: soma(marcacoes), desmarcacoes: soma(desmarcacoes) };
  });
  return { porDia, porUf: total };
}

export async function GET(): Promise<Response> {
  let corpo: unknown;
  try {
    const [m, u] = await Promise.all([marcas(), uso()]);
    corpo = { ok: true, agora: new Date().toISOString(), marcas: m, uso: u };
  } catch (erro) {
    corpo = { ok: false, motivo: String(erro) };
  }
  return new Response(
    JSON.stringify({
      ...(corpo as object),
      deploy: {
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        mensagem: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
        ambiente: process.env.VERCEL_ENV ?? "local",
        regiao: process.env.VERCEL_REGION ?? null,
      },
    }),
    { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } },
  );
}
