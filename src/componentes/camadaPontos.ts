// Camada de bolinhas com todos os locais de votação do país, desenhada em
// ladrilhos de canvas: cada pedaço do mapa só desenha os pontos que caem nele.
// Serve para o mapa não abrir vazio antes da busca.
//
// Até o zoom ZOOM_DE_PERTO - 1 desenha o resumo do país (pontos de uns 5 km);
// a partir dele, os quadrados de 1 grau que o Mapa for baixando conforme a
// pessoa anda pelo mapa.
//
// Autor: Matheus C. Pestana

import L from "leaflet";

import type { Coordenada } from "../dados";

type Area = { lat: number; lon: number; raioKm: number };

const COR = "#2563eb";
export const ZOOM_DE_PERTO = 7;

function agrupar(pontos: Coordenada[], destino: Map<string, Coordenada[]>) {
  for (const p of pontos) {
    const chave = `${Math.floor(p[0])}_${Math.floor(p[1])}`;
    const lista = destino.get(chave);
    if (lista) lista.push(p);
    else destino.set(chave, [p]);
  }
}

function raioDoPonto(zoom: number): number {
  if (zoom <= 5) return 0.9;
  if (zoom <= 8) return 1.4;
  if (zoom <= 11) return 2.2;
  return 3;
}

function distanciaKm(a: Coordenada, b: Area): number {
  const dLat = (a[0] - b.lat) * 111.32;
  const dLon = (a[1] - b.lon) * 111.32 * Math.cos((b.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

export function criarCamadaPontos() {
  const deLonge = new Map<string, Coordenada[]>();
  const dePerto = new Map<string, Coordenada[]>();
  let escondida: Area | null = null;

  const Camada = L.GridLayer.extend({
    createTile(this: L.GridLayer, coords: L.Coords): HTMLCanvasElement {
      const tamanho = this.getTileSize();
      const densidade = window.devicePixelRatio || 1;
      const tela = document.createElement("canvas");
      tela.width = tamanho.x * densidade;
      tela.height = tamanho.y * densidade;
      const mapa = (this as unknown as { _map: L.Map })._map;
      const ctx = tela.getContext("2d");
      if (!ctx || !mapa) return tela;
      ctx.scale(densidade, densidade);

      const porGrau = coords.z < ZOOM_DE_PERTO ? deLonge : dePerto;
      const origem = coords.scaleBy(tamanho);
      const raio = raioDoPonto(coords.z);
      const folga = L.point(raio + 1, raio + 1);
      const noroeste = mapa.unproject(origem.subtract(folga), coords.z);
      const sudeste = mapa.unproject(origem.add(tamanho).add(folga), coords.z);

      ctx.fillStyle = COR;
      ctx.globalAlpha = coords.z <= 8 ? 0.55 : 0.75;
      ctx.beginPath();
      for (let lat = Math.floor(sudeste.lat); lat <= Math.floor(noroeste.lat); lat++) {
        for (let lon = Math.floor(noroeste.lng); lon <= Math.floor(sudeste.lng); lon++) {
          for (const p of porGrau.get(`${lat}_${lon}`) ?? []) {
            if (p[0] > noroeste.lat || p[0] < sudeste.lat || p[1] < noroeste.lng || p[1] > sudeste.lng) continue;
            if (escondida && distanciaKm(p, escondida) <= escondida.raioKm) continue;
            const pixel = mapa.project(p, coords.z).subtract(origem);
            ctx.moveTo(pixel.x + raio, pixel.y);
            ctx.arc(pixel.x, pixel.y, raio, 0, Math.PI * 2);
          }
        }
      }
      ctx.fill();
      return tela;
    },
  });

  const ComOpcoes = Camada as unknown as new (opcoes: L.GridLayerOptions) => L.GridLayer;
  const camada = new ComOpcoes({ zIndex: 5, updateWhenZooming: false });
  return {
    camada,
    /** Pontos do resumo do país, para o mapa visto de longe. */
    definirResumo(pontos: Coordenada[]) {
      deLonge.clear();
      agrupar(pontos, deLonge);
      camada.redraw();
    },
    /** Pontos de quadrados de 1 grau recém-baixados, para o mapa de perto. */
    acrescentar(pontos: Coordenada[]) {
      agrupar(pontos, dePerto);
      camada.redraw();
    },
    /** Some com as bolinhas dentro do raio da busca, onde entram os marcadores de verdade. */
    esconderPerto(area: Area | null) {
      escondida = area;
      camada.redraw();
    },
  };
}
