// Boutique du Royaume : on dépense les gemmes gagnées en apprenant.
// Règles éthiques : rien ne s'achète avec de l'argent réel, pas de coffre au hasard,
// tout est visible avec son prix, rien ne disparaît si on ne revient pas.
// Les objets sont des émojis en attendant les illustrations (voir le cahier des charges).

export type Slot = "chapeau" | "lunettes" | "cou" | "compagnon" | "cadre";
export type Cat = Slot | "cabane";

export interface Item {
  id: string;
  nom: string;
  emoji: string;
  cat: Cat;
  prix: number;
  /** couleur d'un cadre d'avatar */
  couleur?: string;
}

export const ITEMS: Item[] = [
  // Chapeaux
  { id: "noeud", nom: "Nœud", emoji: "🎀", cat: "chapeau", prix: 15 },
  { id: "casquette", nom: "Casquette", emoji: "🧢", cat: "chapeau", prix: 20 },
  { id: "bonnet", nom: "Bonnet chaud", emoji: "🎅", cat: "chapeau", prix: 25 },
  { id: "chapeau-haut", nom: "Chapeau de magicien", emoji: "🎩", cat: "chapeau", prix: 40 },
  { id: "chapeau-sorcier", nom: "Chapeau pointu", emoji: "🧙", cat: "chapeau", prix: 60 },
  { id: "couronne", nom: "Couronne", emoji: "👑", cat: "chapeau", prix: 120 },
  // Lunettes
  { id: "lunettes", nom: "Lunettes rondes", emoji: "👓", cat: "lunettes", prix: 20 },
  { id: "lunettes-soleil", nom: "Lunettes de soleil", emoji: "🕶️", cat: "lunettes", prix: 30 },
  { id: "monocle", nom: "Monocle de savant", emoji: "🧐", cat: "lunettes", prix: 50 },
  // Cou et dos
  { id: "echarpe", nom: "Écharpe", emoji: "🧣", cat: "cou", prix: 20 },
  { id: "medaille", nom: "Médaille", emoji: "🏅", cat: "cou", prix: 45 },
  { id: "cape", nom: "Cape de héros", emoji: "🦸", cat: "cou", prix: 80 },
  // Compagnons
  { id: "poussin", nom: "Poussin", emoji: "🐥", cat: "compagnon", prix: 30 },
  { id: "escargot", nom: "Escargot spirale", emoji: "🐌", cat: "compagnon", prix: 35 },
  { id: "etoile", nom: "Petite étoile", emoji: "🌟", cat: "compagnon", prix: 50 },
  { id: "nuage", nom: "Nuage miniature", emoji: "☁️", cat: "compagnon", prix: 70 },
  { id: "dragon", nom: "Bébé dragon", emoji: "🐉", cat: "compagnon", prix: 150 },
  // Cadres d'avatar
  { id: "cadre-violet", nom: "Cadre violet", emoji: "🟣", cat: "cadre", prix: 10, couleur: "#8b3fd9" },
  { id: "cadre-orange", nom: "Cadre orange", emoji: "🟠", cat: "cadre", prix: 10, couleur: "#ff8a1f" },
  { id: "cadre-vert", nom: "Cadre vert", emoji: "🟢", cat: "cadre", prix: 10, couleur: "#2e9e5b" },
  { id: "cadre-or", nom: "Cadre doré", emoji: "🟡", cat: "cadre", prix: 60, couleur: "#e8b100" },
  // Cabane
  { id: "tapis", nom: "Tapis", emoji: "🟫", cat: "cabane", prix: 10 },
  { id: "plante", nom: "Plante", emoji: "🪴", cat: "cabane", prix: 15 },
  { id: "lampe", nom: "Lampe", emoji: "🪔", cat: "cabane", prix: 20 },
  { id: "livres", nom: "Étagère de livres", emoji: "📚", cat: "cabane", prix: 25 },
  { id: "tableau", nom: "Tableau à craie", emoji: "🖼️", cat: "cabane", prix: 25 },
  { id: "guirlande", nom: "Guirlande", emoji: "🎏", cat: "cabane", prix: 30 },
  { id: "aquarium", nom: "Aquarium", emoji: "🐠", cat: "cabane", prix: 45 },
  { id: "hamac", nom: "Hamac", emoji: "🛏️", cat: "cabane", prix: 50 },
  { id: "telescope", nom: "Télescope", emoji: "🔭", cat: "cabane", prix: 70 },
  { id: "globe", nom: "Globe", emoji: "🌍", cat: "cabane", prix: 60 },
  { id: "piano", nom: "Piano", emoji: "🎹", cat: "cabane", prix: 90 },
  { id: "fusee", nom: "Maquette de fusée", emoji: "🚀", cat: "cabane", prix: 110 },
];

export const itemById = (id?: string) => ITEMS.find((i) => i.id === id);

export const CAT_LABEL: Record<Cat, string> = {
  chapeau: "🎩 Chapeaux",
  lunettes: "👓 Lunettes",
  cou: "🧣 Cou et dos",
  compagnon: "🐥 Compagnons",
  cadre: "🖼️ Cadres",
  cabane: "🏡 Pour ma cabane",
};

/** Points d'ancrage des accessoires sur chaque mascotte (en % de la boîte carrée). */
export const ANCHORS: Record<"mia" | "neo" | "zero", Record<"chapeau" | "lunettes" | "cou", [number, number, number]>> = {
  mia: { chapeau: [47, 12, 0.36], lunettes: [47, 34, 0.3], cou: [47, 44, 0.22] },
  neo: { chapeau: [47, 13, 0.32], lunettes: [47, 33, 0.26], cou: [47, 45, 0.22] },
  zero: { chapeau: [50, 16, 0.34], lunettes: [50, 36, 0.32], cou: [50, 48, 0.24] },
};
