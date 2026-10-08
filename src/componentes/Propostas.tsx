import conteudo from "../conteudo/propostas.json";
import FadeContent from "../efeitos/FadeContent";

type Proposta = { titulo: string; trecho: string; pagina: number };
type Tema = { chave: string; titulo: string; chamada: string; propostas: Proposta[] };
type Conteudo = { fonte: { titulo: string; url: string }; temas: Tema[] };

const { fonte, temas } = conteudo as Conteudo;

export default function Propostas() {
  return (
    <article className="pagina">
      <p className="sobretitulo">Propostas</p>
      <h1 className="titulo-campanha titulo-pagina">O que o Flávio vai fazer, tema por tema</h1>
      <p className="chamada">
        Para mostrar na conversa, com as palavras do próprio programa. Cada trecho tem a página, para quem quiser conferir.
      </p>
      <nav className="indice-conversas" aria-label="Temas">
        {temas.map((t) => (
          <a key={t.chave} href={`#/propostas/${t.chave}`}>
            {t.titulo}
          </a>
        ))}
      </nav>
      {temas.map((t) => (
        <FadeContent key={t.chave}>
          <section id={`proposta-${t.chave}`} className="bloco-conversa tema">
            <h2>{t.titulo}</h2>
            <p className="tema-chamada">{t.chamada}</p>
            <ol className="propostas">
              {t.propostas.map((p) => (
                <li key={p.trecho}>
                  <h3>{p.titulo}</h3>
                  <blockquote>“{p.trecho}”</blockquote>
                  <a className="pagina-fonte" href={`${fonte.url}#page=${p.pagina}`} target="_blank" rel="noreferrer">
                    Programa de governo, p. {p.pagina}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        </FadeContent>
      ))}
      <p className="miudo fonte-geral">
        Fonte:{" "}
        <a href={fonte.url} target="_blank" rel="noreferrer">
          {fonte.titulo}
        </a>
        .
      </p>
    </article>
  );
}
