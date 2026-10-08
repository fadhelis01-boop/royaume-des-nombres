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
  { from: 5, title: "Esprit des nombres", emoji: "🔢" },
  { from: 8, title: "Boussole du Royaume", emoji: "🧭" },
  { from: 12, title: "Détective des problèmes", emoji: "🔎" },
  { from: 16, title: "Architecte des formes", emoji: "📐" },
  { from: 20, title: "Mage des fractions", emoji: "✨" },
  { from: 25, title: "Bouclier de l'algèbre", emoji: "🛡️" },
  { from: 30, title: "Phare des théorèmes", emoji: "🏰" },
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
  { id: "vingt-lecons", emoji: "📚", titre: "Rat de bibliothèque", desc: "Terminer 20 leçons.", test: (c) => lessonsDone(c) >= 20 },
  { id: "cinquante-lecons", emoji: "🏔️", titre: "Grimpeur de savoir", desc: "Terminer 50 leçons.", test: (c) => lessonsDone(c) >= 50 },
  { id: "cent-lecons", emoji: "🚀", titre: "Fusée du savoir", desc: "Terminer 100 leçons.", test: (c) => lessonsDone(c) >= 100 },
  { id: "trois-etoiles", emoji: "🌟", titre: "Trois étoiles", desc: "Obtenir 3 étoiles à un défi.", test: (c) => Object.values(c.progress).some((p) => p.stars === 3) },
  { id: "monde-complet", emoji: "🗺️", titre: "Monde conquis", desc: "Terminer toutes les leçons d'un monde.", test: (c, ws) => ws.some((w) => worldDone(c, w)) },
  { id: "trois-mondes", emoji: "🏝️", titre: "Globe-trotteur", desc: "Terminer 3 mondes.", test: (c, ws) => ws.filter((w) => worldDone(c, w)).length >= 3 },
  { id: "serie-3", emoji: "🔥", titre: "3 jours de suite", desc: "Venir apprendre 3 jours d'affilée.", test: (c) => c.bestStreak >= 3 },
  { id: "serie-7", emoji: "☄️", titre: "Une semaine !", desc: "7 jours d'affilée.", test: (c) => c.bestStreak >= 7 },
  { id: "serie-30", emoji: "🌋", titre: "Un mois entier", desc: "30 jours d'affilée.", test: (c) => c.bestStreak >= 30 },
  { id: "sans-faute", emoji: "💯", titre: "Sans faute", desc: "Réussir un défi à 100 %.", test: (c) => cnt(c, "perfect") >= 1 },
  { id: "perseverant", emoji: "💪", titre: "Persévérance", desc: "Réussir 20 fois une question après une erreur.", test: (c) => cnt(c, "comeback") >= 20 },
  { id: "tetu", emoji: "🐢", titre: "Jamais abandonner", desc: "Recommencer un défi pour l'améliorer.", test: (c) => Object.values(c.progress).some((p) => p.attempts >= 2) },
  { id: "cent-questions", emoji: "🎯", titre: "100 réponses justes", desc: "100 bonnes réponses.", test: (c) => cnt(c, "ok") >= 100 },
  { id: "mille-questions", emoji: "🏆", titre: "1 000 réponses justes", desc: "MILLE ! 😳 (dixit Zéro)", test: (c) => cnt(c, "ok") >= 1000 },
  { id: "curieux", emoji: "❓", titre: "Curiosité", desc: "Poser 5 questions dans « Demande à Mia ».", test: (c) => cnt(c, "ask") >= 5 },
  { id: "tables", emoji: "✖️", titre: "As des tables", desc: "Connaître toutes les tables de 2 à 9.", test: (c) => tablesMastered(c) >= 64 },
  { id: "eclair", emoji: "⚡", titre: "Éclair", desc: "20 points au Calcul éclair.", test: (c) => (c.games["eclair"] ?? 0) >= 20 },
  { id: "compte-bon", emoji: "🧮", titre: "Le compte est bon", desc: "Résoudre 5 « Compte est bon ».", test: (c) => cnt(c, "compte") >= 5 },
  { id: "vise-juste", emoji: "🎯", titre: "Œil de lynx", desc: "80 points à « Vise juste ».", test: (c) => (c.games["vise"] ?? 0) >= 80 },
  { id: "enigmes", emoji: "🧩", titre: "Déchiffrage", desc: "Résoudre 5 énigmes.", test: (c) => c.enigmes.length >= 5 },
  { id: "revisions", emoji: "🔁", titre: "Mémoire d'éléphant", desc: "Faire 10 séances de révision.", test: (c) => cnt(c, "revision") >= 10 },
  { id: "astucieux", emoji: "💡", titre: "Astuce d'or", desc: "Terminer 5 leçons de l'École des Astuces.", test: (c) => Object.entries(c.progress).filter(([k, p]) => k.startsWith("ecole-des-astuces/") && p.done).length >= 5 },
  { id: "cristal-1", emoji: "💎", titre: "Premier monde sauvé", desc: "Réussir un Défi du Gardien.", test: (c) => (c.crystals?.length ?? 0) >= 1 },
  { id: "cristal-5", emoji: "🔮", titre: "Cinq mondes sauvés", desc: "Réussir 5 Défis du Gardien.", test: (c) => (c.crystals?.length ?? 0) >= 5 },
  { id: "arc-1", emoji: "☁️", titre: "Ami du Grignoteur", desc: "Terminer l'Arc 1 de l'aventure (les Graines).", test: (c) => !!c.story?.["fin-arc-1"] },
  { id: "mains", emoji: "🖐️", titre: "Petites mains", desc: "Réussir 10 activités de manipulation.", test: (c) => cnt(c, "manip") >= 10 },
  { id: "vraie-vie", emoji: "🏡", titre: "Savoirs dans la vraie vie", desc: "Réaliser 3 défis dans la vraie vie avec un adulte.", test: (c) => cnt(c, "vraievie") >= 3 },
  { id: "explique", emoji: "🗣️", titre: "Petit professeur", desc: "Expliquer 5 fois sa méthode à Néo.", test: (c) => cnt(c, "explique") >= 5 },
  { id: "additions", emoji: "➕", titre: "As des additions", desc: "Connaître toutes les additions jusqu'à 10 + 10.", test: (c) => additionsMastered(c) >= 100 },
  { id: "echauffement", emoji: "🏃", titre: "Échauffé", desc: "Faire 7 échauffements du jour.", test: (c) => cnt(c, "echauffement") >= 7 },
  { id: "inventeur", emoji: "✍️", titre: "Inventivité", desc: "Inventer 3 problèmes.", test: (c) => cnt(c, "invente") >= 3 },
  { id: "combo-5", emoji: "🔥", titre: "En feu", desc: "Réussir 5 questions d'affilée du premier coup.", test: (c) => cnt(c, "comboMax") >= 5 },
  { id: "combo-10", emoji: "☄️", titre: "Inarrêtable", desc: "Réussir 10 questions d'affilée du premier coup.", test: (c) => cnt(c, "comboMax") >= 10 },
  { id: "premier-achat", emoji: "🛍️", titre: "Premier trésor", desc: "S'offrir un objet à la boutique avec ses gemmes.", test: (c) => cnt(c, "achats") >= 1 },
  { id: "decorateur", emoji: "🏡", titre: "Décorateur", desc: "Installer 5 objets dans sa cabane.", test: (c) => (c.cabane ?? []).filter(Boolean).length >= 5 },
  { id: "savant", emoji: "🧪", titre: "Jeune savant", desc: "Réaliser 3 expériences pour de vrai.", test: (c) => cnt(c, "experience") >= 3 },
  { id: "savant-10", emoji: "🥽", titre: "Savant confirmé", desc: "Réaliser 10 expériences pour de vrai.", test: (c) => cnt(c, "experience") >= 10 },
  { id: "dessinateur", emoji: "✏️", titre: "Crayon agile", desc: "Terminer 5 dessins pas à pas.", test: (c) => cnt(c, "dessin") >= 5 },
  { id: "artiste", emoji: "🎨", titre: "Artiste en herbe", desc: "Ranger 5 dessins libres dans sa galerie.", test: (c) => cnt(c, "dessin-libre") >= 5 },
  { id: "oreille", emoji: "👂", titre: "Oreille d'or", desc: "8 sur 10 à un jeu de l'Oreille d'or.", test: (c) => (c.games["oreille"] ?? 0) >= 8 },
  { id: "compositeur", emoji: "🎹", titre: "Petit compositeur", desc: "Jouer 50 notes dans le studio de musique.", test: (c) => cnt(c, "studio-notes") >= 50 },
  { id: "galaxie-3", emoji: "🌌", titre: "Voyageur de la Galaxie", desc: "Terminer une leçon sur 3 planètes différentes.", test: (c, ws) => new Set(Object.entries(c.progress).filter(([, p]) => p.done).map(([k]) => ws.find((w) => w.id === k.split("/")[0])?.matiere)).size >= 3 },
  { id: "galaxie-8", emoji: "🌠", titre: "Explorateur de toutes les planètes", desc: "Terminer une leçon sur les 8 planètes.", test: (c, ws) => new Set(Object.entries(c.progress).filter(([, p]) => p.done).map(([k]) => ws.find((w) => w.id === k.split("/")[0])?.matiere)).size >= 8 },
  { id: "duel", emoji: "🤝", titre: "Duel en famille", desc: "Jouer un duel à deux sur le même écran.", test: (c) => cnt(c, "duel") >= 1 },
  { id: "defenseur", emoji: "🏰", titre: "Défenseur du Royaume", desc: "Atteindre la vague 5 de la Défense des Tables.", test: (c) => (c.recordsJeux?.defense ?? 0) >= 5 },
  { id: "pontonnier", emoji: "🌉", titre: "Bâtisseur de ponts", desc: "Réussir 10 ponts des fractions.", test: (c) => (c.recordsJeux?.pont ?? 0) >= 10 },
  { id: "mots-10", emoji: "📒", titre: "Collectionneur de mots", desc: "Ranger 10 mots dans son carnet.", test: (c) => (c.carnet ?? []).length >= 10 },
  { id: "mots-50", emoji: "📚", titre: "Trésor de mots", desc: "Ranger 50 mots dans son carnet.", test: (c) => (c.carnet ?? []).length >= 50 },
  { id: "mots-200", emoji: "🖋️", titre: "Plume d'or", desc: "Ranger 200 mots dans son carnet.", test: (c) => (c.carnet ?? []).length >= 200 },
  { id: "grenouille", emoji: "🐸", titre: "Grenouille d'or", desc: "Gagner la Course de la Grenouille.", test: (c) => cnt(c, "courseGagnee") >= 1 },
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

export function additionsMastered(c: Child): number {
  let n = 0;
  for (let a = 1; a <= 10; a++)
    for (let b = 1; b <= 10; b++) {
      const t = c.tables[`${a}+${b}`];
      if (t && t.ok >= 2 && t.ok > t.ko * 2) n++;
    }
  return n;
}

/** Seuil de maîtrise : une leçon est validée à partir de 80 % (2 étoiles). */
export const MASTERY = 0.8;

export function starsFor(score: number): number {
  return score >= 0.95 ? 3 : score >= 0.8 ? 2 : score >= 0.6 ? 1 : 0;
}

// Messages d'encouragement : variés, personnels, centrés sur l'effort.
export const PRAISE = {
  mia: ["Bravo ! Tu as trouvé !", "Génial ! 😸", "Super, je te l'avais dit que tu y arriverais !", "Trop bien joué !", "Tu brilles comme une étoile !"],
  neo: ["Défi réussi !", "Excellent, c'est vérifié !", "Bien joué, défi relevé !", "Parfait, on continue ?", "Ça marche vraiment !"],
  zero: ["Wouah ! Même moi je n'aurais pas trouvé ! 😳", "C'est juste ! …Je le savais. C'est évident.", "INCROYABLE ! 🤯"],
};
export const ENCOURAGE = {
  mia: ["Pas grave ! Et si on essayait autrement ?", "Presque ! Regarde bien l'indice.", "Une erreur, c'est ton cerveau qui grandit !"],
  neo: ["Attends, vérifions ensemble !", "On recommence calmement : relis l'énoncé.", "Même les plus grands savants se trompent. Réessaie !"],
  zero: ["Moi aussi je me trompe tout le temps ! On réessaie ?", "Hmm… ce n'est pas ça. Mais ce n'était pas zéro non plus ! 😄"],
};
export const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
