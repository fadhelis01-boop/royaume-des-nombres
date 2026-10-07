import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Estampille le service worker à chaque compilation : les appareils
// détectent ainsi la nouvelle version et proposent la mise à jour.
function stampServiceWorker(): Plugin {
  return {
    name: "stamp-sw",
    apply: "build",
    closeBundle() {
      const f = "dist/sw.js";
      if (existsSync(f)) writeFileSync(f, readFileSync(f, "utf8").replaceAll("__BUILD__", new Date().toISOString()));
    },
  };
}

// base "./" : fonctionne à la racine d'un domaine comme dans un sous-dossier (GitHub Pages).
export default defineConfig({
  base: "./",
  plugins: [react(), stampServiceWorker()],
  build: { target: "es2020", chunkSizeWarningLimit: 900 },
  server: { port: 5194 },
  preview: { port: 5195 },
});
