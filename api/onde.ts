// Cidade aproximada de quem abre o site, pelos cabeçalhos de geolocalização da
// Vercel. Serve só para abrir o mapa perto da pessoa; nada é guardado.
//
// Autor: Matheus C. Pestana

function cabecalho(request: Request, nome: string): string {
  const valor = request.headers.get(nome) ?? "";
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

export function GET(request: Request): Response {
  const pais = cabecalho(request, "x-vercel-ip-country");
  const lat = Number(cabecalho(request, "x-vercel-ip-latitude"));
  const lon = Number(cabecalho(request, "x-vercel-ip-longitude"));
  const achou = pais === "BR" && Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0);
  const corpo = achou
    ? { lat, lon, cidade: cabecalho(request, "x-vercel-ip-city"), uf: cabecalho(request, "x-vercel-ip-country-region") }
    : null;
  return new Response(JSON.stringify(corpo), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" },
  });
}
