// Fecha o painel interno com usuário e senha antes de servir a página e os
// números de montagem. A API do painel confere a senha de novo por conta própria.
//
// Autor: Matheus C. Pestana

import { next } from "@vercel/functions";
import { exigirSenha, exigirSenhaRelatorio } from "./api/_acesso.js";

export const config = {
  runtime: "nodejs",
  matcher: ["/dash", "/dash/:path*", "/dados/painel.json", "/relatorio", "/relatorio/:path*", "/dados/relatorio.json"],
};

export default async function middleware(request: Request): Promise<Response> {
  if (new URL(request.url).pathname.startsWith("/relatorio") || new URL(request.url).pathname === "/dados/relatorio.json") {
    return (await exigirSenhaRelatorio(request)) ?? next();
  }
  return (await exigirSenha(request)) ?? next();
}
