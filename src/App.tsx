import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { avisoDaFase, faseEm } from "./calendario";
import Estrela from "./componentes/Estrela";
import Perto from "./componentes/Perto";
import Rodape from "./componentes/Rodape";

// Páginas de texto baixam só quando alguém abre: quem vem pelo mapa não paga por elas.
const Conversas = lazy(() => import("./componentes/Conversas"));
const Propostas = lazy(() => import("./componentes/Propostas"));
const Sobre = lazy(() => import("./componentes/Sobre"));
const OQueFazer = lazy(() => import("./componentes/OQueFazer"));
const OndeVirarMais = lazy(() => import("./componentes/OndeVirarMais"));
import { carregarIndice, type Indice } from "./dados";

const ROTAS = ["perto", "onde-virar-mais", "o-que-fazer", "conversas", "propostas", "sobre"] as const;
type Rota = (typeof ROTAS)[number];

const PREFIXO_ANCORA: Partial<Record<Rota, string>> = { conversas: "conversa", propostas: "proposta" };

function lerRota(): { rota: Rota; ancora: string | null } {
  const [, primeira, segunda] = location.hash.replace(/^#/, "").split("/");
  const rota = ROTAS.find((r) => r === primeira) ?? "perto";
  return { rota, ancora: segunda ?? null };
}

function agoraDeTeste(): number | null {
  if (!import.meta.env.DEV) return null;
  const valor = new URLSearchParams(location.search).get("agora");
  const data = valor ? Date.parse(valor) : NaN;
  return Number.isNaN(data) ? null : data;
}

export default function App() {
  const [{ rota, ancora }, setLocal] = useState(lerRota);
  const [indice, setIndice] = useState<Indice | null>(null);
  const [indicePronto, setIndicePronto] = useState(false);
  const [agora, setAgora] = useState(() => agoraDeTeste() ?? Date.now());

  useEffect(() => {
    const mudou = () => setLocal(lerRota());
    window.addEventListener("hashchange", mudou);
    return () => window.removeEventListener("hashchange", mudou);
  }, []);

  useEffect(() => {
    carregarIndice().then((i) => {
      setIndice(i);
      setIndicePronto(true);
    });
  }, []);

  useEffect(() => {
    if (agoraDeTeste() !== null) return;
    const relogio = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(relogio);
  }, []);

  useEffect(() => {
    const prefixo = PREFIXO_ANCORA[rota];
    if (prefixo && ancora) {
      document.getElementById(`${prefixo}-${ancora}`)?.scrollIntoView({ block: "start" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [rota, ancora]);

  // No celular o menu rola para o lado: mantém à vista o item da página aberta.
  useEffect(() => {
    document.querySelector('.navegacao a[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [rota]);

  const fase = faseEm(agora);
  const aviso = avisoDaFase(fase);
  const exemplo = useMemo(
    () => new URLSearchParams(location.search).has("exemplo") || (indicePronto && (!indice || indice.boletinsLidos === 0)),
    [indice, indicePronto],
  );

  const link = (alvo: Rota, texto: string) => (
    <a href={`#/${alvo}`} aria-current={rota === alvo ? "page" : undefined}>
      {texto}
    </a>
  );

  return (
    <>
      <header className="cabecalho">
        <a className="marca" href="#/perto" aria-label="Onde dá pra conversar, início">
          <span className="marca-estrela">
            <Estrela tamanho={22} cor="var(--vermelho)" />
          </span>
          <span className="marca-nome" aria-hidden>
            <span>Onde dá pra</span>
            <span>conversar</span>
          </span>
        </a>
        <nav className="navegacao" aria-label="Seções do site">
          {link("perto", "Por perto")}
          {link("onde-virar-mais", "Onde virar mais")}
          {link("o-que-fazer", "O que fazer")}
          {link("conversas", "Conversas")}
          {link("propostas", "Propostas")}
          {link("sobre", "Sobre")}
        </nav>
      </header>
      {exemplo && <div className="faixa-exemplo">Números de exemplo. Não são da apuração.</div>}
      {aviso && (
        <div className={fase === "votacao" ? "faixa-fase votacao" : "faixa-fase"} role="status">
          {aviso}
        </div>
      )}
      <main>
        {rota === "perto" && indicePronto && <Perto indice={indice} exemplo={exemplo} fase={fase} ancora={ancora} />}
        <Suspense fallback={null}>
          {rota === "onde-virar-mais" && indicePronto && (
            <OndeVirarMais indice={indice} exemplo={exemplo} fase={fase} ancora={ancora} />
          )}
          {rota === "o-que-fazer" && <OQueFazer />}
          {rota === "conversas" && <Conversas fase={fase} />}
          {rota === "propostas" && <Propostas />}
          {rota === "sobre" && <Sobre indice={indice} />}
        </Suspense>
      </main>
      {rota !== "perto" && rota !== "onde-virar-mais" && <Rodape />}
    </>
  );
}
