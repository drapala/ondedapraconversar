import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { podeMarcar, type Fase } from "../calendario";
import {
  carregarResultadoUrna,
  fmt,
  fmtDistancia,
  listaHumana,
  nomeLocal,
  pilhas,
  situacao,
  type RegiaoPerto,
  type ResultadoUrna,
} from "../dados";
import FadeContent from "../efeitos/FadeContent";
import { fichaPorChave } from "../fichas";
import { marcar, minhasRegioes } from "../marcas";
import Conversa from "./Conversa";
import Disputa from "./Disputa";

type Props = {
  regiao: RegiaoPerto;
  candidatos: Record<string, string>;
  fase: Fase;
  exemplo: boolean;
  contagem: number;
  onContagem: (id: string, total: number) => void;
  onFechar: () => void;
};

function secoesPorZona(secoes: [number, number][]) {
  const zonas = new Map<number, number[]>();
  for (const [zona, secao] of secoes) zonas.set(zona, [...(zonas.get(zona) ?? []), secao]);
  return [...zonas].map(([zona, lista]) => `Zona ${zona}: ${lista.length > 1 ? "seções" : "seção"} ${listaHumana(lista.map(String))}`);
}

function textoContagem(n: number) {
  if (n === 0) return "Ninguém marcou essa região ainda.";
  if (n === 1) return "1 pessoa já marcou que vai conversar por aqui.";
  return `${fmt(n)} pessoas já marcaram que vão conversar por aqui.`;
}

export default function Ficha({ regiao, candidatos, fase, exemplo, contagem, onContagem, onFechar }: Props) {
  const [marcada, setMarcada] = useState(() => minhasRegioes().has(regiao.id));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const voltar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMarcada(minhasRegioes().has(regiao.id));
    setErro(null);
    voltar.current?.focus();
  }, [regiao.id]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onFechar]);

  const tipo = situacao(regiao);
  const v = regiao.votos;
  const partes = v ? pilhas(v, candidatos) : [];
  const convida = fase === "antes" || fase === "conversa";
  const botao = tipo === "conversa" && !exemplo && podeMarcar(fase);

  async function alternar() {
    setEnviando(true);
    setErro(null);
    const resposta = await marcar(regiao.id, !marcada);
    setEnviando(false);
    if (resposta.ok) {
      setMarcada(!marcada);
      onContagem(regiao.id, resposta.total);
    } else {
      setErro(resposta.motivo);
    }
  }

  const titulo = nomeLocal(regiao);
  const onde = [regiao.bairro, regiao.municipio, regiao.uf].filter(Boolean).join(", ");
  // Ponto aproximado: a rota vai pelo endereço escrito, não pelo ponto estimado.
  const enderecoBusca = `${regiao.locais[0]?.endereco ?? ""}, ${regiao.municipio} - ${regiao.uf}`;
  const rotaGoogle = regiao.aprox
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoBusca)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${regiao.lat},${regiao.lon}`;
  const rotaWaze = regiao.aprox
    ? `https://waze.com/ul?q=${encodeURIComponent(enderecoBusca)}&navigate=yes`
    : `https://waze.com/ul?ll=${regiao.lat},${regiao.lon}&navigate=yes`;

  return (
    <div className="folha" role="dialog" aria-modal="false" aria-labelledby="ficha-titulo">
      <div className="folha-topo">
        <button ref={voltar} type="button" onClick={onFechar}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Voltar para a lista
        </button>
      </div>
      <div className="folha-corpo">
        <FadeContent key={regiao.id}>
          <h2 id="ficha-titulo" className="titulo-campanha ficha-titulo">
            {titulo}
          </h2>
          <p className="ficha-onde">
            {onde} · a {fmtDistancia(regiao.distancia)} do ponto escolhido
          </p>

          <p className="ficha-abertura">
            <b>{fmt(regiao.eleitores)} pessoas</b> votam nessas seções.
          </p>

          {tipo === "sem_boletim" && (
            <p className="contexto">O boletim de urna dessa região ainda não foi publicado pelo TSE. Assim que sair, o número aparece aqui.</p>
          )}

          {tipo === "conversa" && v && (
            <>
              <p className="titulo-campanha ficha-numero">
                {convida ? "Dá para tentar virar até " : "Aqui, "}
                <strong>{fmt(v.ate)} votos</strong>
                {convida ? " para o Lula." : " não foram para o Lula nem para o Flávio."}
              </p>
              <p className="decomposicao">
                {listaHumana(partes.map((p) => `${fmt(p.quantidade)} ${p.rotulo}`))}.
              </p>
              <Disputa votos={v} />
              {regiao.apuradas < regiao.urnas && (
                <p className="parcial">
                  {fmt(regiao.apuradas)} de {fmt(regiao.urnas)} urnas daqui já têm boletim. A conta usa só essas.
                </p>
              )}
              <p className="miudo contagem">{textoContagem(contagem)}</p>
            </>
          )}

          {tipo === "conversa" && partes.some((p) => p.ficha) && (
            <section className="ficha-secao">
              <h3>O que dá pra conversar aqui</h3>
              <ul className="conversas-da-regiao">
                {partes
                  .filter((p) => p.ficha)
                  .map((p) => {
                    const ficha = fichaPorChave(p.ficha!);
                    if (!ficha) return null;
                    return (
                      <li key={p.chave}>
                        <details>
                          <summary>
                            <span>
                              {ficha.titulo} <span className="miudo">({fmt(p.quantidade)})</span>
                            </span>
                          </summary>
                          <FadeContent className="conteudo">
                            <Conversa ficha={ficha} nivel={4} />
                          </FadeContent>
                        </details>
                      </li>
                    );
                  })}
              </ul>
            </section>
          )}

          <section className="ficha-secao">
            <h3>Onde essas pessoas votam</h3>
            <div className="como-chegar">
              <a
                className="botao"
                href={rotaGoogle}
                target="_blank"
                rel="noopener noreferrer"
              >
                Como chegar
              </a>
              <a href={rotaWaze} target="_blank" rel="noopener noreferrer">
                Abrir no Waze
              </a>
            </div>
            {regiao.aprox && (
              <p className="miudo">
                Localização aproximada. O TSE não publicou o ponto exato deste local, e o mapa usa uma estimativa feita pelo endereço,
                com o cadastro de endereços do IBGE. Confira o endereço antes de ir.
              </p>
            )}
            <ul className="locais">
              {regiao.locais.map((l) => (
                <li key={`${l.nome}-${l.secoes[0]?.join("-")}`}>
                  <b>{l.nome}</b>
                  {l.endereco}
                  {secoesPorZona(l.secoes).map((linha) => (
                    <span key={linha} className="miudo zona">
                      {linha}
                    </span>
                  ))}
                  {l.secoes.flatMap(([zona, secao]) => (
                    <ResultadoDaUrna
                      key={`${zona}-${secao}`}
                      uf={regiao.uf}
                      municipio={regiao.id.slice(3, 8)}
                      zona={zona}
                      secao={secao}
                      candidatos={candidatos}
                    />
                  ))}
                </li>
              ))}
            </ul>
          </section>
        </FadeContent>
      </div>

      {tipo === "conversa" && (
        <div className="folha-pe">
          {botao ? (
            <>
              <button
                type="button"
                className={marcada ? "botao largo feito" : "botao largo principal"}
                onClick={alternar}
                disabled={enviando}
                aria-pressed={marcada}
              >
                {marcada ? "Você vai conversar por aqui" : "Vou conversar por aqui"}
              </button>
              <p className="miudo" aria-live="polite">
                {erro ?? (marcada ? "Toque de novo para desmarcar." : "Sem cadastro. Conta uma vez por aparelho.")}
              </p>
            </>
          ) : (
            <p className="miudo">{motivoSemBotao(fase, exemplo)}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ResultadoDaUrna({
  uf,
  municipio,
  zona,
  secao,
  candidatos,
}: {
  uf: string;
  municipio: string;
  zona: number;
  secao: number;
  candidatos: Record<string, string>;
}) {
  const [resultado, setResultado] = useState<ResultadoUrna | null>(null);
  const [consultado, setConsultado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const votos = Object.entries(resultado?.nominais ?? {}).sort((a, b) => Number(b[1]) - Number(a[1]));

  async function aoAbrir(evento: SyntheticEvent<HTMLDetailsElement>) {
    if (!evento.currentTarget.open || consultado) return;
    setConsultado(true);
    setCarregando(true);
    setResultado(await carregarResultadoUrna(uf, municipio, zona, secao));
    setCarregando(false);
  }

  return (
    <details className="resultado-urna" onToggle={aoAbrir}>
      <summary>Ver votos presidenciais da seção {secao}</summary>
      {carregando && <p className="miudo">Carregando resultado do boletim…</p>}
      {!carregando && consultado && !resultado && (
        <p className="miudo">O detalhe desta urna ainda não está nos dados consolidados locais.</p>
      )}
      {resultado && (
        <div className="resultado-urna-corpo">
          <p className="miudo">1º turno · comparecimento {fmt(resultado.comparecimento)} · brancos {fmt(resultado.brancos)} · nulos {fmt(resultado.nulos)}</p>
          <ul>
            {votos.map(([numero, quantidade]) => (
              <li key={numero}>
                <span>{candidatos[numero] ?? `Candidato ${numero}`}</span>
                <b>{fmt(quantidade)}</b>
              </li>
            ))}
          </ul>
          <p className="miudo">Consolidado a partir do BU oficial do TSE.</p>
        </div>
      )}
    </details>
  );
}

function motivoSemBotao(fase: Fase, exemplo: boolean) {
  if (exemplo) return "Com números de exemplo não dá para marcar região.";
  switch (fase) {
    case "antes":
    case "conversa":
      return "";
    case "pausa":
    case "votacao":
    case "encerrada":
      return "A marcação fechou. Obrigado por cada conversa.";
    default: {
      const nunca: never = fase;
      return nunca;
    }
  }
}