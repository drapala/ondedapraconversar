"""Baixa os três conjuntos do TSE de 2022 usados para estimar quem faltou no
2º turno em cada local de votação (ver scripts/estimar_perfil_2022.py):

  perfil_comparecimento_abstencao_2022   abstenção por perfil, por zona
  perfil_eleitor_secao_2022_{UF}         eleitorado por perfil, por seção
  detalhe_votacao_secao_2022             aptos e abstenções, por seção

Os endereços vêm da API CKAN do TSE (dadosabertos.tse.jus.br), como no projeto
Eleicoes2026. O download usa o curl e não repete arquivo que já está inteiro.

Saída em dados/bruto/perfil2022/ (fora do git).

Uso: python scripts/baixar_perfil_2022.py

Autor: Matheus C. Pestana
"""

from __future__ import annotations

import json
import subprocess
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "dados" / "bruto" / "perfil2022"
CKAN = "https://dadosabertos.tse.jus.br/api/3/action/package_show?id="
PACOTES = {
    "comparecimento-e-abstencao-2022": lambda url: url.endswith("/perfil_comparecimento_abstencao_2022.zip"),
    "eleitorado-2022": lambda url: "/perfil_eleitor_secao/perfil_eleitor_secao_2022_" in url and not url.endswith("_ZZ.zip"),
    "resultados-2022": lambda url: url.endswith("/detalhe_votacao_secao_2022.zip"),
}


def urls() -> list[str]:
    saida = []
    for pacote, quero in PACOTES.items():
        resposta = subprocess.run(["curl", "-sSf", "--retry", "4", CKAN + pacote], check=True, capture_output=True).stdout
        saida += [r["url"] for r in json.loads(resposta)["result"]["resources"] if quero(r["url"])]
    return saida


def inteiro(caminho: Path) -> bool:
    try:
        with zipfile.ZipFile(caminho) as z:
            return bool(z.namelist())
    except (zipfile.BadZipFile, OSError):
        return False


def baixar(url: str) -> str:
    destino = PASTA / url.rsplit("/", 1)[1]
    if destino.exists() and inteiro(destino):
        return f"já tinha {destino.name}"
    parcial = destino.with_suffix(".parcial")
    subprocess.run(["curl", "-sSfL", "--retry", "4", "--retry-delay", "5", "-o", str(parcial), url], check=True)
    parcial.replace(destino)
    return f"baixado {destino.name}" if inteiro(destino) else f"ZIP RUIM {destino.name}"


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    lista = urls()
    print(f"{len(lista)} arquivos", flush=True)
    with ThreadPoolExecutor(4) as pool:
        for linha in pool.map(baixar, lista):
            print(linha, flush=True)


if __name__ == "__main__":
    main()
