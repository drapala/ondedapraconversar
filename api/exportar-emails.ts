// Exportação da lista de e-mails, com o mesmo acesso do painel (/dash, link secreto). Só
// leitura. CSV por padrão (abre no Excel); ?formato=json devolve JSON.
//
// Autor: Matheus C. Pestana

import { exigirAcesso } from "./_acesso.js";
import { dia, redis } from "./_redis.js";
import { EMAILS } from "./email.js";

type Registro = { quando?: string; origem?: string; termo?: string; whatsapp?: string };

const CABECALHOS = { "cache-control": "no-store", "x-robots-tag": "noindex" };

/** Célula de CSV; o apóstrofo na frente impede o Excel de tratar o texto como fórmula. */
function celula(valor: string): string {
  const numeroValido = /^\+55\d{10,11}$/.test(valor);
  const seguro = !numeroValido && /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replaceAll('"', '""')}"`;
}

export async function GET(request: Request): Promise<Response> {
  const barrado = await exigirAcesso(request);
  if (barrado) return barrado;
  try {
    const bruto = ((await redis().hgetall(EMAILS)) ?? {}) as Record<string, string | Registro>;
    const linhas = Object.entries(bruto)
      .map(([email, v]) => ({ email, ...((typeof v === "string" ? JSON.parse(v) : v) as Registro) }))
      .sort((a, b) => (a.quando ?? "").localeCompare(b.quando ?? ""));
    if (new URL(request.url).searchParams.get("formato") === "json") {
      return new Response(JSON.stringify({ ok: true, total: linhas.length, emails: linhas }), {
        headers: { "content-type": "application/json; charset=utf-8", ...CABECALHOS },
      });
    }
    const csv = [
      "email,whatsapp,quando,origem,termo",
      ...linhas.map((l) => [l.email, l.whatsapp ?? "", l.quando ?? "", l.origem ?? "", l.termo ?? ""].map(celula).join(",")),
    ].join("\r\n");
    return new Response(`\uFEFF${csv}\r\n`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="emails-${dia()}.csv"`,
        ...CABECALHOS,
      },
    });
  } catch (erro) {
    return new Response(JSON.stringify({ ok: false, motivo: String(erro) }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8", ...CABECALHOS },
    });
  }
}
