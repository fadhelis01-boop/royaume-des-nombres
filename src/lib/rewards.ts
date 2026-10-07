import type { Child, World } from "./types";

// Récompenses : on valorise l'EFFORT et la PERSÉVÉRANCE autant que la réussite
// (« état d'esprit de croissance »). Pas de classement entre enfants, pas de
// perte de points en cas d'erreur.

export const XP = {
  correct: 10,
  correctAfterHint: 6,
  correctSecondTry: 5,
  lessonDone: 40,
  star: 15,
  revision: 8,
  enigme: 30,
  daily: 50,
};

/** XP nécessaire pour atteindre le niveau n (courbe douce : 100, 250, 450, 700…). */
export const xpForLevel = (n: number) => 50 * n * (n + 1);
export function levelOf(xp: number): { level: number; cur: number; next: number; title: string; emoji: string } {
  let level = 1;
  while (xp >= xpForLevel(level)) level++;
  const prev = level === 1 ? 0 : xpForLevel(level - 1);
  const t = TITLES.filter((x) => x.from <= level).at(-1)!;
  return { level, cur: xp - prev, next: xpForLevel(level) - prev, title: t.title, emoji: t.emoji };
}

export const TITLES = [
  { from: 1, title: "Graine de calcul", emoji: "🌱" },
  { from: 3, title: "Pousse curieuse", emoji: "🌿" },
  { from: 5, title: "Apprenti·e des nombres", emoji: "🔢" },
  { from: 8, title: "Explorateur·rice", emoji: "🧭" },
  { from: 12, title: "Détective des problèmes", emoji: "🔎" },
  { from: 16, title: "Architecte des formes", emoji: "📐" },
  { from: 20, title: "Magicien·ne des fractions", emoji: "🪄" },
  { from: 25, title: "Chevalier·ère de l'algèbre", emoji: "🛡️" },
  { from: 30, title: "Gardien·ne des théorèmes", emoji: "🏰" },
  { from: 40, title: "Sage du Royaume", emoji: "🦉" },
  { from: 50, title: "Légende des Nombres", emoji: "👑" },
];

export interface Badge {
  id: string;
  emoji: string;
  titre: string;
  desc: string;
  test: (c: Child, worlds: World[]) => boolean;
}

const lessonsDone = (c: Child) => Object.values(c.progress).filter((p) => p.done).length;
const cnt = (c: Child, k: string) => c.counters?.[k] ?? 0;
const worldDone = (c: Child, w: World) => w.lecons.every((l) => c.progress[`${w.id}/${l.id}`]?.done);

export const BADGES: Badge[] = [
  { id: "premier-pas", emoji: "👣", titre: "Premier pas", desc: "Terminer sa première leçon.", test: (c) => lessonsDone(c) >= 1 },
  { id: "cinq-lecons", emoji: "🎒", titre: "Bon élan", desc: "Terminer 5 leçons.", test: (c) => lessonsDone(c) >= 5 },
  { id: "vingt-lecons", emoji: "📚", titre: "Grand lecteur", desc: "Terminer 20 leçons.", test: (c) => lessonsDone(c) >= 20 },
  { id: "cinquante-lecons", emoji: "🏔️", titre: "Grimpeur de savoir", desc: "Terminer 50 leçons.", test: (c) => lessonsDone(c) >= 50 },
  { id: "cent-lecons", emoji: "🚀", titre: "Fusée des maths", desc: "Terminer 100 leçons.", test: (c) => lessonsDone(c) >= 100 },
  { id: "trois-etoiles", emoji: "🌟", titre: "Trois étoiles", desc: "Obtenir 3 étoiles à un défi.", test: (c) => Object.values(c.progress).some((p) => p.stars === 3) },
  { id: "monde-complet", emoji: "🗺️", titre: "Monde conquis", desc: "Terminer toutes les leçons d'un monde.", test: (c, ws) => ws.some((w) => worldDone(c, w)) },
  { id: "trois-mondes", emoji: "🏝️", titre: "Grand voyageur", desc: "Terminer 3 mondes.", test: (c, ws) => ws.filter((w) => worldDone(c, w)).length >= 3 },
  { id: "serie-3", emoji: "🔥", titre: "3 jours de suite", desc: "Venir apprendre 3 jours d'affilée.", test: (c) => c.bestStreak >= 3 },
  { id: "serie-7", emoji: "☄️", titre: "Une semaine !", desc: "7 jours d'affilée.", test: (c) => c.bestStreak >= 7 },
  { id: "serie-30", emoji: "🌋", titre: "Un mois entier", desc: "30 jours d'affilée.", test: (c) => c.bestStreak >= 30 },
  { id: "sans-faute", emoji: "💯", titre: "Sans faute", desc: "Réussir un défi à 100 %.", test: (c) => cnt(c, "perfect") >= 1 },
  { id: "perseverant", emoji: "💪", titre: "Persévérant·e", desc: "Réussir 20 fois une question après s'être trompé·e.", test: (c) => cnt(c, "comeback") >= 20 },
  { id: "tetu", emoji: "🐢", titre: "Jamais abandonner", desc: "Recommencer un défi pour l'améliorer.", test: (c) => Object.values(c.progress).some((p) => p.attempts >= 2) },
  { id: "cent-questions", emoji: "🎯", titre: "100 réponses justes", desc: "100 bonnes réponses.", test: (c) => cnt(c, "ok") >= 100 },
  { id: "mille-questions", emoji: "🏆", titre: "1 000 réponses justes", desc: "MILLE ! 😳 (dixit Zéro)", test: (c) => cnt(c, "ok") >= 1000 },
  { id: "curieux", emoji: "❓", titre: "Curieux·se", desc: "Poser 5 questions dans « Demande à Mia ».", test: (c) => cnt(c, "ask") >= 5 },
  { id: "tables", emoji: "✖️", titre: "Maître des tables", desc: "Connaître toutes les tables de 2 à 9.", test: (c) => tablesMastered(c) >= 64 },
  { id: "eclair", emoji: "⚡", titre: "Éclair", desc: "20 points au Calcul éclair.", test: (c) => (c.games["eclair"] ?? 0) >= 20 },
  { id: "compte-bon", emoji: "🧮", titre: "Le compte est bon", desc: "Résoudre 5 « Compte est bon ».", test: (c) => cnt(c, "compte") >= 5 },
  { id: "vise-juste", emoji: "🎯", titre: "Œil de lynx", desc: "80 points à « Vise juste ».", test: (c) => (c.games["vise"] ?? 0) >= 80 },
  { id: "enigmes", emoji: "🧩", titre: "Déchiffreur·se", desc: "Résoudre 5 énigmes.", test: (c) => c.enigmes.length >= 5 },
  { id: "revisions", emoji: "🔁", titre: "Mémoire d'éléphant", desc: "Faire 10 séances de révision.", test: (c) => cnt(c, "revision") >= 10 },
  { id: "astucieux", emoji: "💡", titre: "Astucieux·se", desc: "Terminer 5 leçons de l'École des Astuces.", test: (c) => Object.entries(c.progress).filter(([k, p]) => k.startsWith("ecole-des-astuces/") && p.done).length >= 5 },
  { id: "ami-de-zero", emoji: "🐹", titre: "Ami·e de Zéro", desc: "Répondre « 0 » comme Zéro… alors que ce n'était pas la réponse !", test: (c) => cnt(c, "zero") >= 1 },
  { id: "inventeur", emoji: "✍️", titre: "Inventeur·rice", desc: "Inventer 3 problèmes.", test: (c) => cnt(c, "invente") >= 3 },
];

export function tablesMastered(c: Child): number {
  let n = 0;
  for (let a = 2; a <= 9; a++)
    for (let b = 2; b <= 9; b++) {
      const t = c.tables[`${a}x${b}`];
      if (t && t.ok >= 2 && t.ok > t.ko * 2) n++;
    }
  return n;
}

export function starsFor(score: number): number {
  return score >= 0.95 ? 3 : score >= 0.8 ? 2 : score >= 0.6 ? 1 : 0;
}

// Messages d'encouragement : variés, personnels, centrés sur l'effort.
export const PRAISE = {
  mia: ["Bravo ! Tu as trouvé !", "Génial ! 😸", "Super, je te l'avais dit que tu y arriverais !", "Trop fort·e !", "Tu brilles comme une étoile !"],
  neo: ["Défi réussi !", "Excellent, c'est vérifié !", "Bien joué, champion·ne !", "Parfait, on continue ?", "Ça marche vraiment !"],
  zero: ["Wouah ! Même moi je n'aurais pas trouvé ! 😳", "C'est juste ! …Je le savais. C'est évident.", "INCROYABLE ! 🤯"],
};
export const ENCOURAGE = {
  mia: ["Pas grave ! Et si on essayait autrement ?", "Presque ! Regarde bien l'indice.", "Une erreur, c'est ton cerveau qui grandit !"],
  neo: ["Attends, vérifions ensemble !", "On recommence calmement : relis l'énoncé.", "Les champions se trompent aussi. Réessaie !"],
  zero: ["Moi aussi je me trompe tout le temps ! On réessaie ?", "Hmm… ce n'est pas ça. Mais ce n'était pas zéro non plus ! 😄"],
};
export const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
