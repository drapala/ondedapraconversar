// Autor: Matheus C. Pestana

import { useEffect, useMemo, useState } from "react";
import { fmt } from "../dados";

type Totais = {
  eleitores: number;
  urnas: number;
  apuradas: number;
  lula: number;
  flavio: number;
  brancos: number;
  nulos: number;
  abstencao: number;
  outros: number;
  validos: number;
  comparecimento: number;
};

type Historico2022 = {
  primeiroTurno: { lula: number; validos: number } | null;
  segundoTurno: { lula: number; validos: number } | null;
};

type Municipio = Totais & {
  id: string;
  uf: string;
  municipio: string;
  lula2022: Historico2022;
};

// lula2022 do bairro: votação por seção de 2022 somada pelo bairro do cadastro (ausente em dados antigos).
type Bairro = Totais & { municipioId: string; uf: string; municipio: string; nome: string; lula2022?: Historico2022 };
type DadosRelatorio = { geradoEm: string; municipios: Municipio[]; bairros: Bairro[] };

const CAMPOS: { id: keyof Totais; nome: string }[] = [
  { id: "lula", nome: "Lula" },
  { id: "flavio", nome: "Votos de Flávio" },
  { id: "comparecimento", nome: "Comparecimento" },
  { id: "validos", nome: "Votos válidos" },
  { id: "brancos", nome: "Votos brancos" },
  { id: "nulos", nome: "Votos nulos" },
  { id: "abstencao", nome: "Abstenções" },
  { id: "outros", nome: "Outros candidatos" },
  { id: "eleitores", nome: "Eleitorado" },
];

const percentual = (parte: number, total: number) => total ? `${(100 * parte / total).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—";
const nomeDaLinha = (linha: Municipio | Bairro) => "nome" in linha ? linha.nome : linha.municipio;
const chaveDaLinha = (linha: Municipio | Bairro) => "municipioId" in linha ? `${linha.municipioId}-${linha.nome}` : linha.id;

type OrdemQueda = "quedaVotos" | "quedaPp" | "lula2022" | "lula" | "eleitores" | "abstencao";
const ORDENS_QUEDA: { id: OrdemQueda; nome: string }[] = [
  { id: "quedaVotos", nome: "Queda de votos de Lula" },
  { id: "quedaPp", nome: "Queda da fatia dos válidos (p.p.)" },
  { id: "lula2022", nome: "Lula em 2022" },
  { id: "lula", nome: "Lula em 2026" },
  { id: "eleitores", nome: "Eleitorado" },
  { id: "abstencao", nome: "Abstenções" },
];

export default function Relatorio() {
  const [dados, setDados] = useState<DadosRelatorio | null>(null);
  const [erro, setErro] = useState("");
  const [nivel, setNivel] = useState<"municipios" | "bairros">("municipios");
  const [campo, setCampo] = useState<keyof Totais>("lula");
  const [uf, setUf] = useState("Brasil");
  const [municipioId, setMunicipioId] = useState("");
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(100);
  const [turno, setTurno] = useState<"primeiroTurno" | "segundoTurno">("primeiroTurno");
  const [limiteCriticas, setLimiteCriticas] = useState(200);
  const [nivelQueda, setNivelQueda] = useState<"municipios" | "bairros">("municipios");
  const [ordemQueda, setOrdemQueda] = useState<OrdemQueda>("quedaVotos");
  const [ufQueda, setUfQueda] = useState("Brasil");
  const [municipioIdQueda, setMunicipioIdQueda] = useState("");
  const [buscaQueda, setBuscaQueda] = useState("");
  const [atualizado, setAtualizado] = useState<Date | null>(null);

  async function carregar() {
    setErro("");
    try {
      const resposta = await fetch(`/dados/relatorio.json?t=${Date.now()}`, { cache: "no-store" });
      if (!resposta.ok) throw new Error(resposta.status === 503 ? "Relatório fechado: configure as credenciais de acesso." : `Não foi possível carregar os dados (${resposta.status}).`);
      setDados(await resposta.json() as DadosRelatorio);
      setAtualizado(new Date());
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível carregar o relatório.");
    }
  }

  useEffect(() => {
    document.title = "Relatório · Onde dá pra conversar";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    void carregar();
    return () => meta.remove();
  }, []);

  const ufs = useMemo(() => [...new Set(dados?.municipios.map((m) => m.uf) ?? [])].sort(), [dados]);
  const municipiosDaUf = useMemo(
    () => (dados?.municipios ?? []).filter((m) => uf === "Brasil" || m.uf === uf),
    [dados, uf],
  );
  const cidadeEscolhida = municipiosDaUf.find((m) => m.id === municipioId) ?? municipiosDaUf[0];

  const linhasRanking = useMemo(() => {
    if (!dados) return [];
    const base: (Municipio | Bairro)[] = nivel === "municipios"
      ? municipiosDaUf
      : dados.bairros.filter((b) => b.municipioId === cidadeEscolhida?.id);
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return [...base]
      .filter((linha) => !termo || `${nomeDaLinha(linha)} ${linha.uf}`.toLocaleLowerCase("pt-BR").includes(termo))
      .sort((a, b) => b[campo] - a[campo] || nomeDaLinha(a).localeCompare(nomeDaLinha(b), "pt-BR"));
  }, [dados, nivel, municipiosDaUf, cidadeEscolhida?.id, busca, campo]);

  const municipiosDaQueda = useMemo(
    () => (dados?.municipios ?? []).filter((m) => ufQueda === "Brasil" || m.uf === ufQueda),
    [dados, ufQueda],
  );
  const cidadeDaQueda = municipiosDaQueda.find((m) => m.id === municipioIdQueda) ?? municipiosDaQueda[0];
  const baseDaQueda = useMemo<(Municipio | Bairro)[]>(() => {
    if (!dados) return [];
    return nivelQueda === "municipios" ? municipiosDaQueda : dados.bairros.filter((b) => b.municipioId === cidadeDaQueda?.id);
  }, [dados, nivelQueda, municipiosDaQueda, cidadeDaQueda?.id]);

  const criticas = useMemo(() => {
    const termo = buscaQueda.trim().toLocaleLowerCase("pt-BR");
    return baseDaQueda.flatMap((m) => {
      const base = m.lula2022?.[turno];
      if (!base || !base.validos || !m.validos) return [];
      if (termo && !`${nomeDaLinha(m)} ${m.uf}`.toLocaleLowerCase("pt-BR").includes(termo)) return [];
      const quedaVotos = base.lula - m.lula;
      const quedaPp = 100 * (base.lula / base.validos - m.lula / m.validos);
      // A lista é de onde Lula recuou: pela fatia quando se ordena por ela, pelos votos nos outros casos.
      if (ordemQueda === "quedaPp" ? quedaPp <= 0 : quedaVotos <= 0) return [];
      return [{ linha: m, base, quedaVotos, quedaPp }];
    }).sort((a, b) => {
      const valor = (x: typeof a) =>
        ordemQueda === "quedaVotos" ? x.quedaVotos
          : ordemQueda === "quedaPp" ? x.quedaPp
            : ordemQueda === "lula2022" ? x.base.lula
              : x.linha[ordemQueda];
      return valor(b) - valor(a) || b.quedaVotos - a.quedaVotos || nomeDaLinha(a.linha).localeCompare(nomeDaLinha(b.linha), "pt-BR");
    });
  }, [baseDaQueda, turno, ordemQueda, buscaQueda]);

  const totalUrnas = dados?.municipios.reduce((s, m) => s + m.urnas, 0) ?? 0;
  const urnasApuradas = dados?.municipios.reduce((s, m) => s + m.apuradas, 0) ?? 0;
  const bairrosSemNome = dados?.bairros.filter((b) => b.nome === "").reduce((s, b) => s + b.eleitores, 0) ?? 0;
  const comHistorico = baseDaQueda.filter((m) => m.lula2022?.[turno]).length;

  return (
    <main className="dash relatorio">
      <header className="dash-topo">
        <div>
          <p className="sobretitulo">Painel interno</p>
          <h1>Relatório de votos</h1>
        </div>
        <div className="dash-atualizado">
          {atualizado && <span>Consultado às {atualizado.toLocaleTimeString("pt-BR")}</span>}
          <button type="button" className="botao" onClick={() => void carregar()}>Atualizar</button>
        </div>
      </header>

      {erro && <p className="relatorio-erro" role="alert">{erro}</p>}
      {!dados && !erro && <p className="corpo">Carregando os dados do relatório…</p>}

      {dados && <>
        <section className="dash-cartoes">
          <Cartao rotulo="Municípios" valor={fmt(dados.municipios.length)} nota="com dados de 2026" />
          <Cartao rotulo="Urnas apuradas" valor={percentual(urnasApuradas, totalUrnas)} nota={`${fmt(urnasApuradas)} de ${fmt(totalUrnas)} no conjunto do relatório`} />
          <Cartao rotulo="Bairros identificados" valor={fmt(dados.bairros.filter((b) => b.nome).length)} nota="agrupados dentro de cada cidade" />
          <Cartao rotulo="Sem bairro informado" valor={fmt(bairrosSemNome)} nota="eleitores em locais sem bairro identificado" />
        </section>
        <p className="dash-nota">Dados montados em {new Date(dados.geradoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. Resultados de 2026 agregados por local de votação. Em bairros, locais sem bairro cadastrado aparecem como “Sem bairro identificado”.</p>

        <section aria-labelledby="titulo-ranking">
          <h2 id="titulo-ranking">Onde há mais votos para buscar</h2>
          <div className="relatorio-controles">
            <label>Nível
              <select value={nivel} onChange={(e) => { setNivel(e.target.value as typeof nivel); setBusca(""); }}>
                <option value="municipios">Cidades</option>
                <option value="bairros">Bairros dentro de uma cidade</option>
              </select>
            </label>
            <label>Ordenar por
              <select value={campo} onChange={(e) => setCampo(e.target.value as keyof Totais)}>
                {CAMPOS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <label>Estado
              <select value={uf} onChange={(e) => { setUf(e.target.value); setMunicipioId(""); }}>
                <option value="Brasil">Brasil</option>
                {ufs.map((sigla) => <option key={sigla} value={sigla}>{sigla}</option>)}
              </select>
            </label>
            {nivel === "bairros" && <label>Cidade
              <select value={cidadeEscolhida?.id ?? ""} onChange={(e) => setMunicipioId(e.target.value)}>
                {municipiosDaUf.map((m) => <option key={m.id} value={m.id}>{m.municipio} — {m.uf}</option>)}
              </select>
            </label>}
            <label>Buscar
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={nivel === "municipios" ? "Cidade ou estado" : "Nome do bairro"} />
            </label>
            <label>Mostrar
              <select value={limite} onChange={(e) => setLimite(Number(e.target.value))}>
                {[50, 100, 200, 500].map((q) => <option key={q} value={q}>{q} linhas</option>)}
              </select>
            </label>
          </div>
          <p className="dash-nota">{nivel === "bairros" && cidadeEscolhida ? `Bairros de ${cidadeEscolhida.municipio} (${cidadeEscolhida.uf}). ` : ""}{linhasRanking.length.toLocaleString("pt-BR")} resultados. Votos absolutos; cobertura varia conforme a apuração.</p>
          <div className="dash-tabela">
            <table>
              <thead><tr>
                <th>Posição</th><th>{nivel === "municipios" ? "Cidade" : "Bairro"}</th><th>UF</th>
                <th>{CAMPOS.find((c) => c.id === campo)?.nome}</th><th>Lula</th><th>Brancos</th><th>Nulos</th><th>Abstenções</th><th>Apuradas</th>
              </tr></thead>
              <tbody>{linhasRanking.slice(0, limite).map((m, i) => <tr key={"municipioId" in m ? `${m.municipioId}-${m.nome}` : m.id}>
                <td>{i + 1}</td><td className="texto">{"municipioId" in m ? (m.nome || "Sem bairro identificado") : m.municipio}</td><td>{m.uf}</td>
                <td>{fmt(m[campo])}</td><td>{fmt(m.lula)}</td><td>{fmt(m.brancos)}</td><td>{fmt(m.nulos)}</td><td>{fmt(m.abstencao)}</td><td>{fmt(m.apuradas)}/{fmt(m.urnas)} ({percentual(m.apuradas, m.urnas)})</td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="titulo-queda">
          <h2 id="titulo-queda">Onde a votação de Lula recuou</h2>
          <p className="dash-nota">A comparação é territorial e agregada: não indica como uma pessoa votou. A votação de 2026 pode ter cobertura incompleta.</p>
          <div className="relatorio-controles">
            <label>Nível
              <select value={nivelQueda} onChange={(e) => { setNivelQueda(e.target.value as typeof nivelQueda); setBuscaQueda(""); }}>
                <option value="municipios">Cidades</option>
                <option value="bairros">Bairros dentro de uma cidade</option>
              </select>
            </label>
            <label>Ordenar por
              <select value={ordemQueda} onChange={(e) => setOrdemQueda(e.target.value as OrdemQueda)}>
                {ORDENS_QUEDA.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </label>
            <label>Estado
              <select value={ufQueda} onChange={(e) => { setUfQueda(e.target.value); setMunicipioIdQueda(""); }}>
                <option value="Brasil">Brasil</option>
                {ufs.map((sigla) => <option key={sigla} value={sigla}>{sigla}</option>)}
              </select>
            </label>
            {nivelQueda === "bairros" && <label>Cidade
              <select value={cidadeDaQueda?.id ?? ""} onChange={(e) => setMunicipioIdQueda(e.target.value)}>
                {municipiosDaQueda.map((m) => <option key={m.id} value={m.id}>{m.municipio} — {m.uf}</option>)}
              </select>
            </label>}
            <label>Referência de 2022
              <select value={turno} onChange={(e) => setTurno(e.target.value as typeof turno)}>
                <option value="primeiroTurno">1º turno</option><option value="segundoTurno">2º turno</option>
              </select>
            </label>
            <label>Buscar
              <input value={buscaQueda} onChange={(e) => setBuscaQueda(e.target.value)} placeholder={nivelQueda === "municipios" ? "Cidade ou estado" : "Nome do bairro"} />
            </label>
            <label>Mostrar
              <select value={limiteCriticas} onChange={(e) => setLimiteCriticas(Number(e.target.value))}>
                {[50, 100, 200, 300, 400, 500].map((q) => <option key={q} value={q}>{q} linhas</option>)}
              </select>
            </label>
          </div>
          <p className="dash-nota">
            {nivelQueda === "bairros" && cidadeDaQueda ? `Bairros de ${cidadeDaQueda.municipio} (${cidadeDaQueda.uf}). ` : ""}
            {criticas.length.toLocaleString("pt-BR")} {nivelQueda === "municipios" ? (criticas.length === 1 ? "cidade" : "cidades") : (criticas.length === 1 ? "bairro" : "bairros")} com queda {ordemQueda === "quedaPp" ? "na fatia dos votos válidos" : "nos votos de Lula"}; comparação disponível em {comHistorico.toLocaleString("pt-BR")} de {baseDaQueda.length.toLocaleString("pt-BR")}.
            {turno === "segundoTurno" && " Esta opção compara o 2º turno de 2022 com o 1º turno de 2026."}
            {nivelQueda === "bairros" && " Em bairros, 2022 vem da votação por seção somada pelo nome do bairro no cadastro de locais; escolas que abriram, fecharam ou mudaram de bairro entre as eleições mexem na comparação."}
          </p>
          <div className="dash-tabela">
            <table>
              <thead><tr><th>Posição</th><th>{nivelQueda === "municipios" ? "Cidade" : "Bairro"}</th><th>UF</th><th>Lula 2022</th><th>Lula 2026</th><th>Diferença de votos</th><th>Variação da fatia</th><th>Apuradas em 2026</th></tr></thead>
              <tbody>{criticas.slice(0, limiteCriticas).map(({ linha: m, base }, i) => <tr key={chaveDaLinha(m)}>
                <td>{i + 1}</td><td className="texto">{nomeDaLinha(m) || "Sem bairro identificado"}</td><td>{m.uf}</td><td>{fmt(base.lula)}</td><td>{fmt(m.lula)}</td>
                <td>{fmt(m.lula - base.lula)}</td>
                <td>{(100 * (m.lula / m.validos - base.lula / base.validos)).toLocaleString("pt-BR", { signDisplay: "always", maximumFractionDigits: 2 })} p.p.</td>
                <td>{fmt(m.apuradas)}/{fmt(m.urnas)} ({percentual(m.apuradas, m.urnas)})</td>
              </tr>)}</tbody>
            </table>
          </div>
          {!dados.municipios.some((m) => m.lula2022.primeiroTurno || m.lula2022.segundoTurno) && <p className="relatorio-erro">Os resultados presidenciais de 2022 ainda não foram incorporados. Baixe os arquivos do TSE e remonte os dados para preencher esta seção.</p>}
          {nivelQueda === "bairros" && !dados.bairros.some((b) => b.lula2022?.primeiroTurno || b.lula2022?.segundoTurno) && <p className="relatorio-erro">Os resultados de 2022 por bairro ainda não estão nos dados. Rode scripts/baixar_perfil_2022.py e remonte os dados.</p>}
        </section>
      </>}
    </main>
  );
}

function Cartao({ rotulo, valor, nota }: { rotulo: string; valor: string; nota: string }) {
  return <div className="dash-cartao"><span>{rotulo}</span><b>{valor}</b><small>{nota}</small></div>;
}
