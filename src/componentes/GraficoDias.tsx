// Gráfico simples por dia para o painel interno: barras e linhas em SVG.
//
// Autor: Matheus C. Pestana

import { fmt } from "../dados";

/** null é dia que ainda não chegou: fica em branco, sem cair para zero. */
export type Serie = { nome: string; cor: string; tipo: "barra" | "linha"; valores: (number | null)[] };

const LARGURA = 900;
const ALTURA = 240;
const MARGEM = { topo: 12, direita: 12, baixo: 28, esquerda: 52 };

function tetoRedondo(maximo: number): number {
  if (maximo <= 4) return 4;
  const base = 10 ** Math.floor(Math.log10(maximo));
  const passo = [1, 2, 2.5, 5, 10].find((m) => m * base >= maximo) ?? 10;
  return passo * base;
}

export default function GraficoDias({ dias, series }: { dias: string[]; series: Serie[] }) {
  const largura = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const altura = ALTURA - MARGEM.topo - MARGEM.baixo;
  const teto = tetoRedondo(Math.max(0, ...series.flatMap((s) => s.valores.map((v) => v ?? 0))));
  const passoX = largura / Math.max(dias.length, 1);
  const y = (v: number) => MARGEM.topo + altura - (v / teto) * altura;
  const xCentro = (i: number) => MARGEM.esquerda + passoX * (i + 0.5);
  const barras = series.filter((s) => s.tipo === "barra");
  const larguraBarra = (passoX * 0.7) / Math.max(barras.length, 1);
  const cadaRotulo = Math.ceil(dias.length / 10);

  return (
    <figure className="grafico-dias">
      <figcaption>
        {series.map((s) => (
          <span key={s.nome}>
            <i className={s.tipo} style={{ background: s.cor }} /> {s.nome}
          </span>
        ))}
      </figcaption>
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={series.map((s) => s.nome).join(", ")}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={MARGEM.esquerda} x2={LARGURA - MARGEM.direita} y1={y(teto * f)} y2={y(teto * f)} className="grade" />
            <text x={MARGEM.esquerda - 8} y={y(teto * f) + 4} textAnchor="end">
              {fmt(Math.round(teto * f))}
            </text>
          </g>
        ))}
        {dias.map((d, i) =>
          i % cadaRotulo === 0 || i === dias.length - 1 ? (
            <text key={d} x={xCentro(i)} y={ALTURA - 8} textAnchor="middle">
              {d.slice(8, 10)}/{d.slice(5, 7)}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          switch (s.tipo) {
            case "barra": {
              const ordem = barras.indexOf(s);
              return (
                <g key={s.nome}>
                  {s.valores.map((v, i) =>
                    v === null ? null : (
                      <rect
                        key={dias[i]}
                        x={xCentro(i) - (larguraBarra * barras.length) / 2 + ordem * larguraBarra}
                        y={y(v)}
                        width={larguraBarra}
                        height={Math.max(0, MARGEM.topo + altura - y(v))}
                        fill={s.cor}
                        rx={2}
                      />
                    ),
                  )}
                </g>
              );
            }
            case "linha":
              return (
                <g key={s.nome}>
                  <polyline
                    points={s.valores.flatMap((v, i) => (v === null ? [] : [`${xCentro(i)},${y(v)}`])).join(" ")}
                    fill="none"
                    stroke={s.cor}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                  />
                  {s.valores.map((v, i) => (v === null ? null : <circle key={dias[i]} cx={xCentro(i)} cy={y(v)} r={3} fill={s.cor} />))}
                </g>
              );
            default: {
              const nunca: never = s.tipo;
              return nunca;
            }
          }
        })}
        {dias.map((d, i) => (
          <rect key={d} x={xCentro(i) - passoX / 2} y={MARGEM.topo} width={passoX} height={altura} className="area-dica">
            <title>
              {`${d.slice(8, 10)}/${d.slice(5, 7)}\n${series.map((s) => `${s.nome}: ${s.valores[i] === null ? "ainda não chegou" : fmt(s.valores[i] ?? 0)}`).join("\n")}`}
            </title>
          </rect>
        ))}
      </svg>
    </figure>
  );
}
