import L from "leaflet";
import { useEffect, useRef } from "react";
import { carregarPontos, situacao, type Ponto, type RegiaoPerto } from "../dados";
import { ZOOM_DE_PERTO, criarCamadaPontos } from "./camadaPontos";

const TILES = "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";
const ATRIBUICAO =
  '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
  'estilo <a href="https://www.hotosm.org/">Humanitarian OSM Team</a>, ' +
  'servido por <a href="https://openstreetmap.fr/">OSM France</a>';

const COR_MARCA = "#2563eb";
const TINTA = "#2a1a1c";

type Props = {
  ponto: Ponto | null;
  inicio: { lat: number; lon: number } | null;
  raioKm: number;
  regioes: RegiaoPerto[];
  maxAte: number;
  selecionada: string | null;
  /** Sem ela, tocar no mapa não escolhe ponto (a página "Onde virar mais" escolhe pela lista). */
  onEscolherPonto?: (lat: number, lon: number) => void;
  onSelecionar: (id: string) => void;
  /** O que define o tamanho do marcador; por padrão, os votos possíveis (votos.ate). */
  valor?: (r: RegiaoPerto) => number;
  /** Pontos que o mapa enquadra quando a lista muda, em vez de um raio em volta de um ponto. */
  enquadrar?: { lat: number; lon: number }[] | null;
};

const MUITAS_REGIOES = 150;

const votosPossiveis = (r: RegiaoPerto) => r.votos?.ate ?? 0;

export default function Mapa({
  ponto,
  inicio,
  raioKm,
  regioes,
  maxAte,
  selecionada,
  onEscolherPonto,
  onSelecionar,
  valor = votosPossiveis,
  enquadrar = null,
}: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const camada = useRef<L.LayerGroup | null>(null);
  const escolher = useRef(onEscolherPonto);
  const selecionar = useRef(onSelecionar);
  const ultimasRegioes = useRef("");
  const fundo = useRef<ReturnType<typeof criarCamadaPontos> | null>(null);
  const areaBusca = useRef<{ lat: number; lon: number; raioKm: number } | null>(null);
  escolher.current = onEscolherPonto;
  selecionar.current = onSelecionar;

  useEffect(() => {
    if (!caixa.current) return;
    const m = L.map(caixa.current, { zoomControl: true, attributionControl: true }).setView([-14.5, -52], 4);
    L.tileLayer(TILES, { subdomains: "abc", maxZoom: 19, attribution: ATRIBUICAO }).addTo(m);
    m.attributionControl.setPrefix(false);
    camada.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => escolher.current?.(e.latlng.lat, e.latlng.lng));
    mapa.current = m;
    const observador = new ResizeObserver(() => m.invalidateSize());
    observador.observe(caixa.current);
    let vivo = true;
    const bolinhas = criarCamadaPontos();
    bolinhas.camada.addTo(m);
    fundo.current = bolinhas;
    // Baixa só o que a tela mostra: o resumo do país de longe, os quadrados de 1 grau de perto.
    let pediuResumo = false;
    const quadradosPedidos = new Set<string>();
    const carregarVisiveis = () => {
      if (m.getZoom() < ZOOM_DE_PERTO) {
        if (pediuResumo) return;
        pediuResumo = true;
        carregarPontos("resumo").then((pontos) => vivo && bolinhas.definirResumo(pontos));
        return;
      }
      const area = m.getBounds().pad(0.15);
      const novos: string[] = [];
      for (let lat = Math.floor(area.getSouth()); lat <= Math.floor(area.getNorth()); lat++) {
        for (let lon = Math.floor(area.getWest()); lon <= Math.floor(area.getEast()); lon++) {
          const chave = `${lat}_${lon}`;
          if (!quadradosPedidos.has(chave)) {
            quadradosPedidos.add(chave);
            novos.push(chave);
          }
        }
      }
      if (!novos.length) return;
      Promise.all(novos.map((chave) => carregarPontos(chave))).then((partes) => vivo && bolinhas.acrescentar(partes.flat()));
    };
    m.on("moveend", carregarVisiveis);
    // O mapa nasce no Brasil inteiro, mas quase sempre pula logo para a cidade de quem
    // visita ou para o ponto do link. Espera um pouco antes de baixar o resumo do país:
    // se o mapa já tiver ido para perto, o moveend baixa só os quadrados da cidade.
    const espera = setTimeout(carregarVisiveis, 2000);
    return () => {
      clearTimeout(espera);
      vivo = false;
      observador.disconnect();
      m.remove();
      mapa.current = null;
      fundo.current = null;
    };
  }, []);

  useEffect(() => {
    areaBusca.current = ponto ? { lat: ponto.lat, lon: ponto.lon, raioKm } : null;
    fundo.current?.esconderPerto(areaBusca.current);
  }, [ponto, raioKm]);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !inicio || ponto) return;
    m.setView([inicio.lat, inicio.lon], 12, { animate: false });
  }, [inicio, ponto]);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !ponto) return;
    const circulo = L.circle([ponto.lat, ponto.lon], { radius: raioKm * 1000 });
    circulo.addTo(m);
    m.fitBounds(circulo.getBounds(), { padding: [12, 12], animate: !matchMedia("(prefers-reduced-motion: reduce)").matches });
    circulo.remove();
  }, [ponto, raioKm]);

  useEffect(() => {
    const grupo = camada.current;
    if (!grupo) return;
    grupo.clearLayers();
    const chave = regioes.map((r) => r.id).join("|");
    const novas = chave !== ultimasRegioes.current;
    ultimasRegioes.current = chave;
    if (ponto) {
      L.circle([ponto.lat, ponto.lon], {
        radius: raioKm * 1000,
        color: COR_MARCA,
        weight: 1.5,
        dashArray: "4 6",
        fillColor: COR_MARCA,
        fillOpacity: 0.05,
        interactive: false,
      }).addTo(grupo);
    }
    // Numa cidade inteira são centenas de marcadores: menores, para não taparem uns aos outros.
    const denso = regioes.length > MUITAS_REGIOES;
    const ordem = [...regioes].sort((a, b) => Number(a.id === selecionada) - Number(b.id === selecionada));
    for (const r of ordem) {
      const tipo = situacao(r);
      const escolhida = r.id === selecionada;
      let opcoes: L.CircleMarkerOptions;
      switch (tipo) {
        case "conversa": {
          const escala = Math.sqrt(valor(r) / Math.max(maxAte, 1));
          opcoes = {
            radius: denso ? 5 + escala * 9 : 9 + escala * 14,
            color: escolhida ? TINTA : "#ffffff",
            weight: escolhida ? 3.5 : 2,
            fillColor: COR_MARCA,
            fillOpacity: 1,
            className: novas ? "marcador novo" : "marcador",
          };
          break;
        }
        case "sem_boletim":
          opcoes = {
            radius: 5.5,
            color: COR_MARCA,
            weight: 2.5,
            fillColor: "#ffffff",
            fillOpacity: 1,
            className: "marcador sem-boletim",
          };
          break;
        default: {
          const nunca: never = tipo;
          throw new Error(`situação desconhecida: ${String(nunca)}`);
        }
      }
      const marcador = L.circleMarker([r.lat, r.lon], opcoes).addTo(grupo);
      marcador.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        selecionar.current(r.id);
      });
    }
    if (ponto) {
      L.marker([ponto.lat, ponto.lon], {
        icon: L.divIcon({ className: "", html: '<div class="ponto-usuario"><i></i></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
        interactive: false,
        keyboard: false,
      }).addTo(grupo);
    }
  }, [regioes, selecionada, ponto, raioKm, maxAte, valor]);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !enquadrar?.length) return;
    const limites = L.latLngBounds(enquadrar.map((p) => [p.lat, p.lon] as [number, number]));
    m.fitBounds(limites, {
      padding: [24, 24],
      maxZoom: 15,
      animate: !matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  }, [enquadrar]);

  useEffect(() => {
    const m = mapa.current;
    const r = regioes.find((x) => x.id === selecionada);
    if (!m || !r) return;
    if (!m.getBounds().pad(-0.1).contains([r.lat, r.lon])) m.panTo([r.lat, r.lon]);
  }, [selecionada, regioes]);

  return <div ref={caixa} className="mapa" role="application" aria-label={enquadrar ? "Mapa dos lugares de votação do município" : "Mapa das regiões de votação por perto"} />;
}
