import type { Fase } from "../calendario";
import FadeContent from "../efeitos/FadeContent";
import { FICHAS } from "../fichas";
import Conversa from "./Conversa";

export default function Conversas({ fase }: { fase: Fase }) {
  const consulta = fase === "votacao" || fase === "encerrada";
  return (
    <article className="pagina">
      <p className="sobretitulo">Conversas</p>
      <h1 className="titulo-campanha titulo-pagina">O que falar na calçada, na praça, no ponto de ônibus</h1>
      <p className="chamada">
        {consulta
          ? "Material de consulta do que foi conversado até aqui."
          : "Cada pessoa chegou ao segundo turno de um jeito. Aqui tem o que dizer para cada uma, com a proposta certa na mão."}
      </p>
      <p className="chamada">
        <a href="#/boatos">Ouviu alguma coisa sobre o Flávio por aí? Veja o que é verdade.</a>
      </p>
      <nav className="indice-conversas" aria-label="Conversas">
        {FICHAS.map((f) => (
          <a key={f.chave} href={`#/conversas/${f.chave}`}>
            {f.titulo}
          </a>
        ))}
      </nav>
      {FICHAS.map((f) => (
        <FadeContent key={f.chave}>
          <section id={`conversa-${f.chave}`} className="bloco-conversa">
            <h2>{f.titulo}</h2>
            <Conversa ficha={f} />
          </section>
        </FadeContent>
      ))}
    </article>
  );
}
