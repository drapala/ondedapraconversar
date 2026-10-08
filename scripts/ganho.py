"""Ganho esperado de votos para o Flávio em cada região.

    ganho = soma de peso_g * N_g  +  pesoRetorno * max(0, bolsonaro2022 - flavio)

N_g são os grupos do 1º turno de 2026 na região (abstenção, brancos, nulos,
votos no Lula e em cada um dos outros). Os pesos são os de
dados/transferencia_2022.json (scripts/transferencia_2022.py): quanto de cada
grupo de 2022 foi para o Bolsonaro no 2º turno. É estimativa por lugar, não
por pessoa.

Uso (aplica em public/dados sem remontar tudo):
    python3 scripts/ganho.py
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "public" / "dados"
PESOS = RAIZ / "dados" / "transferencia_2022.json"
EVIDENCIA = RAIZ / "evidences" / "virar-as-avessas-2026-10-08" / "f9-ganho.json"
# Coluna do ganho nas linhas de onde/{uf}-{município}.json (depois de lulaDomina).
COLUNA_ONDE = 16


def carregar_pesos() -> dict:
    return json.loads(PESOS.read_text(encoding="utf-8"))


def votaram_2026(votos: dict) -> int:
    return votos["flavio"] + votos["lula"] + sum(votos["outros"].values()) + votos["brancos"] + votos["nulos"]


def ligacao_plausivel(bolsonaro2022: int | None, votos: dict) -> bool:
    """A ligação com 2022 só vale se o Bolsonaro de 2022 cabe em quem votou ali agora (ligação muitos-para-um infla)."""
    return bool(bolsonaro2022) and bolsonaro2022 <= votaram_2026(votos)


def ganho_esperado(votos: dict, bolsonaro2022: int | None, pesos: dict) -> int:
    p = pesos["pesos"]
    total = (
        p["abstencao"] * votos["abstencao"]
        + p["brancos"] * votos["brancos"]
        + p["nulos"] * votos["nulos"]
        + p["lula"] * votos["lula"]
    )
    for numero, qtd in votos["outros"].items():
        total += p.get(numero, p["demais"]) * qtd
    if ligacao_plausivel(bolsonaro2022, votos):
        total += pesos.get("pesoRetorno", 0) * max(0, bolsonaro2022 - votos["flavio"])
    return round(total)


def spearman(a: list[float], b: list[float]) -> float:
    def postos(x: list[float]) -> list[float]:
        ordem = sorted(range(len(x)), key=lambda i: x[i])
        r = [0.0] * len(x)
        i = 0
        while i < len(ordem):
            j = i
            while j + 1 < len(ordem) and x[ordem[j + 1]] == x[ordem[i]]:
                j += 1
            for k in range(i, j + 1):
                r[ordem[k]] = (i + j) / 2
            i = j + 1
        return r

    ra, rb = postos(a), postos(b)
    ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    va = sum((x - ma) ** 2 for x in ra) ** 0.5
    vb = sum((y - mb) ** 2 for y in rb) ** 0.5
    return cov / (va * vb)


def main() -> None:
    pesos = carregar_pesos()
    sensibilidade = {
        **pesos,
        "pesos": {
            **pesos["pesos"],
            "55": pesos["pesos"]["70"],
            "14": pesos["pesos"]["70"],
        },
    }
    versao = hashlib.sha256()
    por_id: dict[str, dict] = {}
    ganhos, ganhos_alt, ates = [], [], []
    for caminho in sorted((SAIDA / "celulas").glob("*.json")):
        lista = json.loads(caminho.read_text(encoding="utf-8"))
        for r in lista:
            v = r.get("votos")
            if not v:
                continue
            v["ganho"] = ganho_esperado(v, r.get("bolsonaro2022"), pesos)
            if v["ganho"] > r["eleitores"]:
                raise SystemExit(f"ganho maior que o eleitorado em {r['id']}")
            por_id[r["id"]] = r
            ganhos.append(v["ganho"])
            ganhos_alt.append(ganho_esperado(v, r.get("bolsonaro2022"), sensibilidade))
            ates.append(v["ate"])
        texto = json.dumps(lista, ensure_ascii=False, separators=(",", ":"))
        caminho.write_text(texto, encoding="utf-8")
        versao.update(caminho.name.encode() + texto.encode())

    for caminho in sorted((SAIDA / "onde").glob("*-*.json")):
        linhas = json.loads(caminho.read_text(encoding="utf-8"))
        for linha in linhas:
            ganho = por_id[linha[0]]["votos"]["ganho"]
            if len(linha) > COLUNA_ONDE:
                linha[COLUNA_ONDE] = ganho
            else:
                linha.append(ganho)
        texto = json.dumps(linhas, ensure_ascii=False, separators=(",", ":"))
        caminho.write_text(texto, encoding="utf-8")
        versao.update(caminho.name.encode() + texto.encode())

    exemplos = json.loads((SAIDA / "exemplo.json").read_text(encoding="utf-8"))
    for r in exemplos:
        r["votos"]["ganho"] = ganho_esperado(r["votos"], None, pesos)
    texto = json.dumps(exemplos, ensure_ascii=False, separators=(",", ":"))
    (SAIDA / "exemplo.json").write_text(texto, encoding="utf-8")
    versao.update(texto.encode())

    indice = json.loads((SAIDA / "indice.json").read_text(encoding="utf-8"))
    indice["brasil"]["ganho"] = sum(ganhos)
    versao.update(indice["versao"].encode())
    indice["versao"] = versao.hexdigest()[:12]
    (SAIDA / "indice.json").write_text(
        json.dumps(indice, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    resultado = {
        "regioes": len(ganhos),
        "ganhoBrasil": sum(ganhos),
        "spearmanGanhoXSensibilidade": round(spearman(ganhos, ganhos_alt), 4),
        "spearmanGanhoXAte": round(spearman(ganhos, ates), 4),
        "versao": indice["versao"],
    }
    EVIDENCIA.write_text(
        json.dumps(resultado, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(resultado)


if __name__ == "__main__":
    main()
