"""Gera a fonte Archivo enxuta que o site serve (src/fontes/archivo-latin.woff2).

O arquivo "latin" do @fontsource-variable/archivo é baixado por todo visitante
(uns 90 KB). Aqui ele fica só com o que o site usa, sem mudar nada na tela.
Os eixos de peso e largura ficam inteiros: recortá-los recalcula os contornos e
mexe em frações de pixel nas bordas das letras.

  letras     Latin-1 inteiro, mais todo caractere da faixa "latin" que aparece
             no código ou nos dados de public/dados
  recursos   os que o navegador aplica sozinho (ccmp, locl, liga, kern, mark,
             mkmk, rvrn) e os números tabulares e proporcionais (tnum, pnum);
             saem só as frações (frac, numr, dnom), que o site não usa

Os arquivos latin-ext e vietnamita continuam vindo do pacote, porque só são
baixados quando aparece um caractere dessas faixas.

Uso: uv run --with fonttools --with brotli python scripts/gerar_fonte.py
Rodar de novo se o site passar a usar outro peso, largura ou caractere.

Autor: Matheus C. Pestana
"""

from __future__ import annotations

from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2"
DESTINO = RAIZ / "src" / "fontes" / "archivo-latin.woff2"
RECURSOS = ["ccmp", "locl", "liga", "kern", "mark", "mkmk", "rvrn", "tnum", "pnum"]


def faixa_latin(c: str) -> bool:
    n = ord(c)
    return n <= 0xFF or 0x2000 <= n <= 0x206F or n in (0x131, 0x152, 0x153, 0x20AC, 0x2122, 0x2191, 0x2193, 0x2212)


def caracteres_usados() -> str:
    usados: set[str] = set(chr(c) for c in range(0x20, 0x7F)) | set(chr(c) for c in range(0xA0, 0x100))
    arquivos = [*RAIZ.joinpath("src").rglob("*.ts*"), *RAIZ.joinpath("src").rglob("*.json"),
                RAIZ / "index.html", *RAIZ.joinpath("public", "dados").rglob("*.json")]
    for arquivo in arquivos:
        try:
            usados |= {c for c in arquivo.read_text(encoding="utf-8") if faixa_latin(c)}
        except (UnicodeDecodeError, OSError):
            continue
    return "".join(sorted(usados))


def main() -> None:
    fonte = TTFont(ORIGEM)
    opcoes = subset.Options()
    opcoes.flavor = "woff2"
    opcoes.layout_features = RECURSOS
    recorte = subset.Subsetter(opcoes)
    recorte.populate(text=caracteres_usados())
    recorte.subset(fonte)
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    fonte.flavor = "woff2"
    fonte.save(DESTINO)
    print(f"{DESTINO.relative_to(RAIZ)}: {DESTINO.stat().st_size} bytes (antes {ORIGEM.stat().st_size})")


if __name__ == "__main__":
    main()
