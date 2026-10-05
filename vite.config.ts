import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Bibliotecas num arquivo à parte: elas mudam pouco, e o navegador de quem
        // volta reaproveita esse arquivo mesmo depois de um deploy que mexeu no código do site.
        codeSplitting: {
          // Só as que a página inicial usa: React e Leaflet.
          groups: [{ name: "bibliotecas", test: /node_modules[\\/](react|react-dom|scheduler|leaflet)[\\/]/ }],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
