// Recense les illustrations présentes dans public/img et écrit src/lib/visuels.ts.
// Chaque composant affiche l'image si elle existe, sinon l'émoji d'origine : on peut livrer les visuels au fil de l'eau.
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const CATS = ["mascottes", "boutique", "objets", "badges", "habitants", "persos"];
const out = {};
for (const c of CATS) {
  const d = path.join("public", "img", c);
  out[c] = existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, "")).sort() : [];
}
writeFileSync(
  "src/lib/visuels.ts",
  `// Fichier généré par scripts/index-visuels.mjs : ne pas modifier à la main.\nexport const VISUELS: Record<string, string[]> = ${JSON.stringify(out, null, 1)};\n`,
);
console.log(Object.entries(out).map(([k, v]) => `${k} ${v.length}`).join(" · "));
