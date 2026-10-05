"""
Confere se cada trecho citado nas fichas é texto literal da página do PDF indicada.

Lê dados/fichas/propostas.json e dados/fichas/pontes_extra.json, extrai a página
com pdftotext (sem -layout), normaliza e exige que o trecho normalizado seja
substring do texto normalizado da página. Com --fichas-ts, confere também as
citações de src/fichas.ts (chamadas como cury("trecho", "68") ou "16-17";
quando a citação atravessa páginas, o rodapé entre elas é descartado).

Uso: python3 scripts/conferir_citacoes.py [--fichas-ts]
     python3 scripts/conferir_citacoes.py --buscar zema "regex"

Autor: Matheus C. Pestana
"""

import json
import re
import subprocess
import sys
import unicodedata
from functools import lru_cache
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PROGRAMAS = RAIZ / "dados" / "bruto" / "programas"
FICHAS = RAIZ / "dados" / "fichas"

TROCAS = {
    "\u201c": '"', "\u201d": '"', "\u201e": '"', "\u2033": '"',
    "\u2018": "'", "\u2019": "'", "\u201a": "'", "\u2032": "'",
    "\u2013": "-", "\u2014": "-", "\u2012": "-", "\u2011": "-", "\u2010": "-",
    "\u00a0": " ", "\u2009": " ", "\u202f": " ", "\u00ad": "",
    "\ufb01": "fi", "\ufb02": "fl", "\u2026": "...",
}


def normalizar(texto: str) -> str:
    texto = unicodedata.normalize("NFC", texto)
    for de, para in TROCAS.items():
        texto = texto.replace(de, para)
    texto = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", texto)
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip()


@lru_cache(maxsize=None)
def pagina(programa: str, numero: int) -> str:
    pdf = PROGRAMAS / f"{programa}.pdf"
    bruto = subprocess.run(
        ["pdftotext", "-f", str(numero), "-l", str(numero), str(pdf), "-"],
        capture_output=True, text=True, check=True,
    ).stdout
    return normalizar(bruto)


@lru_cache(maxsize=None)
def total_paginas(programa: str) -> int:
    saida = subprocess.run(
        ["pdfinfo", str(PROGRAMAS / f"{programa}.pdf")],
        capture_output=True, text=True, check=True,
    ).stdout
    return int(re.search(r"Pages:\s+(\d+)", saida).group(1))


def citacoes_propostas():
    dados = json.loads((FICHAS / "propostas.json").read_text(encoding="utf-8"))
    for tema in dados["temas"]:
        for proposta in tema["propostas"]:
            yield (f"propostas/{tema['chave']}/{proposta['titulo']}",
                   "lula", proposta["pagina"], proposta["trecho"])


def citacoes_pontes():
    dados = json.loads((FICHAS / "pontes_extra.json").read_text(encoding="utf-8"))
    for candidato, pontes in dados.items():
        if candidato.startswith("_"):
            continue
        for ponte in pontes:
            rotulo = f"pontes/{candidato}/{ponte['tema']}"
            yield (rotulo + " [candidato]", candidato,
                   ponte["candidato"]["pagina"], ponte["candidato"]["trecho"])
            yield (rotulo + " [lula]", "lula",
                   ponte["lula"]["pagina"], ponte["lula"]["trecho"])


def citacoes_fichas_ts():
    texto = (RAIZ / "src" / "fichas.ts").read_text(encoding="utf-8")
    padrao = re.compile(
        r"\b(?P<programa>lula|cury|renan|caiado|zema)\(\s*\"(?P<citacao>(?:\\.|[^\"\\])*)\",\s*"
        r"\"(?P<inicio>\d+)(?:-(?P<fim>\d+))?\""
    )
    for achado in padrao.finditer(texto):
        inicio = int(achado["inicio"])
        fim = int(achado["fim"] or inicio)
        yield (f"fichas.ts/{achado['programa']}", achado["programa"], (inicio, fim), achado["citacao"])


RODAPES = {
    "lula": r"P R O G R A M A D E G OV E R N O|\s\d+$",
    "cury": r"\s\d+$",
    "renan": r"LIVRO AMARELO - MISSÃO 2026 \d+$",
    "caiado": r"Plano de Governo 2027 a 2030 · PSD · Caiado e Kassab \d+$",
    "zema": r"P L A N O I M P L A C ÁV E L ● ROMEU ZEMA \| \d+$",
}


def sem_hifen(texto: str) -> str:
    return re.sub(r"\s*-\s*", "", texto)


def sem_rodape(programa: str, texto: str) -> str:
    return re.sub(r"\s+", " ", re.sub(RODAPES[programa], " ", texto)).strip()


def conferir_intervalo(programa, paginas, trecho) -> bool:
    if isinstance(paginas, tuple):
        texto = " ".join(sem_rodape(programa, pagina(programa, n))
                         for n in range(paginas[0], paginas[1] + 1))
    else:
        texto = pagina(programa, paginas)
    alvo = normalizar(trecho)
    return alvo in texto or sem_hifen(alvo) in sem_hifen(texto)


def buscar(programa: str, expressao: str, contexto: int = 220):
    regex = re.compile(expressao, re.I)
    for numero in range(1, total_paginas(programa) + 1):
        texto = pagina(programa, numero)
        for achado in regex.finditer(texto):
            ini = max(0, achado.start() - contexto)
            print(f"[{programa} p.{numero}] ...{texto[ini:achado.end() + contexto]}...\n")


def main():
    if len(sys.argv) >= 4 and sys.argv[1] == "--buscar":
        buscar(sys.argv[2], sys.argv[3])
        return

    grupos = [("propostas.json", citacoes_propostas()), ("pontes_extra.json", citacoes_pontes())]
    if "--fichas-ts" in sys.argv:
        grupos.append(("src/fichas.ts", citacoes_fichas_ts()))

    falhas = 0
    for nome, citacoes in grupos:
        ok = total = 0
        for rotulo, programa, paginas, trecho in citacoes:
            total += 1
            if conferir_intervalo(programa, paginas, trecho):
                ok += 1
            else:
                falhas += 1
                print(f"FALHOU  {rotulo} ({programa} p. {paginas}): {trecho[:110]}...")
        print(f"{nome}: {ok}/{total} trechos conferidos")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
