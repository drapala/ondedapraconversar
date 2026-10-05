// Busca de endereço no Nominatim do OpenStreetMap.
// A política de uso pede no máximo um pedido por segundo e nada de autocompletar.

export type Lugar = { lat: number; lon: number; rotulo: string };
export type CidadeAproximada = { lat: number; lon: number; cidade: string; uf: string };

/** Cidade aproximada pelo IP, vinda da Vercel. Fora dela, ou fora do Brasil, volta null. */
export async function cidadePeloIp(): Promise<CidadeAproximada | null> {
  try {
    const resp = await fetch("/api/onde");
    if (!resp.ok || !resp.headers.get("content-type")?.includes("json")) return null;
    return (await resp.json()) as CidadeAproximada | null;
  } catch {
    return null;
  }
}

let ultimo = 0;

export async function buscarEndereco(texto: string): Promise<Lugar[]> {
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
