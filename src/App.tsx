import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { avisoDaFase, faseEm } from "./calendario";
import AvisoEmail from "./componentes/AvisoEmail";
import Bandeira from "./componentes/Bandeira";
import Perto from "./componentes/Perto";
import Rodape from "./componentes/Rodape";

// Páginas de texto baixam só quando alguém abre: quem vem pelo mapa não paga por elas.
const Conversas = lazy(() => import("./componentes/Conversas"));
const Propostas = lazy(() => import("./componentes/Propostas"));
const Sobre = lazy(() => import("./componentes/Sobre"));
const OQueFazer = lazy(() => import("./componentes/OQueFazer"));
const OndeVirarMais = lazy(() => import("./componentes/OndeVirarMais"));
const Iniciativas = lazy(() => import("./componentes/Iniciativas"));
const Boatos = lazy(() => import("./componentes/Boatos"));
import { carregarIndice, type Indice } from "./dados";

const ROTAS = ["perto", "onde-virar-mais", "o-que-fazer", "conversas", "propostas", "boatos", "iniciativas", "sobre"] as const;
type Rota = (typeof ROTAS)[number];

const PREFIXO_ANCORA: Partial<Record<Rota, string>> = { conversas: "conversa", propostas: "proposta", boatos: "boato", sobre: "sobre" };

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
    if (!prefixo || !ancora) {
      window.scrollTo(0, 0);
      return;
    }
    // Páginas de texto são lazy: na primeira visita o alvo ainda não existe, então tenta de novo por até 3 s.
    let tentativas = 0;
    let quadro = 0;
    const rolar = () => {
      const alvo = document.getElementById(`${prefixo}-${ancora}`);
      if (alvo) alvo.scrollIntoView({ block: "start" });
      else if (tentativas++ < 180) quadro = requestAnimationFrame(rolar);
    };
    rolar();
    return () => cancelAnimationFrame(quadro);
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
        <a className="marca" href="#/perto" aria-label="Onde posso conversar, início">
          <span className="marca-bandeira">
            <Bandeira largura={34} />
          </span>
          <span className="marca-nome" aria-hidden>
            <span>
              <span className="logo-onde">Onde</span> <span className="logo-posso">posso</span>
            </span>
            <span className="logo-conversar">conversar</span>
          </span>
        </a>
        <nav className="navegacao" aria-label="Seções do site">
          {link("perto", "Por perto")}
          {link("onde-virar-mais", "Onde virar mais")}
          {link("o-que-fazer", "O que fazer")}
          {link("conversas", "Conversas")}
          {link("propostas", "Propostas")}
          {link("boatos", "Ouviu isso?")}
          {link("iniciativas", "Iniciativas")}
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
          {rota === "boatos" && <Boatos />}
          {rota === "iniciativas" && <Iniciativas />}
          {rota === "sobre" && <Sobre indice={indice} />}
        </Suspense>
      </main>
      {rota !== "perto" && rota !== "onde-virar-mais" && (
        <>
          <div className="aviso-email-pagina">
            <AvisoEmail key={rota} origem={rota} />
          </div>
          <Rodape />
        </>
      )}
    </>
  );
}
