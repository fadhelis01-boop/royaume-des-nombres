import fs from "fs";
import { niveauLecon, nomClasse } from "../src/lib/parcours";
import type { World } from "../src/lib/types";
const worlds: World[] = fs.readdirSync("public/content/worlds").map((f) => JSON.parse(fs.readFileSync("public/content/worlds/" + f, "utf8")));
const m = process.argv[2] ?? "maths";
for (const w of worlds) { if (w.matiere !== m || w.cycle === "astuces") continue; w.lecons.forEach((l, i) => { const n = niveauLecon(w, i); if (n !== null && n > 5.5 && n <= 11) console.log(`${w.id}/${l.id} | ${nomClasse(Math.ceil(n - 1e-4))} | ${l.titre}${l.classe ? " [classe " + l.classe + "]" : ""}`); }); }
