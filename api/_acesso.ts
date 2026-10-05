// Senha do painel interno (/dash). Usuário e senha ficam só nas variáveis de
// ambiente da Vercel (DASH_USUARIO e DASH_SENHA), nunca no código nem no
// navegador. Sem as variáveis, o painel fica fechado.
//
// Autor: Matheus C. Pestana

import { createHash, timingSafeEqual } from "node:crypto";
import { ipDe, redis } from "./_redis.js";

const TENTATIVAS = 10;
const JANELA_S = 15 * 60;

function resumo(texto: string): Buffer {
  return createHash("sha256").update(texto).digest();
}

function iguais(a: string, b: string): boolean {
  return timingSafeEqual(resumo(a), resumo(b));
}

function resposta(status: number, texto: string, extra: Record<string, string> = {}): Response {
  return new Response(texto, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", ...extra },
  });
}

/** Devolve a resposta de recusa, ou null quando a senha confere. */
export async function exigirSenha(request: Request): Promise<Response | null> {
  const usuario = process.env.DASH_USUARIO;
  const senha = process.env.DASH_SENHA;
  if (!usuario || !senha) return resposta(503, "Painel fechado.");

  const pedir = resposta(401, "Painel interno.", { "www-authenticate": 'Basic realm="Painel", charset="UTF-8"' });
  const cabecalho = request.headers.get("authorization") ?? "";
  if (!cabecalho.startsWith("Basic ")) return pedir;

  const chaveFalhas = `dash:falhas:${ipDe(request)}:${Math.floor(Date.now() / 1000 / JANELA_S)}`;
  if (Number((await redis().get(chaveFalhas)) ?? 0) >= TENTATIVAS) {
    return resposta(429, "Muitas tentativas. Espere 15 minutos.", { "retry-after": String(JANELA_S) });
  }

  const decodificado = Buffer.from(cabecalho.slice(6), "base64").toString("utf8");
  const separador = decodificado.indexOf(":");
  const conferem =
    separador > 0 && iguais(decodificado.slice(0, separador), usuario) && iguais(decodificado.slice(separador + 1), senha);
  if (conferem) return null;

  const fila = redis().pipeline();
  fila.incr(chaveFalhas);
  fila.expire(chaveFalhas, JANELA_S);
  await fila.exec();
  return pedir;
}
