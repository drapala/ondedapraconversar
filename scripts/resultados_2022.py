"""Le os votos presidenciais municipais de 2022 do arquivo oficial do TSE.

O CSV compactado é mantido em dados/bruto/perfil2022 (fora do Git). O resumo
por município é cacheado na mesma pasta para não reler centenas de megabytes
a cada atualização de boletins de 2026.

Autor: Matheus C. Pestana
"""

from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZipFile

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "dados" / "bruto" / "perfil2022"
ARQUIVO = PASTA / "votacao_candidato_munzona_2022.zip"
CACHE = PASTA / "votos_presidente_municipio_2022.json"


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
