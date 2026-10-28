// Audit : consignes rencontrées par une enfant de 8 ans pendant le test de positionnement en maths
// et dans les leçons de niveau CP–CE2. Mesures de lisibilité.
import { readFileSync, readdirSync } from "node:fs";
import { instantiate, newSeed } from "../src/lib/gen";
import { departEscalier, domainesATester, domainesDe, exercicesTest, leconPour, pas, QUESTIONS_PAR_DOMAINE } from "../src/lib/parcours";
import type { World } from "../src/lib/types";

const manifest = JSON.parse(readFileSync("public/content/manifest.json", "utf8"));
const worlds: World[] = readdirSync("public/content/worlds").map((f) => JSON.parse(readFileSync("public/content/worlds/" + f, "utf8")));
const AGE = Number(process.argv[2] ?? 8);
const doms = domainesDe("maths", worlds, manifest.domaines.maths);
const aTester = domainesATester(doms, AGE);
console.log("Domaines testés à", AGE, "ans :", aTester.map((d) => `${d.titre} [${d.min.toFixed(1)}–${d.max.toFixed(1)}]`).join(" | "));
console.log("Nombre de questions :", aTester.length * QUESTIONS_PAR_DOMAINE);

const strip = (s: string) => s.replace(/\$[^$]*\$/g, " X ").replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim();
const words = (s: string) => strip(s).split(/[\s'’]+/).filter((w) => /[a-zà-ÿ]/i.test(w));
const seen = new Map<string, { n: number; lvl: number; dom: string; type: string; lesson: string }>();
// enfant « moyen » : réussit à p=0.6 sous son niveau, 0.35 au-dessus
for (let run = 0; run < 400; run++) {
  for (const d of aTester) {
    let e = departEscalier(d, AGE);
    for (let q = 0; q < QUESTIONS_PAR_DOMAINE; q++) {
      const l = leconPour(d, e.cible);
      if (!l) break;
      const specs = exercicesTest(l.lesson);
      const spec = specs[Math.floor(Math.random() * specs.length)];
      let inst;
      try { inst = instantiate(spec, newSeed()); } catch { break; }
      const key = spec.enonce;
      const s = seen.get(key) ?? { n: 0, lvl: l.niveau, dom: d.titre, type: spec.type, lesson: `${l.world.id}/${l.lesson.id}` };
      s.n++;
      seen.set(key, s);
      const ok = Math.random() < (l.niveau <= 3 ? 0.6 : 0.35);
      e = pas(e, d, l.niveau, ok);
    }
  }
}
// lecture
const LONG = 9; // mots longs (> 9 lettres) : difficiles à déchiffrer à 8 ans
const rows = [...seen.entries()].map(([k, v]) => {
  const w = words(k);
  return { ...v, enonce: strip(k), nmots: w.length, longs: w.filter((x) => x.length > LONG).join(","), };
}).sort((a, b) => b.n - a.n);
let tot = 0, totMots = 0, sup15 = 0, avecLong = 0, mathsMots = 0;
const JARGON = /\b(chiffre des|rang|décompos|complète|calcule|range|ordre croissant|ordre décroissant|encadre|arrondi|multiple|quotient|reste|produit|somme|différence|périmètre|segment|droite|symétri|perpendicul|parallèle|fraction|numérateur|dénominateur|équivalent|unité|dizaine|centaine|écris en chiffres|en lettres)/i;
for (const r of rows) { tot += r.n; totMots += r.n * r.nmots; if (r.nmots > 15) sup15 += r.n; if (r.longs) avecLong += r.n; if (JARGON.test(r.enonce)) mathsMots += r.n; }
console.log(`Consignes différentes : ${rows.length} ; mots par consigne (pondéré) : ${(totMots / tot).toFixed(1)} ; >15 mots : ${(100 * sup15 / tot).toFixed(0)} % ; avec mot long : ${(100 * avecLong / tot).toFixed(0)} % ; vocabulaire scolaire : ${(100 * mathsMots / tot).toFixed(0)} %`);
const byLvl: Record<string, number> = {};
for (const r of rows) { const c = r.lvl < 1.5 ? "CP" : r.lvl < 2.5 ? "CE1" : r.lvl < 3.5 ? "CE2" : r.lvl < 4.5 ? "CM1" : "CM2+"; byLvl[c] = (byLvl[c] ?? 0) + r.n; }
console.log("Niveaux rencontrés :", Object.entries(byLvl).map(([k, v]) => `${k} ${(100 * v / tot).toFixed(0)} %`).join(" · "));
const byType: Record<string, number> = {};
for (const r of rows) byType[r.type] = (byType[r.type] ?? 0) + r.n;
console.log("Types :", Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / tot).toFixed(0)} %`).join(" · "));
console.log("\n--- Consignes les plus fréquentes ---");
for (const r of rows.slice(0, 45)) console.log(`${String(r.n).padStart(4)} ${r.lvl.toFixed(1)} ${r.type.padEnd(8)} ${r.nmots}m | ${r.enonce.slice(0, 150)}${r.longs ? "  [longs: " + r.longs + "]" : ""}`);
console.log("\n--- Les plus longues ---");
for (const r of [...rows].sort((a, b) => b.nmots - a.nmots).slice(0, 15)) console.log(`${r.nmots}m ${r.lvl.toFixed(1)} ${r.type} | ${r.enonce.slice(0, 220)}`);
