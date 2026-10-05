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

Urna sem boletim não entra na conta. Local que o TSE publicou sem coordenada
usa a do CNEFE do IBGE, de dados/locais_cnefe.json (scripts/geocodificar_locais.py);
quando ela vem só da rua, da localidade ou do CEP, a região fica marcada como
aproximada. Local sem coordenada nenhuma não vai para o mapa. Região em que o Flávio passa cada candidato e também brancos,
nulos e abstenção fica marcada como contexto.

Saída em public/dados/: indice.json, relatorio.json (totais por cidade e bairro
e comparação de votos presidenciais municipais com 2022), celulas/{lat}_{lon}.json (quadrados de
0,25 grau), pontos/ (só as coordenadas, para as bolinhas do mapa antes da
busca: resumo.json com o país em pontos de uns 5 km, para o mapa visto de longe,
e {lat}_{lon}.json com cada local, em quadrados de 1 grau, para o mapa de perto),
busca/{prefixo}.json (bairros e municípios para a busca de
endereço sem serviço de fora), exemplo.json e painel.json (números de acompanhamento para /dash,
incluindo o andamento do download lido de dados/bruto/boletins/andamento.log).

Com dados/perfil_2022_locais.json.gz (scripts/estimar_perfil_2022.py), grava
também perfil2022/{lat}_{lon}.json: para cada região, quem mais deixou de votar
ali no 2º turno de 2022, estimado por perfil (ver aquele script).

O indice.json leva "versao", um resumo do conteúdo dos outros arquivos. O site
pede cada arquivo com ?v=versao e o navegador guarda por um ano: só baixa de
novo quando os dados mudam de verdade.

Uso: python scripts/montar_dados.py   (precisa de pandas e pyarrow)

Autor: Matheus C. Pestana
"""

from __future__ import annotations

import ast
import gzip
import hashlib
import json
import math
import os
import re
import unicodedata
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from boletim import BoletimInvalido, ler_presidente
from resultados_2022 import carregar as resultados_presidente_2022

RAIZ = Path(__file__).resolve().parent.parent
BOLETINS = RAIZ / "dados" / "bruto" / "boletins"
SAIDA = RAIZ / "public" / "dados"
ELEICOES = Path(os.environ.get("ELEICOES2026", Path.home() / "Documents/Datasets/Eleicoes2026"))
LOCAIS = ELEICOES / "data/raw/eleitorado/2026-08-13"
CNEFE = RAIZ / "dados" / "locais_cnefe.json"
PERFIL_2022 = RAIZ / "dados" / "perfil_2022_locais.json.gz"
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


def totais_relatorio() -> dict:
    return {"eleitores": 0, "urnas": 0, "apuradas": 0, "lula": 0, "flavio": 0,
            "brancos": 0, "nulos": 0, "abstencao": 0, "outros": 0}


def adicionar_total_relatorio(total: dict, urna: dict, boletim) -> None:
    total["urnas"] += 1
    total["eleitores"] += boletim[8] if boletim else urna["eleitores"]
    if boletim is None:
        return
    _, _, _, _, _, brancos, nulos, nominais, aptos = boletim
    total["apuradas"] += 1
    total["brancos"] += brancos
    total["nulos"] += nulos
    total["lula"] += nominais.get(LULA, 0)
    total["flavio"] += nominais.get(FLAVIO, 0)
    total["outros"] += sum(qtd for numero, qtd in nominais.items() if numero not in (LULA, FLAVIO))
    total["abstencao"] += aptos - boletim[4]


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


def coordenadas_cnefe() -> dict[str, dict]:
    return json.loads(CNEFE.read_text(encoding="utf-8")) if CNEFE.exists() else {}


def montar_uf(uf: str, boletins: dict, recusas: Counter, cnefe: dict[str, dict]) -> tuple[list[dict], dict]:
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
            coord = coordenada(linha.NR_LATITUDE, linha.NR_LONGITUDE)
            fonte, aprox = "tse", False
            if coord is None and (achado := cnefe.get(f"{uf}-{mun}-{zona}-{chave_local[2]}")):
                coord, fonte, aprox = (achado["lat"], achado["lon"]), "cnefe", bool(achado.get("aprox"))
            locais[chave_local] = {
                "municipio": titulo(linha.NM_MUNICIPIO),
                "nome": titulo(linha.NM_LOCAL_VOTACAO),
                "endereco": titulo(linha.DS_ENDERECO),
                "bairro": titulo(linha.NM_BAIRRO) if str(linha.NM_BAIRRO or "").strip() else "",
                "coord": coord, "fonte": fonte, "aprox": aprox,
            }
        urna = urnas.setdefault((mun, zona, principal), {"eleitores": 0, "local": None, "secoes": []})
        urna["eleitores"] += int(linha.QT_ELEITOR_SECAO or 0)
        urna["secoes"].append(secao)
        if not agregada:
            urna["local"] = chave_local

    regioes: dict[tuple, dict] = {}
    sem_coordenada = 0
    sem_local = 0
    pelo_cnefe = 0
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
            sem_local += 1
            continue
        local = locais[chave_local]
        if local["coord"] is None:
            sem_coordenada += 1
            continue
        if local["fonte"] == "cnefe":
            pelo_cnefe += 1
        lat, lon = local["coord"]
        chave = (mun, round(lat, 4), round(lon, 4))
        r = regioes.setdefault(chave, {
            "uf": uf, "municipio": local["municipio"], "lat": round(lat, 5), "lon": round(lon, 5),
            "bairros": Counter(), "locais": {}, "eleitores": 0, "urnas": 0, "apuradas": 0,
            "brancos": 0, "nulos": 0, "abstencao": 0, "lula": 0, "flavio": 0, "outros": Counter(),
            "_relatorio": totais_relatorio(), "_bairros_relatorio": {},
        })
        if local["bairro"]:
            r["bairros"][local["bairro"]] += 1
        nome_local = r["locais"].setdefault(chave_local, {
            "nome": local["nome"], "endereco": local["endereco"], "secoes": [], "aprox": local["aprox"]})
        nome_local["secoes"].append([zona, principal])
        r["urnas"] += 1
        adicionar_total_relatorio(r["_relatorio"], urna, b)
        bairro = local["bairro"]
        chave_bairro = normalizar(bairro)
        bairro_relatorio = r["_bairros_relatorio"].setdefault(
            chave_bairro, {"nome": bairro, **totais_relatorio()})
        adicionar_total_relatorio(bairro_relatorio, urna, b)
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
                        "secoes": sorted(v["secoes"])} | ({"aprox": True} if v["aprox"] else {})
                       for v in r["locais"].values()],
            "eleitores": r["eleitores"], "urnas": r["urnas"], "apuradas": r["apuradas"],
            "votos": None,
            # Só para ligar ao perfil de 2022; sai antes de gravar.
            "_tse": [[z, local] for (_, z, local) in r["locais"]],
            "_relatorio": r["_relatorio"],
            "_bairros_relatorio": r["_bairros_relatorio"],
        }
        # O ponto é aproximado só se nenhum local dele tem coordenada exata.
        if all(v["aprox"] for v in r["locais"].values()):
            registro["aprox"] = True
            if len(r["locais"]) > 1:
                recusas["locais aproximados juntados no mesmo ponto"] += len(r["locais"]) - 1
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
              "semLocal": sem_local, "peloCnefe": pelo_cnefe, "regioes": len(saida)}
    return saida, resumo


ESCALA_RESUMO = 20  # vigésimos de grau, uns 5 km


def codificar_pontos(unicos: set[tuple[int, int]], escala: int) -> dict:
    """Coordenadas inteiras (grau vezes a escala), sem repetição, em ordem e
    gravadas como diferença do ponto anterior, que comprime bem."""
    diferencas: list[int] = []
    lat_antes = lon_antes = 0
    for lat, lon in sorted(unicos):
        diferencas += [lat - lat_antes, lon - lon_antes]
        lat_antes, lon_antes = lat, lon
    return {"escala": escala, "d": diferencas}


def pontos_do_mapa(regioes: list[dict]) -> dict[str, dict]:
    """Onde há local de votação, para as bolinhas do mapa antes da busca.

    O resumo serve ao mapa visto de longe; cada quadrado de 1 grau, com os
    pontos em milésimos de grau (uns 100 m), só é baixado quando o mapa chega
    perto dele. Quem abre o mapa na própria cidade baixa um ou dois quadrados.
    """
    resumo = {(round(r["lat"] * ESCALA_RESUMO), round(r["lon"] * ESCALA_RESUMO)) for r in regioes}
    quadrados: dict[str, set[tuple[int, int]]] = defaultdict(set)
    for r in regioes:
        quadrados[f"{math.floor(r['lat'])}_{math.floor(r['lon'])}"].add((round(r["lat"] * 1000), round(r["lon"] * 1000)))
    saida = {"resumo": codificar_pontos(resumo, ESCALA_RESUMO)}
    saida.update({chave: codificar_pontos(pontos, 1000) for chave, pontos in quadrados.items()})
    return saida


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


# Grupos do perfil de 2022 e a ordem das dimensões (scripts/estimar_perfil_2022.py).
DIMENSOES_2022 = {
    "idade": ["16-17", "18-24", "25-34", "35-44", "45-59", "60-69", "70+"],
    "genero": ["mulheres", "homens"],
    "escolaridade": ["fund_incompleto", "fund_completo", "medio_completo", "superior"],
}
MIN_INSCRITOS_GRUPO = 30
ACIMA_DA_MEDIA = 1.15
PALAVRAS_GENERICAS_LOCAL = {"escola", "municipal", "estadual", "colegio", "creche", "centro", "educacional",
                            "ensino", "fundamental", "medio", "unidade", "escolar", "grupo", "predio", "emef",
                            "emei", "ee", "em", "eef", "eem", "eefm", "professor", "professora", "de", "da",
                            "do", "das", "dos"}


def palavras_do_local(nome: str) -> set[str]:
    return {p for p in normalizar(nome).split() if len(p) > 2 and p not in PALAVRAS_GENERICAS_LOCAL}


def perfil_2022(regioes: list[dict]) -> dict[str, dict]:
    """Quem mais faltou no 2º turno de 2022 em cada região, pelos locais de 2022 dela.

    Um local de 2022 entra na região que tem o mesmo número de local na mesma
    zona e município, se o nome bater; senão, na região do mesmo município a até
    150 m. Por região: aptos e abstenção reais e até três destaques (um por
    dimensão), os grupos com abstenção estimada bem acima da média dali.
    """
    if not PERFIL_2022.exists():
        return {}
    dados = json.loads(gzip.decompress(PERFIL_2022.read_bytes()))
    dimensoes = [d for d in DIMENSOES_2022 if d in dados["dimensoes"]]
    por_numero: dict[tuple, dict] = {}
    perto: dict[tuple, list[dict]] = defaultdict(list)
    for r in regioes:
        mun = r["id"][3:8]
        for z, local in r["_tse"]:
            por_numero[(r["uf"], mun, z, local)] = r
        perto[(r["uf"], mun, round(r["lat"], 2), round(r["lon"], 2))].append(r)

    def mais_perto(uf: str, mun: str, lat: float, lon: float) -> dict | None:
        melhor, menor = None, 0.15
        for dla in (-0.01, 0, 0.01):
            for dlo in (-0.01, 0, 0.01):
                for r in perto.get((uf, mun, round(lat + dla, 2), round(lon + dlo, 2)), []):
                    km = math.dist((lat * 111.32, lon * 111.32 * math.cos(math.radians(lat))),
                                   (r["lat"] * 111.32, r["lon"] * 111.32 * math.cos(math.radians(lat))))
                    if km <= menor:
                        melhor, menor = r, km
        return melhor

    somas: dict[str, dict] = {}
    for chave, local in dados["locais"].items():
        uf, mun, z, numero = chave.split("-")
        r = por_numero.get((uf, mun, int(z), int(numero)))
        if r is not None:
            nomes = [l["nome"] for l in r["locais"]]
            atual = palavras_do_local(local["nome"])
            if not any(len(atual & palavras_do_local(n)) * 2 >= max(len(atual), 1) for n in nomes):
                r = None
        if r is None and "lat" in local:
            r = mais_perto(uf, mun, local["lat"], local["lon"])
        if r is None:
            continue
        soma = somas.setdefault(r["id"], {"aptos": 0, "abst": 0, "g": defaultdict(lambda: [0, 0])})
        soma["aptos"] += local["aptos"]
        soma["abst"] += local["abst"]
        for g, (inscritos, abst) in local["g"].items():
            soma["g"][g][0] += inscritos
            soma["g"][g][1] += abst

    saida = {}
    for id_, soma in somas.items():
        if soma["aptos"] <= 0:
            continue
        media = soma["abst"] / soma["aptos"]
        destaques = []
        for dim in dimensoes:
            candidatos = [(abst / inscritos, g, inscritos, abst) for g in DIMENSOES_2022[dim]
                          for inscritos, abst in [soma["g"].get(g, (0, 0))]
                          if inscritos >= MIN_INSCRITOS_GRUPO and abst / inscritos >= media * ACIMA_DA_MEDIA]
            if candidatos:
                _, g, inscritos, abst = max(candidatos)
                destaques.append({"g": g, "inscritos": inscritos, "abstencao": abst})
        destaques.sort(key=lambda d: -d["abstencao"] / d["inscritos"])
        saida[id_] = {"aptos": soma["aptos"], "abstencao": soma["abst"], "destaques": destaques[:3]}
    return saida


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


def montar_relatorio(regioes: list[dict], resultados_2022: dict) -> dict:
    """Totais de cidade e bairro sem cruzar pessoas ou reatribuir bairros pelo mapa."""
    cidades: dict[str, dict] = {}
    bairros: dict[tuple[str, str], dict] = {}
    for regiao in regioes:
        codigo = regiao["id"].split("-")[1]
        cidade = cidades.setdefault(codigo, {
            "id": codigo, "uf": regiao["uf"], "municipio": regiao["municipio"], **totais_relatorio()})
        for campo, quantidade in regiao["_relatorio"].items():
            cidade[campo] += quantidade
        for chave, total in regiao["_bairros_relatorio"].items():
            bairro = bairros.setdefault((codigo, chave), {
                "municipioId": codigo, "uf": regiao["uf"], "municipio": regiao["municipio"],
                "nome": total["nome"], **totais_relatorio()})
            for campo in totais_relatorio():
                bairro[campo] += total[campo]

    for cidade in cidades.values():
        validos = cidade["lula"] + cidade["flavio"] + cidade["outros"]
        cidade["validos"] = validos
        cidade["comparecimento"] = validos + cidade["brancos"] + cidade["nulos"]
        historico = resultados_2022.get(cidade["id"], {}).get("turnos", {})
        cidade["lula2022"] = {
            "primeiroTurno": historico.get("1"),
            "segundoTurno": historico.get("2"),
        }
    for bairro in bairros.values():
        validos = bairro["lula"] + bairro["flavio"] + bairro["outros"]
        bairro["validos"] = validos
        bairro["comparecimento"] = validos + bairro["brancos"] + bairro["nulos"]

    return {
        "geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fonte2022": "TSE, votação nominal por município e zona, eleição presidencial de 2022",
        "urlFonte2022": "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip",
        "fonte2026": "TSE, boletins de urna do 1º turno de 2026; locais de votação do cadastro eleitoral",
        "municipios": sorted(cidades.values(), key=lambda x: (x["uf"], x["municipio"])),
        "bairros": sorted(bairros.values(), key=lambda x: (x["uf"], x["municipio"], x["nome"])),
    }


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
    cnefe = coordenadas_cnefe()
    todas = []
    for uf in UFS:
        antes = recusas["eleitorado menor que comparecimento"]
        regioes, resumo = montar_uf(uf, boletins.get(uf, {}), recusas, cnefe)
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
    versao = hashlib.sha256()
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
        versao.update(json.dumps(urnas, sort_keys=True).encode())

    def gravar(caminho: Path, conteudo) -> None:
        texto = json.dumps(conteudo, ensure_ascii=False, separators=(",", ":"))
        caminho.write_text(texto, encoding="utf-8")
        versao.update(caminho.name.encode() + texto.encode())

    relatorio = montar_relatorio(todas, resultados_presidente_2022())
    gravar(SAIDA / "relatorio.json", relatorio)

    perfis = perfil_2022(todas)
    for r in todas:
        r.pop("_tse", None)
        r.pop("_relatorio", None)
        r.pop("_bairros_relatorio", None)
    (SAIDA / "perfil2022").mkdir(parents=True, exist_ok=True)
    for velho in (SAIDA / "perfil2022").glob("*.json"):
        velho.unlink()
    perfis_por_celula: dict[str, dict] = defaultdict(dict)
    for chave, lista in celulas.items():
        for r in lista:
            if r["id"] in perfis:
                perfis_por_celula[chave][r["id"]] = perfis[r["id"]]
    for chave, conteudo in sorted(perfis_por_celula.items()):
        gravar(SAIDA / "perfil2022" / f"{chave}.json", dict(sorted(conteudo.items())))

    for chave, lista in sorted(celulas.items()):
        gravar(SAIDA / "celulas" / f"{chave}.json", lista)
    (SAIDA / "pontos.json").unlink(missing_ok=True)
    (SAIDA / "pontos").mkdir(parents=True, exist_ok=True)
    for velho in (SAIDA / "pontos").glob("*.json"):
        velho.unlink()
    for chave, conteudo in sorted(pontos_do_mapa(todas).items()):
        gravar(SAIDA / "pontos" / f"{chave}.json", conteudo)

    (SAIDA / "busca").mkdir(parents=True, exist_ok=True)
    for velho in (SAIDA / "busca").glob("*.json"):
        velho.unlink()
    for chave, lista in sorted(indice_busca(todas).items()):
        gravar(SAIDA / "busca" / f"{chave}.json", lista)
    exemplos = exemplo(todas)
    versao.update(json.dumps(exemplos, ensure_ascii=False).encode())

    indice = {
        "geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "versao": versao.hexdigest()[:12],
        "celula": CELULA,
        "candidatos": {str(k): v for k, v in sorted(nomes_candidatos().items())},
        "ufs": resumo_ufs,
        "boletinsLidos": sum(len(v) for v in boletins.values()),
        "brasil": {
            "ate": sum(u.get("ate", 0) for u in painel_ufs.values()),
            "viraveis": sum(u.get("viraveis", 0) for u in painel_ufs.values()),
        },
        "recusas": dict(recusas),
        "fontes": {
            "boletins": "https://resultados.tse.jus.br (boletins de urna, eleição 6257, pleito 3220)",
            "locais": "TSE, eleitorado_local_votacao_2026, gerado em 13/08/2026",
            "coordenadasFaltantes": "IBGE, CNEFE do Censo Demográfico 2022 (dados/locais_cnefe.json)",
        },
    }
    with open(SAIDA / "indice.json", "w", encoding="utf-8") as f:
        json.dump(indice, f, ensure_ascii=False, indent=1)
    with open(SAIDA / "exemplo.json", "w", encoding="utf-8") as f:
        json.dump(exemplos, f, ensure_ascii=False, separators=(",", ":"))
    painel = {
        "geradoEm": indice["geradoEm"],
        "boletinsLidos": indice["boletinsLidos"],
        "boletinsNoDisco": sum(no_disco.values()),
        "recusas": dict(recusas),
        "celulas": len(celulas),
        "regioesComPerfil2022": len(perfis),
        "candidatos": indice["candidatos"],
        "ufs": painel_ufs,
    }
    with open(SAIDA / "painel.json", "w", encoding="utf-8") as f:
        json.dump(painel, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(celulas)} células, {indice['boletinsLidos']} boletins, recusas {dict(recusas)}")


if __name__ == "__main__":
    main()
