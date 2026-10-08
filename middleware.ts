// Fecha o painel e o relatório internos antes de servir a página e os números:
// só entra quem tem o cookie do link secreto (api/_acesso.ts). A API do painel
// confere o acesso de novo por conta própria.
//
// Autor: Matheus C. Pestana

import { next } from "@vercel/functions";
import { exigirAcesso, exigirAcessoRelatorio } from "./api/_acesso.js";

export const config = {
  runtime: "nodejs",
  matcher: ["/dash", "/dash/:path*", "/dados/painel.json", "/relatorio", "/relatorio/:path*", "/dados/relatorio.json"],
};

export default async function middleware(request: Request): Promise<Response> {
  if (new URL(request.url).pathname.startsWith("/relatorio") || new URL(request.url).pathname === "/dados/relatorio.json") {
    return (await exigirAcessoRelatorio(request)) ?? next();
  }
  return (await exigirAcesso(request)) ?? next();
}
