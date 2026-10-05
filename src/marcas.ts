// Contagem compartilhada de quem vai conversar em cada região.
// Sem conta e sem login: um aparelho conta como uma pessoa.

const CHAVE_APARELHO = "odpc-aparelho";
const CHAVE_MINHAS = "odpc-minhas-regioes";

export function aparelho(): string {
  let id = localStorage.getItem(CHAVE_APARELHO);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CHAVE_APARELHO, id);
  }
  return id;
}

export function minhasRegioes(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHAVE_MINHAS) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function guardarMinhas(ids: Set<string>) {
  localStorage.setItem(CHAVE_MINHAS, JSON.stringify([...ids]));
}

export async function contar(ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  try {
    const resp = await fetch(`/api/marcas?regioes=${encodeURIComponent(ids.join(","))}`);
    if (!resp.ok) return {};
    return (await resp.json()) as Record<string, number>;
  } catch {
    return {};
  }
}

export type Resposta = { ok: true; total: number } | { ok: false; motivo: string };

export async function marcar(regiao: string, vou: boolean): Promise<Resposta> {
  try {
    const resp = await fetch("/api/marcas", {
      method: vou ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ regiao, aparelho: aparelho() }),
    });
    const corpo = (await resp.json()) as { total?: number; motivo?: string };
    if (!resp.ok || typeof corpo.total !== "number") {
      return { ok: false, motivo: corpo.motivo ?? "Não deu para marcar agora. Tente de novo em instantes." };
    }
    const minhas = minhasRegioes();
    if (vou) minhas.add(regiao);
    else minhas.delete(regiao);
    guardarMinhas(minhas);
    return { ok: true, total: corpo.total };
  } catch {
    return { ok: false, motivo: "Sem conexão com o servidor. A marca não foi registrada." };
  }
}
