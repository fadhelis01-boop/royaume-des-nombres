// Leçons dont les défis restent dominés par un seul type d'exercice (audit « 8 ans »).
// npm run audit:domines [-- 8]
import fs from "fs";
import { niveauLecon, optionsEcrit } from "../src/lib/parcours";
import { planDefi } from "../src/lib/plan";
import type { World } from "../src/lib/types";
const AGE = Number(process.argv[2] ?? 8);
const worlds: World[] = fs.readdirSync("public/content/worlds").map((f) => JSON.parse(fs.readFileSync("public/content/worlds/" + f, "utf8")));
const out: string[] = [];
for (const w of worlds)
  w.lecons.forEach((l, i) => {
    const niv = niveauLecon(w, i);
    if (niv === null || niv > AGE - 4.5 || w.cycle === "astuces" || !l.exercices.length) return;
    let dom = 0;
    for (let r = 0; r < 20; r++) {
      const p = planDefi(l.exercices, l.nb_defi ?? 5, optionsEcrit({ age: AGE, lecteur: AGE <= 8 ? "debutant" : "oui" }, (r + 0.5) / 20));
      const c: Record<string, number> = {};
      for (const e of p) c[e.type] = (c[e.type] ?? 0) + 1;
      if (Math.max(...Object.values(c)) > p.length / 2) dom++;
    }
    if (dom >= 10) {
      const types: Record<string, number> = {};
      for (const e of l.exercices) types[e.type] = (types[e.type] ?? 0) + 1;
      out.push(`${w.matiere}:${w.id}/${l.id} | ${Object.entries(types).map(([t, n]) => `${t} ${n}`).join(", ")}`);
    }
  });
console.log(`${out.length} leçons dominées par un type (${AGE} ans)\n` + out.join("\n"));
