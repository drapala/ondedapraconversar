// Busca de endereço. Primeiro nos bairros e municípios do cadastro do TSE, que
// o site publica em /dados/busca; só o que não estiver lá (nome de rua, em geral)
// vai para o Nominatim do OpenStreetMap, cuja política pede no máximo um pedido
// por segundo para o site inteiro e nada de autocompletar.

export type Lugar = { lat: number; lon: number; rotulo: string };
export type CidadeAproximada = { lat: number; lon: number; cidade: string; uf: string };

export type Chegada = { cidade: CidadeAproximada | null; visitas: number | null };

/**
 * Registra a visita e traz a cidade aproximada pelo IP, vinda da Vercel, e o
 * total de visitas. Fora da Vercel, ou fora do Brasil, a cidade volta null.
 */
export async function registrarChegada(): Promise<Chegada> {
  try {
    const resp = await fetch("/api/onde");
    if (!resp.ok || !resp.headers.get("content-type")?.includes("json")) return { cidade: null, visitas: null };
    const corpo = (await resp.json()) as { local: CidadeAproximada | null; visitas: number | null };
    return { cidade: corpo.local, visitas: corpo.visitas };
  } catch {
    return { cidade: null, visitas: null };
  }
}

type EntradaBusca = { t: "b" | "m"; n: string; m?: string; uf: string; lat: number; lon: number; e: number };

// Mesmas regras de chaves_busca() em scripts/montar_dados.py.
const GENERICAS = new Set(
  ("jardim jardins vila parque conjunto residencial bairro cidade nova novo santa santo sao nossa senhora " +
    "loteamento setor chacara chacaras recanto condominio habitacional quadra zona rural urbana centro alto baixo " +
    "jd vl pq res cj povoado distrito sitio fazenda comunidade assentamento aldeia localidade colonia linha gleba").split(" "),
);

function normalizar(texto: string): string {
  return texto
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chaveDaBusca(palavras: string[]): string | null {
  const boas = palavras.filter((p) => p.length >= 4 && !GENERICAS.has(p));
  const opcoes = boas.length ? boas : palavras.filter((p) => p.length >= 3);
  const maior = opcoes.reduce<string | null>((m, p) => (!m || p.length > m.length ? p : m), null);
  return maior ? maior.slice(0, 3) : null;
}

const arquivosBusca = new Map<string, Promise<EntradaBusca[]>>();

function carregarBusca(chave: string): Promise<EntradaBusca[]> {
  let pedido = arquivosBusca.get(chave);
  if (!pedido) {
    pedido = fetch(`/dados/busca/${chave}.json`)
      .then((r) => (r.ok && r.headers.get("content-type")?.includes("json") ? r.json() : []))
      .catch(() => []) as Promise<EntradaBusca[]>;
    arquivosBusca.set(chave, pedido);
  }
  return pedido;
}

const casa = (palavras: string[], alvo: string[]) => palavras.every((p) => alvo.some((a) => a.startsWith(p)));

/** Bairros e municípios com lugar de votação. "Capão Redondo, São Paulo" acha o bairro certo. */
export async function buscarLocal(texto: string): Promise<Lugar[]> {
  const [primeira = "", ...resto] = texto.split(",").map(normalizar);
  const palavras = primeira.split(" ").filter(Boolean);
  const chave = chaveDaBusca(palavras);
  if (!chave) return [];
  const restantes = resto.join(" ").split(" ").filter(Boolean);
  const achados = (await carregarBusca(chave)).filter((e) => {
    const nome = normalizar(e.n).split(" ");
    const lugar = [...normalizar(e.m ?? e.n).split(" "), e.uf.toLowerCase()];
    return (casa(palavras, nome) || casa(palavras, [...nome, ...lugar])) && casa(restantes, lugar);
  });
  const exato = (e: EntradaBusca) => (normalizar(e.n) === primeira ? 0 : 1);
  return achados
    .sort((a, b) => exato(a) - exato(b) || b.e - a.e)
    .slice(0, 5)
    .map((e) => ({ lat: e.lat, lon: e.lon, rotulo: e.m ? `${e.n}, ${e.m} – ${e.uf}` : `${e.n} – ${e.uf}` }));
}

export async function buscarEndereco(texto: string): Promise<Lugar[]> {
  const locais = await buscarLocal(texto).catch(() => []);
  return locais.length ? locais : buscarNominatim(texto);
}

let ultimo = 0;

async function buscarNominatim(texto: string): Promise<Lugar[]> {
  const espera = 1100 - (Date.now() - ultimo);
  if (espera > 0) await new Promise((ok) => setTimeout(ok, espera));
  ultimo = Date.now();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    q: texto,
    format: "jsonv2",
    countrycodes: "br",
    limit: "5",
    "accept-language": "pt-BR",
  }).toString();
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Nominatim respondeu ${resp.status}`);
  const lista = (await resp.json()) as { lat: string; lon: string; display_name: string }[];
  const vistos = new Set<string>();
  return lista
    .map((l) => ({
      lat: Number(l.lat),
      lon: Number(l.lon),
      rotulo: l.display_name
        .split(", ")
        .filter((p) => p !== "Brasil" && !p.startsWith("Região ") && !/^\d{5}-?\d{3}$/.test(p))
        .slice(0, 4)
        .join(", "),
    }))
    .filter((l) => !vistos.has(l.rotulo) && vistos.add(l.rotulo));
}
