import "@fontsource-variable/archivo/wdth.css";
import "leaflet/dist/leaflet.css";
import "./estilo.css";
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// O painel interno só baixa para quem abre /dash.
const Painel = lazy(() => import("./componentes/Painel"));

const painel = /^\/dash\/?$/.test(location.pathname);

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    {painel ? (
      <Suspense fallback={null}>
        <Painel />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
