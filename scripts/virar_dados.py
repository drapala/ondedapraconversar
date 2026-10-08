"""Vira os arquivos de public/dados para o lado do Flávio Bolsonaro, sem baixar
de novo os boletins de 2026.

O montar_dados.py precisa do cadastro de locais de 2026 e das candidaturas
(ELEICOES2026), que não estão neste repositório. Os boletins já somados estão
em public/dados. Este script lê esses arquivos e grava de novo o que muda de
lado:

  lulaDomina      a região em que o Lula passa cada rival (era flavioDomina)
  viraveis        regiões com o Lula na frente, onde brancos, nulos e abstenção
                  passam a diferença (era com o Flávio na frente)
  bolsonaro2022   votos de Jair Bolsonaro (22) no 2º turno de 2022 em cada região
                  (era lula2022, votos do 13)

Os locais de 2022 entram na região de 2026 que tem as mesmas seções na mesma
zona e município, se o nome bater; senão, na região do mesmo município a até
150 m, como em montar_dados.ligar_locais_2022. Antes de gravar, o script liga
também os votos do Lula de 2022 e compara com o lula2022 que já estava em cada
região. Se a ligação não reproduzir o que o montar_dados.py fez, nada é gravado.

Uso: uv run --with pandas python scripts/virar_dados.py
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path
from zipfile import ZipFile

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from montar_dados import normalizar, palavras_do_local  # noqa: E402
from resultados_2022 import LOCAIS, SECOES, carregar, carregar_por_bairro  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "public" / "dados"
LULA, BOLSONARO = 13, 22
# A ligação precisa reproduzir o lula2022 que já estava gravado. Abaixo disso,
# alguma coisa mudou entre o montar_dados.py e este script.
MINIMO_IGUAIS = 0.95
MAXIMO_DIFERENCA_TOTAL = 0.01


def ler_json(caminho: Path):
    return json.loads(caminho.read_text(encoding="utf-8"))


def gravar_json(caminho: Path, conteudo, compacto: bool = True) -> str:
    if compacto:
        texto = json.dumps(conteudo, ensure_ascii=False, separators=(",", ":"))
    else:
        texto = json.dumps(conteudo, ensure_ascii=False, indent=1)
    caminho.write_text(texto, encoding="utf-8")
    return texto


def lula_domina(v: dict) -> bool:
    rivais = [
        v["flavio"],
        v["brancos"],
        v["nulos"],
        v["abstencao"],
        *v["outros"].values(),
    ]
    return all(v["lula"] > r for r in rivais)


def votos_2022_por_local() -> tuple[dict, dict]:
    """Votos do 13 e do 22 no 2º turno de 2022 por local, e o local de cada seção."""
    votos: dict[tuple, Counter] = defaultdict(Counter)
    nomes: dict[tuple, str] = {}
    secao_local: dict[tuple, tuple] = {}
    colunas = [
        "NR_TURNO",
        "SG_UF",
        "CD_CARGO",
        "CD_MUNICIPIO",
        "NR_ZONA",
        "NR_SECAO",
        "NR_LOCAL_VOTACAO",
        "NM_LOCAL_VOTACAO",
        "NR_VOTAVEL",
        "QT_VOTOS",
    ]
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
            chunksize=1_000_000,
        ):
            bloco = bloco[
                (bloco["CD_CARGO"] == "1")
                & (bloco["NR_TURNO"] == "2")
                & (bloco["SG_UF"] != "ZZ")
            ]
            if bloco.empty:
                continue
            bloco = bloco.assign(
                mun=bloco["CD_MUNICIPIO"].str.zfill(5),
                zona=bloco["NR_ZONA"].astype(int),
                secao=bloco["NR_SECAO"].astype(int),
                local=bloco["NR_LOCAL_VOTACAO"].astype(int),
                numero=pd.to_numeric(bloco["NR_VOTAVEL"], errors="coerce"),
                qtd=pd.to_numeric(bloco["QT_VOTOS"], errors="coerce")
                .fillna(0)
                .astype("int64"),
            )
            for linha in bloco.drop_duplicates(
                ["SG_UF", "mun", "zona", "secao"]
            ).itertuples(index=False):
                chave = (linha.SG_UF, linha.mun, linha.zona, linha.local)
                secao_local[(linha.SG_UF, linha.mun, linha.zona, linha.secao)] = chave
                nomes.setdefault(chave, linha.NM_LOCAL_VOTACAO)
            nominais = bloco[bloco["numero"].isin((LULA, BOLSONARO))]
            somas = nominais.groupby(["SG_UF", "mun", "zona", "local", "numero"])[
                "qtd"
            ].sum()
            for (uf, mun, zona, local, numero), qtd in somas.items():
                votos[(uf, mun, zona, local)][int(numero)] += int(qtd)
    locais = {
        chave: {"nome": nomes[chave], "votos": votos.get(chave, Counter())}
        for chave in nomes
    }
    return locais, secao_local


def coordenadas_2022(locais: dict) -> None:
    colunas = [
        "SG_UF",
        "CD_MUNICIPIO",
        "NR_ZONA",
        "NR_LOCAL_VOTACAO",
        "NR_LATITUDE",
        "NR_LONGITUDE",
    ]
    with ZipFile(LOCAIS) as arquivo:
        nome = next(n for n in arquivo.namelist() if n.endswith(".csv"))
        with arquivo.open(nome) as entrada:
            cadastro = pd.read_csv(
                entrada, sep=";", encoding="latin-1", dtype=str, usecols=colunas
            )
    for linha in cadastro.drop_duplicates(
        ["SG_UF", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO"]
    ).itertuples(index=False):
        chave = (
            linha.SG_UF,
            linha.CD_MUNICIPIO.zfill(5),
            int(linha.NR_ZONA),
            int(linha.NR_LOCAL_VOTACAO),
        )
        local = locais.get(chave)
        if local is None:
            continue
        try:
            lat = float(str(linha.NR_LATITUDE).replace(",", "."))
            lon = float(str(linha.NR_LONGITUDE).replace(",", "."))
        except ValueError:
            continue
        if -34 <= lat <= 5.5 and -74.5 <= lon <= -28.5 and lat not in (0, -1):
            local["lat"], local["lon"] = lat, lon


def ligar(regioes: list[dict], locais: dict, secao_local: dict) -> dict[tuple, dict]:
    """Região de 2026 de cada local de 2022."""
    secoes_por_local: dict[tuple, Counter] = defaultdict(Counter)
    perto: dict[tuple, list[dict]] = defaultdict(list)
    for r in regioes:
        mun = r["id"][3:8]
        for local in r["locais"]:
            for zona, secao in local["secoes"]:
                chave = secao_local.get((r["uf"], mun, zona, secao))
                if chave is not None:
                    secoes_por_local[chave][r["id"]] += 1
        perto[(r["uf"], mun, round(r["lat"], 2), round(r["lon"], 2))].append(r)
    por_id = {r["id"]: r for r in regioes}

    def mais_perto(uf: str, mun: str, lat: float, lon: float) -> dict | None:
        melhor, menor = None, 0.15
        for dla in (-0.01, 0, 0.01):
            for dlo in (-0.01, 0, 0.01):
                for r in perto.get(
                    (uf, mun, round(lat + dla, 2), round(lon + dlo, 2)), []
                ):
                    km = math.dist(
                        (lat * 111.32, lon * 111.32 * math.cos(math.radians(lat))),
                        (
                            r["lat"] * 111.32,
                            r["lon"] * 111.32 * math.cos(math.radians(lat)),
                        ),
                    )
                    if km <= menor:
                        melhor, menor = r, km
        return melhor

    ligacao: dict[tuple, dict] = {}
    for chave, local in locais.items():
        r = None
        if chave in secoes_por_local:
            r = por_id[secoes_por_local[chave].most_common(1)[0][0]]
            atual = palavras_do_local(local["nome"])
            if not any(
                len(atual & palavras_do_local(l["nome"])) * 2 >= max(len(atual), 1)
                for l in r["locais"]
            ):
                r = None
        if r is None and "lat" in local:
            r = mais_perto(chave[0], chave[1], local["lat"], local["lon"])
        if r is not None:
            ligacao[chave] = r
    return ligacao


def main() -> None:
    arquivos_celulas = sorted((SAIDA / "celulas").glob("*.json"))
    celulas = {c: ler_json(c) for c in arquivos_celulas}
    regioes = [r for lista in celulas.values() for r in lista]
    print(f"{len(regioes)} regiões em {len(celulas)} células")

    locais, secao_local = votos_2022_por_local()
    coordenadas_2022(locais)
    print(f"{len(locais)} locais de 2022, {len(secao_local)} seções")
    ligacao = ligar(regioes, locais, secao_local)

    lula_ligado: Counter = Counter()
    bolsonaro_ligado: Counter = Counter()
    for chave, r in ligacao.items():
        lula_ligado[r["id"]] += locais[chave]["votos"][LULA]
        bolsonaro_ligado[r["id"]] += locais[chave]["votos"][BOLSONARO]

    # Conferência: a ligação daqui reproduz o lula2022 do montar_dados.py?
    com_2022 = [r for r in regioes if "lula2022" in r]
    iguais = sum(1 for r in com_2022 if lula_ligado[r["id"]] == r["lula2022"])
    total_antes = sum(r["lula2022"] for r in com_2022)
    total_agora = sum(lula_ligado.values())
    taxa = iguais / max(len(com_2022), 1)
    diferenca = abs(total_agora - total_antes) / max(total_antes, 1)
    conferencia = {
        "regioesComLula2022": len(com_2022),
        "iguais": iguais,
        "taxaIguais": round(taxa, 4),
        "lula2022Antes": total_antes,
        "lula2022Agora": total_agora,
        "diferencaTotal": round(diferenca, 4),
        "regioesSo2022Agora": sum(
            1 for r in regioes if "lula2022" not in r and lula_ligado[r["id"]]
        ),
    }
    print("conferência", conferencia)
    if taxa < MINIMO_IGUAIS or diferenca > MAXIMO_DIFERENCA_TOTAL:
        sys.exit("a ligação não reproduz o lula2022 gravado; nada foi alterado")

    versao = hashlib.sha256()
    for caminho, lista in celulas.items():
        for r in lista:
            r.pop("lula2022", None)
            if bolsonaro_ligado[r["id"]]:
                r["bolsonaro2022"] = bolsonaro_ligado[r["id"]]
            v = r.get("votos")
            if v:
                v.pop("flavioDomina", None)
                v["lulaDomina"] = lula_domina(v)
        versao.update(caminho.name.encode() + gravar_json(caminho, lista).encode())

    por_id = {r["id"]: r for r in regioes}
    for caminho in sorted((SAIDA / "onde").glob("*-*.json")):
        linhas = ler_json(caminho)
        for linha in linhas:
            linha[15] = int(por_id[linha[0]]["votos"]["lulaDomina"])
        versao.update(caminho.name.encode() + gravar_json(caminho, linhas).encode())

    exemplos = ler_json(SAIDA / "exemplo.json")
    for r in exemplos:
        r.pop("lula2022", None)
        r["votos"].pop("flavioDomina", None)
        r["votos"]["lulaDomina"] = lula_domina(r["votos"])
    texto_exemplo = gravar_json(SAIDA / "exemplo.json", exemplos)
    versao.update(texto_exemplo.encode())

    painel = ler_json(SAIDA / "painel.json")
    por_uf: dict[str, Counter] = defaultdict(Counter)
    for r in regioes:
        v = r.get("votos")
        if not v:
            continue
        if v["lula"] > v["flavio"]:
            por_uf[r["uf"]]["lulaNaFrente"] += 1
            if v["brancos"] + v["nulos"] + v["abstencao"] > v["lula"] - v["flavio"]:
                por_uf[r["uf"]]["viraveis"] += 1
        else:
            por_uf[r["uf"]]["flavioNaFrente"] += 1
    for uf, dados in painel["ufs"].items():
        for campo in ("lulaNaFrente", "flavioNaFrente", "viraveis"):
            dados[campo] = por_uf[uf][campo]
    gravar_json(SAIDA / "painel.json", painel)

    relatorio = ler_json(SAIDA / "relatorio.json")
    municipios_2022 = carregar()
    bairros_2022 = carregar_por_bairro(normalizar)
    validos_iguais = validos_total = 0
    for cidade in relatorio["municipios"]:
        antes = cidade.pop("lula2022", {}) or {}
        turnos = municipios_2022.get(cidade["id"], {}).get("turnos", {})
        cidade["bolsonaro2022"] = {
            "primeiroTurno": turnos.get("1"),
            "segundoTurno": turnos.get("2"),
        }
        for turno, nome in (("1", "primeiroTurno"), ("2", "segundoTurno")):
            if antes.get(nome):
                validos_total += 1
                validos_iguais += (turnos.get(turno) or {}).get("validos") == antes[
                    nome
                ]["validos"]
    for bairro in relatorio["bairros"]:
        antes = bairro.pop("lula2022", {}) or {}
        turnos = bairros_2022.get(
            f"{bairro['municipioId']}|{normalizar(bairro['nome'])}", {}
        )
        bairro["bolsonaro2022"] = {
            "primeiroTurno": turnos.get("1"),
            "segundoTurno": turnos.get("2"),
        }
        for turno, nome in (("1", "primeiroTurno"), ("2", "segundoTurno")):
            if antes.get(nome):
                validos_total += 1
                validos_iguais += (turnos.get(turno) or {}).get("validos") == antes[
                    nome
                ]["validos"]
    conferencia["relatorioValidosIguais"] = f"{validos_iguais}/{validos_total}"
    print(
        "relatório: válidos de 2022 iguais aos de antes em",
        conferencia["relatorioValidosIguais"],
    )
    if validos_iguais < validos_total * MINIMO_IGUAIS:
        sys.exit(
            "o relatório de 2022 não bate com o de antes; células já gravadas, relatório não"
        )
    relatorio["fonte2022Bairros"] = relatorio["fonte2022Bairros"].replace(
        "votacao_secao_2022_BR", "votacao_secao_2022_BR, número 22"
    )
    gravar_json(SAIDA / "relatorio.json", relatorio)

    indice = ler_json(SAIDA / "indice.json")
    indice["brasil"]["viraveis"] = sum(u["viraveis"] for u in painel["ufs"].values())
    versao.update(indice["versao"].encode())
    indice["versao"] = versao.hexdigest()[:12]
    gravar_json(SAIDA / "indice.json", indice, compacto=False)
    conferencia["viraveis"] = indice["brasil"]["viraveis"]
    conferencia["regioesComBolsonaro2022"] = sum(
        1 for r in regioes if "bolsonaro2022" in r
    )
    print("pronto", conferencia)


if __name__ == "__main__":
    main()
