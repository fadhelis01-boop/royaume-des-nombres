// Audit de la rédaction libre (« Sans regarder : qu'as-tu retenu ? ») pour un âge donné :
// la correction automatique accepte-t-elle une bonne réponse mal orthographiée, refuse-t-elle
// une liste de mots-clés sans phrase ou une réponse vide de sens ?
// npm run audit:libre [-- 10]
import fs from "fs";
import { check, instantiate } from "../src/lib/gen";
import { niveauLecon } from "../src/lib/parcours";
import type { World } from "../src/lib/types";

const AGE = Number(process.argv[2] ?? 10);
const NIV = AGE - 4.5;
const worlds: World[] = fs.readdirSync("public/content/worlds").map((f) => JSON.parse(fs.readFileSync("public/content/worlds/" + f, "utf8")));

/** Fautes typiques d'un enfant : accents oubliés, une lettre doublée ou oubliée dans les mots longs, pluriels oubliés. */
function fautes(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\*\*/g, "")
    .split(/\s+/)
    .map((w, i) => (w.length >= 7 && i % 2 === 0 ? w.slice(0, 3) + w.slice(4) : w.length >= 5 && i % 3 === 0 ? w.replace(/s([.,;:!?]?)$/, "$1") : w))
    .join(" ");
}

let n = 0;
const stats = { modele: 0, fautes: 0, motsCles: 0, vide: 0, court: 0 };
const exemples: Record<string, string[]> = { fautes: [], motsCles: [] };
for (const w of worlds)
  w.lecons.forEach((l, i) => {
    const niv = niveauLecon(w, i);
    if (niv === null || niv > NIV || niv <= NIV - 1 || w.cycle === "astuces") return;
    for (const spec of l.exercices) {
      if (spec.type !== "libre") continue;
      const inst = instantiate(spec, 1);
      if (!inst) continue;
      n++;
      const ok = (v: string) => check(inst, { kind: "text", value: v }).ok;
      const modele = String(spec.modele ?? "");
      const cles = (spec.cles ?? []).map((c: string[]) => c[0]);
      if (ok(modele.replace(/\*\*/g, ""))) stats.modele++;
      const f = fautes(modele);
      if (ok(f)) stats.fautes++;
      else exemples.fautes.push(`${w.id}/${l.id} | ${f.slice(0, 120)}`);
      // tricher : écrire seulement les mots-clés, sans phrase
      if (ok(cles.join(" "))) {
        stats.motsCles++;
        exemples.motsCles.push(`${w.id}/${l.id} | « ${cles.join(" ")} »`);
      }
      if (ok("je sais pas")) stats.vide++;
      // une vraie phrase courte avec la moitié des idées
      if (ok(`Il faut retenir ${cles.slice(0, Math.ceil(cles.length / 2)).join(" et ")}.`)) stats.court++;
    }
  });
const p = (k: number) => `${Math.round((100 * k) / Math.max(1, n))} %`;
console.log(`Rédactions libres de l'année (${AGE} ans) : ${n}`);
console.log(`Le « Je retiens » recopié est accepté : ${p(stats.modele)}`);
console.log(`Bonne réponse avec des fautes d'enfant (accents, lettres, pluriels) acceptée : ${p(stats.fautes)}`);
console.log(`Simple liste des mots-clés, sans phrase, acceptée : ${p(stats.motsCles)}`);
console.log(`« Il faut retenir X et Y. » (la moitié des idées) acceptée : ${p(stats.court)}`);
console.log(`« je sais pas » accepté : ${p(stats.vide)}`);
for (const [k, v] of Object.entries(exemples)) console.log(`\n${k} (${v.length})\n  ` + v.slice(0, 6).join("\n  "));
