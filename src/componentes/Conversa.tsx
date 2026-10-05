import { COMO_PUXAR, type Citacao, type Ficha, type Fonte } from "../fichas";
import Estrela from "./Estrela";

function LinkFonte({ fonte }: { fonte: Fonte }) {
  return (
    <a href={fonte.url} target="_blank" rel="noreferrer">
      {fonte.texto}
    </a>
  );
}

function Trecho({ citacao, lula }: { citacao: Citacao; lula?: boolean }) {
  return (
    <figure className={lula ? "citacao lula" : "citacao"}>
      <blockquote>“{citacao.texto}”</blockquote>
      <figcaption>
        <b>{citacao.quem}.</b> <LinkFonte fonte={citacao.fonte} />
      </figcaption>
    </figure>
  );
}

export default function Conversa({ ficha, nivel = 3 }: { ficha: Ficha; nivel?: 3 | 4 }) {
  const Sub = nivel === 3 ? "h3" : "h4";
  switch (ficha.tipo) {
    case "candidato":
      return (
        <div className="material">
          <p className="abertura-ficha">{ficha.abertura}</p>
          <Sub>O que já combina</Sub>
          {ficha.pontes.map((p) => (
            <section key={p.tema} className="ponte" aria-label={p.tema}>
              <div className="em-comum">
                <Estrela tamanho={20} />
                <span>
                  <span className={p.tipo === "igual" ? "selo igual" : "selo"}>{p.tipo === "igual" ? "Igual" : "Perto"}</span>
                  {p.emComum}
                </span>
              </div>
              <div className="par-citacoes">
                <Trecho citacao={p.candidato} />
                <Trecho citacao={p.lula} lula />
              </div>
            </section>
          ))}
          <Sub>Como puxar a conversa</Sub>
          <ol className="roteiro">
            {COMO_PUXAR.map((linha) => (
              <li key={linha}>{linha}</li>
            ))}
          </ol>
        </div>
      );
    case "voto":
      return (
        <div className="material">
          <p className="titulo-campanha frase-guia">{ficha.frase}</p>
          <p className="apoio">{ficha.apoio}</p>
          <Sub>Como funciona</Sub>
          {ficha.explicacao.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <Sub>Um jeito de conversar</Sub>
          <ol className="roteiro">
            {ficha.roteiro.map((linha) => (
              <li key={linha}>{linha}</li>
            ))}
          </ol>
          <p className="cuidado">
            <b>Cuidado.</b> {ficha.cuidado}
          </p>
        </div>
      );
    default: {
      const nunca: never = ficha;
      return nunca;
    }
  }
}
