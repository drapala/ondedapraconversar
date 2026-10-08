// Números de uso do site para a página /dash: marcações de "Vou conversar por
// aqui", aberturas do mapa e visitantes estimados por dia. Tudo agregado,
// nada por pessoa.
//
// Autor: Matheus C. Pestana

import { exigirAcesso } from "./_acesso.js";
import { CONTAGENS, dia, diasDoPeriodo, garantirContagens, redis } from "./_redis.js";

type PorCampo = Record<string, number>;

function somar(alvo: PorCampo, origem: PorCampo | null): void {
  for (const [campo, n] of Object.entries(origem ?? {})) alvo[campo] = (alvo[campo] ?? 0) + Number(n);
}

async function marcas() {
  // Um comando só: o hash de contagens que a marcação mantém (ver api/marcas.ts).
  await garantirContagens();
  const contagens = ((await redis().hgetall(CONTAGENS)) ?? {}) as Record<string, number | string>;
  const regioes = Object.entries(contagens)
    .map(([id, n]) => ({ id, pessoas: Number(n) }))
    .filter((r) => r.pessoas > 0);
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
  const hoje = dia();
  const periodo = diasDoPeriodo();
  const passados = periodo.filter((d) => d <= hoje);
  const fila = redis().pipeline();
  fila.get("uso:aberturas:total");
  for (const d of passados) {
    fila.hgetall(`uso:aberturas:${d}`);
    fila.hgetall(`uso:marcacoes:${d}`);
    fila.hgetall(`uso:desmarcacoes:${d}`);
    fila.pfcount(`uso:visitantes:${d}`);
    fila.hgetall(`uso:paises:${d}`);
    fila.hgetall(`uso:horas:${d}`);
  }
  const [visitasTotal, ...respostas] = (await fila.exec()) as (PorCampo | number | string | null)[];
  const total = { aberturas: {} as PorCampo, marcacoes: {} as PorCampo, desmarcacoes: {} as PorCampo };
  const aberturasPorPais: PorCampo = {};
  const aberturasPorHora: PorCampo = {};
  let aberturasPorHoraHoje: PorCampo = {};
  const soma = (x: PorCampo | null) => Object.values(x ?? {}).reduce((s, n) => s + Number(n), 0);
  const porDia = periodo.map((d) => {
    const i = passados.indexOf(d);
    if (i < 0) return { dia: d, futuro: true, visitantes: 0, aberturas: 0, marcacoes: 0, desmarcacoes: 0 };
    const [aberturas, marcacoes, desmarcacoes, visitantes, paises, horas] = respostas.slice(i * 6, i * 6 + 6);
    somar(aberturasPorPais, paises as PorCampo | null);
    somar(aberturasPorHora, horas as PorCampo | null);
    if (d === hoje) aberturasPorHoraHoje = Object.fromEntries(Object.entries((horas as PorCampo | null) ?? {}).map(([h, n]) => [h, Number(n)]));
    somar(total.aberturas, aberturas as PorCampo | null);
    somar(total.marcacoes, marcacoes as PorCampo | null);
    somar(total.desmarcacoes, desmarcacoes as PorCampo | null);
    return {
      dia: d,
      futuro: false,
      visitantes: Number(visitantes ?? 0),
      aberturas: soma(aberturas as PorCampo | null),
      marcacoes: soma(marcacoes as PorCampo | null),
      desmarcacoes: soma(desmarcacoes as PorCampo | null),
    };
  });

  // PFCOUNT com várias chaves conta a união: quem voltou em dias diferentes conta uma vez.
  const origens = Object.keys(total.aberturas);
  const paises = Object.keys(aberturasPorPais);
  let visitantesNoPeriodo = 0;
  let visitantesPorUf: PorCampo = {};
  let visitantesPorPais: PorCampo = {};
  if (passados.length) {
    const [primeiro, ...resto] = passados;
    const unicos = redis().pipeline();
    unicos.pfcount(`uso:visitantes:${primeiro}`, ...resto.map((d) => `uso:visitantes:${d}`));
    for (const o of origens) unicos.pfcount(`uso:visitantes:${primeiro}:${o}`, ...resto.map((d) => `uso:visitantes:${d}:${o}`));
    for (const p of paises) {
      unicos.pfcount(`uso:visitantes:${primeiro}:pais:${p}`, ...resto.map((d) => `uso:visitantes:${d}:pais:${p}`));
    }
    const contagens = (await unicos.exec()) as number[];
    visitantesNoPeriodo = Number(contagens[0] ?? 0);
    visitantesPorUf = Object.fromEntries(origens.map((o, i) => [o, Number(contagens[i + 1] ?? 0)]));
    visitantesPorPais = Object.fromEntries(paises.map((p, i) => [p, Number(contagens[origens.length + i + 1] ?? 0)]));
  }
  return {
    hoje,
    visitasTotal: Number(visitasTotal ?? 0),
    visitantesNoPeriodo,
    porDia,
    porUf: { ...total, visitantes: visitantesPorUf },
    porPais: { aberturas: aberturasPorPais, visitantes: visitantesPorPais },
    porHora: { periodo: aberturasPorHora, hoje: aberturasPorHoraHoje },
  };
}

export async function GET(request: Request): Promise<Response> {
  const barrado = await exigirAcesso(request);
  if (barrado) return barrado;
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
