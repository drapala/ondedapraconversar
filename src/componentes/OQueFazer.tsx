// Página "O que fazer": orientação para quem quer atuar, do mapa ao grupo de
// WhatsApp, da conversa olho no olho às redes.
//
// Autor: Matheus C. Pestana

import { ENDERECO_SITE, IconeWhatsApp, linkWhatsApp } from "./Compartilhar";

const CONVITE = [
  "Tô montando um grupo pra conversar com a vizinhança e buscar voto pro Flávio no segundo turno.",
  `Antes, dá uma olhada no mapa de quantos votos dá pra conquistar perto de você: ${ENDERECO_SITE}`,
  "Bora junto? Se topar, me chama que eu te coloco no grupo.",
].join("\n\n");

export default function OQueFazer() {
  return (
    <article className="pagina corpo o-que-fazer">
      <p className="sobretitulo">O que fazer</p>
      <h1 className="titulo-campanha titulo-pagina">Essa eleição se ganha de dois jeitos: olho no olho e nas redes.</h1>
      <p className="chamada">
        Os votos estão perto de você. No primeiro turno, muita gente votou em branco, anulou, ficou em casa ou escolheu outro nome. Dá pra
        conversar com cada uma dessas pessoas, e quem vai fazer isso somos nós.
      </p>

      <ol className="passos-acao">
        <li>
          <h2>Olhe o mapa da sua região</h2>
          <p>
            Digite onde você mora, trabalha ou estuda e veja quantos votos dá pra conquistar ali perto, local de votação por local de
            votação. O número grande é o tamanho da tarefa. A lista mostra por onde começar: primeiro onde tem mais gente pra conversar.
          </p>
          <a className="botao" href="#/perto">
            Abrir o mapa
          </a>
        </li>
        <li>
          <h2>Monte um grupo no WhatsApp</h2>
          <p>
            Chame quem vota no Flávio e está disposto a trabalhar de verdade até o dia 25: família, vizinhos, gente do trabalho, da igreja
            ou do clube, do time de futebol. Dê ao grupo o nome do bairro ou da cidade, tipo “Conversa pelo Flávio · Vila Nova”.
          </p>
          <p className="miudo passos-aviso">
            Só entra quem topar: adicionar quem não pediu afasta as pessoas. E nada de mensagem em massa, que a Justiça Eleitoral proíbe.
          </p>
        </li>
        <li>
          <h2>Divida as tarefas</h2>
          <p>
            Grupo que funciona tem combinado. Quem conversa na feira, quem fica no ponto de ônibus, quem passa na saída da escola ou do
            culto, quem cuida das redes, quem chama mais gente pro grupo. Marquem dia, hora e lugar.
          </p>
          <p>
            No mapa, cada um toca em “Vou conversar por aqui” no local escolhido. Assim ninguém fica sozinho e ninguém repete o mesmo
            quarteirão.
          </p>
        </li>
        <li>
          <h2>Converse olho no olho</h2>
          <p>
            Chegue pra ouvir antes de falar. Pergunte o que está pesando: o preço no mercado, a saúde, o emprego, a segurança. Depois
            mostre o que não mudou e o que o Flávio vai fazer, com a proposta certa na mão.
          </p>
          <p>
            Em <a href="#/conversas">Conversas</a> tem o que dizer pra cada tipo de eleitor. Em <a href="#/propostas">Propostas</a>, o
            que está no programa, com a página. Se aparecer um boato, em <a href="#/boatos">Ouviu isso?</a> tem o que é verdade, com a
            checagem. E nada de briga: quem sai irritado da conversa não muda o voto.
          </p>
        </li>
        <li>
          <h2>Dispute as redes</h2>
          <p>
            A conversa também acontece no grupo da família, no Instagram, no TikTok, no Facebook. Compartilhe o que é verdade e tem fonte,
            responda com calma e não deixe mentira sem resposta. Um vídeo curto contando por que você vota no Flávio vale muito.
          </p>
          <p className="miudo passos-aviso">
            Nada de notícia falsa. E não pague pra impulsionar post: pela lei eleitoral, só candidato e partido podem.
          </p>
        </li>
        <li>
          <h2>Fique de olho no calendário</h2>
          <p>
            A conversa na rua vai até sábado, 24 de outubro, às 22h. No domingo, dia 25, é dia de votar: nada de abordar eleitor nem fazer
            campanha. Vote cedo e com tranquilidade.
          </p>
        </li>
      </ol>

      <section className="o-que-fazer-fim">
        <p className="titulo-campanha">
          Vamos buscar cada voto e tirar a diferença que falta. Com o empenho de todos, a gente leva o Flávio à vitória no dia 25.
        </p>
        <div className="o-que-fazer-botoes">
          <a className="botao principal largo" href="#/perto">
            Ver o mapa da minha região
          </a>
          <a className="botao botao-whatsapp largo" href={linkWhatsApp(CONVITE)} target="_blank" rel="noopener noreferrer">
            <IconeWhatsApp />
            Chamar gente pro grupo
          </a>
        </div>
      </section>
    </article>
  );
}
