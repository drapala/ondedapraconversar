// Pedido de e-mail (e, se a pessoa quiser, WhatsApp) para avisar das novidades
// do projeto. Quem aceitou uma vez não vê o formulário de novo (o aparelho lembra).
//
// Autor: Matheus C. Pestana

import { useState, type FormEvent } from "react";

const CHAVE = "odpc-email-anotado";

function jaAnotado(): boolean {
  try {
    return localStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}

type Props = { origem: string };

export default function AvisoEmail({ origem }: Props) {
  const [anotado, setAnotado] = useState(jaAnotado);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [comWhatsapp, setComWhatsapp] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const campos = e.currentTarget.elements;
    const email = (campos.namedItem("email") as HTMLInputElement).value;
    const whatsapp = (campos.namedItem("whatsapp") as HTMLInputElement).value;
    const aceite = (campos.namedItem("aceite") as HTMLInputElement).checked;
    const site = (campos.namedItem("site") as HTMLInputElement).value;
    setOcupado(true);
    setErro(null);
    try {
      const resp = await fetch("/api/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, whatsapp, aceite, site, origem }),
      });
      const corpo = (await resp.json().catch(() => ({}))) as { motivo?: string };
      if (!resp.ok) {
        setErro(corpo.motivo ?? "Não deu para anotar agora. Tente de novo em instantes.");
        return;
      }
      try {
        localStorage.setItem(CHAVE, "1");
      } catch {
        // Sem armazenamento, o formulário só volta a aparecer na próxima visita.
      }
      setAnotado(true);
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo em instantes.");
    } finally {
      setOcupado(false);
    }
  }

  if (anotado) {
    return (
      <section className="aviso-email" aria-live="polite">
        <p className="compartilhar-titulo">Anotado. Obrigado por estar nessa.</p>
        <p className="compartilhar-texto">A gente escreve quando tiver novidade.</p>
      </section>
    );
  }

  return (
    <section className="aviso-email" aria-labelledby="aviso-email-titulo">
      <p id="aviso-email-titulo" className="compartilhar-titulo">
        A conversa continua.
      </p>
      <p className="compartilhar-texto">
        Deixe seu e-mail e a gente avisa quando tiver novidade. Se quiser, deixe também o seu WhatsApp. Nada de spam, e ninguém mais
        recebe os seus dados.
      </p>
      <form onSubmit={enviar}>
        <div className="aviso-email-campos">
          <label htmlFor="aviso-email" className="sr">
            Seu e-mail
          </label>
          <input
            id="aviso-email"
            className="campo"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            required
            placeholder="Seu e-mail"
          />
          <label htmlFor="aviso-whatsapp" className="sr">
            Seu WhatsApp, se quiser
          </label>
          <input
            id="aviso-whatsapp"
            className="campo"
            type="tel"
            name="whatsapp"
            inputMode="tel"
            autoComplete="tel"
            maxLength={24}
            placeholder="WhatsApp, se quiser (com DDD)"
            onChange={(e) => setComWhatsapp(e.target.value.trim() !== "")}
          />
        </div>
        <label className="aviso-email-aceite">
          <input type="checkbox" name="aceite" required />
          <span>
            {comWhatsapp
              ? "Aceito receber e-mails e mensagens no WhatsApp da iniciativa Onde Dá Pra Conversar sobre este projeto."
              : "Aceito receber e-mails da iniciativa Onde Dá Pra Conversar sobre este projeto."}
          </span>
        </label>
        {/* Isca contra robô: pessoa não vê nem preenche. */}
        <input className="isca" type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <button type="submit" className="botao principal largo aviso-email-botao" disabled={ocupado}>
          Quero receber
        </button>
        <p className="miudo aviso-email-nota">Toda mensagem vai ter um jeito simples de sair.</p>
        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}
      </form>
    </section>
  );
}
