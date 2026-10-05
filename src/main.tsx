import "@fontsource-variable/archivo/wdth.css";
import "leaflet/dist/leaflet.css";
import "./estilo.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Painel from "./componentes/Painel";

const painel = /^\/dash\/?$/.test(location.pathname);

createRoot(document.getElementById("raiz")!).render(<StrictMode>{painel ? <Painel /> : <App />}</StrictMode>);
