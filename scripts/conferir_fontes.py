"""
Confere se cada fato do registro do governo Lula é texto literal da fonte citada.

Lê dados/fichas/registro_lula.json. Para cada entrada, baixa a página do campo
"fonte" (segue redirecionamentos e exige HTTP 200) e confere o "trecho". Se a
entrada tem "fonteImprensa", confere também o "trechoImprensa" nessa página. PDF vira texto com pdftotext,
HTML vira texto sem tags. O texto e o "trecho" são normalizados como em
conferir_citacoes.py, sem diferença de maiúsculas e acentos, e o trecho tem de
ser substring do texto da página. Uma fonte de imprensa tem de ter tipo
"imprensa". Confere também src/fichas.ts: cada fato citado (registro("id"))
tem de existir no registro.

Uso: python3 scripts/conferir_fontes.py
     python3 scripts/conferir_fontes.py --buscar URL "regex"
"""

import html
import json
import re
import ssl
import subprocess
import sys
import tempfile
import unicodedata
import urllib.request
from functools import lru_cache
from pathlib import Path

from conferir_citacoes import normalizar

RAIZ = Path(__file__).resolve().parent.parent
REGISTRO = RAIZ / "dados" / "fichas" / "registro_lula.json"
FICHAS_TS = RAIZ / "src" / "fichas.ts"

NAVEGADOR = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0 Safari/537.36"
)
TEMPO_LIMITE = 40
TIPOS = {"dado oficial", "decisao judicial", "orgao de controle", "imprensa"}
CAMPOS = (
    "id", "tema", "orgao", "afirmacao", "publicacao", "fonte", "trecho", "data", "tipo",
)
OPCIONAIS = ("fonteImprensa", "trechoImprensa")
SITES_DE_IMPRENSA = ("agenciabrasil.ebc.com.br", "senado.leg.br/noticias")


def comparavel(texto: str) -> str:
    texto = normalizar(texto)
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", texto).casefold().strip()


def sem_tags(bruto: str) -> str:
    bruto = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", bruto)
    bruto = re.sub(r"(?s)<!--.*?-->", " ", bruto)
    bruto = re.sub(r"<[^>]+>", " ", bruto)
    return html.unescape(bruto)


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
        charset = resposta.headers.get_content_charset() or "utf-8"
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
    return sem_tags(corpo.decode(charset, errors="replace"))


def conferir_trecho(url: str, trecho: str) -> str | None:
    try:
        texto = baixar(url)
    except Exception as erro:  # noqa: BLE001
        return f"não baixou: {erro}"
    if comparavel(trecho) not in comparavel(texto):
        return "trecho não encontrado na página"
    return None


def conferir_entrada(entrada: dict) -> list[str]:
    faltando = [c for c in CAMPOS if not entrada.get(c)]
    if faltando:
        return [f"campos vazios: {', '.join(faltando)}"]
    extras = sorted(set(entrada) - set(CAMPOS) - set(OPCIONAIS))
    if extras:
        return [f"campos desconhecidos: {', '.join(extras)}"]
    if entrada["tipo"] not in TIPOS:
        return [f"tipo desconhecido: {entrada['tipo']}"]
    imprensa = any(site in entrada["fonte"] for site in SITES_DE_IMPRENSA)
    if imprensa and entrada["tipo"] != "imprensa":
        return [f"fonte de imprensa com tipo {entrada['tipo']!r}"]
    erros = []
    erro = conferir_trecho(entrada["fonte"], entrada["trecho"])
    if erro:
        erros.append(f"fonte: {erro} ({entrada['fonte']})")
    tem_imprensa = [bool(entrada.get(c)) for c in OPCIONAIS]
    if any(tem_imprensa) and not all(tem_imprensa):
        erros.append("fonteImprensa e trechoImprensa vêm juntos")
    elif all(tem_imprensa):
        erro = conferir_trecho(entrada["fonteImprensa"], entrada["trechoImprensa"])
        if erro:
            erros.append(f"fonteImprensa: {erro} ({entrada['fonteImprensa']})")
    return erros


def ids_da_ficha() -> list[str]:
    texto = FICHAS_TS.read_text(encoding="utf-8")
    return re.findall(r"\bregistro\(\s*\"([^\"]+)\"\s*\)", texto)


def buscar(url: str, expressao: str, contexto: int = 220):
    texto = re.sub(r"\s+", " ", normalizar(baixar(url)))
    for achado in re.finditer(expressao, texto, re.I):
        ini = max(0, achado.start() - contexto)
        print(f"...{texto[ini : achado.end() + contexto]}...\n")


def main():
    if len(sys.argv) >= 4 and sys.argv[1] == "--buscar":
        buscar(sys.argv[2], sys.argv[3])
        return

    registro = json.loads(REGISTRO.read_text(encoding="utf-8"))
    falhas = 0
    ids = set()
    for entrada in registro:
        ids.add(entrada.get("id"))
        erros = conferir_entrada(entrada)
        if erros:
            falhas += 1
            for erro in erros:
                print(f"FALHA  {entrada.get('id')}: {erro}")
        else:
            print(f"OK     {entrada['id']} [{entrada['orgao']}, {entrada['tipo']}]: {entrada['fonte']}")
            if entrada.get("fonteImprensa"):
                print(f"         imprensa: {entrada['fonteImprensa']}")
    print(
        f"registro_lula.json: {len(registro) - falhas}/{len(registro)} fontes conferidas"
    )

    citados = ids_da_ficha()
    if not citados:
        falhas += 1
        print("FALHA  src/fichas.ts: nenhum fato do registro é citado")
    for chave in citados:
        if chave in ids:
            print(f"OK     fichas.ts -> {chave}")
        else:
            falhas += 1
            print(f"FALHA  fichas.ts -> {chave}: id fora do registro")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
