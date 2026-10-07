import { getContent } from "./content";
import { normText } from "./gen";
import type { GlossEntry, Lesson, World } from "./types";

// Recherche locale (hors connexion) dans les leçons et le Grand Livre.
const STOP = new Set("le la les un une des de du d l a au aux et ou est ce que qui quoi comment pourquoi c est en pour sur dans avec on je tu il elle sont fait faire veut dire ca sa son ses mes mon ma quel quelle quels quelles combien".split(" "));

const words = (s: string) =>
  normText(s)
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => w.replace(/(s|x)$/, ""));

function lessonText(l: Lesson) {
  return l.etapes
    .map((s) => ("texte" in s ? s.texte : s.kind === "dialogue" ? s.lines.map((x) => x.text).join(" ") : s.kind === "exemple" ? s.enonce + " " + s.etapes.join(" ") : ""))
    .join(" ");
}

export interface Hit {
  kind: "lecon" | "mot";
  score: number;
  world?: World;
  lesson?: Lesson;
  entry?: GlossEntry;
}

export function searchLocal(q: string, limit = 6): Hit[] {
  const qw = words(q);
  if (!qw.length) return [];
  const { worlds, manifest } = getContent();
  const hits: Hit[] = [];
  for (const g of manifest?.glossaire ?? []) {
    const mw = words(g.mot);
    const dw = new Set(words(g.def));
    let s = 0;
    for (const w of qw) {
      if (mw.includes(w)) s += 10;
      else if (mw.some((m) => m.startsWith(w) || w.startsWith(m))) s += 5;
      if (dw.has(w)) s += 1;
    }
    if (s >= 5) hits.push({ kind: "mot", score: s + 2, entry: g });
  }
  for (const w of worlds)
    for (const l of w.lecons) {
      const tw = new Set(words(l.titre + " " + l.objectif + " " + (l.mots ?? []).join(" ")));
      const body = new Set(words(lessonText(l)));
      let s = 0;
      for (const x of qw) {
        if (tw.has(x)) s += 6;
        if (body.has(x)) s += 1;
      }
      if (s >= 3) hits.push({ kind: "lecon", score: s, world: w, lesson: l });
    }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
