"""Monta os arquivos que o site lê, a partir dos boletins baixados e do cadastro
de locais de votação do TSE.

A unidade é a região: as urnas que ficam no mesmo ponto do mapa (coordenada
arredondada em 4 casas, uns 11 m) do mesmo município, somadas mesmo quando são
de zonas diferentes. Cada urna é a seção principal mais as agregadas a ela,
porque o eleitor da agregada vota na urna da principal.

Para cada região:
  eleitores   soma dos eleitores aptos de todas as urnas da região: o número do
              boletim quando ele existe, o do cadastro quando ainda não
  brancos, nulos, outros   tirados dos boletins de presidente
  abstencao   aptos do boletim menos comparecimento, só onde há boletim
  ate         brancos + nulos + abstenção + votos em quem não é Lula nem Flávio

Urna sem boletim não entra na conta. Região sem coordenada utilizável não vai
para o mapa. Região em que o Flávio passa cada candidato e também brancos,
nulos e abstenção fica marcada como contexto.

Saída em public/dados/: indice.json, celulas/{lat}_{lon}.json (quadrados de
0,25 grau), busca/{prefixo}.json (bairros e municípios para a busca de
endereço sem serviço de fora), exemplo.json e painel.json (números de acompanhamento para /dash,
incluindo o andamento do download lido de dados/bruto/boletins/andamento.log).

Uso: python scripts/montar_dados.py   (precisa de pandas e pyarrow)

Autor: Matheus C. Pestana
"""

from __future__ import annotations

import ast
import json
import os
import re
import unicodedata
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from boletim import BoletimInvalido, ler_presidente

RAIZ = Path(__file__).resolve().parent.parent
BOLETINS = RAIZ / "dados" / "bruto" / "boletins"
SAIDA = RAIZ / "public" / "dados"
ELEICOES = Path(os.environ.get("ELEICOES2026", Path.home() / "Documents/Datasets/Eleicoes2026"))
LOCAIS = ELEICOES / "data/raw/eleitorado/2026-08-13"
CANDIDATOS = ELEICOES / "data/raw/candidaturas/2026-10-03/consulta_cand_2026_BR.parquet"

LULA, FLAVIO = 13, 22
CELULA = 0.25
UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
       "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"]
NOMES_CURTOS = {13: "Lula", 22: "Flávio Bolsonaro", 70: "Augusto Cury", 14: "Renan Santos",
                55: "Ronaldo Caiado", 30: "Romeu Zema"}
MINUSCULAS = {"de", "da", "do", "das", "dos", "e", "em", "na", "no", "nas", "nos", "a", "o"}
SIGLAS = {"ee", "em", "emef", "emei", "ceu", "cei", "ciep", "ufrj", "usp", "sesi", "senai",
          "ii", "iii", "iv", "vi", "vii", "viii", "ix", "xi", "xv", "xx", "cmei", "caic",
          "eeef", "eefm", "ufpe", "ufmg", "ufba", "ufpr", "unb", "sesc", "ifsp", "ifrj"}


def titulo(texto: str) -> str:
    palavras = []
    for i, p in enumerate(str(texto or "").strip().lower().split()):
        nua = re.sub(r"[^\wà-ú]", "", p)
        if nua in SIGLAS:
            palavras.append(p.upper())
        elif i > 0 and nua in MINUSCULAS:
            palavras.append(p)
        else:
            palavras.append(p[:1].upper() + p[1:])
    return " ".join(palavras)


def normalizar(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", str(texto or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", sem_acento.lower())).strip()


def coordenada(lat: str, lon: str) -> tuple[float, float] | None:
    try:
        la = float(str(lat).replace(",", "."))
        lo = float(str(lon).replace(",", "."))
    except ValueError:
        return None
    if la in (0, -1) or lo in (0, -1):
        return None
    if not (-34.0 <= la <= 5.5 and -74.5 <= lo <= -28.5):
        return None
    return la, lo


def ler_boletim(caminho: str):
    try:
        b = ler_presidente(Path(caminho).read_bytes())
    except BoletimInvalido as erro:
        return caminho, None, str(erro)
    return caminho, (b.municipio, b.zona, b.local, b.secao, b.comparecimento,
                     b.brancos, b.nulos, b.nominais, b.aptos), None


def nomes_candidatos() -> dict[int, str]:
    df = pd.read_parquet(CANDIDATOS)
    df = df[df["DS_CARGO"].str.upper() == "PRESIDENTE"]
    por_numero: dict[int, list[str]] = defaultdict(list)
    for _, linha in df.iterrows():
        numero = int(linha["NR_CANDIDATO"])
        por_numero[numero].append(f"{titulo(linha['NM_URNA_CANDIDATO'])} ({linha['SG_PARTIDO']})")
    nomes = {}
    for numero, lista in por_numero.items():
        if numero in NOMES_CURTOS:
            nomes[numero] = NOMES_CURTOS[numero]
        elif len(set(lista)) == 1:
            nomes[numero] = titulo(lista[0].rsplit(" (", 1)[0])
        else:
            nomes[numero] = f"número {numero}"
    return nomes


def montar_uf(uf: str, boletins: dict, recusas: Counter) -> tuple[list[dict], dict]:
    df = pd.read_parquet(LOCAIS / f"eleitorado_local_votacao_2026_{uf}.parquet")
    df = df[df["NR_TURNO"].astype(str) == "1"]

    locais: dict[tuple, dict] = {}
    urnas: dict[tuple, dict] = {}
    for linha in df.itertuples(index=False):
        mun = str(linha.CD_MUNICIPIO).zfill(5)
        zona = int(linha.NR_ZONA)
        secao = int(linha.NR_SECAO)
        agregada = str(linha.CD_TIPO_SECAO_AGREGADA) == "2"
        principal = int(linha.NR_SECAO_PRINCIPAL) if agregada else secao
        chave_local = (mun, zona, int(linha.NR_LOCAL_VOTACAO))
        if chave_local not in locais:
            locais[chave_local] = {
                "municipio": titulo(linha.NM_MUNICIPIO),
                "nome": titulo(linha.NM_LOCAL_VOTACAO),
                "endereco": titulo(linha.DS_ENDERECO),
                "bairro": titulo(linha.NM_BAIRRO) if str(linha.NM_BAIRRO or "").strip() else "",
                "coord": coordenada(linha.NR_LATITUDE, linha.NR_LONGITUDE),
            }
        urna = urnas.setdefault((mun, zona, principal), {"eleitores": 0, "local": None, "secoes": []})
        urna["eleitores"] += int(linha.QT_ELEITOR_SECAO or 0)
        urna["secoes"].append(secao)
        if not agregada:
            urna["local"] = chave_local

    regioes: dict[tuple, dict] = {}
    sem_coordenada = 0
    com_boletim = 0
    for (mun, zona, principal), urna in urnas.items():
        b = boletins.get((mun, zona, principal))
        chave_local = urna["local"]
        if b is not None:
            com_boletim += 1
            local_bu = (mun, zona, b[2])
            if local_bu in locais:
                chave_local = local_bu
        if chave_local is None or chave_local not in locais:
            continue
        local = locais[chave_local]
        if local["coord"] is None:
            sem_coordenada += 1
            continue
        lat, lon = local["coord"]
        chave = (mun, round(lat, 4), round(lon, 4))
        r = regioes.setdefault(chave, {
            "uf": uf, "municipio": local["municipio"], "lat": round(lat, 5), "lon": round(lon, 5),
            "bairros": Counter(), "locais": {}, "eleitores": 0, "urnas": 0, "apuradas": 0,
            "brancos": 0, "nulos": 0, "abstencao": 0, "lula": 0, "flavio": 0, "outros": Counter(),
        })
        if local["bairro"]:
            r["bairros"][local["bairro"]] += 1
        nome_local = r["locais"].setdefault(chave_local, {
            "nome": local["nome"], "endereco": local["endereco"], "secoes": []})
        nome_local["secoes"].append([zona, principal])
        r["urnas"] += 1
        if b is None:
            r["eleitores"] += urna["eleitores"]
            continue
        _, _, _, _, comparecimento, brancos, nulos, nominais, aptos = b
        r["eleitores"] += aptos
        if urna["eleitores"] < comparecimento:
            recusas["eleitorado menor que comparecimento"] += 1
        abstencao = aptos - comparecimento
        r["apuradas"] += 1
        r["brancos"] += brancos
        r["nulos"] += nulos
        r["abstencao"] += abstencao
        for numero, qtd in nominais.items():
            if numero == LULA:
                r["lula"] += qtd
            elif numero == FLAVIO:
                r["flavio"] += qtd
            else:
                r["outros"][numero] += qtd

    saida = []
    for (mun, la, lo), r in regioes.items():
        registro = {
            "id": f"{uf.lower()}-{mun}-{la:.4f}-{lo:.4f}",
            "uf": uf, "municipio": r["municipio"],
            "bairro": r["bairros"].most_common(1)[0][0] if r["bairros"] else "",
            "lat": r["lat"], "lon": r["lon"],
            "locais": [{"nome": v["nome"], "endereco": v["endereco"],
                        "secoes": sorted(v["secoes"])} for v in r["locais"].values()],
            "eleitores": r["eleitores"], "urnas": r["urnas"], "apuradas": r["apuradas"],
            "votos": None,
        }
        if r["apuradas"]:
            outros = {str(n): q for n, q in r["outros"].most_common() if q}
            ate = r["brancos"] + r["nulos"] + r["abstencao"] + sum(outros.values())
            rivais = [r["lula"], r["brancos"], r["nulos"], r["abstencao"], *outros.values()]
            registro["votos"] = {
                "brancos": r["brancos"], "nulos": r["nulos"], "abstencao": r["abstencao"],
                "outros": outros, "lula": r["lula"], "flavio": r["flavio"], "ate": ate,
                "flavioDomina": all(r["flavio"] > v for v in rivais),
            }
        saida.append(registro)
    resumo = {"urnas": len(urnas), "comBoletim": com_boletim, "semCoordenada": sem_coordenada,
              "regioes": len(saida)}
    return saida, resumo


def votos_da_uf(regioes: list[dict]) -> dict:
    """Somas por estado para o painel. Só entram urnas com boletim."""
    soma = Counter()
    municipios = set()
    for r in regioes:
        municipios.add(r["municipio"])
        soma["regioes"] += 1
        soma["eleitoresNoMapa"] += r["eleitores"]
        soma["urnasNoMapa"] += r["urnas"]
        soma["apuradas"] += r["apuradas"]
        v = r["votos"]
        if not v:
            continue
        soma["regioesComVotos"] += 1
        for campo in ("lula", "flavio", "brancos", "nulos", "abstencao", "ate"):
            soma[campo] += v[campo]
        soma["outros"] += sum(v["outros"].values())
        if v["flavio"] > v["lula"]:
            soma["flavioNaFrente"] += 1
            if v["brancos"] + v["nulos"] + v["abstencao"] > v["flavio"] - v["lula"]:
                soma["viraveis"] += 1
        else:
            soma["lulaNaFrente"] += 1
    return {**soma, "municipios": len(municipios)}


def andamento_download() -> dict:
    """Último estado do download de cada UF, lido do log do baixar_boletins.py."""
    log = BOLETINS / "andamento.log"
    saida: dict[str, dict] = {}
    if not log.exists():
        return saida
    for linha in log.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^(\S+ \S+) ([a-z]{2}): (.*)$", linha)
        if not m:
            continue
        quando, uf, resto = m.group(1), m.group(2).upper(), m.group(3)
        d = saida.setdefault(uf, {})
        if pub := re.match(r"^(\d+) seções com boletim publicado", resto):
            d.update({"publicadas": int(pub.group(1)), "inicio": quando, "contagem": {}, "pronto": False})
        elif prog := re.match(r"^(?:pronto|(\d+)/\d+) (\{.*\})$", resto):
            d.update({"contagem": ast.literal_eval(prog.group(2)), "atualizado": quando,
                      "pronto": resto.startswith("pronto"), "processadas": int(prog.group(1) or 0)})
            if d["pronto"]:
                d["processadas"] = sum(d["contagem"].values())
    return saida


# Palavras comuns demais em nome de bairro para servir de chave da busca.
GENERICAS = {"jardim", "jardins", "vila", "parque", "conjunto", "residencial", "bairro", "cidade",
             "nova", "novo", "santa", "santo", "sao", "nossa", "senhora", "loteamento", "setor",
             "chacara", "chacaras", "recanto", "condominio", "habitacional", "quadra", "zona",
             "rural", "urbana", "centro", "alto", "baixo", "jd", "vl", "pq", "res", "cj",
             "povoado", "distrito", "sitio", "fazenda", "comunidade", "assentamento", "aldeia",
             "localidade", "colonia", "linha", "gleba"}


def chaves_busca(nome: str) -> set[str]:
    """Prefixos de 3 letras sob os quais o nome entra no índice de busca."""
    palavras = normalizar(nome).split()
    boas = [p for p in palavras if len(p) >= 4 and p not in GENERICAS]
    if not boas:
        boas = [p for p in palavras if len(p) >= 3] or palavras[:1]
    return {p[:3] for p in boas if p}


def indice_busca(regioes: list[dict]) -> dict[str, list[dict]]:
    """Bairros e municípios com o centro ponderado pelo eleitorado de cada região."""
    grupos: dict[tuple, list] = defaultdict(lambda: [0.0, 0.0, 0])
    for r in regioes:
        peso = max(r["eleitores"], 1)
        chaves = [("m", r["municipio"], "", r["uf"])]
        if r["bairro"]:
            chaves.append(("b", r["bairro"], r["municipio"], r["uf"]))
        for chave in chaves:
            g = grupos[chave]
            g[0] += r["lat"] * peso
            g[1] += r["lon"] * peso
            g[2] += peso
    arquivos: dict[str, list[dict]] = defaultdict(list)
    for (tipo, nome, municipio, uf), (slat, slon, peso) in grupos.items():
        entrada = {"t": tipo, "n": nome, "uf": uf, "lat": round(slat / peso, 5),
                   "lon": round(slon / peso, 5), "e": peso}
        if municipio:
            entrada["m"] = municipio
        for chave in chaves_busca(nome):
            arquivos[chave].append(entrada)
    for lista in arquivos.values():
        lista.sort(key=lambda x: -x["e"])
    return arquivos


def exemplo(regioes: list[dict]) -> list[dict]:
    """Números inventados, de propósito, para quando não houver boletim. Marcados."""
    amostra = [r for r in regioes if r["municipio"] in ("São Paulo", "Recife", "Boa Vista")][:600]
    saida = []
    for i, r in enumerate(amostra):
        e = max(r["eleitores"], 300)
        brancos, nulos = (i * 7) % 40 + 5, (i * 11) % 50 + 8
        abst = int(e * (0.12 + (i % 9) / 100))
        outros = {"70": (i * 13) % 60, "14": (i * 5) % 45, "55": (i * 3) % 30, "30": i % 20}
        flavio = int(e * (0.25 + (i % 7) / 20))
        lula = int(e * 0.3)
        rivais = [lula, brancos, nulos, abst, *outros.values()]
        saida.append({**r, "exemplo": True, "apuradas": r["urnas"], "votos": {
            "brancos": brancos, "nulos": nulos, "abstencao": abst, "outros": outros,
            "lula": lula, "flavio": flavio, "ate": brancos + nulos + abst + sum(outros.values()),
            "flavioDomina": all(flavio > v for v in rivais)}})
    return saida


def main() -> None:
    caminhos = [str(p) for p in BOLETINS.rglob("*.bu")]
    print(f"{len(caminhos)} boletins no disco")
    boletins: dict[str, dict] = defaultdict(dict)
    recusas: Counter = Counter()
    no_disco: Counter = Counter()
    invalidos: Counter = Counter()
    with ProcessPoolExecutor() as pool:
        for caminho, dado, erro in pool.map(ler_boletim, caminhos, chunksize=256):
            uf = Path(caminho).parts[-3].upper()
            no_disco[uf] += 1
            if dado is None:
                recusas[erro[:80]] += 1
                invalidos[uf] += 1
                continue
            mun, zona, _local, secao = dado[0], dado[1], dado[2], dado[3]
            boletins[uf][(mun, zona, secao)] = dado

    (SAIDA / "celulas").mkdir(parents=True, exist_ok=True)
    (SAIDA / "secoes").mkdir(parents=True, exist_ok=True)
    for velho in (SAIDA / "celulas").glob("*.json"):
        velho.unlink()
    celulas: dict[str, list] = defaultdict(list)
    resumo_ufs = {}
    painel_ufs = {}
    download = andamento_download()
    todas = []
    for uf in UFS:
        antes = recusas["eleitorado menor que comparecimento"]
        regioes, resumo = montar_uf(uf, boletins.get(uf, {}), recusas)
        resumo_ufs[uf] = resumo
        painel_ufs[uf] = {
            **resumo,
            **votos_da_uf(regioes),
            "noDisco": no_disco[uf],
            "invalidos": invalidos[uf],
            "eleitoradoMenor": recusas["eleitorado menor que comparecimento"] - antes,
            "download": download.get(uf, {}),
        }
        todas.extend(regioes)
        for r in regioes:
            chave = f"{int(r['lat'] // CELULA)}_{int(r['lon'] // CELULA)}"
            celulas[chave].append(r)
        print(uf, resumo)

    # Publica um índice estadual para a ficha da região abrir o resultado de
    # cada urna sem duplicar os BUs no site. Seções agregadas aparecem junto
    # da seção principal no cadastro do eleitorado e não têm BU próprio.
    for uf in UFS:
        urnas = {}
        for (mun, zona, secao), dado in boletins.get(uf, {}).items():
            _, _, _, _, comparecimento, brancos, nulos, nominais, aptos = dado
            urnas[f"{mun}-{zona:04d}-{secao:04d}"] = {
                "aptos": aptos,
                "comparecimento": comparecimento,
                "brancos": brancos,
                "nulos": nulos,
                "nominais": {str(n): qtd for n, qtd in nominais.items()},
            }
        caminho = SAIDA / "secoes" / f"{uf.lower()}.json"
        parcial = caminho.with_suffix(".json.parcial")
        parcial.write_text(json.dumps({
            "eleicao": 6257,
            "pleito": 3220,
            "geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "urnas": urnas,
        }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        parcial.replace(caminho)
    for chave, lista in celulas.items():
        with open(SAIDA / "celulas" / f"{chave}.json", "w", encoding="utf-8") as f:
            json.dump(lista, f, ensure_ascii=False, separators=(",", ":"))

    (SAIDA / "busca").mkdir(parents=True, exist_ok=True)
    for velho in (SAIDA / "busca").glob("*.json"):
        velho.unlink()
    for chave, lista in indice_busca(todas).items():
        with open(SAIDA / "busca" / f"{chave}.json", "w", encoding="utf-8") as f:
            json.dump(lista, f, ensure_ascii=False, separators=(",", ":"))

    indice = {
        "geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "celula": CELULA,
        "candidatos": {str(k): v for k, v in sorted(nomes_candidatos().items())},
        "ufs": resumo_ufs,
        "boletinsLidos": sum(len(v) for v in boletins.values()),
        "recusas": dict(recusas),
        "fontes": {
            "boletins": "https://resultados.tse.jus.br (boletins de urna, eleição 6257, pleito 3220)",
            "locais": "TSE, eleitorado_local_votacao_2026, gerado em 13/08/2026",
        },
    }
    with open(SAIDA / "indice.json", "w", encoding="utf-8") as f:
        json.dump(indice, f, ensure_ascii=False, indent=1)
    with open(SAIDA / "exemplo.json", "w", encoding="utf-8") as f:
        json.dump(exemplo(todas), f, ensure_ascii=False, separators=(",", ":"))
    painel = {
        "geradoEm": indice["geradoEm"],
        "boletinsLidos": indice["boletinsLidos"],
        "boletinsNoDisco": sum(no_disco.values()),
        "recusas": dict(recusas),
        "celulas": len(celulas),
        "candidatos": indice["candidatos"],
        "ufs": painel_ufs,
    }
    with open(SAIDA / "painel.json", "w", encoding="utf-8") as f:
        json.dump(painel, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(celulas)} células, {indice['boletinsLidos']} boletins, recusas {dict(recusas)}")


if __name__ == "__main__":
    main()
