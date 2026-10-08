// Página "Iniciativas": canais, grupos e sites de quem também está trabalhando
// pelo voto no segundo turno. A lista mora em src/conteudo/iniciativas.json.
//
// Autor: Matheus C. Pestana

import conteudo from "../conteudo/iniciativas.json";
import FadeContent from "../efeitos/FadeContent";
import { IconeWhatsApp } from "./Compartilhar";

type Item = {
  chave: string;
  tipo: string;
  titulo: string;
  descricao: string;
  acao: string;
  url: string;
  exibir?: string;
  whatsapp?: boolean;
  interno?: boolean;
};

const { itens } = conteudo as { itens: Item[] };

export default function Iniciativas() {
  return (
    <article className="pagina corpo">
      <p className="sobretitulo">Iniciativas</p>
      <h1 className="titulo-campanha titulo-pagina">Tem muita gente trabalhando por esse voto. Entre numa dessas.</h1>
      <p className="chamada">
        Canais, grupos e sites de quem também quer virar voto até o dia 25. Escolha o seu jeito de ajudar e chame mais gente.
      </p>

      <ul className="iniciativas">
        {itens.map((item) => (
          <li key={item.chave}>
            <FadeContent>
              <p className="iniciativa-tipo">{item.tipo}</p>
              <h2>{item.titulo}</h2>
              <p>{item.descricao}</p>
              <a
                className={item.whatsapp ? "botao botao-whatsapp" : "botao"}
                href={item.url}
                {...(item.interno ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              >
                {item.whatsapp && <IconeWhatsApp />}
                {item.acao}
              </a>
              {item.exibir && <span className="iniciativa-endereco">{item.exibir}</span>}
            </FadeContent>
          </li>
        ))}
      </ul>

      <section className="o-que-fazer-fim">
        <p className="titulo-campanha">Não sabe por onde começar? A gente mostra o caminho.</p>
        <div className="o-que-fazer-botoes">
          <a className="botao principal largo" href="#/o-que-fazer">
            Ver o que fazer
          </a>
        </div>
      </section>
    </article>
  );
}
