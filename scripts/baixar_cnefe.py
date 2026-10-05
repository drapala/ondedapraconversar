"""Baixa o CNEFE 2022 do IBGE só dos municípios com local de votação sem
coordenada no cadastro do TSE.

O IBGE publica um zip por município em
ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/
Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/{UF}/{código}_{NOME}.zip.
O município do TSE é ligado ao do IBGE pelo nome dentro da UF; os poucos que
mudaram de grafia vão por aproximação (registrada em municipios.json) ou pela
lista de APELIDOS.

O download usa o curl porque o servidor do IBGE não manda o certificado
intermediário e o Python recusa a conexão. A ordem é de quem tem mais eleitores
sem coordenada para quem tem menos.

Saída em dados/bruto/cnefe/: {código IBGE}.zip e municipios.json.

Uso: python scripts/baixar_cnefe.py

Autor: Matheus C. Pestana
"""

from __future__ import annotations

import difflib
import json
import re
import subprocess
import zipfile
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import unquote

import pandas as pd

from montar_dados import LOCAIS, RAIZ, UFS, coordenada, normalizar

BASE = ("https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/"
        "Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/")
PASTA = RAIZ / "dados" / "bruto" / "cnefe"
CODIGO_UF = {"RO": 11, "AC": 12, "AM": 13, "RR": 14, "PA": 15, "AP": 16, "TO": 17, "MA": 21,
             "PI": 22, "CE": 23, "RN": 24, "PB": 25, "PE": 26, "AL": 27, "SE": 28, "BA": 29,
             "MG": 31, "ES": 32, "RJ": 33, "SP": 35, "PR": 41, "SC": 42, "RS": 43, "MS": 50,
             "MT": 51, "GO": 52, "DF": 53}
# Nome do TSE -> nome do arquivo do IBGE, quando a aproximação erraria ou não acharia.
APELIDOS = {("SP", "embu das artes"): "embu", ("TO", "tabocao"): "fortaleza do tabocao"}


def curl(url: str, destino: Path | None = None) -> str:
    comando = ["curl", "-sSfL", "--retry", "4", "--retry-delay", "3", url]
    if destino is None:
        return subprocess.run(comando, check=True, capture_output=True).stdout.decode("latin1")
    parcial = destino.with_suffix(".parcial")
    subprocess.run([*comando, "-o", str(parcial)], check=True)
    parcial.replace(destino)
    return ""


def arquivos_ibge(uf: str) -> dict[str, tuple[str, str]]:
    """Nome normalizado -> (código IBGE, nome do arquivo) de uma UF."""
    pasta = f"{CODIGO_UF[uf]}_{uf}/"
    html = curl(BASE + pasta)
    saida = {}
    for codigo, nome in re.findall(r'href="(\d{7})_([^"]+)\.zip"', html):
        legivel = unquote(nome, encoding="utf-8").replace("_", " ").replace("-", " ")
        saida[normalizar(legivel)] = (codigo, f"{pasta}{codigo}_{nome}.zip")
    return saida


def zip_bom(caminho: Path) -> bool:
    try:
        with zipfile.ZipFile(caminho) as z:
            return z.testzip() is None
    except (zipfile.BadZipFile, OSError):
        return False


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    municipios: dict[str, dict] = {}
    faltando: Counter = Counter()
    for uf in UFS:
        df = pd.read_parquet(LOCAIS / f"eleitorado_local_votacao_2026_{uf}.parquet",
                             columns=["NR_TURNO", "CD_MUNICIPIO", "NM_MUNICIPIO", "NR_LATITUDE",
                                      "NR_LONGITUDE", "QT_ELEITOR_SECAO"])
        df = df[df["NR_TURNO"].astype(str) == "1"]
        sem = df[[coordenada(a, b) is None for a, b in zip(df["NR_LATITUDE"], df["NR_LONGITUDE"])]]
        if sem.empty:
            continue
        ibge = arquivos_ibge(uf)
        for (cd, nome), grupo in sem.groupby(["CD_MUNICIPIO", "NM_MUNICIPIO"]):
            chave = normalizar(nome)
            alvo = APELIDOS.get((uf, chave), chave)
            como = "nome"
            if alvo not in ibge:
                perto = difflib.get_close_matches(alvo, list(ibge), 1, 0.8)
                if not perto:
                    print(f"sem município no IBGE: {uf} {nome}")
                    continue
                alvo, como = perto[0], "aproximado"
                print(f"aproximado: {uf} {nome} -> {alvo}")
            elif (uf, chave) in APELIDOS:
                como = "apelido"
            codigo, arquivo = ibge[alvo]
            tse = f"{uf}-{str(cd).zfill(5)}"
            municipios[tse] = {"ibge": codigo, "arquivo": arquivo, "nomeTse": nome, "nomeIbge": alvo, "como": como}
            faltando[tse] = int(pd.to_numeric(grupo["QT_ELEITOR_SECAO"]).sum())

    (PASTA / "municipios.json").write_text(
        json.dumps(dict(sorted(municipios.items())), ensure_ascii=False, indent=1), encoding="utf-8")

    fila = [municipios[t] for t, _ in faltando.most_common()]

    def baixar(m: dict) -> str:
        destino = PASTA / f"{m['ibge']}.zip"
        if destino.exists() and zip_bom(destino):
            return "já tinha"
        curl(BASE + m["arquivo"], destino)
        return "baixado" if zip_bom(destino) else "zip ruim"

    resultado: Counter = Counter()
    with ThreadPoolExecutor(4) as pool:
        for i, estado in enumerate(pool.map(baixar, fila), 1):
            resultado[estado] += 1
            if i % 50 == 0 or i == len(fila):
                print(f"{i}/{len(fila)} {dict(resultado)}", flush=True)


if __name__ == "__main__":
    main()
