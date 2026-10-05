"""Coordenadas para os locais de votação que o TSE publicou sem latitude e
longitude, tiradas do CNEFE 2022 do IBGE (Cadastro Nacional de Endereços para
Fins Estatísticos), baixado antes por scripts/baixar_cnefe.py.

Para cada local, tenta nesta ordem, e para no primeiro que achar:

  estabelecimento  escola, igreja ou salão do CNEFE com o mesmo nome
  endereco         mesma rua e número igual ou vizinho
  rua              mesma rua, sem número; ponto do meio da rua, se ela for curta
  localidade       povoado, sítio ou comunidade com o mesmo nome
  cep              CEP específico (que não termina em 000)

Segunda rodada, para o que a primeira não achou (quase tudo rural):

  escola_localidade  a escola do CNEFE dentro do povoado com o mesmo nome,
                     quando o local de votação é uma escola
  nucleo             o núcleo do povoado: o centro de onde as casas se
                     concentram, ignorando as espalhadas pela zona rural

Os nomes de povoado também são comparados sem espaço e sem plural
("Umburanas" acha "Umburana", "Pau D Arco" acha "Pau Darco").

Ficam marcados como aproximados rua, localidade, cep e nucleo. Cada ponto passa por duas
conferências antes de valer: precisa ficar perto do CEP (quando ele é
específico) e perto dos outros locais do mesmo bairro que o TSE já localizou.
Nome que aparece em pontos muito distantes entre si é recusado, nunca
promediado.

Com --validar, roda o mesmo processo em locais que já têm coordenada do TSE,
como se não tivessem, e mostra o erro de cada nível; --validar-rural faz o
mesmo só com locais de zona rural.

Pontos já gravados em dados/locais_cnefe.json nunca mudam: o id de cada
região sai da coordenada, e as marcas de "Vou conversar por aqui" estão
presas a ele. Cada execução só acrescenta os locais que ainda faltam.

Saída: dados/locais_cnefe.json, chave "UF-MUNICIPIO-ZONA-LOCAL".

Uso: python scripts/geocodificar_locais.py [--validar]

Autor: Matheus C. Pestana
"""

from __future__ import annotations

import json
import math
import re
import sys
import zipfile
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor
from statistics import median

import pandas as pd

from baixar_cnefe import PASTA
from montar_dados import LOCAIS, RAIZ, UFS, coordenada, normalizar

SAIDA = RAIZ / "dados" / "locais_cnefe.json"
APROXIMADOS = {"rua", "localidade", "cep", "nucleo"}
COLUNAS = ["CEP", "DSC_LOCALIDADE", "NOM_TIPO_SEGLOGR", "NOM_TITULO_SEGLOGR", "NOM_SEGLOGR",
           "NUM_ENDERECO", "LATITUDE", "LONGITUDE", "NV_GEO_COORD", "COD_ESPECIE", "DSC_ESTABELECIMENTO"]
ESPECIES_LOCAL = {"4", "5", "6", "8"}  # ensino, saúde, outras finalidades, religioso

ABREVIACOES = {
    "prof": "professor", "profa": "professora", "profe": "professora", "dr": "doutor", "dra": "doutora",
    "pres": "presidente", "gov": "governador", "cel": "coronel", "sto": "santo", "sta": "santa",
    "dep": "deputado", "sen": "senador", "mal": "marechal", "gal": "general", "gen": "general",
    "cap": "capitao", "ten": "tenente", "ver": "vereador", "pe": "padre", "fr": "frei",
    "eng": "engenheiro", "pref": "prefeito", "alm": "almirante", "brig": "brigadeiro",
    "cmte": "comandante", "sgt": "sargento", "sr": "senhor", "sra": "senhora", "nsa": "nossa",
    "jd": "jardim", "jdm": "jardim", "vl": "vila", "pq": "parque", "cj": "conjunto", "res": "residencial",
    "dom": "dom", "mons": "monsenhor", "maj": "major", "des": "desembargador", "min": "ministro",
}
TIPOS_DE_RUA = {
    "rua", "r", "avenida", "av", "ave", "travessa", "tv", "trav", "tr", "estrada", "est", "estr",
    "rodovia", "rod", "praca", "pca", "pc", "pr", "alameda", "al", "largo", "lgo", "lg", "beco",
    "viela", "via", "vereda", "ladeira", "acesso", "servidao", "vicinal", "rodoanel", "passagem",
    "caminho", "marginal", "contorno", "anel", "viaduto", "rampa", "escadaria", "trevo", "quadra", "qd",
}
TIPOS_RURAIS = {"povoado", "pov", "sitio", "fazenda", "faz", "comunidade", "com", "localidade", "loc",
                "distrito", "dist", "linha", "colonia", "assentamento", "aldeia", "vila", "lugarejo",
                "corrego", "corr", "zona", "rural", "regiao", "nucleo", "agrovila", "gleba", "lote", "setor",
                "bairro", "comunidade", "ilha", "serra", "chapada", "lagoa", "brejo", "riacho", "barra"}
TITULOS = {"professor", "professora", "doutor", "doutora", "presidente", "governador", "coronel",
           "deputado", "senador", "marechal", "general", "capitao", "tenente", "vereador", "padre",
           "frei", "engenheiro", "prefeito", "almirante", "brigadeiro", "comandante", "sargento",
           "dom", "monsenhor", "major", "desembargador", "ministro", "santo", "santa", "sao", "senhor",
           "senhora", "irma", "madre", "pastor", "maestro", "poeta", "doutora", "barao", "visconde",
           "conde", "duque", "princesa", "imperatriz", "dona", "mestre", "cabo", "soldado", "juiz"}
LIGACOES = {"de", "da", "do", "das", "dos", "e", "d"}
# Palavras de nome de local de votação que não identificam o lugar.
GENERICAS_NOME = {
    "escola", "escolas", "municipal", "municipais", "estadual", "federal", "colegio", "creche", "centro",
    "educacional", "educacao", "ensino", "fundamental", "medio", "infantil", "unidade", "escolar", "grupo",
    "predio", "e", "em", "ee", "eef", "eem", "eefm", "eeefm", "emef", "emei", "emeief", "emeb", "cemei",
    "cmei", "cei", "ceu", "ciep", "caic", "cemeb", "eme", "eeif", "eeief", "emeif", "integral", "tempo",
    "basica", "basico", "anexo", "anexa", "sede", "particular", "rede", "nucleo", "polo", "instituto",
    "faculdade", "universidade", "campus", "salao", "paroquial", "comunitario", "comunitaria",
    "associacao", "igreja", "capela", "povoado", "comunidade", "rural", "zona", "fazenda", "sitio",
    "antigo", "antiga", "novo", "nova", "integrado", "integrada", "jovens", "adultos", "eja",
    "prefeitura", "camara", "ginasio", "quadra", "poliesportivo", "esportes", "clube", "sindicato",
    "posto", "saude", "unidade", "basica", "professor", "professora", "doutor", "doutora", "deputado",
    "prefeito", "governador", "presidente", "vereador", "senador", "dom", "padre", "irma",
}
MAX_ESPALHADO_KM = {"estabelecimento": 0.6, "endereco": 0.4, "rua": 1.2, "localidade": 1.5, "cep": 0.8}
DISTANCIA_CEP_KM = 2.0
DISTANCIA_BAIRRO_KM = 4.0


def palavras(texto: str) -> list[str]:
    return [ABREVIACOES.get(p, p) for p in normalizar(texto).split()]


def chave_rua(texto: str, sem_titulo: bool = False) -> str:
    ps = palavras(texto)
    while ps and ps[0] in TIPOS_DE_RUA:
        ps = ps[1:]
    if sem_titulo:
        while len(ps) > 1 and ps[0] in TITULOS:
            ps = ps[1:]
    return " ".join(p for p in ps if p not in LIGACOES)


def chave_localidade(texto: str) -> str:
    ps = [p for p in palavras(texto) if p not in LIGACOES]
    while ps and ps[0] in TIPOS_RURAIS | TIPOS_DE_RUA:
        ps = ps[1:]
    return " ".join(ps)


def tokens_nome(texto: str) -> frozenset[str]:
    return frozenset(p for p in palavras(texto) if p not in LIGACOES and p not in GENERICAS_NOME and len(p) > 1)


def numero(texto: str) -> int | None:
    m = re.search(r"(\d{1,3}(?:\.\d{3})+|\d+)", texto)
    if not m:
        return None
    try:
        return int(m.group(1).replace(".", ""))
    except ValueError:
        return None


def separar_endereco(endereco: str) -> tuple[str, int | None, list[str]]:
    """Rua, número e os pedaços que sobram (nomes de localidade, em geral)."""
    texto = re.sub(r"\s+", " ", str(endereco or "")).strip()
    partes = [p.strip() for p in re.split(r"\s+-\s+|\s*-\s*(?=zona\b)", texto, flags=re.I) if p.strip()]
    partes = [p for p in partes if not re.fullmatch(r"zona (urbana|rural)", p, flags=re.I)]
    if not partes:
        return "", None, []
    principal, resto = partes[0], partes[1:]
    rua, num = principal, None
    if "," in principal:
        rua, depois = principal.split(",", 1)
        if not re.search(r"\bkm\b", depois, flags=re.I):
            num = numero(depois)
        resto = [p for p in [depois] if not re.search(r"\d|s/?n", p, flags=re.I)] + resto
    else:
        m = re.search(r"\s(?:n[º°o]?\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*$", principal, flags=re.I)
        if m and not re.search(r"\bkm\s*\d+\s*$", principal, flags=re.I):
            rua, num = principal[:m.start()], numero(m.group(1))
    rua = re.sub(r"\bs/?n[º°o]?\b.*$", "", rua, flags=re.I).strip(" ,.")
    return rua, num, resto


def distancia_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    rad = math.pi / 180
    h = (math.sin((b[0] - a[0]) * rad / 2) ** 2
         + math.cos(a[0] * rad) * math.cos(b[0] * rad) * math.sin((b[1] - a[1]) * rad / 2) ** 2)
    return 12742 * math.asin(math.sqrt(h))


def centro(pontos: list[tuple[float, float]]) -> tuple[float, float]:
    return median(p[0] for p in pontos), median(p[1] for p in pontos)


def espalhado(pontos: list[tuple[float, float]]) -> float:
    c = centro(pontos)
    return max(distancia_km(c, p) for p in pontos)


def centro_denso(pontos: list[tuple[float, float]]) -> tuple[tuple[float, float], float]:
    """Centro de onde os pontos se concentram, e a fração deles a até 1,5 km dali."""
    c = centro(pontos)
    for _ in range(4):
        perto = [p for p in pontos if distancia_km(c, p) <= 1.0]
        if not perto:
            break
        c = centro(perto)
    return c, sum(distancia_km(c, p) <= 1.5 for p in pontos) / len(pontos)


def compacta(chave: str) -> str:
    """Nome de povoado sem espaço e sem plural, para casar grafias diferentes."""
    return "".join(p[:-1] if len(p) > 3 and p.endswith("s") else p for p in chave.split())


ESCOLAR = re.compile(r"\b(escola|escolar|colegio|creche|educandario|grupo escolar|emef|emei|eef|eem|eefm|"
                     r"emeif|cemei|cmei|ee|em|e m|e e|ensino)\b")
RURAL = re.compile(r"\b(povoado|pov|zona rural|fazenda|faz|comunidade|sitio|localidade|distrito|assentamento|"
                   r"agrovila|aldeia|colonia|linha|corrego|ramal|gleba|vicinal)\b")


class Municipio:
    """Índices do CNEFE de um município, só com o que interessa aos locais procurados."""

    def __init__(self, codigo: str, locais: list[dict]):
        ruas_alvo, locs_alvo, ceps_alvo = set(), set(), set()
        for l in locais:
            ruas_alvo |= {l["rua"], l["rua_sem_titulo"]}
            locs_alvo |= set(l["localidades"])
            if l["cep_especifico"]:
                ceps_alvo.add(l["cep"])
        ruas_alvo.discard("")
        locs_alvo.discard("")
        self.ruas: dict[str, list[tuple[int | None, tuple[float, float]]]] = defaultdict(list)
        self.localidades: dict[str, list[tuple[float, float]]] = defaultdict(list)
        self.ceps: dict[str, list[tuple[float, float]]] = defaultdict(list)
        self.estabelecimentos: list[tuple[frozenset[str], str, tuple[float, float]]] = []
        self.nucleos: dict[str, list[tuple[float, float]]] = defaultdict(list)
        self.escolas_do_povoado: dict[str, list[tuple[float, float]]] = defaultdict(list)
        self.compactas_alvo = {compacta(c) for c in locs_alvo}
        with zipfile.ZipFile(PASTA / f"{codigo}.zip") as z:
            nome = next(n for n in z.namelist() if n.lower().endswith(".csv"))
            for bloco in pd.read_csv(z.open(nome), sep=";", dtype=str, usecols=COLUNAS,
                                     chunksize=400_000, keep_default_na=False, encoding="latin1"):
                self._absorver(bloco, ruas_alvo, locs_alvo, ceps_alvo)

    def _absorver(self, bloco: pd.DataFrame, ruas_alvo: set, locs_alvo: set, ceps_alvo: set) -> None:
        for linha in bloco.itertuples(index=False):
            try:
                ponto = (float(linha.LATITUDE), float(linha.LONGITUDE))
            except ValueError:
                continue
            nivel = int(linha.NV_GEO_COORD or 9)
            preciso = nivel <= 4
            completa = f"{linha.NOM_TITULO_SEGLOGR} {linha.NOM_SEGLOGR}"
            rua = chave_rua(completa)
            if preciso:
                num = numero(linha.NUM_ENDERECO) if linha.NUM_ENDERECO not in ("", "0") else None
                for chave in {rua, chave_rua(completa, sem_titulo=True), chave_rua(linha.NOM_SEGLOGR)}:
                    if chave in ruas_alvo:
                        self.ruas[chave].append((num, ponto))
                if linha.CEP in ceps_alvo:
                    self.ceps[linha.CEP].append(ponto)
                if linha.COD_ESPECIE in ESPECIES_LOCAL and linha.DSC_ESTABELECIMENTO:
                    tokens = tokens_nome(linha.DSC_ESTABELECIMENTO)
                    if tokens:
                        self.estabelecimentos.append((tokens, rua, ponto))
            for chave in {chave_localidade(linha.DSC_LOCALIDADE), chave_localidade(completa)}:
                if chave in locs_alvo:
                    self.localidades[chave].append(ponto)
            povoado = compacta(chave_localidade(linha.DSC_LOCALIDADE))
            if povoado and povoado in self.compactas_alvo:
                self.nucleos[povoado].append(ponto)
                if linha.COD_ESPECIE == "4" and preciso:
                    self.escolas_do_povoado[povoado].append(ponto)


def candidatos(m: Municipio, l: dict) -> list[tuple[str, tuple[float, float], str]]:
    """Pontos possíveis para o local, do nível mais confiável para o menos."""
    saida = []
    alvo = l["tokens"]
    if len(alvo) >= 2 or (len(alvo) == 1 and len(next(iter(alvo))) >= 6):
        achados = [(t, rua, p) for t, rua, p in m.estabelecimentos if alvo <= t]
        if len(alvo) == 1:
            achados = [a for a in achados if a[1] in (l["rua"], l["rua_sem_titulo"])]
        na_rua = [a for a in achados if a[1] and a[1] in (l["rua"], l["rua_sem_titulo"])]
        for grupo in (na_rua, achados):
            pontos = [p for _, _, p in grupo]
            if pontos and espalhado(pontos) <= MAX_ESPALHADO_KM["estabelecimento"]:
                saida.append(("estabelecimento", centro(pontos), " ".join(sorted(grupo[0][0]))))
                break

    for chave in dict.fromkeys([l["rua"], l["rua_sem_titulo"]]):
        lista = m.ruas.get(chave) if chave else None
        if not lista:
            continue
        if l["numero"] is not None:
            com_num = [(abs(n - l["numero"]), p) for n, p in lista if n is not None]
            if com_num:
                menor = min(d for d, _ in com_num)
                if menor <= 30:
                    pontos = [p for d, p in com_num if d == menor]
                    if espalhado(pontos) <= MAX_ESPALHADO_KM["endereco"]:
                        saida.append(("endereco", centro(pontos), chave))
        pontos = [p for _, p in lista]
        if espalhado(pontos) <= MAX_ESPALHADO_KM["rua"]:
            saida.append(("rua", centro(pontos), chave))
        break

    for chave in l["localidades"]:
        pontos = m.localidades.get(chave)
        if pontos and espalhado(pontos) <= MAX_ESPALHADO_KM["localidade"]:
            saida.append(("localidade", centro(pontos), chave))
            break

    if l["cep_especifico"] and m.ceps.get(l["cep"]):
        pontos = m.ceps[l["cep"]]
        if espalhado(pontos) <= MAX_ESPALHADO_KM["cep"]:
            saida.append(("cep", centro(pontos), l["cep"]))

    # Segunda rodada.
    for chave in l["localidades"]:
        povoado = compacta(chave)
        escolas = m.escolas_do_povoado.get(povoado)
        if l["escolar"] and escolas and espalhado(escolas) <= 0.5:
            saida.append(("escola_localidade", centro(escolas), chave))
            break
    for chave in l["localidades"]:
        casas = m.nucleos.get(compacta(chave))
        if casas and len(casas) >= 5:
            ponto, concentracao = centro_denso(casas)
            if concentracao >= 0.6:
                saida.append(("nucleo", ponto, chave))
                break
    return saida


def aceitos(m: Municipio, l: dict, bairros: dict) -> list[dict]:
    """Candidatos que passam pela conferência do CEP e do bairro, em ordem de confiança."""
    perto_cep = centro(m.ceps[l["cep"]]) if l["cep_especifico"] and m.ceps.get(l["cep"]) else None
    perto_bairro = bairros.get(l["bairro"]) if l["bairro"] else None
    saida = []
    for nivel, ponto, achado in candidatos(m, l):
        if perto_cep and distancia_km(ponto, perto_cep) > DISTANCIA_CEP_KM:
            continue
        if perto_bairro and distancia_km(ponto, perto_bairro) > DISTANCIA_BAIRRO_KM:
            continue
        saida.append({"lat": round(ponto[0], 5), "lon": round(ponto[1], 5), "nivel": nivel, "achado": achado})
    return saida


def descrever(uf: str, linha) -> dict:
    rua, num, resto = separar_endereco(linha.DS_ENDERECO)
    cep = re.sub(r"\D", "", str(linha.NR_CEP or "")).zfill(8)
    localidades = []
    for texto in [linha.NM_BAIRRO, *resto, rua, linha.DS_ENDERECO]:
        chave = chave_localidade(texto or "")
        if chave and len(chave) >= 4 and chave not in localidades:
            localidades.append(chave)
    return {
        "chave": f"{uf}-{str(linha.CD_MUNICIPIO).zfill(5)}-{int(linha.NR_ZONA)}-{int(linha.NR_LOCAL_VOTACAO)}",
        "rua": chave_rua(rua), "rua_sem_titulo": chave_rua(rua, sem_titulo=True), "numero": num,
        "localidades": localidades, "cep": cep, "cep_especifico": cep != "00000000" and not cep.endswith("000"),
        "tokens": tokens_nome(linha.NM_LOCAL_VOTACAO),
        # "Zona Rural" não é bairro: o centro dele seria o do município inteiro.
        "bairro": normalizar(linha.NM_BAIRRO) if chave_localidade(linha.NM_BAIRRO or "") else "",
        "escolar": bool(ESCOLAR.search(normalizar(linha.NM_LOCAL_VOTACAO))),
        "rural": bool(RURAL.search(normalizar(f"{linha.DS_ENDERECO} {linha.NM_BAIRRO}"))),
        "coord": coordenada(linha.NR_LATITUDE, linha.NR_LONGITUDE),
    }


def processar(tarefa: tuple[str, list[dict], dict]) -> list[tuple[dict, list[dict]]]:
    codigo, locais, bairros = tarefa
    try:
        m = Municipio(codigo, locais)
    except (FileNotFoundError, zipfile.BadZipFile, StopIteration) as erro:
        print(f"CNEFE {codigo} ilegível: {erro}", file=sys.stderr)
        return [(l, []) for l in locais]
    return [(l, aceitos(m, l, bairros)) for l in locais]


def tarefas(validar: bool, so_rural: bool, feitos: dict) -> list[tuple[str, list[dict], dict]]:
    municipios = json.loads((PASTA / "municipios.json").read_text(encoding="utf-8"))
    saida = []
    for uf in UFS:
        df = pd.read_parquet(LOCAIS / f"eleitorado_local_votacao_2026_{uf}.parquet")
        df = df[df["NR_TURNO"].astype(str) == "1"].drop_duplicates(["CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO"])
        for cd, grupo in df.groupby("CD_MUNICIPIO"):
            info = municipios.get(f"{uf}-{str(cd).zfill(5)}")
            if not info or not (PASTA / f"{info['ibge']}.zip").exists():
                continue
            locais = [descrever(uf, linha) for linha in grupo.itertuples(index=False)]
            com = [l for l in locais if l["coord"]]
            pontos_bairro = defaultdict(list)
            for l in com:
                if l["bairro"]:
                    pontos_bairro[l["bairro"]].append(l["coord"])
            if validar:
                # Até 8 locais com coordenada do TSE por município, sem a conferência pelo próprio bairro.
                base = [l for l in com if l["rural"]] if so_rural else com
                alvo = base[:: max(1, len(base) // 8)][:8]
                for l in alvo:
                    outros = [p for x in com if x is not l and x["bairro"] == l["bairro"] for p in [x["coord"]]]
                    saida.append((info["ibge"], [l], {l["bairro"]: centro(outros)} if outros else {}))
            else:
                alvo = [l for l in locais if not l["coord"] and l["chave"] not in feitos]
                if alvo:
                    saida.append((info["ibge"], alvo, {b: centro(p) for b, p in pontos_bairro.items()}))
    return saida


def main() -> None:
    so_rural = "--validar-rural" in sys.argv
    validar = so_rural or "--validar" in sys.argv
    feitos = json.loads(SAIDA.read_text(encoding="utf-8")) if SAIDA.exists() else {}
    lista = tarefas(validar, so_rural, feitos)
    if validar:
        # Junta os locais do mesmo município numa leitura só do CNEFE.
        por_codigo: dict[str, tuple[list, dict]] = {}
        for codigo, locais, bairros in lista:
            ls, bs = por_codigo.setdefault(codigo, ([], {}))
            ls.extend(locais)
            bs.update(bairros)
        lista = [(c, ls, bs) for c, (ls, bs) in por_codigo.items()]
    print(f"{sum(len(t[1]) for t in lista)} locais em {len(lista)} municípios", flush=True)

    resultados: list[tuple[dict, list[dict]]] = []
    with ProcessPoolExecutor() as pool:
        for i, parte in enumerate(pool.map(processar, lista, chunksize=1), 1):
            resultados.extend(parte)
            if i % 100 == 0:
                print(f"{i}/{len(lista)} municípios", flush=True)

    contagem = Counter(rs[0]["nivel"] if rs else "sem" for _, rs in resultados)
    print("níveis escolhidos:", dict(contagem))
    if validar:
        # Erro de cada nível por conta própria, mesmo quando outro nível vem antes dele.
        erros: dict[str, list[float]] = defaultdict(list)
        for l, rs in resultados:
            for r in rs:
                erros[r["nivel"]].append(distancia_km(l["coord"], (r["lat"], r["lon"])))
        for nivel, lista_erros in sorted(erros.items()):
            lista_erros.sort()
            p90 = lista_erros[int(len(lista_erros) * 0.9)]
            acima = sum(e > 1 for e in lista_erros) / len(lista_erros)
            print(f"{nivel:18} n={len(lista_erros):5}  mediana {median(lista_erros):.2f} km  "
                  f"p90 {p90:.2f} km  acima de 1 km {acima:.0%}")
        return

    novos = {l["chave"]: {k: rs[0][k] for k in ("lat", "lon", "nivel")}
             | ({"aprox": True} if rs[0]["nivel"] in APROXIMADOS else {})
             for l, rs in resultados if rs}
    # Os que já existiam ficam como estavam; só entram chaves novas.
    juntos = {**novos, **feitos}
    SAIDA.write_text(json.dumps(dict(sorted(juntos.items())), ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    print(f"{len(novos)} locais novos; {len(juntos)} no total em {SAIDA.relative_to(RAIZ)}")

if __name__ == "__main__":
    main()
