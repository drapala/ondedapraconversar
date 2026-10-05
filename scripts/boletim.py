"""Leitor do boletim de urna (arquivo -bu.dat, ASN.1 em DER).

Não há schema junto do arquivo, e o formato muda entre eleições. A leitura vai
pela posição conhecida de cada campo e, quando a posição não tem a forma
esperada, procura o campo que tenha. Campo sem a forma certa é recusa, nunca
palpite. A conferência final exige que os votos de presidente somem o
comparecimento da urna, e que o número de eleitores aptos do boletim seja pelo
menos o comparecimento.

Autor: Matheus C. Pestana
"""

from __future__ import annotations

from dataclasses import dataclass, field

CONTEXTO = 2
PRESIDENTE = 1
FASE_OFICIAL = 2
TIPOS = {1: "nominal", 2: "branco", 3: "nulo", 4: "legenda", 5: "cargo_sem_candidato"}


class BoletimInvalido(Exception):
    pass


@dataclass
class No:
    classe: int
    construido: bool
    conteudo: bytes
    filhos: list["No"] = field(default_factory=list)

    @property
    def inteiro(self) -> int:
        return int.from_bytes(self.conteudo, "big", signed=True)


def ler_der(dados: bytes, pos: int = 0, fim: int | None = None) -> list[No]:
    fim = len(dados) if fim is None else fim
    nos: list[No] = []
    while pos < fim:
        if pos + 2 > fim:
            raise BoletimInvalido("DER truncado")
        etiqueta = dados[pos]
        pos += 1
        if etiqueta & 0x1F == 0x1F:
            while True:
                if pos >= fim:
                    raise BoletimInvalido("etiqueta longa sem fim")
                byte = dados[pos]
                pos += 1
                if not byte & 0x80:
                    break
        primeiro = dados[pos]
        pos += 1
        if primeiro & 0x80:
            n = primeiro & 0x7F
            if n > 4 or pos + n > fim:
                raise BoletimInvalido("tamanho inválido")
            tamanho = int.from_bytes(dados[pos:pos + n], "big")
            pos += n
        else:
            tamanho = primeiro
        if pos + tamanho > fim:
            raise BoletimInvalido("conteúdo menor que o anunciado")
        no = No(etiqueta >> 6, bool(etiqueta & 0x20), dados[pos:pos + tamanho])
        if no.construido:
            no.filhos = ler_der(dados, pos, pos + tamanho)
        nos.append(no)
        pos += tamanho
    return nos


def _exigir(condicao: bool, mensagem: str) -> None:
    if not condicao:
        raise BoletimInvalido(mensagem)


def _filho(no: No, i: int, nome: str) -> No:
    _exigir(no.construido and len(no.filhos) > i, f"falta {nome}")
    return no.filhos[i]


def _cru(no: No) -> int:
    _exigir(not no.construido and len(no.conteudo) <= 8, "inteiro de contexto inválido")
    return int.from_bytes(no.conteudo, "big")


def _eh_votavel(no: No) -> bool:
    return (no.construido and len(no.filhos) >= 2
            and all(not f.construido and f.classe == CONTEXTO for f in no.filhos[:2]))


def _eh_cargos(no: No) -> bool:
    return (no.construido and bool(no.filhos)
            and all(c.construido and len(c.filhos) >= 3 and c.filhos[2].construido
                    and bool(c.filhos[2].filhos)
                    and all(_eh_votavel(v) for v in c.filhos[2].filhos)
                    for c in no.filhos))


def _eh_grupos(no: No) -> bool:
    return (no.construido and bool(no.filhos)
            and all(g.construido and len(g.filhos) >= 3 and _eh_cargos(g.filhos[2])
                    for g in no.filhos))


def _eh_eleicoes(no: No) -> bool:
    return (no.construido and bool(no.filhos)
            and all(e.construido and any(_eh_grupos(f) for f in e.filhos) for e in no.filhos))


def _por_forma(no: No, i: int, forma, nome: str) -> No:
    if len(no.filhos) > i and forma(no.filhos[i]):
        return no.filhos[i]
    for candidato in no.filhos:
        if forma(candidato):
            return candidato
    raise BoletimInvalido(f"nenhum campo com a forma de {nome}")


@dataclass
class Presidente:
    municipio: str
    zona: int
    local: int
    secao: int
    comparecimento: int
    aptos: int
    brancos: int = 0
    nulos: int = 0
    nominais: dict[int, int] = field(default_factory=dict)

    @property
    def total(self) -> int:
        return self.brancos + self.nulos + sum(self.nominais.values())


def ler_presidente(dados: bytes) -> Presidente:
    """Votos de presidente de um boletim oficial. Qualquer surpresa vira recusa."""
    try:
        return _ler(dados)
    except BoletimInvalido:
        raise
    except (IndexError, ValueError, AttributeError, TypeError) as erro:
        raise BoletimInvalido(f"estrutura inesperada: {erro}") from erro


def _ler(dados: bytes) -> Presidente:
    raiz = ler_der(dados)
    _exigir(bool(raiz) and raiz[0].construido and bool(raiz[0].filhos), "envelope vazio")
    bruto = raiz[0].filhos[-1]
    _exigir(not bruto.construido and bool(bruto.conteudo), "envelope sem boletim")
    interno = ler_der(bruto.conteudo)[0]

    fase = _filho(interno, 1, "fase")
    _exigir(not fase.construido and fase.inteiro == FASE_OFICIAL, "boletim fora da fase oficial")

    ident = _filho(interno, 3, "identificação")
    mun_zona = _filho(ident, 0, "município e zona")
    municipio = _filho(mun_zona, 0, "município").inteiro
    zona = _filho(mun_zona, 1, "zona").inteiro
    local = _filho(ident, 1, "local").inteiro
    secao = _filho(ident, 2, "seção").inteiro
    _exigir(0 < municipio <= 99999 and zona > 0 and secao > 0 and local > 0, "identificação fora da faixa")

    resultados = _por_forma(interno, 8, _eh_eleicoes, "resultados")
    achado: Presidente | None = None
    for eleicao in resultados.filhos:
        grupos = _por_forma(eleicao, 4, _eh_grupos, "grupos")
        aptos_no = _filho(eleicao, 1, "eleitores aptos")
        _exigir(not aptos_no.construido and aptos_no.classe == 0, "eleitores aptos sem a forma esperada")
        for grupo in grupos.filhos:
            comparecimento = _filho(grupo, 1, "comparecimento").inteiro
            for totais in _filho(grupo, 2, "cargos").filhos:
                if _cru(_filho(totais, 0, "cargo")) != PRESIDENTE:
                    continue
                _exigir(achado is None, "presidente aparece duas vezes")
                achado = Presidente(f"{municipio:05d}", zona, local, secao, comparecimento, aptos_no.inteiro)
                for votavel in totais.filhos[2].filhos:
                    tipo = TIPOS.get(_cru(votavel.filhos[0]), "desconhecido")
                    qtd = votavel.filhos[1].inteiro
                    _exigir(qtd >= 0, "quantidade negativa")
                    if tipo == "branco":
                        achado.brancos += qtd
                    elif tipo == "nulo":
                        achado.nulos += qtd
                    elif tipo == "nominal":
                        ident_v = _filho(votavel, 2, "identificação do votável")
                        _exigir(ident_v.construido and len(ident_v.filhos) == 2, "nominal sem número")
                        numero = ident_v.filhos[1].inteiro
                        achado.nominais[numero] = achado.nominais.get(numero, 0) + qtd
                    else:
                        raise BoletimInvalido(f"tipo de voto inesperado para presidente: {tipo}")
    _exigir(achado is not None, "boletim sem presidente")
    assert achado is not None
    _exigir(0 < achado.aptos and achado.comparecimento <= achado.aptos,
            f"aptos {achado.aptos}, comparecimento {achado.comparecimento}")
    _exigir(achado.total == achado.comparecimento,
            f"votos somam {achado.total}, comparecimento {achado.comparecimento}")
    return achado
