// Bloco que chama quem quer atuar: mandar o site e montar um grupo de WhatsApp na
// cidade. As mensagens levam o número de votos da busca e o ponto arredondado a
// uns 500 m, nunca o endereço de quem compartilha.
//
// Autor: Matheus C. Pestana

import { fmt } from "../dados";
import { INSTAGRAM_ARROBA, INSTAGRAM_URL, IconeInstagram } from "./Instagram";

export const ENDERECO_SITE = "https://www.ondedapraconversar.com.br";

/** Abre o WhatsApp com o texto pronto, para a pessoa escolher pra quem mandar. */
export const linkWhatsApp = (texto: string) => `https://wa.me/?text=${encodeURIComponent(texto)}`;

export function IconeWhatsApp({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.67.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z"
      />
    </svg>
  );
}

function mensagem(votosPerto: number | null, ancora: string | null, lugar: string | null): string {
  const abertura =
    votosPerto && votosPerto > 0
      ? `Olha só: perto de onde eu estou, dá pra tentar virar até ${fmt(votosPerto)} votos para o Lula no segundo turno.`
      : "Tem gente perto de você que ainda pode escolher o Lula no segundo turno.";
  return [
    abertura,
    "O site *Onde dá pra conversar* mostra no mapa onde estão essas pessoas, com os números de cada local de votação, e dá dicas de como puxar uma boa conversa.",
    ancora ? `Veja aqui: ${ENDERECO_SITE}/#/perto/${ancora}` : `Veja o seu bairro: ${ENDERECO_SITE}`,
    `Bora juntar uma turma ${lugar ? `aqui em ${lugar}` : "aqui"} e sair pra conversar? Quem topar, me chama que eu te coloco no grupo.`,
  ].join("\n\n");
}

type Props = { votosPerto: number | null; ancora: string | null; lugar: string | null };

export default function Compartilhar({ votosPerto, ancora, lugar }: Props) {
  const ondeGrupo = lugar ? `em ${lugar}` : "na sua cidade";
  return (
    <section className="compartilhar">
      <p className="compartilhar-titulo">Quanto mais gente conversando, melhor.</p>
      <p className="compartilhar-texto">Em turma a conversa rende mais. Junte quem você conhece e combinem de sair juntos.</p>

      <h3 className="grupo-titulo">Monte um grupo {ondeGrupo}</h3>
      <ol className="grupo-passos">
        <li>
          <b>Crie um grupo no WhatsApp</b> com quem topa conversar: família, vizinhos, gente do trabalho, da igreja, do futebol.
          Um nome simples ajuda, tipo “Conversa pelo Lula · {lugar ?? "seu bairro"}”.
        </li>
        <li>
          <b>Mande o site no grupo.</b> O botão aqui embaixo já leva o link com o mapa {ancora ? "deste ponto" : "do seu bairro"}.
        </li>
        <li>
          <b>Combinem dia, hora e lugar.</b> Cada um marca “Vou conversar por aqui” no mapa. Assim ninguém fica sozinho e ninguém
          repete o mesmo quarteirão.
        </li>
      </ol>
      <p className="grupo-nota">
        Só entra no grupo quem topar. Nada de adicionar quem não pediu nem de mandar mensagem em massa.
      </p>

      <a
        className="botao botao-whatsapp largo"
        href={linkWhatsApp(mensagem(votosPerto, ancora, lugar))}
        target="_blank"
        rel="noopener noreferrer"
      >
        <IconeWhatsApp />
        Mandar no WhatsApp
      </a>
      <a className="botao botao-instagram largo" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
        <IconeInstagram tamanho={22} />
        Seguir {INSTAGRAM_ARROBA}
      </a>
    </section>
  );
}
