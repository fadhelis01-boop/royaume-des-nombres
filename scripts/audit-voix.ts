// Audit de la voix : ce que la synthèse vocale dit vraiment des textes d'un enfant de l'âge donné
// (scènes, cours, consignes, corrections), et la longueur des leçons (fatigue).
// npm run audit:voix [-- 8]
import fs from "fs";
import { niveauLecon } from "../src/lib/parcours";
import { toSpeech } from "../src/lib/speech";
import type { World } from "../src/lib/types";

const AGE = Number(process.argv[2] ?? 8);
const NIV = AGE - 4.5;
const worlds: World[] = fs.readdirSync("public/content/worlds").map((f) => JSON.parse(fs.readFileSync("public/content/worlds/" + f, "utf8")));
const pb: Record<string, string[]> = {};
const add = (k: string, s: string) => (pb[k] ??= []).push(s);
const ecrans: number[] = [];
let longues = 0;
let n = 0;
type Libre = { texte?: string; lignes?: { text: string }[]; enonce?: string; correction?: string };
for (const w of worlds)
  w.lecons.forEach((l, i) => {
    const niv = niveauLecon(w, i);
    if (niv === null || niv > NIV || w.cycle === "astuces") return;
    n++;
    ecrans.push(l.etapes.length);
    if (l.etapes.length > 12) longues++;
    const textes: string[] = [];
    for (const s of l.etapes as unknown as Libre[]) {
      if (s.texte) textes.push(s.texte);
      if (s.lignes) for (const x of s.lignes) textes.push(x.text);
    }
    for (const e of l.exercices as unknown as Libre[]) {
      if (e.enonce && !/\{\{/.test(e.enonce)) textes.push(e.enonce);
      if (e.correction && !/\{\{/.test(e.correction)) textes.push(e.correction);
    }
    const ou = `${w.id}/${l.id}`;
    for (const t of textes) {
      const v = toSpeech(String(t));
      if (/\||---|\*\*|__|\\/.test(v)) add("balises lues à voix haute", `${ou} | ${v.slice(0, 100)}`);
      if (/[<>]/.test(v)) add("signe < ou > lu tel quel", `${ou} | ${v.slice(0, 100)}`);
      const caps = (v.match(/\b[A-ZÉ]{2,}\b/g) ?? []).filter((m) => !["CP", "CE1", "CE2", "CM1", "CM2", "ADN", "OK"].includes(m));
      if (caps.length) add("mots en MAJUSCULES (risque d'être épelés)", `${ou} | ${caps.join(", ")}`);
      if (/\d\s?(dm|dam|hm|mg|dl|cl|ml)\b/.test(v)) add("unité non traduite", `${ou} | ${v.slice(0, 100)}`);
      if (/[\u{1F300}-\u{1FAFF}]/u.test(String(t)) && v.length < 3) add("texte fait seulement d'émojis (rien n'est dit)", ou);
    }
  });
ecrans.sort((a, b) => a - b);
console.log(`Leçons ${AGE} ans : ${n} · écrans par leçon : médiane ${ecrans[ecrans.length >> 1]}, maximum ${ecrans[ecrans.length - 1]} · leçons de plus de 12 écrans : ${longues}`);
for (const [k, v] of Object.entries(pb)) console.log(`\n${k} (${v.length})\n  ` + [...new Set(v)].slice(0, 10).join("\n  "));
