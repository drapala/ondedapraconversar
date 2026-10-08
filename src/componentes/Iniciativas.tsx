// Página "Iniciativas": canais e sites oficiais da campanha do Flávio Bolsonaro
// e do PL para o segundo turno, mais o mapa deste site (independente). A lista mora em src/conteudo/iniciativas.json.
//
// Autor: Matheus C. Pestana

import { useMemo } from "react";
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

/** Embaralha a cópia (Fisher-Yates): cada visita vê uma ordem, e todas as iniciativas podem abrir a lista. */
function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export default function Iniciativas() {
  const ordem = useMemo(() => embaralhar(itens), []);
  return (
    <article className="pagina corpo">
      <p className="sobretitulo">Iniciativas</p>
      <h1 className="titulo-campanha titulo-pagina">Tem muita gente trabalhando por esse voto. Entre numa dessas.</h1>
      <p className="chamada">
        Canais e sites oficiais da campanha do Flávio e do PL, e o mapa deste site, que é independente e não pertence à campanha. Escolha o seu jeito de ajudar até o dia 25 e chame mais gente.
      </p>

      <ul className="iniciativas">
        {ordem.map((item) => (
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
