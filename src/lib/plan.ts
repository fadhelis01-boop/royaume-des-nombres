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
/**
 * Plan du défi, du plus simple au plus difficile : au moins une question de production
 * (écrire, relier, ranger…) quand la leçon en a, et au plus la moitié de questions à choix
 * (QCM, vrai/faux) quand d'autres formats existent : reconnaître ne suffit pas, il faut produire.
 */
export function planDefi(specs: ExSpec[], n: number): ExSpec[] {
  const ranked = rankSpecs(specs);
  const rang = new Map(ranked.map((e, r) => [e, r]));
  const autres = ranked.filter((e) => !CHOIX.includes(e.type));
  const maxChoix = autres.length ? Math.ceil(n / 2) : n;
  const plan: ExSpec[] = [];
  const prod = ranked.find((e) => PRODUCTION.includes(e.type));
  if (prod) plan.push(prod);
  for (const e of ranked) {
    if (plan.length >= n) break;
    if (plan.includes(e)) continue;
    if (CHOIX.includes(e.type) && plan.filter((x) => CHOIX.includes(x.type)).length >= maxChoix) continue;
    plan.push(e);
  }
  // pas assez d'exercices différents : on complète au hasard (en respectant la limite si possible)
  for (let essais = 0; plan.length < n && ranked.length && essais < 200; essais++) {
    const e = ranked[Math.floor(Math.random() * ranked.length)];
    if (CHOIX.includes(e.type) && plan.filter((x) => CHOIX.includes(x.type)).length >= maxChoix && essais < 100) continue;
    plan.push(e);
  }
  return plan.sort((x, y) => rang.get(x)! - rang.get(y)!);
}
