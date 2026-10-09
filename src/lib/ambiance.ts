// Ambiance visuelle (2.5) : chaque planète a son ciel, ses couleurs et sa vie ambiante, et l'histoire
// se voit à l'écran : le brouillard gris du Grand Neutre recule et les couleurs reviennent
// à mesure que l'enfant apprend (variable CSS --couleurs, de 0 à 1).
import type { Child, Settings, World } from "./types";

/** enchantée (petits) · épurée (plus grands : moins de décor, lignes nettes) · calme (aucune animation) */
export type StyleAmbiance = "enchantee" | "epuree" | "calme";
export type ReglageAmbiance = "auto" | StyleAmbiance;

export function styleEffectif(s: Settings, c: Child | null): StyleAmbiance {
  const reduit = s.reduceMotion || (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const r = s.ambiance ?? "auto";
  if (reduit || r === "calme") return "calme";
  if (r !== "auto") return r;
  return (c?.age ?? 8) >= 12 ? "epuree" : "enchantee";
}

/** La planète à habiller selon la page : celle du monde visité, sinon celle de l'enfant. */
export function planeteAffichee(segments: string[], c: Child | null, worlds: World[]): string {
  const [p0, p1] = segments;
  if (!c) return "galaxie"; // accueil, création du profil : on arrive dans la Galaxie
  if (p0 === "galaxie" || p0 === "profils" || p0 === "nouveau") return "galaxie";
  if (p0 === "parents") return "neutre";
  if (["lecon", "defi", "monde", "gardien", "diplome"].includes(p0)) return worlds.find((w) => w.id === p1)?.matiere ?? c.matiere ?? "maths";
  return c.matiere ?? "maths";
}

/** Part des leçons réussies d'une planète (0 à 1) : c'est la part des couleurs rendues. */
export function couleursRendues(c: Child | null, worlds: World[], planete: string): number {
  if (!c) return 0.6;
  const ws = planete === "galaxie" || planete === "neutre" ? worlds : worlds.filter((w) => w.matiere === planete);
  let total = 0;
  let faites = 0;
  for (const w of ws)
    for (const l of w.lecons) {
      total++;
      if (c.progress[`${w.id}/${l.id}`]?.done) faites++;
    }
  return total ? faites / total : 0;
}

/** Tirage stable (mêmes positions à chaque affichage) pour placer les éléments d'ambiance. */
export function hasard(i: number, sel: number) {
  const x = Math.sin(i * 12.9898 + sel * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
