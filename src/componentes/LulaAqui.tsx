// Quanto o Lula já tem por aqui: porcentagem dos votos válidos no 1º turno,
// com o número absoluto ao lado e uma barra com a marca da metade.
//
// Autor: Matheus C. Pestana

import type { CSSProperties } from "react";
import { fmt, fmtPct, parteDoLula, type Votos } from "../dados";

const FOLGA = 0.65;

export default function LulaAqui({ votos: v, onde }: { votos: Votos; onde: "perto" | "local" }) {
  const parte = parteDoLula(v);
  if (parte === null) return null;
  return (
    <div className="lula-aqui">
      <p className="lula-aqui-numero">
        <span>{onde === "perto" ? "O Lula por aqui" : "O Lula neste local"}</span>
        <b>{fmtPct(parte)}</b>
        <small>
          ({fmt(v.lula)} {v.lula === 1 ? "voto" : "votos"})
        </small>
      </p>
      <div
        className="lula-aqui-barra"
        role="img"
        aria-label={`${fmtPct(parte)} dos votos válidos para o Lula`}
        style={{ "--parte": `${parte * 100}%` } as CSSProperties}
      >
        <i />
      </div>
      <p className="lula-aqui-nota">
        dos votos válidos no 1º turno.
        {parte >= FOLGA && " O Lula já tem folga aqui. A conversa rende mais onde a disputa está apertada."}
      </p>
    </div>
  );
}
