import { useCallback, useEffect, useState } from "react";
import { fmt } from "../dados";
import GraficoDias from "./GraficoDias";

const VERMELHO = "#e4142c";
const TINTA = "#2a1a1c";

type Contagem = Partial<Record<"novo" | "ja" | "sem_aux" | "sem_bu" | "falhou", number>>;

type UfPainel = {
  urnas: number;
  comBoletim: number;
  semCoordenada: number;
  regioes: number;
  regioesComVotos?: number;
  eleitoresNoMapa?: number;
  urnasNoMapa?: number;
  apuradas?: number;
  lula?: number;
  flavio?: number;
  brancos?: number;
  nulos?: number;
  abstencao?: number;
  outros?: number;
  ate?: number;
  flavioNaFrente?: number;
  lulaNaFrente?: number;
  viraveis?: number;
  municipios: number;
  noDisco: number;
  invalidos: number;
  eleitoradoMenor: number;
  download: { publicadas?: number; processadas?: number; contagem?: Contagem; pronto?: boolean; atualizado?: string; inicio?: string };
};

type DadosPainel = {
  geradoEm: string;
  boletinsLidos: number;
  boletinsNoDisco: number;
  recusas: Record<string, number>;
  celulas: number;
  ufs: Record<string, UfPainel>;
};

type PorCampo = Record<string, number>;
type Uso = {
  ok: boolean;
  motivo?: string;
  agora?: string;
  marcas?: { regioes: number; pessoas: number; porUf: Record<string, { regioes: number; pessoas: number }>; maisGente: { id: string; pessoas: number }[] };
  uso?: {
    hoje: string;
    visitasTotal: number;
    visitantesNoPeriodo: number;
    porDia: { dia: string; futuro: boolean; visitantes: number; aberturas: number; marcacoes: number; desmarcacoes: number }[];
    porUf: { aberturas: PorCampo; marcacoes: PorCampo; desmarcacoes: PorCampo; visitantes: PorCampo };
  };
  deploy?: { commit: string | null; mensagem: string | null; ambiente: string; regiao: string | null };
};

const n = (v: number | undefined) => fmt(v ?? 0);
const pct = (parte: number, todo: number) => (todo ? `${((parte / todo) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "–");
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const registro = (log: string) => {
  const [data, hora] = log.split(" ");
  return `${data.split("-").reverse().slice(0, 2).join("/")} ${hora.slice(0, 5)}`;
};

function somaUfs(ufs: UfPainel[], campo: keyof UfPainel): number {
  return ufs.reduce((s, u) => s + (typeof u[campo] === "number" ? (u[campo] as number) : 0), 0);
}

function situacaoDownload(u: UfPainel): string {
  const d = u.download;
  if (!d.publicadas) return "não começou";
  if (d.pronto) return "pronto";
  return `baixando ${n(d.processadas)}/${n(d.publicadas)}`;
}

export default function Painel() {
  const [dados, setDados] = useState<DadosPainel | null>(null);
  const [uso, setUso] = useState<Uso | null>(null);
  const [atualizado, setAtualizado] = useState<Date | null>(null);

  const carregar = useCallback(async () => {
    const [d, u] = await Promise.all([
      fetch(`/dados/painel.json?t=${Date.now()}`).then((r) => (r.ok ? (r.json() as Promise<DadosPainel>) : null)).catch(() => null),
      fetch("/api/painel")
        .then((r) => (r.headers.get("content-type")?.includes("json") ? (r.json() as Promise<Uso>) : null))
        .catch(() => null),
    ]);
    setDados(d);
    setUso(u);
    setAtualizado(new Date());
  }, []);

  useEffect(() => {
    document.title = "Painel · Onde dá pra conversar";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    carregar();
    const relogio = setInterval(carregar, 60_000);
    return () => {
      clearInterval(relogio);
      meta.remove();
    };
  }, [carregar]);

  const siglas = dados ? Object.keys(dados.ufs).sort() : [];
  const ufs = siglas.map((s) => dados!.ufs[s]);
  const urnas = somaUfs(ufs, "urnas");
  const comBoletim = somaUfs(ufs, "comBoletim");
  const publicadas = ufs.reduce((s, u) => s + (u.download.publicadas ?? 0), 0);
  const conta = (campo: keyof Contagem) => ufs.reduce((s, u) => s + (u.download.contagem?.[campo] ?? 0), 0);
  const prontos = ufs.filter((u) => u.download.pronto).length;
  const marcasPorUf = uso?.marcas?.porUf ?? {};
  const aberturasPorUf = uso?.uso?.porUf.aberturas ?? {};
  const visitantesPorUf = uso?.uso?.porUf.visitantes ?? {};
  const porDia = uso?.uso?.porDia ?? [];
  const iHoje = porDia.findIndex((d) => d.dia === uso?.uso?.hoje);
  const hoje = porDia[iHoje];
  const ontem = iHoje > 0 ? porDia[iHoje - 1] : undefined;
  const serie = (campo: "visitantes" | "aberturas" | "marcacoes" | "desmarcacoes") =>
    porDia.map((d) => (d.futuro ? null : d[campo]));

  return (
    <main className="dash">
      <header className="dash-topo">
        <div>
          <p className="sobretitulo">Painel interno</p>
          <h1>Onde dá pra conversar</h1>
        </div>
        <div className="dash-atualizado">
          {atualizado && <span>Atualizado às {atualizado.toLocaleTimeString("pt-BR")}</span>}
          <button type="button" className="botao" onClick={carregar}>
            Atualizar
          </button>
        </div>
      </header>

      {!dados && <p className="corpo">Carregando painel.json…</p>}

      {dados && (
        <>
          <section className="dash-cartoes">
            <Cartao rotulo="Boletins no site" valor={n(dados.boletinsLidos)} nota={`${pct(comBoletim, urnas)} das ${n(urnas)} urnas do cadastro`} />
            <Cartao rotulo="Estados prontos" valor={`${prontos} de 27`} nota={`${n(publicadas)} seções publicadas pelo TSE já listadas`} />
            <Cartao rotulo="Boletins no disco" valor={n(dados.boletinsNoDisco)} nota={`${n(somaUfs(ufs, "invalidos"))} ilegíveis`} />
            <Cartao rotulo="Sem arquivo auxiliar" valor={n(conta("sem_aux"))} nota={`${n(conta("falhou"))} falharam · ${n(conta("sem_bu"))} sem BU`} />
            <Cartao rotulo="Regiões no mapa" valor={n(somaUfs(ufs, "regioes"))} nota={`${n(somaUfs(ufs, "regioesComVotos"))} com votos · ${n(dados.celulas)} células`} />
            <Cartao rotulo="Sem coordenada" valor={n(somaUfs(ufs, "semCoordenada"))} nota="urnas fora do mapa" />
            <Cartao rotulo="Dá pra tentar virar" valor={n(somaUfs(ufs, "ate"))} nota="branco + nulo + abstenção + outros" />
            <Cartao
              rotulo="Regiões viráveis"
              valor={n(somaUfs(ufs, "viraveis"))}
              nota={`de ${n(somaUfs(ufs, "flavioNaFrente"))} com Flávio na frente`}
            />
          </section>
          <p className="dash-nota">
            Dados montados em {quando(dados.geradoEm)}. O andamento do download é o do momento da montagem.
          </p>

          <h2>Boletins por estado</h2>
          <div className="dash-tabela">
            <table>
              <thead>
                <tr>
                  <th>UF</th>
                  <th>Download</th>
                  <th>Urnas no cadastro</th>
                  <th>Publicadas (TSE)</th>
                  <th>Novos</th>
                  <th>Já tinha</th>
                  <th>Sem aux</th>
                  <th>Sem BU</th>
                  <th>Falhou</th>
                  <th>No disco</th>
                  <th>Ilegíveis</th>
                  <th>No site</th>
                  <th>Cobertura</th>
                  <th>Eleitorado &lt; comparec.</th>
                  <th>Sem coordenada</th>
                  <th>Último registro</th>
                </tr>
              </thead>
              <tbody>
                {siglas.map((s) => {
                  const u = dados.ufs[s];
                  const c = u.download.contagem ?? {};
                  return (
                    <tr key={s} className={u.download.pronto ? "" : "pendente"}>
                      <th>{s}</th>
                      <td className="texto">{situacaoDownload(u)}</td>
                      <td>{n(u.urnas)}</td>
                      <td>{n(u.download.publicadas)}</td>
                      <td>{n(c.novo)}</td>
                      <td>{n(c.ja)}</td>
                      <td className={c.sem_aux ? "alerta" : ""}>{n(c.sem_aux)}</td>
                      <td>{n(c.sem_bu)}</td>
                      <td className={c.falhou ? "alerta" : ""}>{n(c.falhou)}</td>
                      <td>{n(u.noDisco)}</td>
                      <td>{n(u.invalidos)}</td>
                      <td>{n(u.comBoletim)}</td>
                      <td>{pct(u.comBoletim, u.urnas)}</td>
                      <td>{n(u.eleitoradoMenor)}</td>
                      <td>{n(u.semCoordenada)}</td>
                      <td>{u.download.atualizado ? registro(u.download.atualizado) : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2>Votos por estado (1º turno, urnas com boletim)</h2>
          <div className="dash-tabela">
            <table>
              <thead>
                <tr>
                  <th>UF</th>
                  <th>Municípios</th>
                  <th>Regiões</th>
                  <th>Eleitores no mapa</th>
                  <th>Lula</th>
                  <th>Flávio</th>
                  <th>Branco</th>
                  <th>Nulo</th>
                  <th>Abstenção</th>
                  <th>Outros</th>
                  <th>Dá pra virar</th>
                  <th>Lula na frente</th>
                  <th>Flávio na frente</th>
                  <th>Viráveis</th>
                </tr>
              </thead>
              <tbody>
                {siglas.map((s) => {
                  const u = dados.ufs[s];
                  return (
                    <tr key={s} className={u.comBoletim ? "" : "pendente"}>
                      <th>{s}</th>
                      <td>{n(u.municipios)}</td>
                      <td>{n(u.regioes)}</td>
                      <td>{n(u.eleitoresNoMapa)}</td>
                      <td>{n(u.lula)}</td>
                      <td>{n(u.flavio)}</td>
                      <td>{n(u.brancos)}</td>
                      <td>{n(u.nulos)}</td>
                      <td>{n(u.abstencao)}</td>
                      <td>{n(u.outros)}</td>
                      <td>
                        <b>{n(u.ate)}</b>
                      </td>
                      <td>{n(u.lulaNaFrente)}</td>
                      <td>{n(u.flavioNaFrente)}</td>
                      <td>{n(u.viraveis)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total</th>
                  <td>{n(somaUfs(ufs, "municipios"))}</td>
                  <td>{n(somaUfs(ufs, "regioes"))}</td>
                  <td>{n(somaUfs(ufs, "eleitoresNoMapa"))}</td>
                  <td>{n(somaUfs(ufs, "lula"))}</td>
                  <td>{n(somaUfs(ufs, "flavio"))}</td>
                  <td>{n(somaUfs(ufs, "brancos"))}</td>
                  <td>{n(somaUfs(ufs, "nulos"))}</td>
                  <td>{n(somaUfs(ufs, "abstencao"))}</td>
                  <td>{n(somaUfs(ufs, "outros"))}</td>
                  <td>
                    <b>{n(somaUfs(ufs, "ate"))}</b>
                  </td>
                  <td>{n(somaUfs(ufs, "lulaNaFrente"))}</td>
                  <td>{n(somaUfs(ufs, "flavioNaFrente"))}</td>
                  <td>{n(somaUfs(ufs, "viraveis"))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {Object.keys(dados.recusas).length > 0 && (
            <>
              <h2>Boletins recusados na montagem</h2>
              <ul className="dash-lista">
                {Object.entries(dados.recusas).map(([motivo, qtd]) => (
                  <li key={motivo}>
                    <b>{n(qtd)}</b> {motivo}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <h2>Uso do site</h2>
      {!uso && <p className="corpo">Sem resposta de /api/painel (só funciona na Vercel).</p>}
      {uso && !uso.ok && <p className="corpo">Erro ao ler o Redis: {uso.motivo}</p>}
      {uso?.ok && uso.marcas && uso.uso && (
        <>
          <section className="dash-cartoes">
            <Cartao rotulo="Visitas (o número da página inicial)" valor={n(uso.uso.visitasTotal)} nota="aberturas do mapa desde 04/10" />
            <Cartao rotulo="Visitantes hoje" valor={n(hoje?.visitantes)} nota={ontem ? `${n(ontem.visitantes)} ontem` : "primeiro dia"} />
            <Cartao rotulo="Visitantes desde 04/10" valor={n(uso.uso.visitantesNoPeriodo)} nota="quem voltou conta uma vez" />
            <Cartao rotulo="Aberturas do mapa hoje" valor={n(hoje?.aberturas)} nota={ontem ? `${n(ontem.aberturas)} ontem` : "primeiro dia"} />
            <Cartao rotulo="Pessoas marcadas" valor={n(uso.marcas.pessoas)} nota={`em ${n(uso.marcas.regioes)} regiões`} />
            <Cartao rotulo="Marcações hoje" valor={n(hoje?.marcacoes)} nota={`${n(hoje?.desmarcacoes)} desmarcações`} />
          </section>

          <h3>Visitantes e aberturas por dia, até o segundo turno</h3>
          <GraficoDias
            dias={porDia.map((d) => d.dia)}
            series={[
              { nome: "Visitantes", cor: VERMELHO, tipo: "barra", valores: serie("visitantes") },
              { nome: "Aberturas do mapa", cor: TINTA, tipo: "linha", valores: serie("aberturas") },
            ]}
          />

          <h3>Marcações por dia</h3>
          <GraficoDias
            dias={porDia.map((d) => d.dia)}
            series={[
              { nome: "Marcações", cor: VERMELHO, tipo: "barra", valores: serie("marcacoes") },
              { nome: "Desmarcações", cor: "#9a8a8c", tipo: "barra", valores: serie("desmarcacoes") },
            ]}
          />
          <p className="dash-nota">
            Visitantes é uma estimativa (erro típico abaixo de 1%) por IP e navegador, sem guardar nenhum dos dois. Gente na mesma rede e
            no mesmo tipo de aparelho pode contar como uma só; a mesma pessoa no celular e no computador conta como duas.
          </p>

          <div className="dash-colunas">
            <div>
              <h3>Por dia</h3>
              <div className="dash-tabela">
                <table>
                  <thead>
                    <tr>
                      <th>Dia</th>
                      <th>Visitantes</th>
                      <th>Aberturas</th>
                      <th>Marcações</th>
                      <th>Desmarcações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porDia.map((d) => (
                      <tr key={d.dia} className={d.futuro ? "pendente" : d === hoje ? "hoje" : ""}>
                        <th>
                          {d.dia.split("-").reverse().slice(0, 2).join("/")}
                          {d === hoje && " · hoje"}
                          {d.dia === porDia[porDia.length - 1]?.dia && " · 2º turno"}
                        </th>
                        <td>{d.futuro ? "" : n(d.visitantes)}</td>
                        <td>{d.futuro ? "" : n(d.aberturas)}</td>
                        <td>{d.futuro ? "" : n(d.marcacoes)}</td>
                        <td>{d.futuro ? "" : n(d.desmarcacoes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3>Por estado, desde 04/10</h3>
              <div className="dash-tabela">
                <table>
                  <thead>
                    <tr>
                      <th>Origem</th>
                      <th>Visitantes</th>
                      <th>Aberturas</th>
                      <th>Regiões marcadas</th>
                      <th>Pessoas marcadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...new Set([...Object.keys(aberturasPorUf), ...Object.keys(marcasPorUf)])]
                      .sort((a, b) => (aberturasPorUf[b] ?? 0) - (aberturasPorUf[a] ?? 0))
                      .map((uf) => (
                        <tr key={uf}>
                          <th>{uf}</th>
                          <td>{n(visitantesPorUf[uf])}</td>
                          <td>{n(aberturasPorUf[uf])}</td>
                          <td>{n(marcasPorUf[uf]?.regioes)}</td>
                          <td>{n(marcasPorUf[uf]?.pessoas)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {uso.marcas.maisGente.length > 0 && (
            <>
              <h3>Regiões com mais gente marcada</h3>
              <ol className="dash-lista">
                {uso.marcas.maisGente.map((r) => (
                  <li key={r.id}>
                    <b>{n(r.pessoas)}</b> <code>{r.id}</code>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}

      {uso?.deploy && (
        <p className="dash-nota">
          Deploy {uso.deploy.ambiente}
          {uso.deploy.commit && ` · ${uso.deploy.commit}`}
          {uso.deploy.mensagem && ` · ${uso.deploy.mensagem}`}
          {uso.deploy.regiao && ` · região ${uso.deploy.regiao}`}
        </p>
      )}
    </main>
  );
}

function Cartao({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="dash-cartao">
      <span>{rotulo}</span>
      <b>{valor}</b>
      {nota && <small>{nota}</small>}
    </div>
  );
}
