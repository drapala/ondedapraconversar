// Cidade aproximada de quem abre o site, pelos cabeçalhos de geolocalização da
// Vercel. Serve só para abrir o mapa perto da pessoa. Do pedido, só ficam o
// total de aberturas do mapa e a estimativa de visitantes, por dia e estado
// (ou país, para quem abre de fora do Brasil).
//
// Autor: Matheus C. Pestana

import { contarAbertura } from "./_redis.js";

function cabecalho(request: Request, nome: string): string {
  const valor = request.headers.get(nome) ?? "";
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

export async function GET(request: Request): Promise<Response> {
  const pais = cabecalho(request, "x-vercel-ip-country");
  const uf = cabecalho(request, "x-vercel-ip-country-region");
  const fora = Boolean(pais) && pais !== "BR";
  const visitas = await contarAbertura(
    request,
    pais === "BR" ? uf || "BR" : fora ? "fora do Brasil" : "sem local",
    fora ? pais.toUpperCase() : undefined,
  );
  const lat = Number(cabecalho(request, "x-vercel-ip-latitude"));
  const lon = Number(cabecalho(request, "x-vercel-ip-longitude"));
  const achou = pais === "BR" && Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0);
  const local = achou ? { lat, lon, cidade: cabecalho(request, "x-vercel-ip-city"), uf } : null;
  return new Response(JSON.stringify({ local, visitas }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" },
  });
}
