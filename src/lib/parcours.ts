// Test de niveau par domaine et parcours personnalisé (module pur, testé par `npm test`).
//
// 1. Chaque leçon reçoit un niveau sur l'échelle des classes (GS = 0, CP = 1 … Terminale = 12,
//    supérieur = 13), estimé à partir de la tranche de classes de son monde et de sa place dans le monde.
// 2. Le test avance domaine par domaine en « escalier » : il part du niveau attendu pour l'âge,
//    monte d'un cran après une réussite, descend après une erreur (3 questions par domaine).
// 3. Le parcours propose, domaine par domaine, les leçons juste au-dessus du niveau estimé,
//    en commençant par les domaines à renforcer, en les entremêlant (on ne reste pas des semaines
//    sur un seul thème : l'entrelacement aide à retenir).
import type { EtapeParcours, ExSpec, Lesson, Parcours, World } from "./types";

export const CLASSES = ["GS", "CP", "CE1", "CE2", "CM1", "CM2", "6ᵉ", "5ᵉ", "4ᵉ", "3ᵉ", "2nde", "1ʳᵉ", "Terminale", "Supérieur"];
export const nomClasse = (g: number) => CLASSES[Math.max(0, Math.min(CLASSES.length - 1, Math.round(g)))];

const JETONS: [RegExp, number][] = [
  [/\bGS\b/, 0], [/\bCP\b/, 1], [/\bCE1\b/, 2], [/\bCE2\b/, 3], [/\bCM1\b/, 4], [/\bCM2\b/, 5],
  [/6\s*[ᵉe]/, 6], [/5\s*[ᵉe]/, 7], [/4\s*[ᵉe]/, 8], [/3\s*[ᵉe]/, 9], [/2nde|seconde/i, 10], [/1\s*[ʳr]\s*[ᵉe]|première/i, 11],
  [/terminale|maths expertes/i, 12], [/supérieur/i, 13], [/lycée/i, 11],
];
/** « CE1 – CM2 » → [2, 5] ; « Tous niveaux » → null. */
export function tranche(niveau: string): [number, number] | null {
  const parts = niveau.split(/\s+[–-]\s+/);
  const val = (p: string) => {
    for (const [re, g] of JETONS) if (re.test(p)) return g;
    return null;
  };
  const a = val(parts[0]);
  const b = val(parts[parts.length - 1]);
  if (a === null && b === null) return null;
  const lo = a ?? b!;
  const hi = b ?? a!;
  return [Math.min(lo, hi), Math.max(lo, hi)];
}

/** Niveau d'une leçon : interpolé dans la tranche de son monde selon sa place. */
export function niveauLecon(w: World, idx: number): number | null {
  const t = tranche(w.niveau);
  if (!t) return null;
  const n = w.lecons.length;
  return n <= 1 ? t[0] : t[0] + ((t[1] - t[0]) * idx) / (n - 1);
}

/** Classe attendue pour un âge (8 ans → CE2 = 3). */
export const classeDeLAge = (age: number) => Math.max(0, Math.min(13, age - 5));

export interface LeconNiv {
  key: string;
  world: World;
  lesson: Lesson;
  niveau: number;
}
export interface Domaine {
  id: string;
  titre: string;
  emoji: string;
  lecons: LeconNiv[];
  min: number;
  max: number;
}
type DefDom = { id: string; titre: string; emoji?: string; mondes: string[] };

/** Les domaines d'une planète, avec leurs leçons rangées par niveau. */
export function domainesDe(planete: string, worlds: World[], defs?: DefDom[]): Domaine[] {
  const mondes = worlds.filter((w) => w.matiere === planete && w.cycle !== "astuces");
  const groupes: DefDom[] = defs?.length ? defs : [{ id: "tout", titre: "Toute la planète", emoji: "🪐", mondes: mondes.map((w) => w.id) }];
  return groupes
    .map((d) => {
      const lecons: LeconNiv[] = [];
      for (const id of d.mondes) {
        const w = mondes.find((x) => x.id === id);
        if (!w) continue;
        w.lecons.forEach((l, i) => {
          const niveau = niveauLecon(w, i);
          if (niveau !== null) lecons.push({ key: `${w.id}/${l.id}`, world: w, lesson: l, niveau });
        });
      }
      lecons.sort((a, b) => a.niveau - b.niveau || a.world.ordre - b.world.ordre);
      return { id: d.id, titre: d.titre, emoji: d.emoji ?? "⭐", lecons, min: lecons[0]?.niveau ?? 0, max: lecons[lecons.length - 1]?.niveau ?? 0 };
    })
    .filter((d) => d.lecons.length);
}

/** Types d'exercice retenus pour le test : pas de hasard (vrai/faux, comparer), pas de rédaction ni de dictée. */
const TYPES_TEST = new Set(["qcm", "nombre", "mot", "texte", "champs", "ordre", "relier", "classer", "expression", "liste", "droite", "blocs", "sauts", "partage", "colorier", "horloge", "payer", "surligner"]);
export const exercicesTest = (l: Lesson): ExSpec[] => l.exercices.filter((e) => TYPES_TEST.has(e.type) && !(e.type === "qcm" && (e.choix?.length ?? 0) < 3));

/** La leçon du domaine la plus proche d'un niveau visé (de préférence juste en dessous), qui a des exercices de test. */
export function leconPour(d: Domaine, cible: number): LeconNiv | null {
  const ok = d.lecons.filter((l) => exercicesTest(l.lesson).length);
  if (!ok.length) return null;
  return ok.reduce((best, l) => {
    const e = Math.abs(l.niveau - cible) + (l.niveau > cible ? 0.25 : 0);
    const eb = Math.abs(best.niveau - cible) + (best.niveau > cible ? 0.25 : 0);
    return e < eb ? l : best;
  });
}

/** Domaines à tester pour un âge : ceux qui ont déjà commencé à cette classe (les autres viendront plus tard). */
export const domainesATester = (doms: Domaine[], age: number) => doms.filter((d) => d.min <= classeDeLAge(age));

/** État d'un domaine pendant le test (escalier). */
export interface Escalier {
  cible: number;
  reponses: { niveau: number; ok: boolean }[];
}
export const QUESTIONS_PAR_DOMAINE = 3;
export function departEscalier(d: Domaine, age: number, depuis?: number): Escalier {
  const c = depuis ?? classeDeLAge(age);
  return { cible: Math.max(d.min, Math.min(d.max, c)), reponses: [] };
}
/** Après une réponse : on monte d'un cran si c'est juste, on descend si c'est faux (dans les bornes du domaine). */
export function pas(e: Escalier, d: Domaine, niveau: number, ok: boolean): Escalier {
  const cible = Math.max(d.min, Math.min(d.max, niveau + (ok ? 1 : -1)));
  return { cible, reponses: [...e.reponses, { niveau, ok }] };
}
/** Niveau estimé : le plus haut niveau réussi, sans dépasser un niveau raté plus bas ; sinon juste sous le plus bas raté. */
export function estimation(e: Escalier, d: Domaine): number {
  const reussis = e.reponses.filter((r) => r.ok).map((r) => r.niveau);
  const rates = e.reponses.filter((r) => !r.ok).map((r) => r.niveau);
  const minRate = rates.length ? Math.min(...rates) : Infinity;
  const sousRate = reussis.filter((n) => n < minRate);
  if (sousRate.length) return Math.max(...sousRate);
  if (reussis.length) return Math.min(...reussis) - 0.5; // réussites au-dessus d'un échec : niveau fragile
  return Math.max(d.min - 1, minRate - 1);
}

/**
 * Le parcours : pour chaque domaine, les leçons juste au-dessus du niveau estimé (jusqu'à 1,5 classe
 * au-dessus), plus une leçon de consolidation pour les domaines sous le niveau de l'âge.
 * Les domaines les plus en retard passent en premier, puis on alterne.
 */
export function construireParcours(doms: Domaine[], niveaux: Record<string, number>, age: number, fait: (key: string) => boolean, max = 18): EtapeParcours[] {
  const attendu = classeDeLAge(age);
  const listes = doms
    .filter((d) => niveaux[d.id] !== undefined)
    .map((d) => {
      const n = niveaux[d.id];
      const retard = attendu - n;
      const items: EtapeParcours[] = [];
      if (retard > 0) {
        const cons = [...d.lecons].reverse().find((l) => l.niveau <= n && l.niveau > n - 1 && !fait(l.key));
        if (cons) items.push({ key: cons.key, dom: d.id, raison: "consolider" });
      }
      for (const l of d.lecons) if (l.niveau > n && l.niveau <= n + 1.5 && !fait(l.key) && !items.some((x) => x.key === l.key)) items.push({ key: l.key, dom: d.id, raison: retard > 0 ? "renforcer" : "nouveau" });
      // une planète d'un ou deux domaines a besoin de plus d'étapes par domaine
      return { retard, items: items.slice(0, doms.length <= 2 ? 10 : 5) };
    })
    .sort((a, b) => b.retard - a.retard);
  const out: EtapeParcours[] = [];
  for (let tour = 0; out.length < max && listes.some((l) => l.items.length > tour); tour++)
    for (const l of listes) if (l.items[tour] && out.length < max) out.push(l.items[tour]);
  return out;
}

/** Mondes à ouvrir après le test : ceux des leçons présumées acquises ou prévues au parcours. */
export function mondesAOuvrir(doms: Domaine[], niveaux: Record<string, number>, etapes: EtapeParcours[]): string[] {
  const ids = new Set<string>();
  for (const d of doms) {
    const n = niveaux[d.id];
    if (n === undefined) continue;
    for (const l of d.lecons) if (l.niveau <= n) ids.add(l.world.id);
  }
  for (const e of etapes) ids.add(e.key.split("/")[0]);
  return [...ids];
}

/** La prochaine étape du parcours qui n'est pas encore réussie. */
export const prochaineEtape = (p: Parcours | undefined, fait: (key: string) => boolean) => p?.etapes.find((e) => !fait(e.key));

/** Faut-il refaire le point ? Parcours terminé, ou plus de 15 jours. */
export const pointConseille = (p: Parcours | undefined, fait: (key: string) => boolean, now = Date.now()) => !!p && (p.etapes.every((e) => fait(e.key)) || now - p.at > 15 * 86400000);
