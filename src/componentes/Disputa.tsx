import { disputa, fmt, type Votos } from "../dados";

const votos = (n: number) => `${fmt(n)} ${n === 1 ? "voto" : "votos"}`;

export default function Disputa({ votos: v }: { votos: Votos }) {
  const d = disputa(v);
  if (d.lula + d.flavio === 0) return null;

  if (d.diferenca === 0) {
    return (
      <p className="disputa">
        No primeiro turno, Flávio e Lula empataram por aqui, com <b>{fmt(d.flavio)}</b> cada. Entre branco, nulo e quem não foi votar,
        são <b>{fmt(d.abertos)}</b>. É aqui que a eleição se decide.
      </p>
    );
  }

  if (d.flavioNaFrente) {
    return (
      <p className="disputa">
        No primeiro turno, o Flávio fez <b>{votos(d.diferenca)}</b> a mais que o Lula por aqui ({fmt(d.flavio)} a {fmt(d.lula)}). E
        ainda tem <b>{fmt(d.abertos)}</b> entre branco, nulo e quem não foi votar. Cada um que vier aumenta a vantagem.
      </p>
    );
  }

  return (
    <p className="disputa atras">
      No primeiro turno, o Lula fez <b>{votos(d.diferenca)}</b> a mais que o Flávio por aqui ({fmt(d.lula)} a {fmt(d.flavio)}). Só entre
      branco, nulo e quem não foi votar, são <b>{fmt(d.abertos)}</b>.{" "}
      {d.abertos > d.diferenca
        ? "Se essa gente escolher o Flávio, a região muda de lado."
        : "Cada voto conquistado aqui encurta a distância."}
    </p>
  );
}
