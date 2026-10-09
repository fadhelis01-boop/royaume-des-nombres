// Types du contenu (produit par scripts/build-content.mjs à partir de content-src/*.yaml)
// et de la progression des enfants.

export type Who = "mia" | "neo" | "zero" | "narrateur" | "nuage" | "ixe" | "enfant" | "gribouille" | "neutre" | "acidia" | "gravis" | "seve" | "uranie" | "resonance" | "pinceau";
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
  type: "nombre" | "qcm" | "vf" | "comparer" | "liste" | "expression" | "ordre" | "droite" | "texte" | "champs" | "blocs" | "partage" | "sauts" | "colorier" | "horloge" | "payer" | "mot" | "dictee" | "surligner" | "classer" | "relier" | "libre";
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
  /** Erreurs fréquentes : si l'enfant répond `valeur`, on lui explique précisément son erreur. */
  erreurs?: { valeur: string; message: string }[];
  /** QCM : une explication par choix (alignée sur `choix`, la 1ʳᵉ = bonne réponse). */
  explications?: string[];
  // manipulation
  total?: string;
  parts?: string;
  depart?: string;
  sauts_permis?: number[];
  n?: string;
  d?: string;
  h?: string;
  m?: string;
  pieces?: number[];
  emoji?: string;
  dessin?: "disque" | "barre";
  clavier?: "nombre" | "algebre" | "texte";
  // français
  /** dictée : le texte lu à voix haute et à écrire */
  dictee?: string;
  /** surligner : la phrase, les mots à toucher entre crochets « Le [chat] dort. » */
  phrase?: string;
  /** classer : les catégories et les mots [mot, n° de catégorie] */
  categories?: string[];
  mots?: [string, number | string][];
  /** relier : les paires [gauche, droite] à associer */
  paires?: [string, string][];
  /** libre (rappel libre) : les idées attendues, chacune avec ses variantes acceptées */
  cles?: string[][];
  /** libre : la réponse modèle montrée après coup */
  modele?: string;
  /** libre : nombre d'idées à retrouver pour réussir (par défaut, la moitié) */
  min_cles?: number;
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
  | { kind: "question"; ex: ExSpec; auto?: boolean }
  | { kind: "explique"; texte: string; qui: Who; choix: { texte: string; ok: boolean; retour: string }[] }
  | { kind: "vraie_vie"; texte: string; titre: string; materiel?: string }
  | { kind: "histoire"; texte: string; titre?: string }
  /** expérience à faire pour de vrai : vert = seul, orange = avec un adulte, rouge = à regarder seulement (jamais à la maison) */
  | { kind: "experience"; titre: string; securite: "vert" | "orange" | "rouge"; materiel: string[]; etapes: string[]; prediction?: { question: string; choix: string[] }; observation: string; explication: string }
  /** dessin pas à pas : chaque étape ajoute des tracés guides (chemins SVG dans un carré 0–100) */
  | { kind: "dessin"; titre: string; etapes: { consigne: string; trace: string; couche?: string }[]; miroir?: boolean };

export interface Lesson {
  id: string;
  titre: string;
  objectif: string;
  duree: number;
  etapes: Step[];
  exercices: ExSpec[];
  nb_defi: number;
  mots?: string[];
  /** « Explique-moi autrement » : une image de la vie et un schéma propres à la leçon (facultatif). */
  autrement?: { texte?: string; visuel?: VisSpec; legende?: string; qui?: Who };
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
  /** la planète (matière) : maths, francais, chimie… — voir content-src/_planetes.yaml */
  matiere: Matiere;
}
export type Matiere = string;

export type FoeSprite = "nuage" | "ixe" | "oubli" | "gribouille" | "tache" | "neutre";
export interface Gardien {
  sprite: FoeSprite;
  nom: string;
  qui: Who;
  ouverture: string;
  cri: string;
  aie: string[];
  nargue: string[];
  jeton: string;
}
export interface Planete {
  id: string;
  famille: string;
  titre: string;
  matiere: string;
  emoji: string;
  couleur: string;
  accroche: string;
  prologue: { id: string; titre: string; appel: string };
  objet: { emoji: string; un: string; des: string };
  echauffement: string;
  astuces: string;
  liens: { texte: string; vers: string }[];
  jeux: string[];
  gardiens: Partial<Record<"graines" | "explorateurs" | "maitres", Gardien>>;
}
export interface Famille {
  id: string;
  titre: string;
  emoji: string;
  accroche: string;
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
  /** une histoire par planète (clé = id de la planète) */
  histoires: Record<string, Histoire>;
  planetes: Planete[];
  familles: Famille[];
  dicoCount?: number;
  /** textes de lecture chronométrée (fluence) */
  fluence?: TexteFluence[];
}

export interface TexteFluence {
  id: string;
  niveau: "CP" | "CE1" | "CE2" | "CM";
  titre: string;
  texte: string;
}
/** une lecture chronométrée : mots correctement lus par minute (MCLM) */
export interface EssaiFluence {
  at: number;
  texte: string;
  niveau: string;
  prepare: boolean;
  /** mots lus (jusqu'au dernier mot atteint) */
  lus: number;
  erreurs: number;
  secondes: number;
  mclm: number;
  /** auto-évaluation de la lecture à voix haute (points respectés, ton, groupes de mots) */
  prosodie?: number[];
}


export interface Choix {
  qui: Who;
  question: string;
  options: { texte: string; suite: Line[] }[];
}
export interface Chapitre {
  titre: string;
  objet: string;
  avant: Line[];
  apres: Line[];
  choix?: Choix;
}
export interface Histoire {
  prologue: Line[];
  prologueChoix?: Choix;
  arcs: { id: string; titre: string; sousTitre?: string; final: string; fin: Line[] }[];
  chapitres: Record<string, Chapitre>;
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
  /** lectures chronométrées (fluence), les plus récentes d'abord */
  fluence?: EssaiFluence[];

  skills: Record<string, { ok: number; ko: number }>; // par leçon
  mistakes: { key: string; q: string; given: string; expected: string; at: number }[];
  games: Record<string, number>; // meilleurs scores
  tables: Record<string, { ok: number; ko: number }>; // « 7x8 »
  diag?: { at: number; validated: string[] };
  enigmes: string[];
  validatedWorlds: string[]; // validés par le test de positionnement
  daily?: { day: string; done: boolean };
  quetes?: { day: string; base: Record<string, number>; faites: string[] }; // quêtes du jour
  album?: string[]; // habitants libérés (album à compléter)
  counters: Record<string, number>; // ok, ko, comeback, perfect, ask, compte, revision, zero, invente…
  inventions: { at: number; calcul: string; histoire: string }[];
  crystals: string[]; // mondes dont le cristal est rallumé (Défi du Gardien réussi)
  story: Record<string, number>; // scènes de l'aventure déjà vues (id → date)
  vraieVie: string[]; // défis « vraie vie » réalisés
  gems: number; // monnaie du jeu, gagnée en apprenant (jamais achetée)
  owned: string[]; // objets de la boutique possédés
  equipped: Partial<Record<"chapeau" | "lunettes" | "cou" | "compagnon" | "cadre", string>>;
  cabane: (string | null)[]; // 9 emplacements de la cabane
  lecteur: "oui" | "non"; // « non » : mode « je ne lis pas encore » (tout en voix et pictogrammes)
  abandons: Record<string, number>; // leçons / défis quittés en cours de route (pour les parents)
  sessions: { day: string; start: number; min: number; q: number }[]; // séances récentes
  recordsJeux: Record<string, number>; // niveaux atteints dans les mini-jeux
  matiere: Matiere; // royaume affiché sur la carte
  carnet: string[]; // mots découverts (dictionnaire) : la collection de l'enfant
  /** surprise du jour (coffre, comète, visiteur…) */
  surprise?: { day: string; base: number; ouvert: boolean; recompense?: string };
  /** dernière modification (ms) : sert à fusionner deux appareils */

  majAt?: number;
  /** dernière activité, pour « Reprendre là où je m'étais arrêté » */
  derniere?: { route: string; label: string; at: number };
}


export interface Settings {
  pin: string;
  apiKey: string;
  model: string;
  voices: Partial<Record<Who, string>>;
  rate: number;
  autoRead: boolean;
  sounds: boolean;
  music: boolean;
  fontScale: number;
  dys: boolean;
  reduceMotion: boolean;
  unlockAll: boolean;
  dailyLimit: number; // minutes, 0 = pas de limite
  aiDailyLimit: number; // questions à l'assistant IA par jour et par enfant, 0 = pas de limite
  sonsVisibles?: boolean; // chaque son est aussi dessiné (enfants sourds ou malentendants)
  lastBackup: number; // date de la dernière sauvegarde téléchargée (ms), 0 = jamais
  theme: "clair" | "sombre" | "auto";
  /** habillage : auto (selon l'âge), enchantée (petits), épurée (plus grands), calme (sans animation) */
  ambiance?: "auto" | "enchantee" | "epuree" | "calme";

}
