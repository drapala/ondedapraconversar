// Cadastro de e-mail (e, se a pessoa quiser, WhatsApp) de quem quer saber das
// novidades do projeto. Só guarda o endereço, o número, a hora, a página de onde
// veio e a versão do texto que a pessoa aceitou. Nada liga esses dados a região,
// local ou marcação.
//
// A resposta é a mesma para e-mail novo e repetido, para ninguém descobrir
// quem já está na lista. A lista só sai por /api/exportar-emails, com senha.
//
// Autor: Matheus C. Pestana

import { dentroDoLimite, ipDe, redis } from "./_redis.js";

/** Hash com um campo por e-mail (minúsculo): o valor é a hora, a origem, a versão do aceite e o WhatsApp, se houver. */
export const EMAILS = "emails";

/** Versão do texto de aceite mostrado ao lado do campo (src/componentes/AvisoEmail.tsx). */
const TERMO = "2026-10-08";

const TAMANHO_MAXIMO = 254;
/** WhatsApp no padrão internacional: +55, DDD (11 a 99) e 8 ou 9 dígitos. */
const FORMATO_WHATSAPP = /^\+55[1-9][1-9]\d{8,9}$/;
const FORMATO = /^[^\s@<>(),;:"\\[\]]+@[^\s@<>(),;:"\\[\]]+\.[^\s@<>(),;:"\\[\]]{2,}$/;

/** Tira máscara e o 55 do início; devolve "+55DDDNÚMERO", ou "" se não parece telefone do Brasil. */
function normalizarWhatsapp(bruto: string): string {
  let digitos = bruto.replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length >= 12) digitos = digitos.slice(2);
  const candidato = `+55${digitos.replace(/^0+/, "")}`;
  return FORMATO_WHATSAPP.test(candidato) ? candidato : "";
}

function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const texto = await request.text();
  if (texto.length > 1000) return json(400, { motivo: "Pedido malformado." });
  let corpo: { email?: unknown; whatsapp?: unknown; aceite?: unknown; site?: unknown; origem?: unknown };
  try {
    corpo = JSON.parse(texto);
  } catch {
    return json(400, { motivo: "Pedido malformado." });
  }
  const { email, whatsapp, aceite, site, origem } = corpo ?? {};
  // Campo escondido no formulário: gente não preenche, robô sim. Finge que deu certo.
  if (typeof site === "string" && site !== "") return json(200, { ok: true });
  if (aceite !== true) return json(400, { motivo: "Marque a caixa para aceitar receber os e-mails." });
  const endereco = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!endereco || endereco.length > TAMANHO_MAXIMO || !FORMATO.test(endereco)) {
    return json(400, { motivo: "Confira o e-mail: parece que falta alguma coisa." });
  }
  const informouWhatsapp = typeof whatsapp === "string" && whatsapp.trim() !== "";
  const numero = informouWhatsapp ? normalizarWhatsapp(whatsapp as string) : "";
  if (informouWhatsapp && !numero) return json(400, { motivo: "Confira o WhatsApp: use o DDD e o número." });
  const de = typeof origem === "string" && /^[a-z-]{1,20}$/.test(origem) ? origem : "site";
  // Só pedido válido chega ao Redis: o resto é recusado sem gastar comando.
  if (!(await dentroDoLimite(ipDe(request), "email", 8, 3600))) {
    return json(429, { motivo: "Muitas tentativas por aqui. Tente de novo mais tarde." });
  }
  try {
    const registro = { quando: new Date().toISOString(), origem: de, termo: TERMO, ...(numero ? { whatsapp: numero } : {}) };
    const novo = await redis().hsetnx(EMAILS, endereco, JSON.stringify(registro));
    if (!novo && numero) {
      // E-mail que já estava na lista e agora trouxe o WhatsApp: acrescenta o número, sem mexer na hora original.
      const atual = (await redis().hget(EMAILS, endereco)) as Record<string, unknown> | string | null;
      const anterior = (typeof atual === "string" ? JSON.parse(atual) : atual) ?? {};
      if (!anterior.whatsapp) await redis().hset(EMAILS, { [endereco]: JSON.stringify({ ...anterior, whatsapp: numero }) });
    }
  } catch {
    return json(500, { motivo: "Não deu para anotar agora. Tente de novo em instantes." });
  }
  return json(200, { ok: true });
}
