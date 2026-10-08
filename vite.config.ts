import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";

// Estampille le service worker à chaque compilation : les appareils
// détectent ainsi la nouvelle version et proposent la mise à jour.
function stampServiceWorker(): Plugin {
  return {
    name: "stamp-sw",
    apply: "build",
    closeBundle() {
      const f = "dist/sw.js";
      if (!existsSync(f)) return;
      // tous les morceaux de code (pages chargées à la demande comprises) pour le hors connexion
      const assets = readdirSync("dist/assets")
        .filter((n) => /\.(js|css)$/.test(n) || /-latin-\d.*\.woff2$/.test(n))
        .map((n) => "./assets/" + n);
      writeFileSync(f, readFileSync(f, "utf8").replaceAll("__BUILD__", new Date().toISOString()).replace("/*ASSETS*/[]", JSON.stringify(assets)));
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
