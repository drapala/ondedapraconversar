"""Quanto de cada grupo do 1º turno de 2022 votou no Bolsonaro no 2º turno.

Por seção eleitoral de 2022, o 2º turno do Bolsonaro é explicado pelos grupos
do 1º turno:

    bolsonaro_2t = soma de beta_g * N_g     (0 <= beta_g <= 1)

beta_g é a fração do grupo g que foi para o Bolsonaro. É uma estimativa por
lugar (regressão ecológica entre seções), não diz como cada pessoa votou.

Conferências antes de gravar:
  sanidade     quem votou Bolsonaro no 1º turno ficou (beta >= 0,90) e quem
               votou Lula quase não mudou (beta <= 0,10)
  teste cego   beta ajustado em metade dos municípios (sorteio com semente
               fixa); na outra metade, a ordem pelo ganho previsto tem de
               acertar melhor o ganho real do que a ordem pelo "ate"
               (brancos + nulos + abstenção + outros)

Grava dados/transferencia_2022.json (pesos de 2026, usados pelo site) e
evidences/.../f8-transferencia.json (números do teste).

Uso: uv run --with pandas python scripts/transferencia_2022.py
"""

from __future__ import annotations

import json
import zlib
from datetime import date
from pathlib import Path
from zipfile import ZipFile

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "dados" / "bruto" / "perfil2022"
SECOES = PASTA / "votacao_secao_2022_BR.zip"
DETALHE = PASTA / "detalhe_votacao_secao_2022.zip"
SECOES_2018 = PASTA / "votacao_secao_2018_BR.zip"
SAIDA = RAIZ / "dados" / "transferencia_2022.json"
EVIDENCIA = RAIZ / "evidences" / "virar-as-avessas-2026-10-08" / "f8-transferencia.json"

# Grupos do 1º turno de 2022: número do TSE de cada candidatura.
NUMEROS = {
    "bolsonaro": 22,
    "lula": 13,
    "ciro": 12,
    "tebet": 15,
    "soraya": 44,
    "davila": 30,
}
GRUPOS = [*NUMEROS, "demais", "brancos", "nulos", "abstencao"]
SEMENTE = 2022
REAMOSTRAS = 200

# Grupo de 2026 -> peso de 2022. Zema é do Novo, como o d'Avila. Caiado e Renan são
# direita fora do 22, como Soraya e d'Avila. Cury (Avante) é centro, como a Tebet.
MAPA_2026 = {
    "abstencao": ["abstencao"],
    "brancos": ["brancos"],
    "nulos": ["nulos"],
    "lula": ["lula"],
    "30": ["davila"],
    "55": ["soraya", "davila"],
    "14": ["soraya", "davila"],
    "70": ["tebet"],
    "demais": ["demais"],
}
MAPA_SENSIBILIDADE = {**MAPA_2026, "55": ["tebet"], "14": ["tebet"]}


def ler_secoes() -> pd.DataFrame:
    """Votos para presidente por seção e turno, uma coluna por grupo."""
    colunas = [
        "NR_TURNO",
        "SG_UF",
        "CD_CARGO",
        "CD_MUNICIPIO",
        "NR_ZONA",
        "NR_SECAO",
        "NR_LOCAL_VOTACAO",
        "NR_VOTAVEL",
        "QT_VOTOS",
    ]
    partes = []
    grupo_do_numero = {n: g for g, n in NUMEROS.items()} | {95: "brancos", 96: "nulos"}
    with (
        ZipFile(SECOES) as arquivo,
        arquivo.open("votacao_secao_2022_BR.csv") as entrada,
    ):
        for bloco in pd.read_csv(
            entrada,
            sep=";",
            encoding="latin-1",
            dtype=str,
            usecols=colunas,
            chunksize=2_000_000,
        ):
            bloco = bloco[(bloco["CD_CARGO"] == "1") & (bloco["SG_UF"] != "ZZ")]
            numero = pd.to_numeric(bloco["NR_VOTAVEL"], errors="coerce").astype("Int64")
            bloco = bloco.assign(
                turno=bloco["NR_TURNO"].astype(int),
                mun=bloco["CD_MUNICIPIO"].astype(int),
                zona=bloco["NR_ZONA"].astype(int),
                secao=bloco["NR_SECAO"].astype(int),
                local=bloco["NR_LOCAL_VOTACAO"].astype(int),
                grupo=numero.map(
                    lambda n: (
                        grupo_do_numero.get(int(n), "demais")
                        if pd.notna(n)
                        else "demais"
                    )
                ),
                qtd=pd.to_numeric(bloco["QT_VOTOS"], errors="coerce")
                .fillna(0)
                .astype("int64"),
            )
            partes.append(
                bloco.groupby(
                    ["SG_UF", "mun", "zona", "secao", "local", "turno", "grupo"]
                )["qtd"].sum()
            )
    serie = pd.concat(partes).groupby(level=[0, 1, 2, 3, 4, 5, 6]).sum()
    largo = serie.unstack("grupo", fill_value=0)
    t1 = largo.xs(1, level="turno")
    t2 = largo.xs(2, level="turno")[["bolsonaro"]].rename(
        columns={"bolsonaro": "bolsonaro_2t"}
    )
    return t1.join(t2, how="inner").reset_index()


def ler_abstencao() -> pd.DataFrame:
    colunas = [
        "NR_TURNO",
        "SG_UF",
        "CD_CARGO",
        "CD_MUNICIPIO",
        "NR_ZONA",
        "NR_SECAO",
        "QT_ABSTENCOES",
    ]
    partes = []
    with ZipFile(DETALHE) as arquivo:
        for nome in arquivo.namelist():
            # Presidente só existe no arquivo nacional; os das UFs têm cargos estaduais.
            if not nome.endswith("_BRASIL.csv"):
                continue
            with arquivo.open(nome) as entrada:
                df = pd.read_csv(
                    entrada, sep=";", encoding="latin-1", dtype=str, usecols=colunas
                )
            df = df[
                (df["CD_CARGO"] == "1")
                & (df["NR_TURNO"] == "1")
                & (df["SG_UF"] != "ZZ")
            ]
            partes.append(
                pd.DataFrame(
                    {
                        "SG_UF": df["SG_UF"],
                        "mun": df["CD_MUNICIPIO"].astype(int),
                        "zona": df["NR_ZONA"].astype(int),
                        "secao": df["NR_SECAO"].astype(int),
                        "abstencao": pd.to_numeric(
                            df["QT_ABSTENCOES"], errors="coerce"
                        ).fillna(0),
                    }
                )
            )
    return (
        pd.concat(partes)
        .groupby(["SG_UF", "mun", "zona", "secao"], as_index=False)["abstencao"]
        .sum()
    )


def ler_bolsonaro_2018() -> pd.DataFrame:
    """Votos do Bolsonaro (17 em 2018) no 2º turno de 2018, por seção."""
    colunas = ["NR_TURNO", "SG_UF", "CD_CARGO", "CD_MUNICIPIO", "NR_ZONA", "NR_SECAO", "NR_VOTAVEL", "QT_VOTOS"]
    partes = []
    with ZipFile(SECOES_2018) as arquivo:
        nome = next(n for n in arquivo.namelist() if n.endswith(".csv"))
        with arquivo.open(nome) as entrada:
            for bloco in pd.read_csv(entrada, sep=";", encoding="latin-1", dtype=str, usecols=colunas, chunksize=2_000_000):
                bloco = bloco[(bloco["CD_CARGO"] == "1") & (bloco["NR_TURNO"] == "2") & (bloco["NR_VOTAVEL"] == "17") & (bloco["SG_UF"] != "ZZ")]
                partes.append(pd.DataFrame({
                    "SG_UF": bloco["SG_UF"], "mun": bloco["CD_MUNICIPIO"].astype(int), "zona": bloco["NR_ZONA"].astype(int),
                    "secao": bloco["NR_SECAO"].astype(int), "bolsonaro2018": pd.to_numeric(bloco["QT_VOTOS"], errors="coerce").fillna(0),
                }))
    return pd.concat(partes).groupby(["SG_UF", "mun", "zona", "secao"], as_index=False)["bolsonaro2018"].sum()


def ajustar(G: np.ndarray, b: np.ndarray, voltas: int = 500) -> np.ndarray:
    """Mínimos quadrados com 0 <= beta <= 1, por descida de coordenadas sobre G = XᵀX e b = Xᵀy."""
    beta = np.clip(np.linalg.lstsq(G, b, rcond=None)[0], 0, 1)
    for _ in range(voltas):
        antes = beta.copy()
        for j in range(len(beta)):
            if G[j, j] <= 0:
                continue
            resto = b[j] - G[j] @ beta + G[j, j] * beta[j]
            beta[j] = min(1.0, max(0.0, resto / G[j, j]))
        if np.max(np.abs(beta - antes)) < 1e-10:
            break
    return beta


def spearman(a: np.ndarray, b: np.ndarray) -> float:
    return float(pd.Series(a).rank().corr(pd.Series(b).rank()))


def no_treino(mun: pd.Series) -> np.ndarray:
    return mun.map(lambda m: zlib.crc32(f"{SEMENTE}-{m}".encode()) % 2 == 0).to_numpy()


def pesos_2026(beta: dict[str, float], mapa: dict[str, list[str]]) -> dict[str, float]:
    return {
        g: round(float(np.mean([beta[x] for x in fontes])), 4)
        for g, fontes in mapa.items()
    }


def avaliar(df: pd.DataFrame, colunas: list[str], treino: np.ndarray) -> dict:
    """Ajusta no treino e mede no teste: Spearman do ganho previsto e do ate contra o ganho real."""
    X = df[colunas].to_numpy(dtype=float)
    y = df["bolsonaro_2t"].to_numpy(dtype=float)
    beta = ajustar(X[treino].T @ X[treino], X[treino].T @ y[treino])
    teste = ~treino
    real = y[teste] - df.loc[teste, "bolsonaro"].to_numpy()
    idx = [i for i, c in enumerate(colunas) if c != "bolsonaro"]
    previsto = X[teste][:, idx] @ beta[idx]
    ate = df.loc[teste, ["demais", "brancos", "nulos", "abstencao", "ciro", "tebet", "soraya", "davila"]].sum(axis=1).to_numpy()
    locais = df.loc[teste, ["SG_UF", "mun", "zona", "local"]].assign(real=real, previsto=previsto, ate=ate)
    por_local = locais.groupby(["SG_UF", "mun", "zona", "local"])[["real", "previsto", "ate"]].sum()
    return {
        "secoesTeste": int(teste.sum()),
        "spearmanGanhoPrevisto": round(spearman(previsto, real), 4),
        "spearmanAte": round(spearman(ate, real), 4),
        "locaisTeste": len(por_local),
        "spearmanGanhoPrevistoLocal": round(spearman(por_local["previsto"].to_numpy(), por_local["real"].to_numpy()), 4),
        "spearmanAteLocal": round(spearman(por_local["ate"].to_numpy(), por_local["real"].to_numpy()), 4),
    }


def main() -> None:
    df = ler_secoes().merge(ler_abstencao(), on=["SG_UF", "mun", "zona", "secao"], how="inner")
    for g in GRUPOS:
        if g not in df:
            df[g] = 0
    # Só seções que também existem em 2018: o retorno precisa delas, e as duas versões do modelo usam as mesmas.
    df = df.merge(ler_bolsonaro_2018(), on=["SG_UF", "mun", "zona", "secao"], how="inner")
    df["retorno"] = (df["bolsonaro2018"] - df["bolsonaro"]).clip(lower=0)
    print(f"{len(df)} seções com os dois turnos de 2022, abstenção e 2018")

    treino = no_treino(df["mun"])
    sem = avaliar(df, GRUPOS, treino)
    com = avaliar(df, [*GRUPOS, "retorno"], treino)
    usa_retorno = (com["spearmanGanhoPrevisto"] > sem["spearmanGanhoPrevisto"]
                   and com["spearmanGanhoPrevistoLocal"] >= sem["spearmanGanhoPrevistoLocal"])
    colunas = [*GRUPOS, "retorno"] if usa_retorno else GRUPOS
    cego = com if usa_retorno else sem
    cego["ganhoVenceAte"] = (cego["spearmanGanhoPrevisto"] > cego["spearmanAte"]
                             and cego["spearmanGanhoPrevistoLocal"] > cego["spearmanAteLocal"])

    # Os pesos publicados são do mesmo modelo testado acima, agora ajustado com todas as seções.
    X = df[colunas].to_numpy(dtype=float)
    y = df["bolsonaro_2t"].to_numpy(dtype=float)
    beta_todo = ajustar(X.T @ X, X.T @ y)
    beta = dict(zip(colunas, map(float, beta_todo)))
    residuo = y - X @ beta_todo
    r2 = 1 - float(residuo @ residuo) / float(((y - y.mean()) ** 2).sum())
    sanidade = beta["bolsonaro"] >= 0.90 and beta["lula"] <= 0.10

    codigos, inversos = np.unique(df["mun"].to_numpy(), return_inverse=True)
    k = len(colunas)
    G_mun = np.zeros((len(codigos), k, k))
    b_mun = np.zeros((len(codigos), k))
    np.add.at(G_mun, inversos, X[:, :, None] * X[:, None, :])
    np.add.at(b_mun, inversos, X * y[:, None])
    gerador = np.random.default_rng(SEMENTE)
    amostras = []
    for _ in range(REAMOSTRAS):
        pegos = np.bincount(gerador.integers(0, len(codigos), len(codigos)), minlength=len(codigos)).astype(float)
        amostras.append(ajustar(np.tensordot(pegos, G_mun, 1), pegos @ b_mun, voltas=200))
    amostras = np.array(amostras)
    intervalo = {c: [round(float(np.percentile(amostras[:, i], 2.5)), 4), round(float(np.percentile(amostras[:, i], 97.5)), 4)]
                 for i, c in enumerate(colunas)}

    pesos = pesos_2026(beta, MAPA_2026)
    peso_retorno = round(beta.get("retorno", 0.0), 4)
    resultado = {
        "secoes": len(df),
        "beta2022": {c: round(v, 4) for c, v in beta.items()},
        "intervalo95": intervalo,
        "r2": round(r2, 4),
        "sanidade": {"betaBolsonaro": round(beta["bolsonaro"], 4), "betaLula": round(beta["lula"], 4), "aprovada": sanidade},
        "testeCegoSemRetorno": sem,
        "testeCegoComRetorno": com,
        "usaRetorno": usa_retorno,
        "testeCego": cego,
        "pesos2026": pesos,
        "pesoRetorno": peso_retorno,
        "pesos2026Sensibilidade": pesos_2026(beta, MAPA_SENSIBILIDADE),
        "mapa2026": MAPA_2026,
    }
    EVIDENCIA.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCIA.write_text(json.dumps(resultado, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(resultado, ensure_ascii=False, indent=1))
    if not sanidade:
        raise SystemExit("sanidade reprovada: o modelo não reproduz o óbvio; nada gravado para o site")
    if not cego["ganhoVenceAte"]:
        raise SystemExit("teste cego: o ganho previsto não ordena melhor que o ate; nada gravado para o site")
    SAIDA.write_text(json.dumps({
        "geradoEm": date.today().isoformat(),
        "fonte": "TSE, votação por seção e detalhe por seção, presidente, 1º e 2º turnos de 2022 e 2º turno de 2018",
        "metodo": "regressão por seção do 2º turno do Bolsonaro nos grupos do 1º turno e no retorno de 2018, 0 <= peso <= 1",
        "pesos": pesos,
        "pesoRetorno": peso_retorno,
        "mapa": MAPA_2026,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"pesos de 2026 gravados em {SAIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
