import { VISUELS } from "./visuels";

const SETS: Record<string, Set<string>> = Object.fromEntries(Object.entries(VISUELS).map(([k, v]) => [k, new Set(v)]));

/** Chemin de l'illustration `img/<cat>/<id>.webp` si elle existe, sinon undefined (on garde l'émoji). */
export function visuel(cat: string, id: string | undefined): string | undefined {
  return id && SETS[cat]?.has(id) ? `img/${cat}/${id}.webp` : undefined;
}
