// Página "Ouviu isso por aí?": o que circula sobre o Flávio e foi checado por
// agência de checagem, com o veredito dela e a resposta com fonte. A lista mora
// em src/conteudo/boatos.json, na ordem calculada por scripts/conferir_boatos.py.

import conteudo from "../conteudo/boatos.json";
import FadeContent from "../efeitos/FadeContent";

type Fonte = { texto: string; url: string };
type Trecho = { quem: string; texto: string; fonte: Fonte; pagina?: number };
type Circulacao = { veiculo: string; url: string; data: string; trecho: string };
type Boato = {
  id: string;
  alegacao: string;
  veredito: "falso" | "enganoso" | "falta contexto";
  resumo: string;
  comoResponder: string;
  verdade: Trecho[];
  circulacao: Circulacao[];
  proeminencia?: number;
};

const bruto = conteudo as unknown;
const BOATOS: Boato[] = Array.isArray(bruto) ? bruto : ((bruto as { boatos?: Boato[] }).boatos ?? []);

const ROTULO: Record<Boato["veredito"], string> = { falso: "Falso", enganoso: "Enganoso", "falta contexto": "Falta contexto" };

const dataBr = (iso: string) => iso.split("-").reverse().join("/");

export default function Boatos() {
  return (
    <article className="pagina">
      <p className="sobretitulo">Ouviu isso por aí?</p>
      <h1 className="titulo-campanha titulo-pagina">O que está circulando sobre o Flávio, e o que é verdade</h1>
      <p className="chamada">
        Cada item foi checado por agência de checagem ou julgado pela Justiça Eleitoral, e o veredito é o de quem checou. Abaixo vem
        o que diz a fonte, com o link, para mostrar na conversa com calma.
      </p>
      <nav className="indice-conversas" aria-label="Alegações">
        {BOATOS.map((b) => (
          <a key={b.id} href={`#/boatos/${b.id}`}>
            {b.alegacao}
          </a>
        ))}
      </nav>
      {BOATOS.map((b) => (
        <FadeContent key={b.id}>
          <section id={`boato-${b.id}`} className="bloco-conversa tema">
            <p className={`selo ${b.veredito === "falso" ? "igual" : ""}`}>{ROTULO[b.veredito]}</p>
            <h2>“{b.alegacao}”</h2>
            <p className="tema-chamada">{b.resumo}</p>
            <div className="material">
              {b.verdade.map((t) => (
                <figure key={t.texto} className="citacao nosso">
                  <blockquote>“{t.texto}”</blockquote>
                  <figcaption>
                    {!t.fonte.texto.startsWith(t.quem) && <b>{t.quem}. </b>}
                    <a href={t.pagina ? `${t.fonte.url}#page=${t.pagina}` : t.fonte.url} target="_blank" rel="noreferrer">
                      {t.fonte.texto}
                    </a>
                  </figcaption>
                </figure>
              ))}
              <h3>Como responder na conversa</h3>
              <p>{b.comoResponder}</p>
              <p className="miudo">
                Quem checou:{" "}
                {b.circulacao.map((c, i) => (
                  <span key={c.url}>
                    {i > 0 && " · "}
                    <a href={c.url} target="_blank" rel="noreferrer">
                      {c.veiculo}, {dataBr(c.data)}
                    </a>
                  </span>
                ))}
              </p>
            </div>
          </section>
        </FadeContent>
      ))}
    </article>
  );
}
