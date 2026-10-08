// Morphologie du nom et de l'adjectif : pluriel, féminin, accord, déterminants avec élision.
// Règles + listes d'exceptions apprises à l'école (les 7 noms en -ou, les -al en -als, les -ail en -aux…).

const VOY = /^[aeiouyâàäéèêëîïôöûùüœæ]/i;
// noms commençant par un h aspiré : pas d'élision (le héros, la hache)
export const H_ASPIRE_NOMS = new Set(["héros", "hibou", "haricot", "hache", "haie", "hamac", "hamster", "hanche", "handicap", "hangar", "hareng", "haricot", "harpe", "hasard", "hausse", "haut", "hauteur", "hérisson", "hêtre", "hibou", "hockey", "homard", "honte", "hotte", "houx", "huit", "huitième", "hurlement", "hutte", "hall", "halte", "hublot"]);

const PLURIEL_IRREG: Record<string, string> = {
  œil: "yeux", ciel: "cieux", aïeul: "aïeux", monsieur: "messieurs", madame: "mesdames", mademoiselle: "mesdemoiselles", bonhomme: "bonshommes", gentilhomme: "gentilshommes",
};
const AL_S = new Set(["bal", "carnaval", "chacal", "festival", "récital", "régal", "cal", "cérémonial", "pal", "val", "narval", "étal"]);
const AIL_AUX = new Set(["bail", "corail", "émail", "soupirail", "travail", "vitrail", "vantail"]);
const OU_X = new Set(["bijou", "caillou", "chou", "genou", "hibou", "joujou", "pou"]);
const EU_S = new Set(["pneu", "bleu", "émeu", "lieu_poisson"]);
const AU_S = new Set(["landau", "sarrau"]);

/** Pluriel d'un nom (règles de l'école primaire et leurs exceptions). */
export function pluriel(nom: string): string {
  const n = nom.trim();
  const low = n.toLowerCase();
  if (PLURIEL_IRREG[low]) return PLURIEL_IRREG[low];
  if (/[sxz]$/.test(low)) return n;
  if (/al$/.test(low)) return AL_S.has(low) ? n + "s" : n.slice(0, -2) + "aux";
  if (/ail$/.test(low)) return AIL_AUX.has(low) ? n.slice(0, -3) + "aux" : n + "s";
  if (/ou$/.test(low)) return OU_X.has(low) ? n + "x" : n + "s";
  if (/(au|eau)$/.test(low)) return AU_S.has(low) ? n + "s" : n + "x";
  if (/eu$/.test(low)) return EU_S.has(low) ? n + "s" : n + "x";
  return n + "s";
}

const FEM_IRREG: Record<string, string> = {
  beau: "belle", nouveau: "nouvelle", fou: "folle", mou: "molle", vieux: "vieille", jumeau: "jumelle",
  doux: "douce", faux: "fausse", roux: "rousse", gentil: "gentille", nul: "nulle", gros: "grosse", bas: "basse", gras: "grasse", las: "lasse",
  épais: "épaisse", frais: "fraîche", malin: "maligne", bénin: "bénigne", favori: "favorite", coi: "coite", aigu: "aiguë", ambigu: "ambiguë", exigu: "exiguë",
  blanc: "blanche", franc: "franche", sec: "sèche", public: "publique", grec: "grecque", turc: "turque", caduc: "caduque", long: "longue",
  sot: "sotte", pâlot: "pâlotte", vieillot: "vieillotte", fat: "fate",
  complet: "complète", incomplet: "incomplète", concret: "concrète", discret: "discrète", indiscret: "indiscrète", inquiet: "inquiète", secret: "secrète", désuet: "désuète", replet: "replète",
  meilleur: "meilleure", supérieur: "supérieure", inférieur: "inférieure", intérieur: "intérieure", extérieur: "extérieure", majeur: "majeure", mineur: "mineure",
  antérieur: "antérieure", postérieur: "postérieure", ultérieur: "ultérieure",
  enchanteur: "enchanteresse", vengeur: "vengeresse",
  chou: "choute", andalou: "andalouse", menteur: "menteuse", porteur: "porteuse", acheteur: "acheteuse",
};
const TEUR_TRICE = /(at|ct|it|ut|ec|ent)eur$/; // créateur, acteur, éditeur, protecteur, inventeur → -trice (selon un usage fréquent)

/** Féminin d'un adjectif (ou d'un nom de métier / d'animal simple). */
export function feminin(adj: string): string {
  const a = adj.trim();
  const low = a.toLowerCase();
  if (FEM_IRREG[low]) return FEM_IRREG[low];
  if (/e$/.test(low) && !/é$/.test(low)) return a; // jeune, rapide (mais joli → jolie, aimé → aimée)
  if (/er$/.test(low)) return a.slice(0, -2) + "ère";
  if (/eux$/.test(low)) return a.slice(0, -1) + "se";
  if (/teur$/.test(low) && TEUR_TRICE.test(low)) return a.slice(0, -3) + "rice";
  if (/eur$/.test(low)) return a.slice(0, -1) + "se"; // menteur → menteuse, chanteur → chanteuse
  if (/f$/.test(low)) return a.slice(0, -1) + "ve";
  if (/(el|eil|ul)$/.test(low)) return a + a.slice(-1) + "e";
  if (/(en|on)$/.test(low)) return a + "ne";
  if (/et$/.test(low)) return a + "te";
  if (/x$/.test(low)) return a.slice(0, -1) + "se";
  return a + "e";
}

const ADJ_AL_S = new Set(["banal", "bancal", "fatal", "final", "natal", "naval", "glacial", "tonal"]);
// adjectifs de couleur issus d'un nom : invariables (sauf rose, mauve, fauve, pourpre, écarlate, incarnat qui s'accordent)
const COULEURS_INVARIABLES = new Set(["marron", "orange", "crème", "noisette", "olive", "kaki", "turquoise", "abricot", "cerise", "citron", "émeraude", "saumon", "chocolat", "argent", "ivoire", "ocre", "paille", "prune", "sable", "lavande", "framboise", "corail"]);

/** Pluriel d'un adjectif déjà au bon genre (beau → beaux, national → nationaux, banal → banals). */
export function plurielAdj(adj: string): string {
  const a = adj.trim();
  const low = a.toLowerCase();
  if (COULEURS_INVARIABLES.has(low)) return a;
  if (/[sx]$/.test(low)) return a;
  if (/al$/.test(low)) return ADJ_AL_S.has(low) ? a + "s" : a.slice(0, -2) + "aux";
  if (/eau$/.test(low)) return a + "x";
  return a + "s";
}

/** Accord d'un adjectif : genre "m" | "f", nombre 1 | 2. */
export function accorder(adj: string, genre: "m" | "f", nombre: 1 | 2): string {
  const low = adj.trim().toLowerCase();
  if (COULEURS_INVARIABLES.has(low)) return adj;
  const g = genre === "f" ? feminin(adj) : adj;
  return nombre === 2 ? (genre === "f" ? g + (/s$/.test(g) ? "" : "s") : plurielAdj(g)) : g;
}

export type TypeDet = "defini" | "indefini" | "partitif" | "demonstratif" | "possessif1" | "possessif2" | "possessif3";

/** Déterminant + nom, avec élision (l'arbre, de l'eau, cet arbre) ; hAspire force l'absence d'élision. */
export function determinant(type: TypeDet, nom: string, genre: "m" | "f", nombre: 1 | 2, hAspire?: boolean): string {
  const low = nom.trim().toLowerCase();
  const asp = hAspire ?? (low.startsWith("h") && H_ASPIRE_NOMS.has(low.replace(/s$/, "")));
  // h muet : on élide comme devant une voyelle (l'hiver, l'hippopotame), sauf h aspiré (le héros)
  const voy = (VOY.test(low) || low.startsWith("h")) && !asp;
  const pl = nombre === 2;
  let d: string;
  switch (type) {
    case "defini":
      d = pl ? "les" : voy ? "l'" : genre === "f" ? "la" : "le";
      break;
    case "indefini":
      d = pl ? "des" : genre === "f" ? "une" : "un";
      break;
    case "partitif":
      d = pl ? "des" : voy ? "de l'" : genre === "f" ? "de la" : "du";
      break;
    case "demonstratif":
      d = pl ? "ces" : genre === "f" ? "cette" : voy ? "cet" : "ce";
      break;
    case "possessif1":
      d = pl ? "mes" : genre === "f" && !voy ? "ma" : "mon";
      break;
    case "possessif2":
      d = pl ? "tes" : genre === "f" && !voy ? "ta" : "ton";
      break;
    case "possessif3":
      d = pl ? "ses" : genre === "f" && !voy ? "sa" : "son";
      break;
  }
  return d.endsWith("'") ? d + nom : d + " " + nom;
}

/** Élision simple pour les gabarits : « le » + « arbre » → « l'arbre », « de » + « eau » → « d'eau », « que » + « il » → « qu'il ». */
export function elision(mot: string, suivant: string): string {
  const low = suivant.trim().toLowerCase();
  const voy = (VOY.test(low) || low.startsWith("h")) && !(low.startsWith("h") && H_ASPIRE_NOMS.has(low));
  if (voy && /^(le|la|de|je|me|te|se|ne|que|ce|jusque|lorsque|puisque)$/i.test(mot)) return (mot === "ce" ? "c" : mot.slice(0, -1)) + "'" + suivant;
  return mot + " " + suivant;
}

/** Comparaison orthographique stricte (accents compris), tolérante sur la casse, les espaces et les apostrophes typographiques. */
export function normOrtho(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[’ʼ`´]/g, "'")
    .replace(/\s*'\s*/g, "'")
    .replace(/[«»"“”.!?;:,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Variantes acceptées par les rectifications orthographiques de 1990 (en plus de la graphie traditionnelle). */
export function variantes1990(mot: string): string[] {
  const out = new Set<string>([mot]);
  // accent circonflexe facultatif sur i et u (sauf distinctions : dû, mûr, sûr, jeûne, croît)
  const sans = mot.replace(/î/g, "i").replace(/û/g, "u");
  if (!/^(dû|mûr|mûre|mûrs|mûres|sûr|sûre|sûrs|sûres|jeûne|croît)$/.test(mot)) out.add(sans);
  // événement → évènement, céderai → cèderai, réglementaire → règlementaire
  out.add(mot.replace(/^événement/, "évènement"));
  out.add(mot.replace(/ognon/, "oignon").replace(/oignon/, "ognon"));
  out.add(mot.replace(/nénuphar/, "nénufar"));
  out.add(mot.replace(/aiguë/, "aigüe").replace(/ambiguë/, "ambigüe"));
  return [...out];
}
