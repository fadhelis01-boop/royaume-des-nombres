// Transforme un texte de cours (Markdown + formules LaTeX + symboles) en texte
// prononçable par la synthèse vocale : « 3 × 4 = 12 » → « 3 fois 4 égale 12 »,
// « $\frac{3}{4}$ » → « 3 quarts », « x² » → « x au carré »…

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

function latexToSpeech(tex: string): string {
  let s = tex;
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
  let s = md
    // formules
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => ` ${latexToSpeech(t)} `)
    .replace(/\$([^$]+?)\$/g, (_, t) => ` ${latexToSpeech(t)} `)
    // Markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?\s*[-:|\s]+\|\s*$/gm, "") // ligne de séparation des tableaux
    .replace(/\|/g, ", ")
    .replace(/[*_`#>]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    // symboles
    .replace(/(\d)\s*×\s*(\d)/g, "$1 fois $2")
    .replace(/×/g, " fois ")
    .replace(/÷/g, " divisé par ")
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
    .replace(/(\d)\s?km\b/g, "$1 kilomètres")
    .replace(/(\d)\s?cm\b/g, "$1 centimètres")
    .replace(/(\d)\s?mm\b/g, "$1 millimètres")
    .replace(/(\d)\s?m\b/g, "$1 mètres")
    .replace(/(\d)\s?kg\b/g, "$1 kilos")
    .replace(/(\d)\s?g\b/g, "$1 grammes")
    .replace(/(\d)\s?L\b/g, "$1 litres")
    .replace(/(\d)\s?cL\b/g, "$1 centilitres")
    .replace(/(\d)\s?mL\b/g, "$1 millilitres")
    .replace(/(\d)\s?min\b/g, "$1 minutes")
    .replace(/(\d)\s?h\s?(\d\d)/g, "$1 heures $2")
    .replace(/(\d)\s?h\b/g, "$1 heures")
    .replace(/→/g, ", puis ")
    .replace(/…/g, "...")
    .replace(/\?\s*$/g, " ?")
    // les émojis ne se lisent pas
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B50}\u{2B55}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  // « 1 000 » (espace fine) → lu comme un seul nombre
  s = s.replace(/(\d)[  ](?=\d{3})/g, "$1");
  return s;
}
