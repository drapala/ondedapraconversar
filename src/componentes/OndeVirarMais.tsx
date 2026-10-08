// Página "Onde virar mais": escolhe o estado e a cidade e mostra os lugares de
// votação em que mais gente votou em branco, anulou ou ficou em casa no 1º turno.
// O clique em um lugar mostra o ponto no mapa e abre a ficha de sempre.
//
// Autor: Matheus C. Pestana

import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import type { Fase } from "../calendario";
import {
  METRICAS_ONDE,
  RAIO_KM,
  carregarLinhasDoMunicipio,
  carregarMunicipios,
  carregarRegiaoCompleta,
  fmt,
  linhaComoRegiao,
  listaHumana,
  nomeLocalOnde,
  ordenarOnde,
  valorOnde,
  type Indice,
  type LinhaOnde,
  type MetricaOnde,
  type MunicipioOnde,
  type Regiao,
  type RegiaoPerto,
} from "../dados";
import BlurText from "../efeitos/BlurText";
import ContaNumero from "../efeitos/ContaNumero";
import { contar } from "../marcas";
import { useLargo } from "../useLargo";
import AvisoEmail from "./AvisoEmail";
import Estrela from "./Estrela";
import Mapa from "./Mapa";
import Rodape from "./Rodape";

// A ficha, com as conversas de cada eleitorado, só baixa quando alguém abre um lugar.
const Ficha = lazy(() => import("./Ficha"));

const UFS: [sigla: string, nome: string][] = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"],
  ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
  ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"],
  ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"],
];

const PASSO = 50;
const ATALHOS = 6;
const MAX_SUGESTOES = 8;
const NENHUMA: LinhaOnde[] = [];

const ANCORA = /^([a-z]{2})(?:-(\d{3,6}))?$/;

function lerAncora(ancora: string | null): { uf: string; codigo: string | null } | null {
  const m = ancora ? ANCORA.exec(ancora) : null;
  if (!m) return null;
  const uf = m[1].toUpperCase();
  return UFS.some(([sigla]) => sigla === uf) ? { uf, codigo: m[2] ?? null } : null;
}

const semAcento = (texto: string) => texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
const nulosTexto = (n: number) => (n === 1 ? "nulo" : "nulos");

type Props = { indice: Indice | null; exemplo: boolean; fase: Fase; ancora: string | null };

export default function OndeVirarMais({ indice, exemplo, fase, ancora }: Props) {
  const largo = useLargo();
  const doLink = useMemo(() => lerAncora(ancora), [ancora]);
  const [uf, setUf] = useState(doLink?.uf ?? "");
  const [municipios, setMunicipios] = useState<MunicipioOnde[] | null>(null);
  const [municipio, setMunicipio] = useState<MunicipioOnde | null>(null);
  const [texto, setTexto] = useState("");
  const [linhas, setLinhas] = useState<{ de: string; lista: LinhaOnde[] } | null>(null);
  const [metrica, setMetrica] = useState<MetricaOnde>("todos");
  const [bairro, setBairro] = useState("");
  const [visiveis, setVisiveis] = useState(PASSO);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [regiaoAberta, setRegiaoAberta] = useState<Regiao | null>(null);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  // Município que o link pede e que ainda não foi encontrado na lista da UF.
  const pendente = useRef<string | null>(doLink?.codigo ?? null);
  // Último lugar aberto: resposta atrasada de um clique anterior não pode trocar a ficha.
  const ultimoAberto = useRef<string | null>(null);
  const candidatos = indice?.candidatos ?? {};

  // Link novo (ou colado) enquanto a página está aberta.
  useEffect(() => {
    if (!doLink) return;
    if (doLink.uf !== uf) {
      pendente.current = doLink.codigo;
      setUf(doLink.uf);
      setMunicipio(null);
      setTexto("");
    } else if (doLink.codigo && doLink.codigo !== municipio?.c && municipios) {
      const achado = municipios.find((m) => m.c === doLink.codigo);
      if (achado) {
        setMunicipio(achado);
        setTexto(achado.n);
      }
    }
    // Só reage ao link: o resto é estado da própria página.
  }, [doLink]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!uf) {
      setMunicipios(null);
      return;
    }
    let vivo = true;
    setMunicipios(null);
    carregarMunicipios(uf).then((lista) => {
      if (!vivo) return;
      setMunicipios(lista);
      const codigo = pendente.current;
      if (!codigo) return;
      pendente.current = null;
      const achado = lista.find((m) => m.c === codigo);
      if (achado) {
        setMunicipio(achado);
        setTexto(achado.n);
      }
    });
    return () => {
      vivo = false;
    };
  }, [uf]);

  const codigoDoMunicipio = municipio?.c ?? null;
  useEffect(() => {
    setBairro("");
    setVisiveis(PASSO);
    setSelecionada(null);
    setRegiaoAberta(null);
    if (!uf || !codigoDoMunicipio) {
      setLinhas(null);
      return;
    }
    let vivo = true;
    const chave = `${uf}-${codigoDoMunicipio}`;
    setLinhas(null);
    carregarLinhasDoMunicipio(uf, codigoDoMunicipio).then((lista) => {
      if (vivo) setLinhas({ de: chave, lista });
    });
    history.replaceState(null, "", `${location.pathname}${location.search}#/onde-virar-mais/${chave.toLowerCase()}`);
    return () => {
      vivo = false;
    };
  }, [uf, codigoDoMunicipio]);

  const carregando = municipio !== null && linhas?.de !== `${uf}-${municipio.c}`;
  const todas = (!carregando && linhas?.lista) || NENHUMA;
  const porId = useMemo(() => new Map(todas.map((l) => [l.id, l])), [todas]);

  const bairros = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const l of todas) if (l.bairro) contagem.set(l.bairro, (contagem.get(l.bairro) ?? 0) + 1);
    return [...contagem.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [todas]);

  const filtradas = useMemo(() => (bairro ? todas.filter((l) => l.bairro === bairro) : todas), [todas, bairro]);
  const ordenadas = useMemo(() => ordenarOnde(filtradas, metrica), [filtradas, metrica]);
  const regioesMapa = useMemo(() => ordenadas.map(linhaComoRegiao), [ordenadas]);
  const pontos = useMemo(() => filtradas.map((l) => ({ lat: l.lat, lon: l.lon })), [filtradas]);
  const maxValor = ordenadas[0] ? valorOnde(ordenadas[0], metrica) : 1;
  const valor = useCallback(
    (r: RegiaoPerto) => {
      const l = porId.get(r.id);
      return l ? valorOnde(l, metrica) : 0;
    },
    [porId, metrica],
  );
  const total = useMemo(
    () =>
      filtradas.reduce(
        (s, l) => ({
          brancos: s.brancos + l.brancos,
          nulos: s.nulos + l.nulos,
          abstencao: s.abstencao + l.abstencao,
          eleitores: s.eleitores + l.eleitores,
        }),
        { brancos: 0, nulos: 0, abstencao: 0, eleitores: 0 },
      ),
    [filtradas],
  );
  const fora = total.brancos + total.nulos + total.abstencao;
  const legenda = METRICAS_ONDE.find((m) => m.chave === metrica)!.legenda;

  const sugestoes = useMemo(() => {
    const busca = semAcento(texto);
    if (!municipios || !busca || municipio?.n === texto) return [];
    const comeca: MunicipioOnde[] = [];
    const contem: MunicipioOnde[] = [];
    for (const m of municipios) {
      const nome = semAcento(m.n);
      if (nome.startsWith(busca)) comeca.push(m);
      else if (nome.includes(busca)) contem.push(m);
    }
    return [...comeca, ...contem].slice(0, MAX_SUGESTOES);
  }, [municipios, texto, municipio]);

  const maiores = useMemo(() => (municipios ? [...municipios].sort((a, b) => b.a - a.a).slice(0, ATALHOS) : []), [municipios]);

  function escolherUf(sigla: string) {
    pendente.current = null;
    setUf(sigla);
    setMunicipio(null);
    setTexto("");
    history.replaceState(null, "", `${location.pathname}${location.search}#/onde-virar-mais`);
  }

  function escolherMunicipio(m: MunicipioOnde) {
    setMunicipio(m);
    setTexto(m.n);
  }

  function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sugestoes[0]) escolherMunicipio(sugestoes[0]);
  }

  const abrir = useCallback(
    (id: string) => {
      const linha = porId.get(id);
      if (!linha) return;
      setSelecionada(id);
      ultimoAberto.current = id;
      const posicao = ordenadas.findIndex((l) => l.id === id);
      if (posicao >= 0) setVisiveis((v) => Math.max(v, Math.ceil((posicao + 1) / PASSO) * PASSO));
      carregarRegiaoCompleta(linha).then((r) => {
        if (ultimoAberto.current === id) setRegiaoAberta(r);
      });
      contar([id]).then((c) => setContagens((antes) => ({ ...antes, ...c })));
    },
    [porId, ordenadas],
  );

  const fechar = useCallback(() => {
    ultimoAberto.current = null;
    setSelecionada(null);
    setRegiaoAberta(null);
  }, []);
  const atualizarContagem = useCallback((id: string, n: number) => setContagens((c) => ({ ...c, [id]: n })), []);

  if (fase === "votacao") {
    return (
      <div className="pagina">
        <h1 className="titulo-campanha">Hoje é dia de votar.</h1>
        <p className="chamada">Hoje o site fica parado. Não aborde eleitor em lugar nenhum até o fim da votação.</p>
        <p className="corpo">
          O material das conversas continua aberto para leitura, como consulta do que foi feito até sábado.
        </p>
      </div>
    );
  }

  const nomeUf = UFS.find(([sigla]) => sigla === uf)?.[1] ?? "";
  const aberta = regiaoAberta && regiaoAberta.id === selecionada ? regiaoAberta : null;

  const blocoMapa = (
    <div className="mapa-caixa">
      <Mapa
        ponto={null}
        inicio={null}
        raioKm={RAIO_KM}
        regioes={regioesMapa}
        maxAte={maxValor}
        selecionada={selecionada}
        onSelecionar={abrir}
        valor={valor}
        enquadrar={pontos}
      />
      {!municipio && <div className="mapa-dica">Escolha uma cidade para ver os lugares no mapa</div>}
    </div>
  );

  return (
    <div className="perto">
      <div className="coluna">
        <div className="painel">
          <section className="abertura">
            <Estrela className="abertura-estrela" tamanho={320} cor="currentColor" />
            <p className="abertura-selo">Segundo turno · 25 de outubro</p>
            <BlurText as="h1" className="titulo-campanha" text="Onde virar mais." />
            <p className="abertura-texto">
              Escolha a cidade e veja, lugar por lugar, onde mais gente votou em branco, anulou ou ficou em casa no primeiro turno. É pra
              lá que vale ir primeiro.
            </p>
            <a className="abertura-link" href="#/perto">
              Prefere partir do seu endereço? Abra o mapa
            </a>
          </section>

          {exemplo ? (
            <div className="vazio">
              <h2>Esta página abre quando os boletins chegarem.</h2>
              <p className="corpo">Por enquanto o site mostra só números de exemplo. Volte daqui a pouco.</p>
            </div>
          ) : (
            <form className="busca onde-busca" onSubmit={buscar}>
              <label htmlFor="onde-uf">Em que estado?</label>
              <select id="onde-uf" className="campo" value={uf} onChange={(e) => escolherUf(e.target.value)}>
                <option value="">Escolha o estado</option>
                {UFS.map(([sigla, nome]) => (
                  <option key={sigla} value={sigla}>
                    {nome}
                  </option>
                ))}
              </select>

              <label htmlFor="onde-cidade">Em que cidade?</label>
              <input
                id="onde-cidade"
                className="campo"
                type="search"
                autoComplete="off"
                disabled={!uf || municipios === null}
                placeholder={uf ? "Digite o nome da cidade" : "Escolha o estado primeiro"}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />

              {sugestoes.length > 0 && (
                <ul className="sugestoes" aria-label="Cidades encontradas">
                  {sugestoes.map((m) => (
                    <li key={m.c}>
                      <button type="button" onClick={() => escolherMunicipio(m)}>
                        {m.n}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {uf && municipios !== null && texto.trim() !== "" && municipio?.n !== texto && sugestoes.length === 0 && (
                <p className="erro" role="alert">
                  Não achamos essa cidade em {nomeUf}. Confira o nome.
                </p>
              )}

              {uf && !municipio && texto.trim() === "" && maiores.length > 0 && (
                <div className="onde-atalhos">
                  <p className="miudo">Ou comece por uma das maiores:</p>
                  <ul>
                    {maiores.map((m) => (
                      <li key={m.c}>
                        <button type="button" onClick={() => escolherMunicipio(m)}>
                          {m.n}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          )}

          {municipio && carregando && (
            <div className="carregando" aria-label="Carregando os lugares de votação">
              <div />
              <div />
              <div />
            </div>
          )}

          {municipio && !carregando && todas.length > 0 && (
            <>
              <section className="resultado" aria-live="polite">
                <p className="ponto-escolhido">
                  {municipio.n}, {uf}
                  {bairro && ` · ${bairro}`}
                </p>
                <h2 className="titulo-campanha manchete">
                  <strong>
                    <ContaNumero valor={fora} /> pessoas
                  </strong>{" "}
                  votaram em branco, anularam ou ficaram em casa{bairro ? ` em ${bairro}` : ""}.
                </h2>
                <p className="decomposicao">
                  {listaHumana([
                    `${fmt(total.abstencao)} não foram votar`,
                    `${fmt(total.brancos)} em branco`,
                    `${fmt(total.nulos)} ${nulosTexto(total.nulos)}`,
                  ])}
                  .
                </p>
                <p className="pessoas">
                  <b>{fmt(total.eleitores)} pessoas</b> votam em {fmt(filtradas.length)}{" "}
                  {filtradas.length === 1 ? "lugar de votação" : "lugares de votação"}.
                </p>
              </section>

              {!largo && blocoMapa}

              <div className="controles onde-controles">
                <div className="alternador" role="group" aria-label="O que ordena a lista">
                  {METRICAS_ONDE.map((m) => (
                    <button key={m.chave} type="button" aria-pressed={metrica === m.chave} onClick={() => setMetrica(m.chave)}>
                      {m.rotulo}
                    </button>
                  ))}
                </div>
                {bairros.length > 1 && (
                  <label className="onde-bairro">
                    <span className="sr">Filtrar por bairro</span>
                    <select
                      className="campo"
                      value={bairro}
                      onChange={(e) => {
                        setBairro(e.target.value);
                        setVisiveis(PASSO);
                      }}
                    >
                      <option value="">Todos os bairros</option>
                      {bairros.map(([nome, n]) => (
                        <option key={nome} value={nome}>
                          {nome} ({n})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <ul className="lista">
                {ordenadas.slice(0, visiveis).map((l, i) => {
                  const principal = valorOnde(l, metrica);
                  const partes = [l.secoes === 1 ? "1 seção" : `${fmt(l.secoes)} seções`, `${fmt(l.eleitores)} pessoas`];
                  if (!bairro && l.bairro) partes.unshift(l.bairro);
                  if (l.apuradas === l.urnas && l.eleitores > 0) {
                    partes.push(`${Math.round((principal / l.eleitores) * 100)}% das pessoas`);
                  }
                  const contagem = contagens[l.id] ?? 0;
                  if (contagem > 0) partes.push(contagem === 1 ? "1 vai conversar" : `${fmt(contagem)} vão conversar`);
                  return (
                    <li
                      key={l.id}
                      className={l.id === selecionada ? "item selecionado" : "item"}
                      style={{ "--i": Math.min(i, 12) } as CSSProperties}
                    >
                      <button type="button" onClick={() => abrir(l.id)}>
                        <span>
                          <span className="item-nome">
                            <span className="onde-pos" aria-hidden>
                              {i + 1}
                            </span>
                            {nomeLocalOnde(l)}
                          </span>
                          <span className="item-sub">{partes.join(" · ")}</span>
                          <span className="item-sub">
                            {fmt(l.abstencao)} não foram votar · {fmt(l.brancos)} em branco · {fmt(l.nulos)} {nulosTexto(l.nulos)}
                          </span>
                        </span>
                        <span className="item-ate">
                          <small>{legenda}</small>
                          <b>{fmt(principal)}</b>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {ordenadas.length > visiveis && (
                <div className="onde-mais">
                  <button type="button" className="botao largo" onClick={() => setVisiveis((v) => v + PASSO)}>
                    Ver mais {Math.min(PASSO, ordenadas.length - visiveis)} lugares
                  </button>
                </div>
              )}

              <div className="notas">
                {municipio.sb > 0 && (
                  <p>
                    {fmt(municipio.sb)} {municipio.sb === 1 ? "lugar de votação desta cidade ainda está" : "lugares de votação desta cidade ainda estão"}{" "}
                    sem boletim publicado e {municipio.sb === 1 ? "fica" : "ficam"} fora da conta.
                  </p>
                )}
                <p>Ordem: primeiro onde mais gente ficou de fora, pelo que você escolheu acima. No empate, vem o lugar com mais eleitores.</p>
              </div>
            </>
          )}

          {municipio && !carregando && todas.length === 0 && (
            <div className="vazio">
              <h2>Os boletins de {municipio.n} ainda estão chegando.</h2>
              <p className="corpo">Volte mais tarde, ou escolha outra cidade.</p>
            </div>
          )}

          <AvisoEmail origem="onde-virar-mais" />
          <Rodape />
        </div>

        {aberta && (
          <Suspense fallback={null}>
            <Ficha
              regiao={aberta}
              candidatos={candidatos}
              fase={fase}
              exemplo={exemplo}
              contagem={contagens[aberta.id] ?? 0}
              onContagem={atualizarContagem}
              onFechar={fechar}
            />
          </Suspense>
        )}
      </div>
      {largo && blocoMapa}
    </div>
  );
}
