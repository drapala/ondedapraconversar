"""
Confere o registro de boatos sobre o Flávio Bolsonaro e calcula a proeminência.

Lê dados/fichas/boatos.json. Para cada entrada:
- confere o esquema (campos, veredito em {"falso", "enganoso", "falta contexto"},
  pelo menos 1 item em circulacao e em verdade);
- baixa cada circulacao[].url (exige HTTP 200) e confere o "trecho" literal;
- baixa cada verdade[].fonte.url que não é o PDF do programa e confere o "texto";
- confere cada citação do programa do Flávio (verdade com "pagina") no PDF local,
  com as funções de conferir_citacoes.py.

A comparação usa a mesma normalização de conferir_fontes.py (sem diferença de
maiúsculas, acentos e espaços). A proeminência de cada entrada é o número de
veículos distintos em circulacao. O desempate é a data mais recente. O script
mostra a ordem calculada. Com --gravar, escreve a ordem e a proeminência em
dados/fichas/boatos.json e na cópia src/conteudo/boatos.json. Sai com código 1
se alguma conferência falha.

Uso: python3 scripts/conferir_boatos.py [--gravar] [--arquivo CAMINHO]
"""

import html
import json
import re
import ssl
import subprocess
import sys
import tempfile
import urllib.request
from functools import lru_cache
from pathlib import Path

from conferir_citacoes import conferir_intervalo
from conferir_fontes import NAVEGADOR, TEMPO_LIMITE, comparavel, sem_tags

RAIZ = Path(__file__).resolve().parent.parent
BOATOS = RAIZ / "dados" / "fichas" / "boatos.json"
COPIA = RAIZ / "src" / "conteudo" / "boatos.json"
FICHAS_TS = RAIZ / "src" / "fichas.ts"

VEREDITOS = {"falso", "enganoso", "falta contexto"}
CAMPOS = (
    "id",
    "alegacao",
    "veredito",
    "resumo",
    "comoResponder",
    "verdade",
    "circulacao",
)
OPCIONAIS = ("proeminencia",)
CAMPOS_CIRCULACAO = ("veiculo", "url", "data", "trecho")
PROIBIDAS = ("militante",)


def url_do_programa() -> str:
    texto = FICHAS_TS.read_text(encoding="utf-8")
    return re.search(r'const PDF_FLAVIO = "([^"]+)"', texto).group(1)


def charset_da_pagina(corpo: bytes, cabecalho: str | None) -> str:
    if cabecalho:
        return cabecalho
    achado = re.search(rb'<meta[^>]+charset=["\']?([\w-]+)', corpo[:4096], re.I)
    return achado.group(1).decode() if achado else "utf-8"


@lru_cache(maxsize=None)
def baixar(url: str) -> str:
    pedido = urllib.request.Request(
        url,
        headers={
            "User-Agent": NAVEGADOR,
            "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9",
        },
    )
    contexto = ssl.create_default_context()
    with urllib.request.urlopen(
        pedido, timeout=TEMPO_LIMITE, context=contexto
    ) as resposta:
        if resposta.status != 200:
            raise RuntimeError(f"HTTP {resposta.status}")
        corpo = resposta.read()
        tipo = resposta.headers.get("Content-Type", "")
        charset = charset_da_pagina(corpo, resposta.headers.get_content_charset())
    if "pdf" in tipo or corpo[:5] == b"%PDF-":
        with tempfile.NamedTemporaryFile(suffix=".pdf") as arquivo:
            arquivo.write(corpo)
            arquivo.flush()
            return subprocess.run(
                ["pdftotext", arquivo.name, "-"],
                capture_output=True,
                text=True,
                check=True,
            ).stdout
    try:
        texto = corpo.decode(charset)
    except (UnicodeDecodeError, LookupError):
        texto = corpo.decode("cp1252", errors="replace")
    return html.unescape(sem_tags(texto))


def conferir_trecho(url: str, trecho: str) -> str | None:
    try:
        texto = baixar(url)
    except Exception as erro:  # noqa: BLE001
        return f"não baixou: {erro}"
    if comparavel(trecho) not in comparavel(texto):
        return "trecho não encontrado na página"
    return None


def paginas(valor: str):
    inicio, _, fim = str(valor).partition("-")
    return (int(inicio), int(fim)) if fim else int(inicio)


def conferir_esquema(entrada: dict) -> list[str]:
    erros = []
    faltando = [c for c in CAMPOS if not entrada.get(c)]
    if faltando:
        erros.append(f"campos vazios: {', '.join(faltando)}")
    extras = sorted(set(entrada) - set(CAMPOS) - set(OPCIONAIS))
    if extras:
        erros.append(f"campos desconhecidos: {', '.join(extras)}")
    if entrada.get("veredito") not in VEREDITOS:
        erros.append(
            f"veredito fora de {sorted(VEREDITOS)}: {entrada.get('veredito')!r}"
        )
    for campo in ("alegacao", "resumo", "comoResponder"):
        valor = str(entrada.get(campo, "")).casefold()
        for palavra in PROIBIDAS:
            if palavra in valor:
                erros.append(f"{campo} usa a palavra {palavra!r}")
    frases = [
        f for f in re.split(r"(?<=[.!?])\s+", entrada.get("resumo", "").strip()) if f
    ]
    if not 1 <= len(frases) <= 3:
        erros.append(f"resumo com {len(frases)} frases (o limite é de 1 a 3)")
    for i, item in enumerate(entrada.get("circulacao") or []):
        vazios = [c for c in CAMPOS_CIRCULACAO if not item.get(c)]
        if vazios:
            erros.append(f"circulacao[{i}] sem {', '.join(vazios)}")
        elif not re.fullmatch(r"\d{4}-\d{2}-\d{2}", item["data"]):
            erros.append(f"circulacao[{i}] com data fora do formato AAAA-MM-DD")
    for i, item in enumerate(entrada.get("verdade") or []):
        fonte = item.get("fonte") or {}
        if not (
            item.get("quem")
            and item.get("texto")
            and fonte.get("texto")
            and fonte.get("url")
        ):
            erros.append(f"verdade[{i}] sem quem, texto ou fonte")
    return erros


def conferir_fontes_da_entrada(entrada: dict, programa: str) -> list[str]:
    erros = []
    for i, item in enumerate(entrada["circulacao"]):
        erro = conferir_trecho(item["url"], item["trecho"])
        if erro:
            erros.append(f"circulacao[{i}] {item['veiculo']}: {erro} ({item['url']})")
    for i, item in enumerate(entrada["verdade"]):
        url = item["fonte"]["url"]
        if "pagina" in item:
            if url != programa:
                erros.append(
                    f"verdade[{i}]: citação com página fora do programa do Flávio"
                )
            elif not conferir_intervalo(
                "flavio", paginas(item["pagina"]), item["texto"]
            ):
                erros.append(
                    f"verdade[{i}]: trecho não está no programa, p. {item['pagina']}"
                )
        elif url == programa or url.lower().endswith(".pdf"):
            erros.append(f"verdade[{i}]: citação de PDF sem página")
        else:
            erro = conferir_trecho(url, item["texto"])
            if erro:
                erros.append(f"verdade[{i}] {item['quem']}: {erro} ({url})")
    return erros


def proeminencia(entrada: dict) -> int:
    return len({item["veiculo"] for item in entrada["circulacao"]})


def ordenar(entradas: list[dict]) -> list[dict]:
    def chave(entrada):
        recente = max(item["data"] for item in entrada["circulacao"])
        return (-proeminencia(entrada), _invertida(recente), entrada["id"])

    return sorted(entradas, key=chave)


def _invertida(data: str) -> str:
    return "".join(
        chr(ord("9") - ord(c) + ord("0")) if c.isdigit() else c for c in data
    )


def gravar(entradas: list[dict]):
    saida = []
    for entrada in ordenar(entradas):
        nova = {c: entrada[c] for c in CAMPOS}
        nova["proeminencia"] = proeminencia(entrada)
        saida.append(nova)
    texto = json.dumps(saida, ensure_ascii=False, indent=2) + "\n"
    BOATOS.write_text(texto, encoding="utf-8")
    COPIA.write_text(texto, encoding="utf-8")
    print(f"gravado: {BOATOS.relative_to(RAIZ)} e {COPIA.relative_to(RAIZ)}")


def main():
    argumentos = sys.argv[1:]
    arquivo = BOATOS
    if "--arquivo" in argumentos:
        arquivo = Path(argumentos[argumentos.index("--arquivo") + 1])
    entradas = json.loads(arquivo.read_text(encoding="utf-8"))
    programa = url_do_programa()

    falhas = 0
    ids = [e.get("id") for e in entradas]
    repetidos = sorted({i for i in ids if ids.count(i) > 1})
    if repetidos:
        falhas += 1
        print(f"FALHA  ids repetidos: {', '.join(map(str, repetidos))}")
    for entrada in entradas:
        erros = conferir_esquema(entrada)
        if not erros:
            erros = conferir_fontes_da_entrada(entrada, programa)
        if (
            not erros
            and "proeminencia" in entrada
            and entrada["proeminencia"] != proeminencia(entrada)
        ):
            erros.append(
                f"proeminencia gravada {entrada['proeminencia']} difere da calculada {proeminencia(entrada)}"
            )
        if erros:
            falhas += 1
            for erro in erros:
                print(f"FALHA  {entrada.get('id')}: {erro}")
        else:
            n_pdf = sum(1 for v in entrada["verdade"] if "pagina" in v)
            print(
                f"OK     {entrada['id']} [{entrada['veredito']}]: "
                f"{len(entrada['circulacao'])} checagem(ns), "
                f"{len(entrada['verdade'])} trecho(s) de verdade ({n_pdf} do programa)"
            )
    print(
        f"{arquivo.name}: {len(entradas) - falhas}/{len(entradas)} entradas conferidas"
    )

    if not falhas:
        print(
            "\nordem por proeminência (veículos distintos; desempate pela data mais recente):"
        )
        for pos, entrada in enumerate(ordenar(entradas), 1):
            veiculos = sorted({item["veiculo"] for item in entrada["circulacao"]})
            recente = max(item["data"] for item in entrada["circulacao"])
            print(
                f"{pos:2}. {entrada['id']}: proeminencia={proeminencia(entrada)} recente={recente} ({', '.join(veiculos)})"
            )
        if "--gravar" in argumentos:
            if arquivo != BOATOS:
                print("FALHA  --gravar só vale para o arquivo padrão")
                sys.exit(1)
            gravar(entradas)
        elif (
            arquivo == BOATOS
            and COPIA.exists()
            and COPIA.read_text(encoding="utf-8") != BOATOS.read_text(encoding="utf-8")
        ):
            falhas += 1
            print(
                "FALHA  src/conteudo/boatos.json difere de dados/fichas/boatos.json (rode com --gravar)"
            )
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
