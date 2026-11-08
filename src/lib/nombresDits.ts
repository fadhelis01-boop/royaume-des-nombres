// Nombre dit au micro → nombre écrit (« quarante-trois » → 43, « mille deux cent » → 1200, « trois virgule cinq » → 3,5).
// Pour les enfants qui savent la réponse mais peinent encore à la taper. Module pur, testé par npm test.

const UNITES: Record<string, number> = {
  zéro: 0, zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, septante: 70, huitante: 80, octante: 80, nonante: 90,
};

// ce qu'un enfant ajoute autour du nombre : « ça fait 12 », « c'est euh… 12 », « la réponse est 12 »
const MOTS_VIDES = new Set(["ça", "ca", "fait", "font", "c", "est", "il", "y", "en", "a", "la", "réponse", "je", "crois", "pense", "que", "euh", "euhh", "ben", "bah", "alors", "égal", "égale", "égalent", "hum", "heu", "ah", "oui"]);

/** Partie entière en mots (déjà en minuscules, séparée en mots). null si un mot n'est pas un nombre. */
function entier(mots: string[]): number | null {
  let total = 0;
  let groupe = 0;
  let vu = false;
  for (let i = 0; i < mots.length; i++) {
    const m = mots[i];
    if (m === "et") continue;
    if (/^\d+$/.test(m)) {
      groupe += Number(m);
      vu = true;
    } else if (m in UNITES) {
      const v = UNITES[m];
      // « quatre vingt » = 80 : quatre suivi de vingt multiplie
      if (v === 20 && groupe % 100 === 4 && i > 0 && mots[i - 1] === "quatre") groupe += 76;
      else groupe += v;
      vu = true;
    } else if (m === "cent" || m === "cents") {
      groupe = (groupe === 0 ? 1 : groupe) * 100;
      vu = true;
    } else if (m === "mille" || m === "milles") {
      total += (groupe === 0 ? 1 : groupe) * 1000;
      groupe = 0;
      vu = true;
    } else if (m === "million" || m === "millions") {
      total += (groupe === 0 ? 1 : groupe) * 1_000_000;
      groupe = 0;
      vu = true;
    } else return null;
  }
  return vu ? total + groupe : null;
}

/**
 * Lit un nombre dans ce que l'enfant a dit. Accepte les chiffres que la reconnaissance renvoie souvent
 * directement (« 43 »), les mots, les deux mélangés, « virgule », et ignore « ça fait », « c'est », « euh ».
 */
export function nombreDit(texte: string): number | null {
  const t = texte
    .toLowerCase()
    .replace(/(\d)[\s  ](?=\d{3}(?!\d))/g, "$1")
    .replace(/[-'’]/g, " ")
    .replace(/[.!?]/g, " ")
    .split(/\s+/)
    .filter((m) => m && !MOTS_VIDES.has(m))
    .join(" ");
  const dec = t.match(/^(.*?)(?:\s*,\s*|\s+virgule\s+)(.*)$/);
  const mots = (s: string) => s.split(/\s+/).filter(Boolean);
  if (dec) {
    const a = entier(mots(dec[1]));
    if (a !== null && /^\d+$/.test(dec[2].trim())) return Number(`${a}.${dec[2].trim()}`);
    const bMots = mots(dec[2]);
    const b = entier(bMots);
    if (a === null || b === null) return null;
    // « trois virgule zéro cinq » : les zéros de tête comptent
    const zeros = bMots.findIndex((m) => m !== "zéro" && m !== "zero");
    const s = "0".repeat(Math.max(0, zeros)) + String(b);
    return Number(`${a}.${s}`);
  }
  const moins = /^moins\s+/.test(t);
  const n = entier(mots(t.replace(/^moins\s+/, "")));
  return n === null ? null : moins ? -n : n;
}
