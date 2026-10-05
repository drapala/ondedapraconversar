"""Baixa os boletins de urna já publicados do 1º turno de 2026.

A URL de cada boletim sai do ele-c.json, do arquivo de seções da UF e do
arquivo auxiliar da seção. Seção sem `da` ainda não tem boletim e não é pedida.
Seção agregada (`nsp`) não tem urna própria e também não. Só entra o bu.dat do
hash Totalizado.

O TSE bloqueia por 10 minutos quem passa de 100 pedidos por segundo. Aqui o
teto é 85, com uma conexão HTTPS reaproveitada por thread. Pode parar e rodar
de novo: o que já está no disco não é pedido.

Uso:
    python scripts/baixar_boletins.py            # todas as UFs
    python scripts/baixar_boletins.py rr ac      # só algumas

Autor: Matheus C. Pestana
"""

from __future__ import annotations

import http.client
import json
import sys
import threading
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HOST = "resultados.tse.jus.br"
BASE = f"https://{HOST}"
POR_SEGUNDO = 85
TRABALHADORES = 32
UA = "onde-da-pra-conversar/0.1 (coleta publica de boletins de urna)"
SAIDA = Path(__file__).resolve().parent.parent / "dados" / "bruto" / "boletins"

UFS = ["rr", "ac", "ap", "ro", "to", "se", "al", "rn", "pi", "pb", "am", "df",
       "ms", "es", "sc", "go", "mt", "ma", "ce", "pa", "pe", "ba", "pr", "rs",
       "mg", "rj", "sp"]


class Bloqueado(Exception):
    pass


class Limitador:
    """Janela deslizante de um segundo, compartilhada entre as threads."""

    def __init__(self, por_segundo: int) -> None:
        self.por_segundo = por_segundo
        self.marcas: deque[float] = deque()
        self.trava = threading.Lock()

    def esperar(self) -> None:
        while True:
            with self.trava:
                agora = time.monotonic()
                while self.marcas and agora - self.marcas[0] >= 1.0:
                    self.marcas.popleft()
                if len(self.marcas) < self.por_segundo:
                    self.marcas.append(agora)
                    return
                espera = 1.0 - (agora - self.marcas[0])
            time.sleep(max(espera, 0.005))


limitador = Limitador(POR_SEGUNDO)
log_trava = threading.Lock()
parar = threading.Event()
local = threading.local()


def conexao() -> http.client.HTTPSConnection:
    if getattr(local, "conexao", None) is None:
        local.conexao = http.client.HTTPSConnection(HOST, timeout=30)
    return local.conexao


def fechar_conexao() -> None:
    atual = getattr(local, "conexao", None)
    if atual is not None:
        atual.close()
    local.conexao = None


def registrar(texto: str) -> None:
    linha = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {texto}"
    with log_trava:
        print(linha, flush=True)
        with open(SAIDA / "andamento.log", "a", encoding="utf-8") as f:
            f.write(linha + "\n")


def pedir(caminho: str, tentativas: int = 4) -> bytes | None:
    """GET com teto de pedidos. 404 devolve None; 403/429 levanta Bloqueado."""
    for tentativa in range(tentativas):
        if parar.is_set():
            raise Bloqueado("parado depois de um bloqueio")
        limitador.esperar()
        try:
            atual = conexao()
            atual.request("GET", f"/{caminho}", headers={"User-Agent": UA})
            resp = atual.getresponse()
            corpo = resp.read()
        except (http.client.HTTPException, OSError):
            fechar_conexao()
            time.sleep(1 + tentativa * 2)
            continue
        if resp.will_close:
            fechar_conexao()
        if resp.status == 200:
            return corpo
        if resp.status == 404:
            return None
        if resp.status in (403, 429):
            parar.set()
            raise Bloqueado(f"{resp.status} em {BASE}/{caminho}")
        time.sleep(1 + tentativa * 2)
    return None


def eleicao_federal() -> tuple[str, str]:
    """Pleito e código da eleição federal ordinária do 1º turno de 2026."""
    corpo = pedir("oficial/comum/config/ele-c.json")
    if corpo is None:
        raise SystemExit("ele-c.json não respondeu")
    config = json.loads(corpo)
    for pleito in config["pl"]:
        if pleito.get("c") != "ele2026":
            continue
        for eleicao in pleito["e"]:
            nome = eleicao.get("nm", "").lower()
            if str(eleicao.get("t")) == "1" and "federal" in nome and "ordin" in nome:
                return str(pleito["cd"]), str(eleicao["cd"])
    raise SystemExit("eleição federal de 2026 não encontrada no ele-c.json")


def secoes_com_urna(config: dict):
    for abr in config.get("abr", []):
        for mu in abr.get("mu", []):
            for zon in mu.get("zon", []):
                for sec in zon.get("sec", []):
                    if sec.get("nsp") or not sec.get("da"):
                        continue
                    yield mu["cd"], zon["cd"], sec["ns"]


def escolher_boletim(aux: dict) -> tuple[str, str] | None:
    hashes = aux.get("hashes") or []
    totalizados = [h for h in hashes if h.get("st") == "Totalizado"]
    escolhido = (totalizados or hashes or [None])[-1]
    if not escolhido:
        return None
    for arq in escolhido.get("arq", []):
        if arq.get("tp") == "bu":
            return escolhido["hash"], arq["nm"]
    return None


def baixar_secao(pleito: str, uf: str, mun: str, zona: str, secao: str) -> str:
    destino = SAIDA / uf / mun / f"{zona}-{secao}.bu"
    if destino.exists():
        return "ja"
    pasta = f"oficial/ele2026/arquivo-urna/{pleito}/dados/{uf}/{mun}/{zona}/{secao}"
    nome_aux = f"p{int(pleito):06d}-{uf}-m{mun}-z{zona}-s{secao}-aux.json"
    corpo = pedir(f"{pasta}/{nome_aux}")
    if corpo is None:
        return "sem_aux"
    escolha = escolher_boletim(json.loads(corpo))
    if escolha is None:
        return "sem_bu"
    hash_, nome_bu = escolha
    corpo = pedir(f"{pasta}/{hash_}/{nome_bu}")
    if corpo is None or not corpo.startswith(b"\x30"):
        return "falhou"
    destino.parent.mkdir(parents=True, exist_ok=True)
    parcial = destino.with_suffix(".bu.parcial")
    parcial.write_bytes(corpo)
    parcial.replace(destino)
    return "novo"


def baixar_uf(pleito: str, uf: str) -> None:
    corpo = pedir(f"oficial/ele2026/arquivo-urna/{pleito}/config/{uf}/{uf}-p{int(pleito):06d}-cs.json")
    if corpo is None:
        registrar(f"{uf}: sem arquivo de seções")
        return
    secoes = list(secoes_com_urna(json.loads(corpo)))
    registrar(f"{uf}: {len(secoes)} seções com boletim publicado")
    contagem: dict[str, int] = {}
    with ThreadPoolExecutor(TRABALHADORES) as pool:
        futuros = [pool.submit(baixar_secao, pleito, uf, mun.zfill(5), zona.zfill(4), secao.zfill(4))
                   for mun, zona, secao in secoes]
        for i, futuro in enumerate(futuros, 1):
            resultado = futuro.result()
            contagem[resultado] = contagem.get(resultado, 0) + 1
            if i % 2000 == 0:
                registrar(f"{uf}: {i}/{len(secoes)} {contagem}")
    registrar(f"{uf}: pronto {contagem}")


def main() -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)
    pedidas = [u.lower() for u in sys.argv[1:]] or UFS
    pleito, eleicao = eleicao_federal()
    registrar(f"pleito {pleito}, eleição {eleicao}, UFs {' '.join(pedidas)}")
    bloqueios = 0
    for uf in pedidas:
        while True:
            try:
                baixar_uf(pleito, uf)
                break
            except Bloqueado as erro:
                bloqueios += 1
                registrar(f"bloqueio do TSE ({erro}); pausa de 11 minutos")
                if bloqueios >= 3:
                    raise SystemExit("três bloqueios; parando para não piorar")
                time.sleep(660)
                parar.clear()


if __name__ == "__main__":
    main()
