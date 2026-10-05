import "./fontes/archivo.css";
import "leaflet/dist/leaflet.css";
import "./estilo.css";
import { Analytics } from "@vercel/analytics/react";
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// O painel interno só baixa para quem abre /dash.
const Painel = lazy(() => import("./componentes/Painel"));
const Relatorio = lazy(() => import("./componentes/Relatorio"));

const painel = /^\/dash\/?$/.test(location.pathname);
const relatorio = /^\/relatorio\/?$/.test(location.pathname);

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    {painel ? (
      <Suspense fallback={null}>
        <Painel />
      </Suspense>
    ) : relatorio ? (
      <Suspense fallback={null}>
        <Relatorio />
      </Suspense>
    ) : (
      <>
        <App />
        {/* Vercel Web Analytics só no site público, fora das páginas internas. */}
        <Analytics />
      </>
    )}
  </StrictMode>,
);
