// Plan d'un défi de leçon (module pur, testé par `npm test`).
import type { ExSpec } from "./types";

export function rankSpecs(specs: ExSpec[]): ExSpec[] {
  return specs
    .map((e, i) => ({ e, r: (e.niveau ?? 2) * 100 + i }))
    .sort((x, y) => x.r - y.r)
    .map((x) => x.e);
}

const CHOIX = ["qcm", "vf", "comparer"];
const PRODUCTION = ["libre", "relier", "classer", "mot", "dictee", "expression", "ordre"];
/** Pour les jeunes lecteurs, « produire » c'est relier, ranger ou manipuler, pas écrire de mémoire. */
const PRODUCTION_JEUNE = ["relier", "classer", "ordre", "blocs", "sauts", "partage", "colorier", "droite", "payer", "horloge", "surligner"];
/** Exercices réservés aux lecteurs à l'aise : rédaction libre et rappels écrits de mémoire. */
export const pourLecteurAgile = (e: ExSpec) => e.type === "libre" || !!e.rappel;
/** Le « mot qui manque » généré à partir du « Je retiens » (écrire un seul mot, de mémoire). */
const estMotQuiManque = (e: ExSpec) => e.type === "mot" && !!e.rappel;
/**
 * Plan du défi, du plus simple au plus difficile : au moins une question de production
 * (écrire, relier, ranger…) quand la leçon en a, et au plus la moitié de questions à choix
 * (QCM, vrai/faux) quand d'autres formats existent : reconnaître ne suffit pas, il faut produire.
 * Aucun type ne dépasse la moitié du défi quand la leçon en propose d'autres (audit « 8 ans »).
 * `jeune` : enfant de moins de 9 ans ou lecteur débutant (ni rédaction ni rappel écrit).
 * `unRappel` : avec `jeune`, garde un seul « mot qui manque » (lectrice à l'aise de 8 ans, CM1).
 * `uneRedaction` : avec `jeune`, ajoute une rédaction libre (CM1, un défi sur trois).
 */
export function planDefi(specs: ExSpec[], n: number, opts: { jeune?: boolean; unRappel?: boolean; uneRedaction?: boolean } = {}): ExSpec[] {
  const tri = opts.jeune ? specs.filter((e) => !pourLecteurAgile(e)) : specs;
  const ranked = rankSpecs(tri.length ? tri : specs);
  const rang = new Map(rankSpecs(specs).map((e, r) => [e, r]));
  const autres = ranked.filter((e) => !CHOIX.includes(e.type));
  const maxChoix = autres.length ? Math.ceil(n / 2) : n;
  const maxType = new Set(ranked.map((e) => e.type)).size > 1 ? Math.max(1, Math.floor(n / 2)) : n;
  const plan: ExSpec[] = [];
  const nb = (f: (x: ExSpec) => boolean) => plan.filter(f).length;
  const tropDe = (e: ExSpec) => (CHOIX.includes(e.type) && nb((x) => CHOIX.includes(x.type)) >= maxChoix) || nb((x) => x.type === e.type) >= maxType;
  const prod = ranked.find((e) => (opts.jeune ? PRODUCTION_JEUNE : PRODUCTION).includes(e.type)) ?? (opts.jeune ? undefined : ranked.find((e) => PRODUCTION.includes(e.type)));
  if (prod) plan.push(prod);
  const rappel = opts.jeune && opts.unRappel ? specs.find(estMotQuiManque) : undefined;
  // CM1 : une rédaction libre de temps en temps (un défi sur trois)
  const redaction = opts.jeune && opts.uneRedaction ? specs.find((e) => e.type === "libre") : undefined;
  const place = n - (rappel ? 1 : 0) - (redaction ? 1 : 0);
  for (const e of ranked) {
    if (plan.length >= place) break;
    if (plan.includes(e) || tropDe(e)) continue;
    plan.push(e);
  }
  // pas assez d'exercices différents : on complète au hasard (en respectant les limites si possible)
  for (let essais = 0; plan.length < place && ranked.length && essais < 200; essais++) {
    const e = ranked[Math.floor(Math.random() * ranked.length)];
    if (essais < 100 && tropDe(e)) continue;
    plan.push(e);
  }
  if (rappel) plan.push(rappel);
  if (redaction) plan.push(redaction);
  return plan.sort((x, y) => rang.get(x)! - rang.get(y)!);
}
