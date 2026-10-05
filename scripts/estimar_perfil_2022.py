"""Estima, para cada local de votação de 2022, quantas pessoas de cada perfil
deixaram de votar no 2º turno da eleição para presidente.

O TSE não publica abstenção por perfil na seção. Publica três coisas, que este
script cruza (baixadas por scripts/baixar_perfil_2022.py):

  quem estava inscrito em cada local, por perfil   perfil_eleitor_secao_2022
  quantos faltaram em cada local, no total          detalhe_votacao_secao_2022
  taxa de abstenção de cada perfil, por zona        perfil_comparecimento_abstencao_2022

A conta, para cada local e cada dimensão (idade, gênero, escolaridade):
inscritos do grupo vezes a taxa de abstenção do grupo na zona dá um esperado;
os esperados são então ajustados para somar exatamente as abstenções reais do
local. O total é contado; a divisão entre grupos é estimada.

Antes de gravar, valida o método um nível acima: estima cada zona com as taxas
do município e compara com a abstenção real por perfil da zona. Só entram no
site as dimensões com erro p90 até LIMITE_P90_PP pontos percentuais.

Local cujo eleitorado por perfil não bate com os aptos do boletim (diferença de
mais de 10%, em geral seção de voto em trânsito, com eleitor de fora) fica de
fora: ali a divisão por grupo sairia distorcida.

Saída: dados/perfil_2022_locais.json.gz, chave "UF-MUNICIPIO-ZONA-LOCAL", com
coordenada e nome do local em 2022, aptos e abstenção reais e, por grupo,
inscritos e abstenção estimada.

Uso: python scripts/estimar_perfil_2022.py

Autor: Matheus C. Pestana
"""

from __future__ import annotations

import gzip
import json
import zipfile
from collections import defaultdict
from statistics import median

import pandas as pd

from montar_dados import RAIZ, UFS, coordenada

BRUTO = RAIZ / "dados" / "bruto"
PERFIL = BRUTO / "perfil2022"
SAIDA = RAIZ / "dados" / "perfil_2022_locais.json.gz"
TURNO = "2"
LIMITE_P90_PP = 5.0
TOLERANCIA_INSCRITOS = 0.10

FAIXAS = [(1600, 1799, "16-17"), (1800, 2499, "18-24"), (2500, 3499, "25-34"), (3500, 4499, "35-44"),
          (4500, 5999, "45-59"), (6000, 6999, "60-69"), (7000, 9999, "70+")]
GENEROS = {"2": "homens", "4": "mulheres"}
ESCOLARIDADES = {"1": "fund_incompleto", "2": "fund_incompleto", "3": "fund_incompleto",
                 "4": "fund_completo", "5": "fund_completo",
                 "6": "medio_completo", "7": "medio_completo", "8": "superior"}
DIMENSOES = ("idade", "genero", "escolaridade")


def idade(codigo: str) -> str:
    try:
        n = int(codigo)
    except ValueError:
        return "outro"
    return next((g for a, b, g in FAIXAS if a <= n <= b), "outro")


def grupos(df: pd.DataFrame) -> pd.DataFrame:
    """Acrescenta as colunas de grupo das três dimensões."""
    return df.assign(
        idade=df["CD_FAIXA_ETARIA"].map(idade),
        genero=df["CD_GENERO"].map(GENEROS).fillna("outro"),
        escolaridade=df["CD_GRAU_ESCOLARIDADE"].map(ESCOLARIDADES).fillna("outro"),
    )


def ler_csv(caminho_zip, nome: str, colunas: list[str], chunksize: int | None = None):
    z = zipfile.ZipFile(caminho_zip)
    return pd.read_csv(z.open(nome), sep=";", encoding="latin1", dtype=str, usecols=colunas, chunksize=chunksize)


def taxas_por_zona() -> tuple[dict, dict]:
    """Aptos e abstenção por grupo, no 2º turno, por zona e por município."""
    zona: dict = defaultdict(lambda: [0, 0])
    municipio: dict = defaultdict(lambda: [0, 0])
    caminho = PERFIL / "perfil_comparecimento_abstencao_2022.zip"
    colunas = ["NR_TURNO", "SG_UF", "CD_MUNICIPIO", "NR_ZONA", "CD_GENERO", "CD_FAIXA_ETARIA",
               "CD_GRAU_ESCOLARIDADE", "QT_APTOS", "QT_ABSTENCAO"]
    nomes = set(zipfile.ZipFile(caminho).namelist())
    for uf in UFS:
        arquivo = f"perfil_comparecimento_abstencao_2022_{uf}.csv"
        if arquivo in nomes:
            df = ler_csv(caminho, arquivo, colunas)
        else:
            # O DF não tem arquivo próprio no zip; só aparece no do Brasil inteiro.
            df = pd.concat(b[b["SG_UF"] == uf] for b in ler_csv(
                caminho, "perfil_comparecimento_abstencao_2022_BRASIL.csv", colunas, chunksize=2_000_000))
        df = grupos(df[df["NR_TURNO"] == TURNO])
        df["QT_APTOS"] = pd.to_numeric(df["QT_APTOS"])
        df["QT_ABSTENCAO"] = pd.to_numeric(df["QT_ABSTENCAO"])
        df["mun"] = df["CD_MUNICIPIO"].str.zfill(5)
        df["zona"] = df["NR_ZONA"].astype(int)
        for dim in DIMENSOES:
            for (mun, z, g), linha in df.groupby(["mun", "zona", dim])[["QT_APTOS", "QT_ABSTENCAO"]].sum().iterrows():
                for alvo, chave in ((zona, (uf, mun, z, dim, g)), (municipio, (uf, mun, dim, g))):
                    alvo[chave][0] += int(linha["QT_APTOS"])
                    alvo[chave][1] += int(linha["QT_ABSTENCAO"])
        print(f"taxas {uf}", flush=True)
    return dict(zona), dict(municipio)


def ajustar(inscritos: dict[str, int], taxas: dict[str, float], total: int) -> dict[str, float]:
    """Abstenção por grupo: inscritos vezes taxa, somando exatamente o total real."""
    esperado = {g: inscritos[g] * taxas[g] for g in inscritos}
    soma = sum(esperado.values())
    if soma <= 0:
        return {g: 0.0 for g in inscritos}
    fator = total / soma
    return {g: min(esperado[g] * fator, inscritos[g]) for g in inscritos}


def validar(zona: dict, municipio: dict) -> dict[str, tuple[float, float]]:
    """Estima cada zona com as taxas do município e mede o erro contra o real."""
    erros: dict[str, list[float]] = defaultdict(list)
    zonas_por_mun = defaultdict(set)
    grupos_da_zona = defaultdict(list)
    for uf, mun, z, dim, g in zona:
        zonas_por_mun[(uf, mun)].add(z)
        grupos_da_zona[(uf, mun, z, dim)].append(g)
    for (uf, mun), zonas in zonas_por_mun.items():
        if len(zonas) < 2:
            continue  # município de uma zona só: as taxas seriam as mesmas
        for z in zonas:
            for dim in DIMENSOES:
                gs = grupos_da_zona[(uf, mun, z, dim)]
                inscritos = {g: zona[(uf, mun, z, dim, g)][0] for g in gs}
                total = sum(zona[(uf, mun, z, dim, g)][1] for g in gs)
                taxas = {g: (municipio[(uf, mun, dim, g)][1] / municipio[(uf, mun, dim, g)][0])
                         if municipio[(uf, mun, dim, g)][0] else 0 for g in gs}
                estimado = ajustar(inscritos, taxas, total)
                for g in gs:
                    if g == "outro" or inscritos[g] < 100:
                        continue
                    real = zona[(uf, mun, z, dim, g)][1] / inscritos[g]
                    erros[dim].append(abs(estimado[g] / inscritos[g] - real) * 100)
    resultado = {}
    for dim, lista in erros.items():
        lista.sort()
        resultado[dim] = (median(lista), lista[int(len(lista) * 0.9)])
        print(f"validação {dim:13} n={len(lista):6}  erro mediano {resultado[dim][0]:.1f} pp  "
              f"p90 {resultado[dim][1]:.1f} pp", flush=True)
    return resultado


def locais_2022() -> dict[tuple, dict]:
    """Coordenada e nome de cada local de votação de 2022."""
    caminho = BRUTO / "tse_locais" / "2022.zip"
    nome = next(n for n in zipfile.ZipFile(caminho).namelist() if n.endswith(".csv"))
    df = ler_csv(caminho, nome, ["SG_UF", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO", "NM_LOCAL_VOTACAO",
                                 "NR_LATITUDE", "NR_LONGITUDE"])
    df = df.drop_duplicates(["SG_UF", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO"])
    saida = {}
    for linha in df.itertuples(index=False):
        saida[(linha.SG_UF, linha.CD_MUNICIPIO.zfill(5), int(linha.NR_ZONA), int(linha.NR_LOCAL_VOTACAO))] = {
            "nome": linha.NM_LOCAL_VOTACAO, "coord": coordenada(linha.NR_LATITUDE, linha.NR_LONGITUDE)}
    return saida


def abstencao_real() -> dict[tuple, list[int]]:
    """Aptos e abstenções de presidente no 2º turno, por local."""
    saida: dict[tuple, list[int]] = defaultdict(lambda: [0, 0])
    colunas = ["NR_TURNO", "SG_UF", "CD_CARGO", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO", "QT_APTOS", "QT_ABSTENCOES"]
    for bloco in ler_csv(PERFIL / "detalhe_votacao_secao_2022.zip", "detalhe_votacao_secao_2022_BRASIL.csv",
                         colunas, chunksize=2_000_000):
        bloco = bloco[(bloco["CD_CARGO"] == "1") & (bloco["NR_TURNO"] == TURNO) & (bloco["SG_UF"] != "ZZ")]
        for linha in bloco.itertuples(index=False):
            chave = (linha.SG_UF, linha.CD_MUNICIPIO.zfill(5), int(linha.NR_ZONA), int(linha.NR_LOCAL_VOTACAO))
            saida[chave][0] += int(linha.QT_APTOS)
            saida[chave][1] += int(linha.QT_ABSTENCOES)
    print(f"abstenção real em {len(saida)} locais", flush=True)
    return dict(saida)


def main() -> None:
    zona, municipio = taxas_por_zona()
    validacao = validar(zona, municipio)
    aprovadas = [d for d, (_, p90) in validacao.items() if p90 <= LIMITE_P90_PP]
    print(f"dimensões aprovadas: {aprovadas}", flush=True)

    reais = abstencao_real()
    cadastro = locais_2022()
    saida = {}
    descartados = 0
    for uf in UFS:
        caminho = PERFIL / f"perfil_eleitor_secao_2022_{uf}.zip"
        nome = next(n for n in zipfile.ZipFile(caminho).namelist() if n.endswith(".csv"))
        df = grupos(ler_csv(caminho, nome, ["CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO", "CD_GENERO",
                                            "CD_FAIXA_ETARIA", "CD_GRAU_ESCOLARIDADE", "QT_ELEITORES_PERFIL"]))
        df["QT"] = pd.to_numeric(df["QT_ELEITORES_PERFIL"])
        df["mun"] = df["CD_MUNICIPIO"].str.zfill(5)
        df["zona"] = df["NR_ZONA"].astype(int)
        df["local"] = df["NR_LOCAL_VOTACAO"].astype(int)
        composicao: dict[str, dict[tuple, dict[str, int]]] = {}
        for dim in aprovadas:
            por_local: dict[tuple, dict[str, int]] = defaultdict(dict)
            for (mun, z, local, g), qt in df.groupby(["mun", "zona", "local", dim])["QT"].sum().items():
                por_local[(mun, z, local)][g] = int(qt)
            composicao[dim] = por_local
        for mun, z, local in {k for d in composicao.values() for k in d}:
            chave = (uf, mun, z, local)
            real = reais.get(chave)
            info = cadastro.get(chave)
            if not real or not info:
                continue
            inscritos_total = sum(composicao[aprovadas[0]][(mun, z, local)].values())
            if abs(inscritos_total - real[0]) > TOLERANCIA_INSCRITOS * real[0]:
                descartados += 1
                continue
            registro = {"nome": info["nome"], "aptos": real[0], "abst": real[1], "g": {}}
            if info["coord"]:
                registro["lat"], registro["lon"] = round(info["coord"][0], 5), round(info["coord"][1], 5)
            for dim in aprovadas:
                inscritos = composicao[dim][(mun, z, local)]
                taxas = {}
                for g in inscritos:
                    aptos_z, abst_z = zona.get((uf, mun, z, dim, g), (0, 0))
                    taxas[g] = abst_z / aptos_z if aptos_z else real[1] / max(real[0], 1)
                for g, est in ajustar(inscritos, taxas, real[1]).items():
                    if g != "outro":
                        registro["g"][g] = [int(inscritos[g]), round(est)]
            saida[f"{uf}-{mun}-{z}-{local}"] = registro
        print(f"locais {uf}: {sum(k.startswith(uf + '-') for k in saida)}", flush=True)

    texto = json.dumps({"turno": int(TURNO), "dimensoes": aprovadas,
                        "validacao": {d: {"medianaPp": round(m, 1), "p90Pp": round(p, 1)} for d, (m, p) in validacao.items()},
                        "locais": dict(sorted(saida.items()))},
                       ensure_ascii=False, separators=(",", ":"))
    SAIDA.write_bytes(gzip.compress(texto.encode("utf-8"), mtime=0))
    print(f"{descartados} locais fora: eleitorado por perfil diferente dos aptos em mais de 10%")
    print(f"{len(saida)} locais em {SAIDA.relative_to(RAIZ)} ({SAIDA.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
