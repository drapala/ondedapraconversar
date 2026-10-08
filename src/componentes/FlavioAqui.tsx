// Quanto o Flávio já tem por aqui: porcentagem dos votos válidos no 1º turno,
// com o número absoluto ao lado e uma barra com a marca da metade.
//
// Autor: Matheus C. Pestana

import type { CSSProperties } from "react";
import { fmt, fmtPct, parteDoFlavio, type Votos } from "../dados";

const FOLGA = 0.65;

export default function FlavioAqui({ votos: v, onde }: { votos: Votos; onde: "perto" | "local" }) {
  const parte = parteDoFlavio(v);
  if (parte === null) return null;
  return (
    <div className="flavio-aqui">
      <p className="flavio-aqui-numero">
        <span>{onde === "perto" ? "Flávio por aqui teve" : "Flávio neste local teve"}</span>
        <b>{fmtPct(parte)}</b>
        <small>
          ({fmt(v.flavio)} {v.flavio === 1 ? "voto" : "votos"})
        </small>
      </p>
      <div
        className="flavio-aqui-barra"
        role="img"
        aria-label={`${fmtPct(parte)} dos votos válidos para o Flávio`}
        style={{ "--parte": `${parte * 100}%` } as CSSProperties}
      >
        <i />
      </div>
      <p className="flavio-aqui-nota">
        válidos no primeiro turno.
        {parte >= FOLGA && " Flávio já tem folga aqui. A conversa rende mais onde a disputa está apertada."}
      </p>
    </div>
  );
}
