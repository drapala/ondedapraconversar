// Fecha o painel interno com usuário e senha antes de servir a página e os
// números de montagem. A API do painel confere a senha de novo por conta própria.
//
// Autor: Matheus C. Pestana

import { next } from "@vercel/functions";
import { exigirSenha } from "./api/_acesso.js";

export const config = {
  runtime: "nodejs",
  matcher: ["/dash", "/dash/:path*", "/dados/painel.json"],
};

export default async function middleware(request: Request): Promise<Response> {
  return (await exigirSenha(request)) ?? next();
}
