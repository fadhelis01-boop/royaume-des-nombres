// Test de niveau par domaine et parcours personnalisé (module pur, testé par `npm test`).
//
// 1. Chaque leçon reçoit un niveau sur l'échelle des classes (GS = 0, CP = 1 … Terminale = 12,
//    supérieur = 13), estimé à partir de la tranche de classes de son monde et de sa place dans le monde.
// 2. Le test avance domaine par domaine en « escalier » : il part du niveau attendu pour l'âge,
//    monte d'un cran après une réussite, descend après une erreur (3 questions par domaine, 2 jusqu'à 8 ans).
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

/** Niveau d'une leçon : sa classe si elle est indiquée, sinon interpolé dans la tranche de son monde selon sa place. */
export function niveauLecon(w: World, idx: number): number | null {
  // classe indiquée dans la leçon (audit « 9-12 ans » : relatifs et priorités de 5ᵉ classés en 4ᵉ)
  const c = w.lecons[idx]?.classe;
  const tc = c ? tranche(c) : null;
  if (tc) return tc[0];
  const t = tranche(w.niveau);
  if (!t) return null;
  // les leçons qui ont leur propre classe ne comptent pas dans la répartition des autres
  const libres = w.lecons.map((l, i) => (l.classe ? -1 : i)).filter((i) => i >= 0);
  const pos = libres.indexOf(idx);
  const n = libres.length;
  return n <= 1 ? t[0] : t[0] + ((t[1] - t[0]) * Math.max(0, pos)) / (n - 1);
}

/** « Âge scolaire » : l'âge qui correspond à la classe déclarée (un enfant né en décembre, qui a sauté
 *  ou redoublé une classe est placé selon sa classe), sinon l'âge réel. */
export const ageScolaire = (c: { age: number; classe?: number }) => (typeof c.classe === "number" ? c.classe + 5 : c.age);

/** Classe attendue pour un âge (8 ans → CE2 = 3). */
export const classeDeLAge = (age: number) => Math.max(0, Math.min(13, age - 5));

/**
 * Niveau habituellement ACQUIS à cet âge, à ce moment de l'année scolaire.
 * En octobre, une enfant de 8 ans vient d'entrer en CE2 : elle maîtrise le CE1, pas encore le CE2.
 * Septembre = début de la classe (classe − 1), juin ≈ classe presque finie, juillet-août = classe finie.
 * (Audit « enfant de 8 ans » : partir du niveau de la classe en cours faisait échouer dès la 1ʳᵉ question.)
 */
export function niveauDuMoment(age: number, quand: Date = new Date()): number {
  const m = quand.getMonth(); // 0 = janvier
  const avance = m >= 8 ? (m - 8) / 10 : m <= 5 ? (m + 4) / 10 : 1;
  return Math.max(0, Math.min(13, classeDeLAge(age) - 1 + avance));
}

export interface LeconNiv {
  key: string;
  world: World;
  lesson: Lesson;
  niveau: number;
}
export interface Domaine {
  id: string;
  titre: string;
  /** nom simple pour les moins de 9 ans (« Partager en parts » plutôt que « Fractions et proportions ») */
  titreJeune?: string;
  emoji: string;
  lecons: LeconNiv[];
  min: number;
  max: number;
}
type DefDom = { id: string; titre: string; jeune?: string; emoji?: string; mondes: string[] };

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
      return { id: d.id, titre: d.titre, titreJeune: d.jeune, emoji: d.emoji ?? "⭐", lecons, min: lecons[0]?.niveau ?? 0, max: lecons[lecons.length - 1]?.niveau ?? 0 };
    })
    .filter((d) => d.lecons.length);
}

/** Types d'exercice retenus pour le test : pas de hasard (vrai/faux, comparer), pas de rédaction ni de dictée. */
const TYPES_TEST = new Set(["qcm", "nombre", "mot", "texte", "champs", "ordre", "relier", "classer", "expression", "liste", "droite", "blocs", "sauts", "partage", "colorier", "horloge", "payer", "surligner"]);
/** En dessous de cet âge (scolaire), on ménage l'enfant : exercices faciles, pas d'écriture de mots, pas de rédaction. */
export const AGE_JEUNE = 9;
/** Nom d'une île adapté à l'âge. */
export const nomIle = (d: { titre: string; titreJeune?: string } | undefined, age: number) => (d ? (age < AGE_JEUNE && d.titreJeune ? d.titreJeune : d.titre) : "");
/** Enfant à ménager dans les défis : moins de 9 ans (classe) ou lecteur pas encore à l'aise. */
export const jeuneLecteur = (c: { age: number; classe?: number; lecteur?: string }) => ageScolaire(c) < AGE_JEUNE || (c.lecteur !== undefined && c.lecteur !== "oui");
/**
 * Écriture dans les défis, par classe (audits « 8 ans » et « 9-12 ans » : pas de marche brutale) :
 * - avant le CE2, ou lecteur pas à l'aise : ni rédaction ni « mot qui manque » ;
 * - CE2 (8 ans) lecteur à l'aise : un « mot qui manque » par défi ;
 * - CM1 (9 ans) : un « mot qui manque », et la rédaction libre un défi sur trois ;
 * - à partir du CM2 : tout.
 */
export function optionsEcrit(c: { age: number; classe?: number; lecteur?: string }, hasard = Math.random()): { jeune: boolean; unRappel: boolean; uneRedaction: boolean } {
  const a = ageScolaire(c);
  const aLAise = c.lecteur === undefined || c.lecteur === "oui";
  if (!aLAise || a < 8) return { jeune: true, unRappel: false, uneRedaction: false };
  if (a === 8) return { jeune: true, unRappel: true, uneRedaction: false };
  if (a === 9) return { jeune: true, unRappel: true, uneRedaction: hasard < 1 / 3 };
  return { jeune: false, unRappel: false, uneRedaction: false };
}
/** À 8 ans, une lectrice à l'aise (« lit tout seul ») garde un « mot qui manque » par défi (audit « 8 ans »). */
export const lectriceAgile8 = (c: { age: number; classe?: number; lecteur?: string }) => ageScolaire(c) === 8 && c.lecteur === "oui";
/**
 * Exercices du test pour une leçon. Avant 9 ans (audit « 7 ans ») : pas de mot à écrire (l'orthographe
 * mesurerait l'écriture, pas la notion) et seulement les exercices de niveau 1 ou 2 de la leçon
 * (le niveau 3 d'une leçon de CE1 relève souvent du CE2 : millimètres, centilitres…).
 */
export function exercicesTest(l: Lesson, age?: number): ExSpec[] {
  const base = l.exercices.filter((e) => TYPES_TEST.has(e.type) && !(e.type === "qcm" && (e.choix?.length ?? 0) < 3));
  if (age === undefined || age >= AGE_JEUNE) return base;
  const doux = base.filter((e) => e.type !== "mot" && e.type !== "texte" && (e.niveau ?? 2) <= 2);
  return doux.length ? doux : base.filter((e) => e.type !== "mot" && e.type !== "texte");
}

/** La leçon du domaine la plus proche d'un niveau visé (de préférence juste en dessous), qui a des exercices de test. */
export function leconPour(d: Domaine, cible: number, age?: number): LeconNiv | null {
  const ok = d.lecons.filter((l) => exercicesTest(l.lesson, age).length);
  if (!ok.length) return null;
  return ok.reduce((best, l) => {
    const e = Math.abs(l.niveau - cible) + (l.niveau > cible ? 0.25 : 0);
    const eb = Math.abs(best.niveau - cible) + (best.niveau > cible ? 0.25 : 0);
    return e < eb ? l : best;
  });
}

/**
 * Domaines à tester : ceux qui ont vraiment commencé à ce moment de l'année (audit « 7 ans » : en novembre
 * de CE1, seules les îles « nombres » et « calcul » sont entamées). Les autres viendront plus tard.
 * Toujours au moins un domaine (celui qui commence le plus tôt).
 */
export function domainesATester(doms: Domaine[], age: number, quand?: Date): Domaine[] {
  const seuil = niveauDuMoment(age, quand) + 0.5;
  const ok = doms.filter((d) => d.min <= seuil);
  if (ok.length || !doms.length) return ok;
  return [doms.reduce((a, b) => (b.min < a.min ? b : a))];
}

/** État d'un domaine pendant le test (escalier). */
export interface Escalier {
  cible: number;
  reponses: { niveau: number; ok: boolean }[];
}
export const QUESTIONS_PAR_DOMAINE = 3;
/** Jusqu'à 8 ans (âge scolaire), 2 questions par île : un test plus court, moins fatigant. */
export const QUESTIONS_PAR_DOMAINE_JEUNE = 2;
export const AGE_TEST_COURT = 8;
/**
 * Nombre de questions par île du test de niveau.
 * « Faire le point » : 2. Planète à une seule île : 5 (sinon la mesure serait trop grossière).
 * Sinon : 2 jusqu'à 8 ans, 3 au-delà.
 */
export function questionsParIle(age: number, nbDomaines: number, point = false): number {
  if (point) return 2;
  if (nbDomaines === 1) return 5;
  return age <= AGE_TEST_COURT ? QUESTIONS_PAR_DOMAINE_JEUNE : QUESTIONS_PAR_DOMAINE;
}
/**
 * Questions pour une île donnée. À 8 ans, une île qui commence à peine en classe (son début est
 * au-dessus du niveau du moment − 0,5) n'a qu'une question : elle n'a pas de « marche basse » où
 * redescendre après une erreur (audit « 8 ans » : l'île « Mesurer » en novembre de CE2).
 */
export function questionsIle(d: Domaine, age: number, nbDomaines: number, point = false, quand?: Date): number {
  const n = questionsParIle(age, nbDomaines, point);
  if (point || nbDomaines === 1 || age !== 8) return n;
  return d.min > niveauDuMoment(age, quand) - 0.5 ? 1 : n;
}

/** Part de « Je ne sais pas encore » au-delà de laquelle le test est jugé fait trop vite. */
export const SEUIL_BACLE = 2 / 3;
/** Le test a-t-il été fait trop vite (presque que des « Je ne sais pas encore ») ? Il faut au moins 4 réponses. */
export const testBacle = (nsp: number, reponses: number) => reponses >= 4 && nsp / reponses > SEUIL_BACLE;
/**
 * Après un test fait trop vite, on ne fait pas redescendre l'enfant sous la classe précédente
 * (niveau du moment − 1,5) : un parcours « de bébé » vexe autant qu'un parcours trop dur décourage.
 * Les îles pas encore commencées gardent leur niveau.
 */
export function plancherBacle(doms: Domaine[], niveaux: Record<string, number>, age: number, quand?: Date): Record<string, number> {
  const moment = niveauDuMoment(age, quand);
  const plancher = moment - 1.5;
  const out: Record<string, number> = { ...niveaux };
  for (const d of doms) {
    const n = out[d.id];
    if (n === undefined) continue;
    // une île commencée en classe depuis plus d'un an n'est pas « à découvrir »
    const p = d.min <= moment - 1 ? Math.max(plancher, d.min) : plancher;
    out[d.id] = Math.max(n, Math.min(p, d.max));
  }
  return out;
}

export function departEscalier(d: Domaine, age: number, depuis?: number, quand?: Date): Escalier {
  const c = depuis ?? niveauDuMoment(age, quand);
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
export function construireParcours(doms: Domaine[], niveaux: Record<string, number>, age: number, fait: (key: string) => boolean, max = 18, quand?: Date): EtapeParcours[] {
  const attendu = niveauDuMoment(age, quand);
  const listes = doms
    .filter((d) => niveaux[d.id] !== undefined)
    .map((d) => {
      const n = niveaux[d.id];
      const retard = attendu - n;
      // île pas encore commencée (comme « à découvrir » sur la carte) : ses leçons sont nouvelles, pas « à revoir »
      const pasCommence = n < d.min - 0.25;
      const items: EtapeParcours[] = [];
      if (retard > 0) {
        const cons = [...d.lecons].reverse().find((l) => l.niveau <= n && l.niveau > n - 1 && !fait(l.key));
        if (cons) items.push({ key: cons.key, dom: d.id, raison: "consolider" });
      }
      for (const l of d.lecons) if (l.niveau > n && l.niveau <= n + 1.5 && !fait(l.key) && !items.some((x) => x.key === l.key)) items.push({ key: l.key, dom: d.id, raison: retard > 0 && !pasCommence ? "renforcer" : "nouveau" });
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

/**
 * Faut-il refaire le point ? Parcours terminé, ou plus de 15 jours.
 * Après le tout premier test (2 ou 3 questions par domaine : estimation encore grossière), dès 7 jours.
 */
export const pointConseille = (p: Parcours | undefined, fait: (key: string) => boolean, now = Date.now(), premierTest = false) =>
  !!p && (p.etapes.every((e) => fait(e.key)) || now - p.at > (premierTest ? 7 : 15) * 86400000);
