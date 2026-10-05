"""Le os votos presidenciais de 2022 dos arquivos oficiais do TSE.

carregar(): por município, de votacao_candidato_munzona_2022.
carregar_por_bairro(): por município e bairro, somando a votação por seção
(votacao_secao_2022_BR) com o bairro de cada local no cadastro de locais de
2022 (eleitorado_local_votacao_2022). O bairro é o nome do cadastro, como no
relatório de 2026: nada é reatribuído pelo mapa.

Os CSVs compactados ficam em dados/bruto/perfil2022 (fora do Git), baixados por
scripts/baixar_perfil_2022.py. Os resumos são cacheados na mesma pasta para não
reler centenas de megabytes a cada atualização de boletins de 2026.

Autor: Matheus C. Pestana
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Callable
from zipfile import ZipFile

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "dados" / "bruto" / "perfil2022"
ARQUIVO = PASTA / "votacao_candidato_munzona_2022.zip"
CACHE = PASTA / "votos_presidente_municipio_2022.json"
SECOES = PASTA / "votacao_secao_2022_BR.zip"
LOCAIS = PASTA / "eleitorado_local_votacao_2022.zip"
CACHE_BAIRROS = PASTA / "votos_presidente_bairro_2022.json"


def carregar() -> dict[str, dict]:
    if not ARQUIVO.exists():
        return {}
    if CACHE.exists() and CACHE.stat().st_mtime >= ARQUIVO.stat().st_mtime:
        return json.loads(CACHE.read_text(encoding="utf-8"))

    somas: dict[str, dict] = {}
    colunas = ["NR_TURNO", "CD_CARGO", "DS_CARGO", "NR_CANDIDATO", "CD_MUNICIPIO",
               "SG_UF", "NM_MUNICIPIO", "QT_VOTOS_NOMINAIS"]
    with ZipFile(ARQUIVO) as arquivo:
        arquivos_uf = [nome for nome in arquivo.namelist()
                       if nome.endswith("_BRASIL.csv")]
        for nome_arquivo in arquivos_uf:
            with arquivo.open(nome_arquivo) as entrada:
                blocos = pd.read_csv(
                    entrada, sep=";", encoding="latin-1", dtype=str, usecols=colunas,
                    chunksize=500_000, low_memory=False,
                )
                for bloco in blocos:
                    presidente = bloco["DS_CARGO"].str.upper().eq("PRESIDENTE") & bloco["CD_CARGO"].eq("1")
                    bloco = bloco[presidente & bloco["NR_TURNO"].isin(("1", "2"))]
                    if bloco.empty:
                        continue
                    bloco = bloco.assign(
                        votos=pd.to_numeric(bloco["QT_VOTOS_NOMINAIS"], errors="coerce").fillna(0).astype("int64"),
                        codigo=bloco["CD_MUNICIPIO"].str.zfill(5),
                    )
                    por_municipio = bloco.groupby(["codigo", "SG_UF", "NM_MUNICIPIO", "NR_TURNO"], sort=False)
                    for (codigo, uf, nome, turno), grupo in por_municipio:
                        registro = somas.setdefault(codigo, {"uf": uf, "municipio": nome, "turnos": {}})
                        turno_dados = registro["turnos"].setdefault(turno, {"lula": 0, "validos": 0})
                        turno_dados["validos"] += int(grupo["votos"].sum())
                        turno_dados["lula"] += int(grupo.loc[grupo["NR_CANDIDATO"].eq("13"), "votos"].sum())

    CACHE.write_text(json.dumps(somas, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return somas


def _bairros_dos_locais(normalizar: Callable[[str], str]) -> dict[tuple, str]:
    """(UF, município, zona, local) -> bairro normalizado, pelo cadastro de 2022."""
    colunas = ["SG_UF", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO", "NM_BAIRRO"]
    with ZipFile(LOCAIS) as arquivo:
        nome = next(n for n in arquivo.namelist() if n.endswith(".csv"))
        with arquivo.open(nome) as entrada:
            df = pd.read_csv(entrada, sep=";", encoding="latin-1", dtype=str, usecols=colunas)
    df = df.drop_duplicates(["SG_UF", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO"])
    saida = {}
    for linha in df.itertuples(index=False):
        bairro = normalizar(linha.NM_BAIRRO or "")
        if bairro:
            chave = (linha.SG_UF, linha.CD_MUNICIPIO.zfill(5), int(linha.NR_ZONA), int(linha.NR_LOCAL_VOTACAO))
            saida[chave] = bairro
    return saida


def carregar_por_bairro(normalizar: Callable[[str], str]) -> dict[str, dict]:
    """Lula e votos válidos para presidente em 2022, por "município|bairro" e turno.

    A chave usa o mesmo normalizar() do relatório de 2026, para os bairros se
    encontrarem pelo nome. Local sem bairro no cadastro fica de fora.
    """
    if not SECOES.exists() or not LOCAIS.exists():
        return {}
    if CACHE_BAIRROS.exists() and CACHE_BAIRROS.stat().st_mtime >= max(SECOES.stat().st_mtime, LOCAIS.stat().st_mtime):
        return json.loads(CACHE_BAIRROS.read_text(encoding="utf-8"))

    bairros = _bairros_dos_locais(normalizar)
    somas: dict[str, dict] = {}
    colunas = ["NR_TURNO", "SG_UF", "CD_CARGO", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO", "NR_VOTAVEL", "QT_VOTOS"]
    with ZipFile(SECOES) as arquivo:
        with arquivo.open("votacao_secao_2022_BR.csv") as entrada:
            for bloco in pd.read_csv(entrada, sep=";", encoding="latin-1", dtype=str, usecols=colunas, chunksize=1_000_000):
                bloco = bloco[(bloco["CD_CARGO"] == "1") & (bloco["SG_UF"] != "ZZ")]
                numero = pd.to_numeric(bloco["NR_VOTAVEL"], errors="coerce")
                bloco = bloco.assign(
                    votos=pd.to_numeric(bloco["QT_VOTOS"], errors="coerce").fillna(0).astype("int64"),
                    lula=numero.eq(13),
                    valido=numero.lt(95),
                    mun=bloco["CD_MUNICIPIO"].str.zfill(5),
                    zona=bloco["NR_ZONA"].astype(int),
                    local=bloco["NR_LOCAL_VOTACAO"].astype(int),
                )
                bloco = bloco[bloco["valido"]]
                agrupado = bloco.groupby(["SG_UF", "mun", "zona", "local", "NR_TURNO"]).apply(
                    lambda g: (int(g["votos"].sum()), int(g.loc[g["lula"], "votos"].sum())), include_groups=False)
                for (uf, mun, zona, local, turno), (validos, lula) in agrupado.items():
                    bairro = bairros.get((uf, mun, zona, local))
                    if not bairro:
                        continue
                    turnos = somas.setdefault(f"{mun}|{bairro}", {})
                    t = turnos.setdefault(turno, {"lula": 0, "validos": 0})
                    t["validos"] += validos
                    t["lula"] += lula

    CACHE_BAIRROS.write_text(json.dumps(somas, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return somas
