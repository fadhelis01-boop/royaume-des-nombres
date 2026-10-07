// Types du contenu (produit par scripts/build-content.mjs à partir de content-src/*.yaml)
// et de la progression des enfants.

export type Who = "mia" | "neo" | "zero" | "narrateur" | "nuage" | "ixe" | "enfant";
export interface Line {
  who: Who;
  text: string;
  humeur?: "reflexion" | "joie" | "surprise" | "triste" | "fier";
}

export type Cycle = "graines" | "explorateurs" | "maitres" | "astuces";

/** Visuels dessinés par l'application (SVG) — voir components/Visuel.tsx */
export type VisSpec = { type: string; [k: string]: unknown };

export interface ExSpec {
  id?: string;
  type: "nombre" | "qcm" | "vf" | "comparer" | "liste" | "expression" | "ordre" | "droite" | "texte" | "champs";
  vars?: Record<string, unknown>;
  si?: string;
  enonce: string;
  visuel?: VisSpec;
  reponse?: unknown;
  choix?: string[];
  ordre_fixe?: boolean;
  items?: string[];
  champs?: { avant?: string; reponse: string; apres?: string }[];
  gauche?: string;
  droite?: string;
  gauche_affiche?: string;
  droite_affiche?: string;
  variables?: string[];
  calcul?: boolean;
  forme?: "fraction" | "irreductible" | "entier" | "developpee" | "factorisee" | "reduite";
  unite?: string;
  tolerance?: number;
  min?: number | string;
  max?: number | string;
  pas?: number | string;
  cible?: string;
  cible_affiche?: string;
  indice?: string;
  correction?: string;
  niveau?: 1 | 2 | 3;
  clavier?: "nombre" | "algebre" | "texte";
}

export type Step =
  | { kind: "dialogue"; lines: Line[] }
  | { kind: "texte"; titre?: string; texte: string }
  | { kind: "visuel"; visuel: VisSpec; legende?: string }
  | { kind: "a_quoi_ca_sert"; texte: string }
  | { kind: "astuce"; texte: string; qui?: Who }
  | { kind: "attention"; texte: string; qui?: Who }
  | { kind: "retiens"; texte: string }
  | { kind: "exemple"; titre?: string; enonce: string; etapes: string[]; reponse?: string; visuel?: VisSpec }
  | { kind: "question"; ex: ExSpec }
  | { kind: "histoire"; texte: string; titre?: string };

export interface Lesson {
  id: string;
  titre: string;
  objectif: string;
  duree: number;
  etapes: Step[];
  exercices: ExSpec[];
  nb_defi: number;
  mots?: string[];
}

export interface World {
  id: string;
  titre: string;
  sousTitre?: string;
  emoji: string;
  couleur: string;
  decor?: string;
  cycle: Cycle;
  age: string;
  niveau: string;
  ordre: number;
  prerequis: string[];
  intro?: Line[];
  lecons: Lesson[];
  version: string;
  source?: "integre" | "importe";
}

export interface GlossEntry {
  mot: string;
  def: string;
  exemple?: string;
  source?: string;
  monde?: string;
}

export interface Enigme {
  id: string;
  niveau: 1 | 2 | 3;
  titre: string;
  texte: string;
  reponse: string; // valeur acceptée (nombre ou mot)
  indice?: string;
  solution: string;
}

export interface DiagQuestion {
  monde: string; // monde validé si la question est réussie
  ex: ExSpec;
}

export interface Manifest {
  version: string;
  updatedAt: string;
  worlds: { id: string; file: string; version: string; titre: string }[];
  glossaire: GlossEntry[];
  enigmes: Enigme[];
  diagnostic: DiagQuestion[];
  jeux: Record<string, { titre: string; niveau: string; exercices: ExSpec[] }>;
  changelog: { version: string; date: string; notes: string[] }[];
}

// ---------- Progression ----------
export interface LessonProgress {
  step: number; // étape où l'enfant s'est arrêté (reprise)
  done: boolean;
  stars: number; // 0 à 3
  best: number; // meilleur score au défi (0–1)
  attempts: number;
  lastAt: number;
}

export interface SrsCard {
  key: string; // monde/lecon
  box: number; // boîte de Leitner 1–5
  due: number; // jour (n° de jour) de la prochaine révision
}

export interface Child {
  id: string;
  name: string;
  avatar: "mia" | "neo" | "zero";
  age: number;
  createdAt: number;
  xp: number;
  stars: number;
  streak: number;
  bestStreak: number;
  lastDay: string;
  days: Record<string, { min: number; xp: number; ok: number; ko: number }>;
  badges: string[];
  progress: Record<string, LessonProgress>;
  srs: Record<string, SrsCard>;
  skills: Record<string, { ok: number; ko: number }>; // par leçon
  mistakes: { key: string; q: string; given: string; expected: string; at: number }[];
  games: Record<string, number>; // meilleurs scores
  tables: Record<string, { ok: number; ko: number }>; // « 7x8 »
  diag?: { at: number; validated: string[] };
  enigmes: string[];
  validatedWorlds: string[]; // validés par le test de positionnement
  daily?: { day: string; done: boolean };
  counters: Record<string, number>; // ok, ko, comeback, perfect, ask, compte, revision, zero, invente…
  inventions: { at: number; calcul: string; histoire: string }[];
  crystals: string[]; // mondes dont le cristal est rallumé (Défi du Gardien réussi)
  story: Record<string, number>; // scènes de l'aventure déjà vues (id → date)
  vraieVie: string[]; // défis « vraie vie » réalisés
}

export interface Settings {
  pin: string;
  apiKey: string;
  model: string;
  voices: Partial<Record<Who, string>>;
  rate: number;
  autoRead: boolean;
  sounds: boolean;
  fontScale: number;
  dys: boolean;
  reduceMotion: boolean;
  unlockAll: boolean;
  dailyLimit: number; // minutes, 0 = pas de limite
  theme: "clair" | "sombre" | "auto";
}
