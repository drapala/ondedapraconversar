// Acesso às páginas internas (/dash e /relatorio) por link secreto que vira cookie.
//
// O link é /dash?k=<DASH_TOKEN>. Com o token certo, a resposta grava um cookie
// (HttpOnly, Secure, SameSite=Lax, 1 ano) com o HMAC do token, não o token, e
// redireciona para o endereço sem ?k=. Daí em diante o navegador entra direto.
// Sem cookie válido e sem token, a resposta é 404: quem não sabe nem descobre que
// a página existe. Trocar DASH_TOKEN na Vercel invalida todos os cookies.
// O relatório usa RELATORIO_TOKEN, ou DASH_TOKEN se não houver um próprio.
//
// Autor: Matheus C. Pestana

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ipDe, redis } from "./_redis.js";

const TENTATIVAS = 10;
const JANELA_S = 15 * 60;
const UM_ANO_S = 365 * 24 * 60 * 60;

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

const naoEncontrado = () => resposta(404, "Não encontrado.");

/** Valor do cookie: HMAC do token, para o cookie não carregar o próprio token. */
function selo(token: string, espaco: string): string {
  return createHmac("sha256", token).update(`acesso:${espaco}:v1`).digest("hex");
}

function lerCookie(request: Request, nome: string): string {
  const cabecalho = request.headers.get("cookie") ?? "";
  for (const parte of cabecalho.split(";")) {
    const [chave, ...valor] = parte.trim().split("=");
    if (chave === nome) return valor.join("=");
  }
  return "";
}

/** Devolve a resposta de recusa (ou o redirecionamento que grava o cookie), ou null quando o acesso vale. */
export async function exigirAcesso(request: Request): Promise<Response | null> {
  return exigirLink(request, process.env.DASH_TOKEN, "dash");
}

/** O relatório aceita um token próprio; sem ele, vale o do painel. */
export async function exigirAcessoRelatorio(request: Request): Promise<Response | null> {
  return exigirLink(request, process.env.RELATORIO_TOKEN || process.env.DASH_TOKEN, "relatorio");
}

async function contarFalha(request: Request, espaco: string): Promise<boolean> {
  try {
    const chave = `${espaco}:falhas:${ipDe(request)}:${Math.floor(Date.now() / 1000 / JANELA_S)}`;
    const fila = redis().pipeline();
    fila.incr(chave);
    fila.expire(chave, JANELA_S);
    const [total] = (await fila.exec()) as number[];
    return Number(total) > TENTATIVAS;
  } catch {
    // Sem Redis não há contagem; o token continua exigido.
    return false;
  }
}

async function exigirLink(request: Request, token: string | undefined, espaco: string): Promise<Response | null> {
  if (!token || token.length < 24) return naoEncontrado();
  const nomeCookie = `acesso_${espaco}`;
  const esperado = selo(token, espaco);
  if (iguais(lerCookie(request, nomeCookie), esperado)) return null;

  const url = new URL(request.url);
  const k = url.searchParams.get("k");
  if (k === null) return naoEncontrado();
  if (await contarFalha(request, espaco)) {
    return resposta(429, "Muitas tentativas. Espere 15 minutos.", { "retry-after": String(JANELA_S) });
  }
  if (!iguais(k, token)) return naoEncontrado();

  url.searchParams.delete("k");
  return new Response(null, {
    status: 303,
    headers: {
      location: url.pathname + url.search,
      "set-cookie": `${nomeCookie}=${esperado}; Path=/; Max-Age=${UM_ANO_S}; HttpOnly; Secure; SameSite=Lax`,
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex",
    },
  });
}
