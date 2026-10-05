import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
} from "react";
import type { Fase } from "../calendario";
import {
  RAIO_KM,
  ancoraDoPonto,
  comparar2022,
  fmt,
  fmtDistancia,
  fmtPct,
  listaHumana,
  nomeLocal,
  ordenar,
  parteDoLula,
  pilhas,
  porBairro,
  regioesPerto,
  situacao,
  somarVotos,
  type Indice,
  type Ponto,
  type RegiaoPerto,
} from "../dados";
import BlurText from "../efeitos/BlurText";
import Compartilhar from "./Compartilhar";
import ContaNumero from "../efeitos/ContaNumero";
import { buscarEndereco, registrarChegada, type CidadeAproximada, type Lugar } from "../geocodificar";
import { contar } from "../marcas";
import Disputa from "./Disputa";
import Estrela from "./Estrela";
import LulaAqui from "./LulaAqui";
import Mapa from "./Mapa";
import Rodape from "./Rodape";

// A ficha da região, com as conversas de cada eleitorado, só baixa quando alguém abre uma região.
const Ficha = lazy(() => import("./Ficha"));

const NENHUMA: RegiaoPerto[] = [];
const MOSTRAR_VISITAS_A_PARTIR = 100;
const LARGO = "(min-width: 960px)";
function useLargo() {
  return useSyncExternalStore(
    (avisar) => {
      const m = matchMedia(LARGO);
      m.addEventListener("change", avisar);
      return () => m.removeEventListener("change", avisar);
    },
    () => matchMedia(LARGO).matches,
  );
}

type Props = { indice: Indice | null; exemplo: boolean; fase: Fase; ancora: string | null };

const PONTO_NO_LINK = /^@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,2}(?:\.\d+)?)$/;

function pontoDoLink(ancora: string | null): Ponto | null {
  const m = ancora ? PONTO_NO_LINK.exec(ancora) : null;
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (lat < -34 || lat > 5.5 || lon < -74.5 || lon > -28.5) return null;
  return { lat, lon, rotulo: "Ponto que mandaram pra você" };
}

export default function Perto({ indice, exemplo, fase, ancora }: Props) {
  const largo = useLargo();
  const [ponto, setPonto] = useState<Ponto | null>(() => pontoDoLink(ancora));
  const [resultado, setResultado] = useState<{ de: Ponto; lista: RegiaoPerto[] } | null>(null);
  const [cidade, setCidade] = useState<CidadeAproximada | null>(null);
  const [visitas, setVisitas] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    registrarChegada().then((c) => {
      if (!vivo) return;
      setCidade(c.cidade);
      setVisitas(c.visitas);
    });
    return () => {
      vivo = false;
    };
  }, []);
  const [visao, setVisao] = useState<"perto" | "bairro">("perto");
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const candidatos = indice?.candidatos ?? {};
  const celula = indice?.celula ?? 0.1;

  useEffect(() => {
    const doLink = pontoDoLink(ancora);
    if (doLink) setPonto((atual) => (atual && ancoraDoPonto(atual) === ancoraDoPonto(doLink) ? atual : doLink));
  }, [ancora]);

  useEffect(() => {
    if (!ponto) return;
    const hash = `#/perto/${ancoraDoPonto(ponto)}`;
    if (location.hash !== hash) history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
  }, [ponto]);

  useEffect(() => {
    if (!ponto) return;
    let vivo = true;
    setSelecionada(null);
    regioesPerto(ponto, RAIO_KM, celula, exemplo).then((lista) => {
      if (vivo) setResultado({ de: ponto, lista });
    });
    return () => {
      vivo = false;
    };
  }, [ponto, celula, exemplo]);

  const todas = resultado?.lista ?? NENHUMA;
  const carregando = ponto !== null && resultado?.de !== ponto;
  const noRaio = todas;
  const lista = useMemo(() => ordenar(noRaio), [noRaio]);
  const total = useMemo(() => somarVotos(lista), [lista]);
  // Quantos votos de Lula do 2º turno de 2022 ainda não voltaram por aqui (só quando há).
  const de2022 = useMemo(() => comparar2022(lista), [lista]);
  const faltam2022 = de2022 && de2022.falta > 0 ? de2022.falta : null;
  const eleitores = lista.reduce((s, r) => s + r.eleitores, 0);
  const semBoletim = noRaio.filter((r) => situacao(r) === "sem_boletim").length;
  const urnasFaltando = lista.reduce((s, r) => s + r.urnas - r.apuradas, 0);
  const maxAte = lista[0]?.votos?.ate ?? 1;
  const regiaoAberta = todas.find((r) => r.id === selecionada) ?? null;

  useEffect(() => {
    if (exemplo || !lista.length) return;
    let vivo = true;
    contar(lista.slice(0, 400).map((r) => r.id)).then((c) => vivo && setContagens((antes) => ({ ...antes, ...c })));
    return () => {
      vivo = false;
    };
  }, [lista, exemplo]);

  const escolherNoMapa = useCallback((lat: number, lon: number) => setPonto({ lat, lon, rotulo: "Ponto escolhido no mapa" }), []);
  const fechar = useCallback(() => setSelecionada(null), []);
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

  const convida = fase === "antes" || fase === "conversa";
  const blocoMapa = (
    <div className="mapa-caixa">
      <Mapa
        ponto={ponto}
        inicio={cidade}
        raioKm={RAIO_KM}
        regioes={noRaio}
        maxAte={maxAte}
        selecionada={selecionada}
        onEscolherPonto={escolherNoMapa}
        onSelecionar={setSelecionada}
      />
      {!ponto && (
        <div className="mapa-dica">
          {cidade?.cidade ? `Você está por ${cidade.cidade}? Toque no mapa para escolher um ponto` : "Toque no mapa para escolher um ponto"}
        </div>
      )}
    </div>
  );

  return (
    <div className="perto">
      <div className="coluna">
        <div className="painel">
          <section className="abertura">
            <Estrela className="abertura-estrela" tamanho={320} cor="currentColor" />
            <p className="abertura-selo">Segundo turno · 25 de outubro</p>
            <BlurText as="h1" className="titulo-campanha" text="Onde dá pra conversar." />
            <p className="abertura-texto">
              Tem gente perto de você que pode fazer esse resultado virar. Descubra onde, chegue com uma boa conversa e ajude o Brasil a continuar soberano.
            </p>
            <a className="abertura-link" href="#/o-que-fazer">
              Quer ajudar? Veja o que fazer
            </a>
            {indice?.brasil && !exemplo && (
              <dl className="abertura-numeros">
                <div>
                  <dt>votos dá pra tentar virar no Brasil todo</dt>
                  <dd>{fmt(indice.brasil.ate)}</dd>
                </div>
                <div>
                  <dt>lugares de votação onde só os brancos, nulos e abstenções já dariam pra virar</dt>
                  <dd>{fmt(indice.brasil.viraveis)}</dd>
                </div>
              </dl>
            )}
            {visitas !== null && visitas >= MOSTRAR_VISITAS_A_PARTIR && (
              <p className="abertura-visitas">
                <b>{fmt(visitas)}</b> visitas desde 4 de outubro
              </p>
            )}
          </section>

          <Busca onPonto={setPonto} exemplo={exemplo} />

          {ponto && carregando && (
            <div className="carregando" aria-label="Carregando regiões">
              <div />
              <div />
              <div />
            </div>
          )}

          {ponto && !carregando && lista.length > 0 && (
            <section className="resultado" aria-live="polite">
              <p className="ponto-escolhido">{ponto.rotulo}</p>
              <h2 className="titulo-campanha manchete">
                {convida ? (
                  <>
                    Perto daqui, dá pra tentar virar até{" "}
                    <strong>
                      <ContaNumero valor={total.ate} /> votos
                    </strong>{" "}
                    para o Lula.
                  </>
                ) : (
                  <>
                    Perto daqui, <strong>{fmt(total.ate)} votos</strong> não foram para o Lula nem para o Flávio no primeiro turno.
                  </>
                )}
              </h2>
              {convida && faltam2022 !== null && (
                <p className="comparacao-2022">
                  Em 2022, no 2º turno, o Lula teve <strong>{fmt(faltam2022)} votos a mais</strong> por aqui do que tem agora.
                </p>
              )}
              <p className="decomposicao">
                {listaHumana(pilhas(total, candidatos).map((p) => `${fmt(p.quantidade)} ${p.rotulo}`))}.
              </p>
              <p className="pessoas">
                <b>{fmt(eleitores)} pessoas</b> votam a até 1 km daqui.{" "}
                <span className="miudo">Os votos possíveis são {Math.round((total.ate / Math.max(eleitores, 1)) * 100)}% delas.</span>
              </p>
              <LulaAqui votos={total} onde="perto" />
              <Disputa votos={total} />
            </section>
          )}

          {!largo && blocoMapa}

          {ponto && !carregando && lista.length > 0 && (
            <>
              <div className="legenda" aria-hidden>
                <span>
                  <i className="l-conversa" /> dá pra conversar
                </span>
                <span>
                  <i className="l-sem" /> sem boletim ainda
                </span>
              </div>
              <div className="controles">
                <div className="alternador" role="group" aria-label="Como ver a lista">
                  <button type="button" aria-pressed={visao === "perto"} onClick={() => setVisao("perto")}>
                    Perto de você
                  </button>
                  <button type="button" aria-pressed={visao === "bairro"} onClick={() => setVisao("bairro")}>
                    Por bairro
                  </button>
                </div>
                <span className="raio">Até 1 km</span>
              </div>
              {visao === "perto" ? (
                <ListaRegioes lista={lista} selecionada={selecionada} contagens={contagens} onAbrir={setSelecionada} />
              ) : (
                <ListaBairros lista={lista} selecionada={selecionada} contagens={contagens} onAbrir={setSelecionada} />
              )}
              <div className="notas">
                {(semBoletim > 0 || urnasFaltando > 0) && (
                  <p>
                    {semBoletim > 0 && `${fmt(semBoletim)} ${semBoletim === 1 ? "região ainda está" : "regiões ainda estão"} sem boletim publicado. `}
                    {urnasFaltando > 0 && `Nas regiões da lista, ${fmt(urnasFaltando)} ${urnasFaltando === 1 ? "urna ainda não tem" : "urnas ainda não têm"} boletim e ficam fora da conta.`}
                  </p>
                )}
                <p>Ordem: primeiro onde dá pra virar mais votos. No empate, a mais perto.</p>
              </div>
            </>
          )}

          {ponto && !carregando && lista.length === 0 && (
            <div className="vazio">
              {semBoletim > 0 ? (
                <>
                  <h2>Os boletins daqui ainda estão chegando.</h2>
                  <p className="corpo">
                    Tem {fmt(semBoletim)} {semBoletim === 1 ? "lugar de votação" : "lugares de votação"} a até 1 km esperando o boletim do
                    TSE. Volte mais tarde, ou toque em outro ponto do mapa.
                  </p>
                </>
              ) : (
                <>
                  <h2>Não tem seção de votação a até 1 km daqui.</h2>
                  <p className="corpo">
                    {exemplo
                      ? "Os números de exemplo cobrem São Paulo, Recife e Boa Vista. Tente um endereço numa dessas cidades."
                      : "Chegue mais perto do centro do bairro, ou toque em outro ponto do mapa."}
                  </p>
                </>
              )}
            </div>
          )}

          <Compartilhar
            votosPerto={ponto && !carregando && convida ? total.ate : null}
            ancora={ponto ? ancoraDoPonto(ponto) : null}
            lugar={ponto && !carregando ? (lista[0]?.municipio ?? null) : null}
          />
          <Rodape />
        </div>

        {regiaoAberta && (
          <Suspense fallback={null}>
            <Ficha
              regiao={regiaoAberta}
              candidatos={candidatos}
              fase={fase}
              exemplo={exemplo}
              contagem={contagens[regiaoAberta.id] ?? 0}
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

function Busca({ onPonto, exemplo }: { onPonto: (p: Ponto) => void; exemplo: boolean }) {
  const [sugestoes, setSugestoes] = useState<Lugar[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const campo = e.currentTarget.elements.namedItem("endereco") as HTMLInputElement;
    const texto = campo.value.trim();
    if (texto.length < 3) {
      setErro("Digite pelo menos o bairro e a cidade.");
      return;
    }
    setOcupado(true);
    setErro(null);
    setSugestoes([]);
    try {
      const achados = await buscarEndereco(texto);
      if (!achados.length) setErro("Não achamos esse endereço. Tente com o bairro e a cidade.");
      else if (achados.length === 1) onPonto(achados[0]);
      else setSugestoes(achados);
    } catch {
      setErro("A busca de endereço não respondeu. Tente de novo ou toque no mapa.");
    } finally {
      setOcupado(false);
    }
  }

  function ondeEstou() {
    if (!navigator.geolocation) {
      setErro("Este aparelho não informa a localização. Digite um endereço ou toque no mapa.");
      return;
    }
    setOcupado(true);
    setErro(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOcupado(false);
        onPonto({ lat: pos.coords.latitude, lon: pos.coords.longitude, rotulo: "Perto de onde você está" });
      },
      () => {
        setOcupado(false);
        setErro("Não deu para pegar sua localização. Digite um endereço ou toque no mapa.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <form className="busca" onSubmit={buscar}>
      <label htmlFor="endereco">Onde você está agora?</label>
      <div className="linha-busca">
        <input
          id="endereco"
          className="campo"
          type="search"
          autoComplete="street-address"
          name="endereco"
          placeholder="Bairro e cidade, ou rua"
        />
        <button type="submit" className="botao" disabled={ocupado}>
          Buscar
        </button>
      </div>
      <div className="acoes-busca">
        <button type="button" className="botao principal" onClick={ondeEstou} disabled={ocupado}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Usar onde eu estou
        </button>
        <span className="miudo">ou toque no mapa</span>
      </div>
      {exemplo && <p className="miudo contagem">Os números de exemplo cobrem São Paulo, Recife e Boa Vista.</p>}
      {sugestoes.length > 0 && (
        <ul className="sugestoes" aria-label="Endereços encontrados">
          {sugestoes.map((s) => (
            <li key={`${s.lat},${s.lon}`}>
              <button
                type="button"
                onClick={() => {
                  setSugestoes([]);
                  onPonto(s);
                }}
              >
                {s.rotulo}
              </button>
            </li>
          ))}
        </ul>
      )}
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
    </form>
  );
}

type ListaProps = {
  lista: RegiaoPerto[];
  selecionada: string | null;
  contagens: Record<string, number>;
  onAbrir: (id: string) => void;
};

type LinhaProps = {
  r: RegiaoPerto;
  ordem: number;
  selecionada: boolean;
  contagem: number;
  onAbrir: (id: string) => void;
  comBairro?: boolean;
};

function Linha({ r, ordem, selecionada, contagem, onAbrir, comBairro = true }: LinhaProps) {
  const nome = nomeLocal(r);
  const partes = [fmtDistancia(r.distancia), `${fmt(r.eleitores)} pessoas`];
  const lula = r.votos ? parteDoLula(r.votos) : null;
  if (lula !== null) partes.push(`Lula ${fmtPct(lula)}`);
  if (comBairro && r.bairro) partes.unshift(r.bairro);
  if (contagem > 0) partes.push(contagem === 1 ? "1 vai conversar" : `${fmt(contagem)} vão conversar`);
  return (
    <li className={selecionada ? "item selecionado" : "item"} style={{ "--i": Math.min(ordem, 12) } as CSSProperties}>
      <button type="button" onClick={() => onAbrir(r.id)}>
        <span>
          <span className="item-nome">{nome}</span>
          <span className="item-sub">
            {partes.join(" · ")}
          </span>
        </span>
        <span className="item-ate">
          <small>até</small>
          <b>{fmt(r.votos!.ate)}</b>
          <small>votos</small>
        </span>
      </button>
    </li>
  );
}

function ListaRegioes({ lista, selecionada, contagens, onAbrir }: ListaProps) {
  return (
    <ul className="lista">
      {lista.map((r, i) => (
        <Linha key={r.id} r={r} ordem={i} selecionada={r.id === selecionada} contagem={contagens[r.id] ?? 0} onAbrir={onAbrir} />
      ))}
    </ul>
  );
}

function ListaBairros({ lista, selecionada, contagens, onAbrir }: ListaProps) {
  const { bairros, semBairro } = useMemo(() => porBairro(lista), [lista]);
  return (
    <>
      <ul className="lista">
        {bairros.map((b, i) => (
          <li key={b.chave} className="item" style={{ "--i": Math.min(i, 12) } as CSSProperties}>
            <details>
              <summary className="item-resumo">
                <span>
                  <span className="item-nome">
                    {b.nome}, {b.municipio}
                  </span>
                  <span className="item-sub">
                    {b.regioes.length === 1 ? "1 região" : `${b.regioes.length} regiões`} · {fmt(b.eleitores)} pessoas · a partir de{" "}
                    {fmtDistancia(b.distancia)}
                  </span>
                </span>
                <span className="item-ate">
                  <small>até</small>
                  <b>{fmt(b.ate)}</b>
                  <small>votos</small>
                </span>
              </summary>
              <ul className="bairro-regioes">
                {b.regioes.map((r) => (
                  <Linha
                    key={r.id}
                    r={r}
                    ordem={0}
                    selecionada={r.id === selecionada}
                    contagem={contagens[r.id] ?? 0}
                    onAbrir={onAbrir}
                    comBairro={false}
                  />
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
      {semBairro > 0 && (
        <p className="notas junto">
          {semBairro === 1 ? "1 região não tem" : `${semBairro} regiões não têm`} bairro no cadastro do TSE. Ela{semBairro === 1 ? "" : "s"} aparece
          {semBairro === 1 ? "" : "m"} na lista Perto de você, sem ser somada a bairro nenhum.
        </p>
      )}
    </>
  );
}
