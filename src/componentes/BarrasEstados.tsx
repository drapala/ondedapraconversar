// Barras horizontais empilhadas para o painel interno: uma linha por estado
// (ou uma só linha para o país), cada parte com sua cor.
//
// Autor: Matheus C. Pestana

import { fmt } from "../dados";

export type Parte = { nome: string; cor: string };
export type Linha = { rotulo: string; valores: number[]; nota?: string };

type Props = {
  partes: Parte[];
  linhas: Linha[];
  /** "total": barras proporcionais ao maior total; "cem": cada linha ocupa 100%. */
  escala?: "total" | "cem";
};

const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default function BarrasEstados({ partes, linhas, escala = "total" }: Props) {
  const maior = Math.max(1, ...linhas.map((l) => l.valores.reduce((s, v) => s + v, 0)));
  return (
    <figure className="barras-estados">
      {partes.length > 1 && (
        <figcaption>
          {partes.map((p) => (
            <span key={p.nome}>
              <i style={{ background: p.cor }} /> {p.nome}
            </span>
          ))}
        </figcaption>
      )}
      <div className="barras-linhas">
        {linhas.map((l) => {
          const total = l.valores.reduce((s, v) => s + v, 0);
          const base = escala === "cem" ? Math.max(total, 1) : maior;
          return (
            <div className="barras-linha" key={l.rotulo}>
              <span className="barras-rotulo">{l.rotulo}</span>
              <span className="barras-trilho">
                {l.valores.map((v, i) =>
                  v > 0 ? (
                    <span
                      key={partes[i].nome}
                      className="barras-parte"
                      style={{ width: `${(v / base) * 100}%`, background: partes[i].cor }}
                      title={`${l.rotulo} · ${partes[i].nome}: ${fmt(v)} (${pct(v / Math.max(total, 1))})`}
                    />
                  ) : null,
                )}
              </span>
              <span className="barras-valor">{l.nota ?? fmt(total)}</span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
