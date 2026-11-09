// Transforme un texte de cours (Markdown + formules LaTeX + symboles) en texte
// prononçable par la synthèse vocale : « 3 × 4 = 12 » → « 3 fois 4 égale 12 »,
// « $\frac{3}{4}$ » → « 3 quarts », « x² » → « x au carré »…
import { enLettres } from "./expr";

const DENOMS: Record<number, [string, string]> = {
  2: ["demi", "demis"],
  3: ["tiers", "tiers"],
  4: ["quart", "quarts"],
  5: ["cinquième", "cinquièmes"],
  6: ["sixième", "sixièmes"],
  7: ["septième", "septièmes"],
  8: ["huitième", "huitièmes"],
  9: ["neuvième", "neuvièmes"],
  10: ["dixième", "dixièmes"],
  12: ["douzième", "douzièmes"],
  100: ["centième", "centièmes"],
  1000: ["millième", "millièmes"],
};

function fracWords(n: string, d: string): string {
  const N = Number(n),
    D = Number(d);
  if (Number.isInteger(N) && DENOMS[D] && /^\d+$/.test(n)) return `${n} ${DENOMS[D][N >= 2 ? 1 : 0]}`;
  return `${n} sur ${d}`;
}


// Émojis « objets » qui portent du sens dans une consigne (« Y a-t-il plus de 🍓 ou de 🍌 ? ») : on les nomme.
// Les autres (✍️ 🧠 💡 🔗…) sont décoratifs et restent muets.
const EMOJI_MOTS: Record<string, [string, string]> = {
  "🍓": ["fraise", "fraises"], "🍎": ["pomme", "pommes"], "🍌": ["banane", "bananes"], "🍇": ["raisin", "raisins"],
  "🍒": ["cerise", "cerises"], "🍋": ["citron", "citrons"], "🍪": ["gâteau", "gâteaux"], "🐟": ["poisson", "poissons"],
  "🐶": ["chien", "chiens"], "🐱": ["chat", "chats"], "🐦": ["oiseau", "oiseaux"], "🐭": ["souris", "souris"],
  "🐴": ["cheval", "chevaux"], "🦆": ["canard", "canards"], "🐷": ["cochon", "cochons"], "🐮": ["vache", "vaches"],
  "🐰": ["lapin", "lapins"], "🐹": ["hamster", "hamsters"], "🐞": ["coccinelle", "coccinelles"], "⭐": ["étoile", "étoiles"],
  "🌸": ["fleur", "fleurs"], "🚗": ["voiture", "voitures"], "🌳": ["arbre", "arbres"], "🌞": ["soleil", "soleils"],
  "🌧": ["pluie", "pluies"], "❄": ["flocon", "flocons"], "🔺": ["triangle", "triangles"], "🟦": ["carré bleu", "carrés bleus"],
  "🔴": ["rond rouge", "ronds rouges"], "🔵": ["rond bleu", "ronds bleus"], "🟢": ["rond vert", "ronds verts"],
  "🟡": ["rond jaune", "ronds jaunes"], "⚫": ["rond noir", "ronds noirs"], "⚪": ["rond blanc", "ronds blancs"],
  "🟣": ["rond violet", "ronds violets"], "🟤": ["rond marron", "ronds marron"],
};
const RE_EMOJI_MOTS = new RegExp(String.raw`(\bde |\bdes |\bd'|\bles )?((?:${Object.keys(EMOJI_MOTS).join("|")})️?)((?:\s*\2)*)`, "gu");
function emojisEnMots(s: string): string {
  return s.replace(RE_EMOJI_MOTS, (_m, avant: string | undefined, e: string, rep: string, off: number, all: string) => {
    const [un, plus] = EMOJI_MOTS[e.replace(/️/g, "")];
    const n = 1 + (rep ? [...rep.matchAll(new RegExp(e, "gu"))].length : 0);
    // « 🔴 rouge » (liste de couleurs) : la couleur est déjà dite
    const coul = un.split(" ")[1];
    if (coul && all.slice(off + _m.length, off + _m.length + coul.length + 2).trim().startsWith(coul)) return avant ?? " ";
    if (n > 1) return `${avant ?? " "}${n} ${plus} `;
    return avant ? `${avant}${plus} ` : ` ${un} `;
  });
}

/** Chiffres en exposant (« ⁸ » → « 8 »). */
const exposant = (e: string) => e.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String("⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)));
/** Chiffres romains (« XVIII » → 18) ; null si ce n'en est pas un. */
// Petit extrait de code Python entre accents graves (NSI) : on dit les symboles en mots.
export function codeEnMots(c: string): string {
  return c
    .replace(/==/g, " égal à ")
    .replace(/!=/g, " différent de ")
    .replace(/<=/g, " inférieur ou égal à ")
    .replace(/>=/g, " supérieur ou égal à ")
    .replace(/\+=/g, " augmente de ")
    .replace(/-=/g, " diminue de ")
    .replace(/\/\//g, " division entière par ")
    .replace(/\*\*/g, " puissance ")
    .replace(/%/g, " modulo ")
    .replace(/\s=\s/g, " prend la valeur ")
    .replace(/</g, " inférieur à ")
    .replace(/>/g, " supérieur à ")
    .replace(/\*/g, " fois ")
    .replace(/[()\[\]{}:,_."']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function romain(r: string): number | null {
  const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let n = 0;
  for (let i = 0; i < r.length; i++) {
    const a = v[r[i]], b = v[r[i + 1]] ?? 0;
    n += a < b ? -a : a;
  }
  return n > 0 && n < 400 ? n : null;
}
/** « CO₂ » → « C O 2 », « H₂O » → « H 2 O ». */
function formuleChimique(f: string): string {
  return f
    .replace(/[₀-₉]/g, (d) => String("₀₁₂₃₄₅₆₇₈₉".indexOf(d)))
    .split(/(?=[A-Z])|(?<=\D)(?=\d)/)
    .join(" ");
}

// petits mots courants écrits en majuscules pour insister (les sigles comme BD, GN, ADN restent épelés)
// sigles de 4 lettres ou plus qui se disent lettre par lettre (NSI, HGGSP)
const SIGLES_EPELES = new Set(["HTML", "HTTP", "HTTPS", "HGGSP", "TPIR", "ADSL", "URSS"]);
const PETITS_MOTS = new Set(["ET", "OU", "PAS", "QUE", "QUI", "CE", "QU", "ON", "UN", "UNE", "LE", "LA", "LES", "DE", "DES", "DU", "EN", "NE", "SI", "OUI", "NON", "TOUT", "DÉ", "IL", "ELLE", "BY"]);

/** « 1ᵉʳ » → « premier », « 3ᵉ » → « troisième ». */
function ordinal(n: number, fem: boolean): string {
  if (n === 1) return fem ? "première" : "premier";
  const w = enLettres(n).replace(/s$/, "");
  if (/cinq$/.test(w)) return w + "uième";
  if (/neuf$/.test(w)) return w.slice(0, -1) + "vième";
  return w.replace(/e$/, "") + "ième";
}

function latexToSpeech(tex: string): string {
  // tableaux de légendes (« \begin{array}{l} \leftarrow \text{numérateur} \\ … \end{array} ») : on garde les mots
  let s = tex
    .replace(/\\begin\{[a-z*]+\}(\{[^}]*\})?|\\end\{[a-z*]+\}/g, " ")
    .replace(/\\(?:long)?(?:left|right|leftright)arrow/gi, " ")
    .replace(/\\\\/g, ", ")
    // audit « 13-15 ans » : fonctions, norme, f(x)
    .replace(/(\w)\s*:\s*(\w)\s*\\mapsto/g, " $1 qui à $2 associe ")
    .replace(/\\mapsto/g, " associe ")
    .replace(/\\\|\s*\\(?:vec|overrightarrow)\{([^{}]*)\}\s*\\\|/g, " norme du vecteur $1 ")
    .replace(/\\\|/g, " ")
    .replace(/\\[,;:! ]/g, " ");
  for (let i = 0; i < 4; i++) {
    s = s
      .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a, b) => (/^\s*-?\d+\s*$/.test(a) && /^\s*\d+\s*$/.test(b) ? fracWords(a.trim(), b.trim()) : ` ${a} sur ${b} `))
      .replace(/\\sqrt\[(\d)\]\{([^{}]*)\}/g, " racine $1-ième de $2 ")
      .replace(/\\sqrt\{([^{}]*)\}/g, " racine carrée de $1 ")
      .replace(/\\(?:text|mathrm|textbf|mathbf|operatorname)\{([^{}]*)\}/g, " $1 ")
      .replace(/\\overrightarrow\{([^{}]*)\}/g, " vecteur $1 ")
      .replace(/\\vec\{([^{}]*)\}/g, " vecteur $1 ")
      .replace(/\\overline\{([^{}]*)\}/g, " $1 barre ")
      .replace(/\\left|\\right/g, "");
  }
  return s
    .replace(/\^\{?2\}?/g, " au carré ")
    .replace(/\^\{?3\}?/g, " au cube ")
    .replace(/\^\{([^{}]*)\}/g, " puissance $1 ")
    .replace(/\^(-?\w)/g, " puissance $1 ")
    .replace(/_\{([^{}]*)\}/g, " indice $1 ")
    .replace(/_(\w)/g, " $1 ")
    .replace(/\\times/g, " fois ")
    .replace(/\\cdot/g, " fois ")
    .replace(/\\div/g, " divisé par ")
    .replace(/\\leq?|\\leqslant/g, " inférieur ou égal à ")
    .replace(/\\geq?|\\geqslant/g, " supérieur ou égal à ")
    .replace(/\\neq?/g, " différent de ")
    .replace(/\\approx/g, " environ égal à ")
    .replace(/\\%/g, " pour cent ")
    // « a < 0 » dans une formule (audit « 16-18 ans »)
    .replace(/\\lt\b|</g, " inférieur à ")
    .replace(/\\gt\b|>/g, " supérieur à ")
    .replace(/\\perp/g, " est perpendiculaire à ")
    .replace(/\\parallel/g, " est parallèle à ")
    .replace(/\\pi/g, " pi ")
    .replace(/\\infty/g, " l'infini ")
    .replace(/\\in\b/g, " appartient à ")
    .replace(/\\notin/g, " n'appartient pas à ")
    .replace(/\\subset/g, " inclus dans ")
    .replace(/\\cup/g, " union ")
    .replace(/\\cap/g, " inter ")
    .replace(/\\mathbb\{N\}/g, " N ")
    .replace(/\\mathbb\{Z\}/g, " Z ")
    .replace(/\\mathbb\{R\}/g, " R ")
    .replace(/\\mathbb\{C\}/g, " C ")
    .replace(/\\mathbb\{Q\}/g, " Q ")
    .replace(/\\Rightarrow|\\implies/g, " implique ")
    .replace(/\\Leftrightarrow|\\iff/g, " équivaut à ")
    .replace(/\\to|\\rightarrow/g, " tend vers ")
    .replace(/\\lim/g, " limite ")
    .replace(/\\sum/g, " somme ")
    .replace(/\\int/g, " intégrale ")
    .replace(/\\(alpha|beta|gamma|delta|theta|lambda|mu|sigma|omega|Delta)/g, " $1 ")
    .replace(/\\(sin|cos|tan|ln|log|exp)\b/g, " $1 ")
    .replace(/\\[,;:! ]|\\quad|\\qquad/g, " ")
    .replace(/\{,\}/g, ",")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/&/g, " ");
}

export function toSpeech(md: string): string {
  let s = emojisEnMots(md)
    // écriture inclusive éventuelle (contenus importés) : « fort·e » → « fort »
    .replace(/\bN·m\b/g, " newton-mètres ")
    .replace(/([A-Za-zÀ-ÿ])·[a-zà-ÿ]+(·[a-z]+)?/g, "$1")
    // formules
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => ` ${latexToSpeech(t)} `)
    .replace(/\$([^$]+?)\$/g, (_, t) => ` ${latexToSpeech(t)} `)
    // un signe cité seul (« le signe **<** ») : on dit son nom
    .replace(/(signe\s*)?\*\*([<>=])\*\*/g, (_m, sg, c) => `${sg ?? "le signe "}« ${c === "<" ? "plus petit que" : c === ">" ? "plus grand que" : "égal"} »`)
    // code entre accents graves
    .replace(/`([^`\n]+)`/g, (_, c) => ` ${codeEnMots(c)} `)
    // Markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?\s*[-:|\s]+\|\s*$/gm, "") // ligne de séparation des tableaux
    .replace(/\|/g, ", ")
    .replace(/[*_`#>]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    // le nombre cherché dans un calcul : « 3 × ? = 12 » → « 3 fois combien égale 12 »
    .replace(/([=+×÷−-]\s*)\?|\?(\s*[=+×÷−-])/g, (_m, a, b) => (a ? `${a} combien ` : ` combien ${b}`))
    // ordinaux
    .replace(/(\d+)\s?(ʳᵉ|ᵉʳ|ᵉ|ème|e)(?![a-zà-ÿ])/g, (m, n, suf) => (suf === "e" && Number(n) !== 1 && !/ᵉ/.test(m) ? m : ` ${ordinal(Number(n), suf === "ʳᵉ")} `))
    // notations du lycée (audit « 13-15 ans ») : ions, exposants, triangles et points, f(x), signes entre parenthèses
    .replace(/((?:[A-Z][a-z]?)+)([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻])/g, (_m, el, ch, sg) => ` ${el.split(/(?=[A-Z])/).map((x: string) => x.split("").join(" ")).join(" ")} ${ch ? exposant(ch) + " " : ""}${sg === "⁺" ? "plus" : "moins"} `)
    .replace(/(\d)(⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]{2,}|⁻[⁰¹²³⁴⁵⁶⁷⁸⁹]+|[⁰¹⁴⁵⁶⁷⁸⁹])/g, (_m, d, e) => `${d} puissance ${e.startsWith("⁻") ? "moins " : ""}${exposant(e.replace("⁻", ""))}`)
    .replace(/↦/g, " associe ")
    .replace(/Δ\s?([A-Z]{3})\b/g, (_m, t) => ` le triangle ${t.split("").join(" ")} `)
    .replace(/\b(triangles?|quadrilatères?|carrés?|rectangles?|parallélogrammes?|losanges?|trapèzes?|segments?|droites?|demi-droites?|points?|vecteurs?|polygones?|angles?|côtés?|repères?)(\s+(?:\[|\()?)([A-Z]{2,5})\b/g, (_m, mot, sep, p) => `${mot}${sep}${p.split("").join(" ")}`)
    .replace(/\b([fgh])\(([a-z0-9]+)\)/g, "$1 de $2")
    .replace(/\(\s*<\s*/g, "(moins de ")
    .replace(/\(\s*>\s*/g, "(plus de ")
    .replace(/\bvecteurs?\s+(vecteur\b)/g, "$1")
    // chromosomes XX / XY épelés, mais pas un siècle « XXᵉ »
    .replace(/\bX([XY])\b(?!ᵉ|ème|e\s+siècle)/g, "X $1")
    // notations des grands (audit « 9-12 ans »)
    .replace(/(?<![A-Za-z])((?:[A-Z][a-z]?[₀-₉]*)+)(?![A-Za-z])/g, (m) => (/[₀-₉]/.test(m) ? ` ${formuleChimique(m)} ` : m))
    .replace(/\bIer\b/g, "premier")
    .replace(/\b([IVXLC]+)(ᵉʳ|ᵉ|ème)(?![a-zà-ÿ])/g, (m, r) => {
      const n = romain(r);
      return n ? ` ${ordinal(n, false)} ` : m;
    })
    .replace(/\b(chapitre|siècle|tome|acte|partie|Louis|Henri|Charles|François|Napoléon|Philippe|Jean|Pie|Léon)\s+([IVXLC]+)\b/g, (m, mot, r) => {
      const n = romain(r);
      return n ? `${mot} ${n}` : m;
    })
    .replace(/⊥/g, " est perpendiculaire à ")
    .replace(/∥|\/\/(?=\s*\()/g, " est parallèle à ")
    .replace(/(\d+(?:,\d+)?)\s?(k|h|da|d|c|m)?m([²³])/g, (_m, n, p, e) => {
      const un = parseFloat(n.replace(",", ".")) < 2;
      const pre = { k: "kilo", h: "hecto", da: "déca", d: "déci", c: "centi", m: "milli" }[p as string] ?? "";
      return `${n} ${pre}mètre${un ? "" : "s"} ${e === "²" ? "carré" : "cube"}${un ? "" : "s"}`;
    })
    .replace(/\b(k?m)\s?\/\s?(h|s)\b/g, (_m, u, t) => `${u === "km" ? "kilomètres" : "mètres"} par ${t === "h" ? "heure" : "seconde"}`)
    .replace(/(?<![A-Za-z])([a-zA-Z])\s*\/\s*([a-zA-Z])(?![A-Za-z])/g, "$1 divisé par $2")
    // symboles
    .replace(/(\d)\s*×\s*(\d)/g, "$1 fois $2")
    .replace(/×/g, " fois ")
    .replace(/÷/g, " divisé par ")
    // intervalle d'années « 1600-1750 » : on dit « 1600 à 1750 »
    .replace(/\b([12]\d{3})-([12]\d{3})\b/g, "$1 à $2")
    .replace(/(\d)\s*[−-]\s*(\d)/g, "$1 moins $2")
    .replace(/\s[−-]\s/g, " moins ")
    .replace(/−(\d)/g, "moins $1")
    .replace(/(\d)\s*\+\s*(\d)/g, "$1 plus $2")
    .replace(/\s\+\s/g, " plus ")
    .replace(/\s?=\s?/g, " égale ")
    .replace(/≈/g, " environ ")
    .replace(/≠/g, " différent de ")
    .replace(/\s<=?\s|≤/g, (m) => (m.includes("=") || m === "≤" ? " inférieur ou égal à " : " est plus petit que "))
    .replace(/\s>=?\s|≥/g, (m) => (m.includes("=") || m === "≥" ? " supérieur ou égal à " : " est plus grand que "))
    .replace(/\s<\s?/g, " est plus petit que ")
    .replace(/\s>\s?/g, " est plus grand que ")
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_, a, b) => fracWords(a, b))
    .replace(/²/g, " au carré")
    .replace(/³/g, " au cube")
    .replace(/√/g, "racine carrée de ")
    .replace(/π/g, " pi ")
    .replace(/%/g, " pour cent")
    .replace(/€/g, " euros")
    .replace(/(\d)\s?°C/g, "$1 degrés")
    .replace(/(\d)\s?°/g, "$1 degrés")
    .replace(/\bcm²/g, "centimètres carrés")
    .replace(/\bm²/g, "mètres carrés")
    .replace(/(\d+(?:,\d+)?)\s?km\b(?![A-Za-zÀ-ÿ])/g, (_m, n) => `${n} kilomètre${parseFloat(n.replace(",", ".")) < 2 ? "" : "s"}`)
    .replace(/(\d)\s?cm\b(?![A-Za-zÀ-ÿ])/g, "$1 centimètres")
    .replace(/(\d)\s?mm\b(?![A-Za-zÀ-ÿ])/g, "$1 millimètres")
    .replace(/(\d+(?:,\d+)?)\s?m\b(?![A-Za-zÀ-ÿ])/g, (_m, n) => `${n} mètre${parseFloat(n.replace(",", ".")) < 2 ? "" : "s"}`)
    .replace(/(\d)\s?kg\b(?![A-Za-zÀ-ÿ])/g, "$1 kilos")
    .replace(/(\d)\s?g\b(?![A-Za-zÀ-ÿ])/g, "$1 grammes")
    .replace(/(\d)\s?L\b(?![A-Za-zÀ-ÿ])/g, "$1 litres")
    .replace(/(\d)\s?cL\b(?![A-Za-zÀ-ÿ])/g, "$1 centilitres")
    .replace(/(\d)\s?mL\b(?![A-Za-zÀ-ÿ])/g, "$1 millilitres")
    .replace(/(\d)\s?min\b(?![A-Za-zÀ-ÿ])/g, "$1 minutes")
    .replace(/(\d)\s?h\s?(\d\d)/g, "$1 heures $2")
    .replace(/(\d)\s?h\b(?![A-Za-zÀ-ÿ])/g, "$1 heures")
    .replace(/\s*→\s*/g, " donne ")
    .replace(/…/g, "...")
    .replace(/\?\s*$/g, " ?")
    // les émojis ne se lisent pas
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B50}\u{2B55}]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim()
    // mots écrits en MAJUSCULES pour insister (« CETTE leçon », « VÉRIFIER ») : certaines voix les épellent
    .replace(/(?<![\p{L}\p{N}])\p{Lu}{2,}(?![\p{L}\p{N}])/gu, (m) => (SIGLES_EPELES.has(m) ? m : m.length >= 4 || PETITS_MOTS.has(m) ? m.toLowerCase() : m));
  // « 1 000 » (espace fine) → lu comme un seul nombre
  s = s.replace(/(\d)[  ](?=\d{3})/g, "$1");
  return s;
}
