export type Votos = {
  brancos: number;
  nulos: number;
  abstencao: number;
  outros: Record<string, number>;
  lula: number;
  flavio: number;
  ate: number;
  /** Votos que a conversa tende a render para o Flávio aqui (scripts/ganho.py). Ausente em dados antigos. */
  ganho?: number;
};

export type Regiao = {
  id: string;
  uf: string;
  municipio: string;
  bairro: string;
  lat: number;
  lon: number;
  locais: { nome: string; endereco: string; secoes: [number, number][]; aprox?: true }[];
  eleitores: number;
  urnas: number;
  apuradas: number;
  votos: Votos | null;
  /** Votos de Bolsonaro no 2º turno de 2022 nos locais de 2022 desta região, quando há algum. */
  bolsonaro2022?: number;
  /** Ponto estimado pelo CNEFE a partir da rua, da localidade ou do CEP. */
  aprox?: true;
  exemplo?: true;
};

export type Indice = {
  geradoEm: string;
  celula: number;
  /** Células por grau (10 = 0,1 grau). Ausente em dados antigos, que usavam 0,25 grau. */
  celulasPorGrau?: number;
  candidatos: Record<string, string>;
  boletinsLidos: number;
  /** Resumo do conteúdo dos dados; muda só quando eles mudam. */
  versao?: string;
  /** Somas do país inteiro, só com urnas que já têm boletim. */
  brasil?: { ate: number; viraveis: number; ganho?: number };
};

export type ResultadoUrna = {
  comparecimento: number;
  brancos: number;
  nulos: number;
  nominais: Record<string, number>;
};

export type Ponto = { lat: number; lon: number; rotulo: string };

export type RegiaoPerto = Regiao & { distancia: number };

export type Situacao = "conversa" | "sem_boletim";

export function situacao(r: Regiao): Situacao {
  return r.votos ? "conversa" : "sem_boletim";
}

export const RAIO_KM = 1;

export type Disputa = { lula: number; flavio: number; diferenca: number; flavioNaFrente: boolean; abertos: number };

/** Flávio contra Lula no 1º turno, e quantos votos de branco, nulo e ausência estão em aberto. */
export function disputa(v: Votos): Disputa {
  return {
    lula: v.lula,
    flavio: v.flavio,
    diferenca: Math.abs(v.flavio - v.lula),
    flavioNaFrente: v.flavio >= v.lula,
    abertos: v.brancos + v.nulos + v.abstencao,
  };
}

/** Votos válidos do 1º turno: os nominais, sem branco nem nulo (a base que o TSE usa nas porcentagens). */
export function votosValidos(v: Votos): number {
  return v.lula + v.flavio + Object.values(v.outros).reduce((s, n) => s + n, 0);
}

/** Fração dos votos válidos que foi para o Flávio, ou null se ninguém votou em candidato. */
export function parteDoFlavio(v: Votos): number | null {
  const validos = votosValidos(v);
  return validos ? v.flavio / validos : null;
}

export const fmtPct = (fracao: number) => `${Math.round(fracao * 100)}%`;

const celulas = new Map<string, Promise<Regiao[]>>();
const urnasPorZona = new Map<string, Promise<Record<string, ResultadoUrna>>>();
let exemplo: Promise<Regiao[]> | null = null;

/** Resultado de uma urna, do arquivo da zona eleitoral dela (alguns KB, não o estado inteiro). */
export function carregarResultadoUrna(
  uf: string,
  municipio: string,
  zona: number,
  secao: number,
): Promise<ResultadoUrna | null> {
  const chaveZona = `${uf.toLowerCase()}-${municipio}-${zona}`;
  let pedido = urnasPorZona.get(chaveZona);
  if (!pedido) {
    pedido = pedirDados(`/dados/secoes/${chaveZona}.json`)
      .then((r) => (r.ok && r.headers.get("content-type")?.includes("json") ? r.json() : {}))
      .catch(() => ({})) as Promise<Record<string, ResultadoUrna>>;
    urnasPorZona.set(chaveZona, pedido);
  }
  return pedido.then((urnas) => urnas[`${municipio}-${String(zona).padStart(4, "0")}-${String(secao).padStart(4, "0")}`] ?? null);
}

let versaoDados: string | null = null;
let porGrau = 10;

/**
 * Chave da célula de uma coordenada: o piso da coordenada vezes as células por
 * grau. É a mesma conta de scripts/montar_dados.py (chave_celula), que em
 * JavaScript e em Python dá exatamente o mesmo número.
 */
export function chaveCelula(lat: number, lon: number): string {
  return `${Math.floor(lat * porGrau)}_${Math.floor(lon * porGrau)}`;
}

/**
 * Pede um arquivo de /dados com a versão dos dados no endereço. Com versão, o
 * navegador guarda o arquivo por um ano (vercel.json) e só baixa de novo quando
 * a versão muda; sem ela, confere com o servidor antes de usar o que guardou.
 */
export function pedirDados(caminho: string): Promise<Response> {
  return versaoDados ? fetch(`${caminho}?v=${versaoDados}`) : fetch(caminho, { cache: "no-cache" });
}

export async function carregarIndice(): Promise<Indice | null> {
  try {
    const resp = await fetch("/dados/indice.json");
    if (!resp.ok) return null;
    const indice = (await resp.json()) as Indice;
    versaoDados = indice.versao ?? null;
    porGrau = indice.celulasPorGrau ?? Math.round(1 / indice.celula);
    return indice;
  } catch {
    return null;
  }
}

export type Coordenada = [lat: number, lon: number];

function decodificarPontos({ escala, d }: { escala: number; d: number[] }): Coordenada[] {
  const pontos: Coordenada[] = [];
  let lat = 0;
  let lon = 0;
  for (let i = 0; i + 1 < d.length; i += 2) {
    lat += d[i];
    lon += d[i + 1];
    pontos.push([lat / escala, lon / escala]);
  }
  return pontos;
}

/**
 * Bolinhas dos locais de votação, para o mapa antes da busca. "resumo" traz o
 * país em pontos de uns 5 km; "-23_-47" traz cada local do quadrado de 1 grau
 * com canto sudoeste em -23, -47. Quadrado sem local responde lista vazia.
 */
export async function carregarPontos(chave: string): Promise<Coordenada[]> {
  try {
    const resp = await pedirDados(`/dados/pontos/${chave}.json`);
    if (!resp.ok || !resp.headers.get("content-type")?.includes("json")) return [];
    return decodificarPontos(await resp.json());
  } catch {
    return [];
  }
}

export function carregarCelula(chave: string): Promise<Regiao[]> {
  let pedido = celulas.get(chave);
  if (!pedido) {
    pedido = pedirDados(`/dados/celulas/${chave}.json`)
      .then((r) => (r.ok && r.headers.get("content-type")?.includes("json") ? r.json() : []))
      .catch(() => []) as Promise<Regiao[]>;
    celulas.set(chave, pedido);
  }
  return pedido;
}

export function carregarExemplo(): Promise<Regiao[]> {
  exemplo ??= pedirDados("/dados/exemplo.json")
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []) as Promise<Regiao[]>;
  return exemplo;
}

export function distanciaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export async function regioesPerto(
  ponto: Ponto,
  raioKm: number,
  celula: number,
  usarExemplo: boolean,
): Promise<RegiaoPerto[]> {
  let todas: Regiao[];
  if (usarExemplo) {
    todas = await carregarExemplo();
  } else {
    const dLat = raioKm / 111;
    const dLon = raioKm / (111 * Math.cos((ponto.lat * Math.PI) / 180));
    const chaves: string[] = [];
    const grau = Math.round(1 / celula);
    for (let i = Math.floor((ponto.lat - dLat) * grau); i <= Math.floor((ponto.lat + dLat) * grau); i++) {
      for (let j = Math.floor((ponto.lon - dLon) * grau); j <= Math.floor((ponto.lon + dLon) * grau); j++) {
        chaves.push(`${i}_${j}`);
      }
    }
    todas = (await Promise.all(chaves.map(carregarCelula))).flat();
  }
  return todas
    .map((r) => ({ ...r, distancia: distanciaKm(ponto, r) }))
    .filter((r) => r.distancia <= raioKm);
}

/** Votos esperados de uma região; em dados sem o ganho, o tamanho do bolo em aberto. */
export const ganhoDe = (v: Votos) => v.ganho ?? v.ate;

/** Regiões para conversar, da que tende a render mais votos para a de menos; empate vai para a mais perto. */
export function ordenar(regioes: RegiaoPerto[]): RegiaoPerto[] {
  return regioes
    .filter((r) => situacao(r) === "conversa")
    .sort((a, b) => ganhoDe(b.votos!) - ganhoDe(a.votos!) || a.distancia - b.distancia);
}

/** A mesma ordem, descontando onde já tem gente marcada para conversar: ganho / (1 + marcados). */
export function ordenarComMarcados(regioes: RegiaoPerto[], marcados: Record<string, number>): RegiaoPerto[] {
  const valor = (r: RegiaoPerto) => ganhoDe(r.votos!) / (1 + (marcados[r.id] ?? 0));
  return [...regioes].sort((a, b) => valor(b) - valor(a) || a.distancia - b.distancia);
}

// Página "Onde virar mais": municípios e lugares de votação ordenados por quem ficou de fora.

export type MunicipioOnde = {
  /** Código do município no TSE, o mesmo do id das regiões. */
  c: string;
  n: string;
  /** Regiões com boletim. */
  r: number;
  /** Brancos, nulos e abstenção somados. */
  a: number;
  /** Regiões ainda sem boletim. */
  sb: number;
};

export type LinhaOnde = {
  id: string;
  bairro: string;
  local: string;
  locais: number;
  secoes: number;
  lat: number;
  lon: number;
  eleitores: number;
  urnas: number;
  apuradas: number;
  brancos: number;
  nulos: number;
  abstencao: number;
  lula: number;
  flavio: number;
  lulaDomina: boolean;
  /** Votos esperados para o Flávio; em dados antigos, brancos + nulos + abstenção. */
  ganho: number;
};

export type MetricaOnde = "ganho" | "todos" | "abstencao" | "brancos" | "nulos";

export const METRICAS_ONDE: { chave: MetricaOnde; rotulo: string; legenda: string }[] = [
  { chave: "ganho", rotulo: "Mais votos por visita", legenda: "votos esperados" },
  { chave: "todos", rotulo: "Tudo junto", legenda: "no total" },
  { chave: "abstencao", rotulo: "Abstenção", legenda: "não foram votar" },
  { chave: "brancos", rotulo: "Brancos", legenda: "em branco" },
  { chave: "nulos", rotulo: "Nulos", legenda: "nulos" },
];

export function valorOnde(l: LinhaOnde, metrica: MetricaOnde): number {
  switch (metrica) {
    case "abstencao":
      return l.abstencao;
    case "brancos":
      return l.brancos;
    case "nulos":
      return l.nulos;
    case "todos":
      return l.brancos + l.nulos + l.abstencao;
    case "ganho":
      return l.ganho;
    default: {
      const nunca: never = metrica;
      return nunca;
    }
  }
}

/** Do lugar com mais gente de fora para o com menos; no empate, o de mais eleitores e depois o id, para a ordem não mudar. */
export function ordenarOnde(linhas: LinhaOnde[], metrica: MetricaOnde): LinhaOnde[] {
  return [...linhas].sort(
    (a, b) =>
      valorOnde(b, metrica) - valorOnde(a, metrica) ||
      valorOnde(b, "todos") - valorOnde(a, "todos") ||
      b.eleitores - a.eleitores ||
      (a.id < b.id ? -1 : 1),
  );
}

export function nomeLocalOnde(l: LinhaOnde) {
  return l.locais > 1 ? `${l.local} e mais ${l.locais - 1}` : l.local;
}

const municipiosPorUf = new Map<string, Promise<MunicipioOnde[]>>();
const linhasPorMunicipio = new Map<string, Promise<LinhaOnde[]>>();

function pedirJson<T>(caminho: string, vazio: T): Promise<T> {
  return pedirDados(caminho)
    .then((r) => (r.ok && r.headers.get("content-type")?.includes("json") ? (r.json() as Promise<T>) : vazio))
    .catch(() => vazio);
}

/** Municípios da UF que têm lugar de votação, em ordem alfabética. */
export function carregarMunicipios(uf: string): Promise<MunicipioOnde[]> {
  const chave = uf.toLowerCase();
  let pedido = municipiosPorUf.get(chave);
  if (!pedido) {
    pedido = pedirJson<MunicipioOnde[]>(`/dados/onde/${chave}.json`, []);
    municipiosPorUf.set(chave, pedido);
  }
  return pedido;
}

type LinhaCompacta = [
  string, string, string, number, number, number, number, number, number, number,
  number, number, number, number, number, number, number?,
];

/** Lugares de votação do município que já têm boletim, na ordem de scripts/montar_dados.py (indice_onde). */
export function carregarLinhasDoMunicipio(uf: string, codigo: string): Promise<LinhaOnde[]> {
  const chave = `${uf.toLowerCase()}-${codigo}`;
  let pedido = linhasPorMunicipio.get(chave);
  if (!pedido) {
    pedido = pedirJson<LinhaCompacta[]>(`/dados/onde/${chave}.json`, []).then((linhas) =>
      linhas.map(
        ([id, bairro, local, locais, secoes, lat, lon, eleitores, urnas, apuradas, brancos, nulos, abstencao, lula, flavio, domina, ganho]) => ({
          id, bairro, local, locais, secoes, lat, lon, eleitores, urnas, apuradas, brancos, nulos, abstencao, lula, flavio,
          lulaDomina: domina === 1,
          ganho: ganho ?? brancos + nulos + abstencao,
        }),
      ),
    );
    linhasPorMunicipio.set(chave, pedido);
  }
  return pedido;
}

/** A região inteira (locais, endereços, seções), que mora no arquivo do quadrado do mapa em que ela está. */
export async function carregarRegiaoCompleta(linha: LinhaOnde): Promise<Regiao | null> {
  const regioes = await carregarCelula(chaveCelula(linha.lat, linha.lon));
  return regioes.find((r) => r.id === linha.id) ?? null;
}

/**
 * A linha vira uma região mínima, só com o que o mapa usa (posição e marcador).
 * Os números de verdade vêm da região completa, quando a ficha abre.
 */
export function linhaComoRegiao(linha: LinhaOnde): RegiaoPerto {
  return {
    id: linha.id,
    uf: "",
    municipio: "",
    bairro: linha.bairro,
    lat: linha.lat,
    lon: linha.lon,
    locais: [],
    eleitores: linha.eleitores,
    urnas: linha.urnas,
    apuradas: linha.apuradas,
    votos: {
      brancos: linha.brancos,
      nulos: linha.nulos,
      abstencao: linha.abstencao,
      outros: {},
      lula: linha.lula,
      flavio: linha.flavio,
      ate: linha.brancos + linha.nulos + linha.abstencao,
    },
    distancia: 0,
  };
}

export type Comparacao2022 = { bolsonaro2022: number; flavio2026: number; falta: number };

/**
 * Quantos votos de Bolsonaro do 2º turno de 2022 o Flávio ainda não tem, somando as regiões
 * da lista. Só entram regiões com locais de 2022 ligados e com todas as urnas de
 * 2026 apuradas: boletim faltando deixaria 2026 menor e inflaria a diferença.
 */
export function comparar2022(regioes: Regiao[]): Comparacao2022 | null {
  let bolsonaro2022 = 0;
  let flavio2026 = 0;
  let usadas = 0;
  for (const r of regioes) {
    // Ligação com 2022 que passa do eleitorado de agora é muitos-para-um: fica fora da conta.
    if (r.bolsonaro2022 === undefined || !r.votos || r.apuradas < r.urnas) continue;
    if (r.bolsonaro2022 > votosValidos(r.votos) + r.votos.brancos + r.votos.nulos) continue;
    bolsonaro2022 += r.bolsonaro2022;
    flavio2026 += r.votos.flavio;
    usadas++;
  }
  return usadas ? { bolsonaro2022, flavio2026, falta: bolsonaro2022 - flavio2026 } : null;
}

export type Bairro = {
  chave: string;
  nome: string;
  municipio: string;
  regioes: RegiaoPerto[];
  ate: number;
  /** Soma dos votos esperados das regiões do bairro (ganhoDe). */
  ganho: number;
  eleitores: number;
  distancia: number;
};

export function porBairro(regioes: RegiaoPerto[], marcados: Record<string, number> = {}): { bairros: Bairro[]; semBairro: number } {
  const mapa = new Map<string, Bairro>();
  let semBairro = 0;
  for (const r of regioes) {
    if (!r.bairro) {
      semBairro++;
      continue;
    }
    const chave = `${r.uf}|${r.municipio}|${r.bairro}`;
    let b = mapa.get(chave);
    if (!b) {
      b = { chave, nome: r.bairro, municipio: r.municipio, regioes: [], ate: 0, ganho: 0, eleitores: 0, distancia: Infinity };
      mapa.set(chave, b);
    }
    b.regioes.push(r);
    b.ate += r.votos!.ate;
    b.ganho += ganhoDe(r.votos!) / (1 + (marcados[r.id] ?? 0));
    b.eleitores += r.eleitores;
    b.distancia = Math.min(b.distancia, r.distancia);
  }
  const bairros = [...mapa.values()].sort((a, b) => b.ganho - a.ganho || a.distancia - b.distancia);
  return { bairros, semBairro };
}

export type Pilha = { chave: string; rotulo: string; quantidade: number; ficha: string | null };

const FICHAS_POR_NUMERO: Record<string, string> = { "70": "cury", "14": "renan", "55": "caiado", "30": "zema" };

/** As partes que somam o "até X", em números absolutos, da maior para a menor. */
export function pilhas(v: Votos, candidatos: Record<string, string>): Pilha[] {
  const lista: Pilha[] = [
    { chave: "brancos", rotulo: "em branco", quantidade: v.brancos, ficha: "branco" },
    { chave: "nulos", rotulo: v.nulos === 1 ? "nulo" : "nulos", quantidade: v.nulos, ficha: "nulo" },
    { chave: "abstencao", rotulo: "não foram votar", quantidade: v.abstencao, ficha: "abstencao" },
  ];
  let restantes = 0;
  for (const [numero, qtd] of Object.entries(v.outros)) {
    const ficha = FICHAS_POR_NUMERO[numero];
    if (ficha) {
      lista.push({ chave: numero, rotulo: `no ${candidatos[numero] ?? `número ${numero}`}`, quantidade: qtd, ficha });
    } else {
      restantes += qtd;
    }
  }
  if (restantes) lista.push({ chave: "outros", rotulo: "em outros nomes", quantidade: restantes, ficha: null });
  return lista.filter((p) => p.quantidade > 0).sort((a, b) => b.quantidade - a.quantidade);
}

export function somarVotos(regioes: Regiao[]): Votos {
  const total: Votos = { brancos: 0, nulos: 0, abstencao: 0, outros: {}, lula: 0, flavio: 0, ate: 0 };
  for (const r of regioes) {
    const v = r.votos;
    if (!v) continue;
    total.brancos += v.brancos;
    total.nulos += v.nulos;
    total.abstencao += v.abstencao;
    total.lula += v.lula;
    total.flavio += v.flavio;
    total.ate += v.ate;
    for (const [n, q] of Object.entries(v.outros)) total.outros[n] = (total.outros[n] ?? 0) + q;
  }
  return total;
}

const numeroBR = new Intl.NumberFormat("pt-BR");
export const fmt = (n: number) => numeroBR.format(n);

export function fmtDistancia(km: number) {
  const metros = Math.max(50, Math.round((km * 1000) / 50) * 50);
  if (metros < 1000) return `${metros} m`;
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

// Ponto que vai nos links compartilhados, arredondado a uns 500 m para não
// apontar a casa de quem mandou.
const GRADE_LINK = 0.005;
const arredondarLink = (x: number) => (Math.round(x / GRADE_LINK) * GRADE_LINK).toFixed(3);

/** "@-23.670,-46.765": o trecho do endereço #/perto/ que abre o mapa num ponto. */
export function ancoraDoPonto(p: { lat: number; lon: number }): string {
  return `@${arredondarLink(p.lat)},${arredondarLink(p.lon)}`;
}

export function nomeRegiao(r: Regiao) {
  return r.bairro ? `${r.bairro}, ${r.municipio}` : r.municipio;
}

/** O nome do lugar de votação, que é por onde a pessoa se orienta na rua. */
export function nomeLocal(r: Regiao) {
  const [primeiro, ...resto] = r.locais;
  if (!primeiro) return nomeRegiao(r);
  return resto.length ? `${primeiro.nome} e mais ${resto.length}` : primeiro.nome;
}

export function listaHumana(itens: string[]) {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

// Perfil de quem faltou no 2º turno de 2022 (scripts/estimar_perfil_2022.py).

export type Destaque2022 = { g: string; inscritos: number; abstencao: number };
export type Perfil2022 = { aptos: number; abstencao: number; destaques: Destaque2022[] };

const perfis2022 = new Map<string, Promise<Record<string, Perfil2022>>>();

/** Perfil de 2022 da região, ou null se ela não tem locais que existiam em 2022. */
export function carregarPerfil2022(r: Regiao): Promise<Perfil2022 | null> {
  const chave = chaveCelula(r.lat, r.lon);
  let pedido = perfis2022.get(chave);
  if (!pedido) {
    pedido = pedirDados(`/dados/perfil2022/${chave}.json`)
      .then((resp) => (resp.ok && resp.headers.get("content-type")?.includes("json") ? resp.json() : {}))
      .catch(() => ({})) as Promise<Record<string, Perfil2022>>;
    perfis2022.set(chave, pedido);
  }
  return pedido.then((porId) => porId[r.id] ?? null);
}

export const GRUPOS_2022: Record<string, string> = {
  "16-17": "jovens de 16 e 17 anos",
  "18-24": "jovens de 18 a 24 anos",
  "25-34": "pessoas de 25 a 34 anos",
  "35-44": "pessoas de 35 a 44 anos",
  "45-59": "pessoas de 45 a 59 anos",
  "60-69": "pessoas de 60 a 69 anos",
  "70+": "pessoas com 70 anos ou mais",
  mulheres: "mulheres",
  homens: "homens",
  fund_incompleto: "pessoas que não terminaram o ensino fundamental",
  fund_completo: "pessoas que terminaram o fundamental, mas não o ensino médio",
  medio_completo: "pessoas com ensino médio completo",
  superior: "pessoas com faculdade completa",
};

/**
 * Uma proporção dita como em release: 0,26 vira "1 em cada 4", 0,41 vira
 * "2 em cada 5". Quando a fração arredonda mais de 1,5 ponto, avisa com
 * "quase" ou "mais de" (0,44 vira "mais de 2 em cada 5", 0,71 vira "quase 3 em cada 4").
 */
export function fracaoHumana(taxa: number): { texto: string; numerador: number } {
  const opcoes: { a: number; b: number; erro: number }[] = [];
  for (let b = 2; b <= 10; b++) {
    for (let a = 1; a < b; a++) {
      if (a > 1 && [2, 3, 5, 7].some((p) => a % p === 0 && b % p === 0)) continue;
      opcoes.push({ a, b, erro: Math.abs(a / b - taxa) });
    }
  }
  // Primeiro "1 em cada N"; depois frações de até 5; só então as outras.
  const porErro = (x: { erro: number; b: number }, y: { erro: number; b: number }) => x.erro - y.erro || x.b - y.b;
  const umEmCada = opcoes.filter((o) => o.a === 1).sort(porErro)[0];
  const simples = opcoes.filter((o) => o.b <= 5).sort(porErro)[0];
  const melhor = umEmCada.erro <= 0.015 ? umEmCada : simples.erro <= 0.045 ? simples : opcoes.sort(porErro)[0];
  const sobra = taxa - melhor.a / melhor.b;
  const prefixo = sobra > 0.015 ? "mais de " : sobra < -0.015 ? "quase " : "";
  return { texto: `${prefixo}${melhor.a} em cada ${melhor.b}`, numerador: melhor.a };
}

/** "cerca de 260": dezenas abaixo de mil, centenas acima. */
export function cerca(n: number): string {
  if (n < 20) return fmt(n);
  const passo = n < 1000 ? 10 : 100;
  return `cerca de ${fmt(Math.round(n / passo) * passo)}`;
}
