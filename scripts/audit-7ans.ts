// Audit « enfant de 7 ans » : tout ce qu'un enfant de CE1 lit ou entend dans les leçons de son niveau,
// pas seulement les consignes (déjà contrôlées par lisibilite.mjs) :
//   textes du cours, scènes, « À quoi ça sert ? », astuces et indices, « Je retiens »,
//   choix des QCM, corrections, consignes générées (relier, ranger, rappel libre), types qui font écrire.
// npm run audit:7ans [-- --exemples]
import fs from "fs";
import { niveauLecon } from "../src/lib/parcours";
import { planDefi } from "../src/lib/plan";
import type { Lesson, World } from "../src/lib/types";

const EXEMPLES = process.argv.includes("--exemples");
// --age 7 (défaut) : jusqu'au milieu du CE1 ; --age 8 : jusqu'au milieu du CE2 (ce que l'enfant rencontre cette année)
const iAge = process.argv.indexOf("--age");
const AGE = iAge > 0 ? Number(process.argv[iAge + 1]) : 7;
const NIV_MAX = AGE - 4.5;
const TOUT = process.argv.includes("--tout");
const worlds: World[] = fs.readdirSync("public/content/worlds").map((f) => JSON.parse(fs.readFileSync("public/content/worlds/" + f, "utf8")));

// ---------- outils de texte ----------
const nettoie = (s: unknown) =>
  String(s ?? "")
    .replace(/\$[^$]*\$/g, " X ")
    .replace(/\{\{[^}]*\}\}/g, " N ")
    .replace(/[*_`#>«»"|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const motsDe = (s: string) => nettoie(s).split(/[\s'’]+/).map((w) => w.replace(/[.,;:!?()…]/g, "")).filter((w) => /[a-zà-ÿ]/i.test(w));
const phrasesDe = (s: string) => nettoie(s).split(/(?<=[.!?…])\s+|\n+|\s-\s/).filter((p) => motsDe(p).length);

/** Mots qu'un enfant de 7 ans ne connaît pas ou ne sait pas encore lire facilement. */
const DIFFICILES = new Set([
  // vocabulaire scolaire abstrait
  "élément", "éléments", "affirmation", "affirmations", "consolider", "renforcer", "notion", "méthode", "stratégie", "résultat", "opération", "opérations",
  "quantité", "quantités", "valeur", "valeurs", "propriété", "symbole", "symboles", "chiffre", "représente", "représenter", "correspond", "correspondant",
  "équivalent", "égalité", "identique", "identiques", "précédent", "suivant", "consécutifs", "respectivement", "déterminer", "détermine", "indique",
  "effectue", "associe", "énoncé", "décompose", "décomposer", "décomposition", "encadre", "encadrer", "intercale", "comparer", "compare", "ordonne",
  "croissant", "décroissant", "graduation", "graduée", "graduations", "dénominateur", "numérateur", "ordinal", "ordinaux", "rang", "commutative",
  "multiple", "multiples", "diviseur", "produit", "somme", "différence", "quotient", "total", "estimation", "estimer", "approximativement",
  "probablement", "vraisemblable", "contenance", "verticalement", "horizontalement", "symétrique", "symétrie", "axe", "sommet", "sommets", "arête",
  "segment", "polygone", "quadrilatère", "perpendiculaire", "parallèle", "cardinal", "collection", "dénombrer", "unité", "unités", "dizaine",
  "centaine", "mémoriser", "automatiser", "conjuguer", "infinitif", "déterminant", "pronom", "adjectif", "accord", "accorde", "masculin", "féminin",
  "singulier", "pluriel", "homophone", "homophones", "graphème", "phonème", "syllabe", "syllabes", "consonne", "voyelle",
  // mots du monde adulte
  "ingénieur", "ingénieurs", "architecte", "architectes", "scientifique", "scientifiques", "économie", "statistiques", "informaticien",
  "programmeur", "banque", "banquier", "entreprise", "comptable", "impôts", "industrie", "chercheur", "chercheurs", "professionnel", "professionnels",
]);
/** Mots « appris dans la leçon » : on ne les compte pas s'ils sont déclarés dans les mots-clés de la leçon. */
const connus = (l: Lesson) => new Set((l.mots ?? []).map((m) => m.toLowerCase()));

/** Le monde de l'enfant et celui des adultes, pour juger un « À quoi ça sert ? ». */
const ENFANT = /\b(école|classe|maîtresse|maître|récré|cour|copain|copine|ami|amie|amis|maman|papa|frère|sœur|famille|mamie|papi|anniversaire|goûter|bonbons?|gâteau|pizza|jouets?|jeux?|ballon|vélo|cartes?|billes|dessin|histoire|livre|chanson|musique|danse|chat|chien|animal|animaux|maison|chambre|cuisine|recette|magasin|boulangerie|marché|courses|pièces?|tirelire|argent de poche|toi|tu|ton|ta|tes)\b/i;
const ADULTE = /\b(ingénieurs?|architectes?|scientifiques?|économie|statistiques|informaticiens?|programmeurs?|banques?|banquiers?|entreprises?|comptables?|impôts|industries?|chercheurs?|professionnels?|médecins?|pilotes?|météorologues?|géomètres?)\b/i;

type Mesure = { cat: string; ou: string; texte: string; mots: number; phraseMax: number; difficiles: string[]; symboles: boolean };
const mesures: Mesure[] = [];
const noter = (cat: string, ou: string, texte: unknown, l: Lesson) => {
  const t = String(texte ?? "");
  if (!t.trim()) return;
  const m = motsDe(t);
  const c = connus(l);
  const diff = [...new Set(m.map((w) => w.toLowerCase()).filter((w) => DIFFICILES.has(w) && !c.has(w)))];
  mesures.push({ cat, ou, texte: nettoie(t), mots: m.length, phraseMax: Math.max(0, ...phrasesDe(t).map((p) => motsDe(p).length)), difficiles: diff, symboles: /\$[^$]+\$|[×÷≈≠≤≥]|\d+\/\d+/.test(t) });
};

// ---------- relevé ----------
const types: Record<string, number> = {};
let lecons = 0;
const sertManquant: string[] = [];
const sertAdulte: string[] = [];
const sertSansEnfant: string[] = [];
const correctionsSansPourquoi: Mesure[] = [];
let corrections = 0;
const genere = { relier: 0, classer: 0, libre: 0 };
for (const w of worlds) {
  w.lecons.forEach((l, i) => {
    const n = niveauLecon(w, i);
    if (n === null || n > NIV_MAX || w.cycle === "astuces") return;
    lecons++;
    const ou = `${w.matiere}:${w.id}/${l.id}`;
    let sert = "";
    for (const e of l.etapes) {
      if (e.kind === "texte") noter("Texte du cours (par écran)", ou, e.texte, l);
      if (e.kind === "dialogue") for (const li of e.lines) noter("Réplique des mascottes", ou, li.text, l);
      if (e.kind === "a_quoi_ca_sert") {
        sert = e.texte;
        noter("À quoi ça sert ?", ou, e.texte, l);
      }
      if (e.kind === "astuce") noter("Astuce (aussi l'indice au 1er essai raté)", ou, e.texte, l);
      if (e.kind === "retiens") noter("Je retiens", ou, e.texte, l);
      if (e.kind === "explique") {
        noter("Explique à Zéro (question)", ou, e.texte, l);
        for (const c of e.choix) noter("Explique à Zéro (choix)", ou, c.texte, l);
      }
    }
    if (!sert) sertManquant.push(ou);
    else {
      if (ADULTE.test(sert)) sertAdulte.push(`${ou} | ${nettoie(sert).slice(0, 150)}`);
      if (!ENFANT.test(sert)) sertSansEnfant.push(`${ou} | ${nettoie(sert).slice(0, 150)}`);
    }
    for (const ex of l.exercices) {
      types[ex.type] = (types[ex.type] ?? 0) + 1;
      if (ex.type === "relier" && /^🔗/.test(ex.enonce)) genere.relier++;
      if (ex.type === "classer" && /^⚖️/.test(ex.enonce)) genere.classer++;
      if (ex.type === "libre") genere.libre++;
      noter(`Consigne · ${ex.type}`, ou, ex.enonce, l);
      for (const c of ex.choix ?? []) noter("Choix de QCM", ou, c, l);
      if (ex.correction) {
        corrections++;
        noter("Correction", ou, ex.correction, l);
        const t = String(ex.correction);
        // une correction qui « explique » : un calcul, une raison ou une règle, pas seulement la réponse
        const explique = /[=+−×÷→]|\b(car|parce|donc|comme|on |c'est|il faut|regarde|compte|ajoute|enlève)\b/i.test(t) || motsDe(t).length >= 10;
        // une correction entièrement « gabarit » ({{t_2}}) dépend de la question tirée : on ne peut pas la juger ici
        if (!explique && nettoie(t) !== "N") correctionsSansPourquoi.push(mesures[mesures.length - 1]);
      } else noter("Correction", ou, "", l);
    }
  });
}

// ---------- synthèse ----------
const pct = (a: number, b: number) => `${b ? Math.round((100 * a) / b) : 0} %`;
console.log(`Leçons d'un enfant de ${AGE} ans (niveau ≤ ${NIV_MAX}, hors « astuces ») : ${lecons}`);
const cats = [...new Set(mesures.map((m) => m.cat))].filter((c) => !c.startsWith("Consigne ·"));
console.log("\nCatégorie | textes | mots moy. | plus long | phrase > 12 mots | mots difficiles | symboles");
for (const c of cats) {
  const ms = mesures.filter((m) => m.cat === c);
  const moy = ms.reduce((a, m) => a + m.mots, 0) / (ms.length || 1);
  console.log(
    `${c} | ${ms.length} | ${moy.toFixed(1)} | ${Math.max(0, ...ms.map((m) => m.mots))} | ${pct(ms.filter((m) => m.phraseMax > 12).length, ms.length)} | ${pct(ms.filter((m) => m.difficiles.length).length, ms.length)} | ${pct(ms.filter((m) => m.symboles).length, ms.length)}`,
  );
}
const totalEx = Object.values(types).reduce((a, b) => a + b, 0);
const ecrire = ["mot", "texte", "dictee", "libre"].reduce((a, t) => a + (types[t] ?? 0), 0);
console.log(`\nTypes d'exercices (${totalEx}) : ${Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${pct(n, totalEx)}`).join(" · ")}`);

// ---------- défis réellement tirés (après les corrections de l'audit « 7 ans ») ----------
{
  const ECRIT = new Set(["mot", "texte", "dictee", "libre"]);
  const CHOIX = new Set(["qcm", "vf", "comparer"]);
  let n = 0, avecLibre = 0, avecEcrit = 0, ecrit = 0, choix = 0, total = 0, domine = 0;
  for (const w of worlds)
    w.lecons.forEach((l, i) => {
      const niv = niveauLecon(w, i);
      if (niv === null || niv > NIV_MAX || w.cycle === "astuces" || !l.exercices.length) return;
      for (let r = 0; r < 20; r++) {
        const p = planDefi(l.exercices, l.nb_defi ?? 5, { jeune: AGE < 9 });
        n++;
        total += p.length;
        if (p.some((e) => e.type === "libre" || e.rappel)) avecLibre++;
        if (p.some((e) => ECRIT.has(e.type))) avecEcrit++;
        ecrit += p.filter((e) => ECRIT.has(e.type)).length;
        choix += p.filter((e) => CHOIX.has(e.type)).length;
        const parType: Record<string, number> = {};
        for (const e of p) parType[e.type] = (parType[e.type] ?? 0) + 1;
        if (Math.max(...Object.values(parType)) > p.length / 2) domine++;
      }
    });
  console.log(`Défis simulés (${n}) : avec rédaction ou « mot qui manque » ${pct(avecLibre, n)} · avec au moins une écriture ${pct(avecEcrit, n)} · questions d'écriture ${pct(ecrit, total)} · questions à choix ${pct(choix, total)} · dominés par un seul type ${pct(domine, n)}`);
}
console.log(`Exercices où il faut écrire des lettres (mot, texte, dictée, rappel libre) : ${ecrire} (${pct(ecrire, totalEx)}) dont rappel libre ${genere.libre}`);
console.log(`Consignes générées : relier ${genere.relier} · vrai/faux à ranger ${genere.classer} · rappel libre ${genere.libre}`);
console.log(`« À quoi ça sert ? » : manquant ${sertManquant.length}/${lecons} · cite des métiers d'adultes ${sertAdulte.length} · ne parle pas du monde de l'enfant ${sertSansEnfant.length}`);
console.log(`Corrections : ${corrections} · sans explication (donnent seulement la réponse) : ${correctionsSansPourquoi.length} (${pct(correctionsSansPourquoi.length, corrections)})`);
const freq: Record<string, number> = {};
for (const m of mesures) for (const d of m.difficiles) freq[d] = (freq[d] ?? 0) + 1;
console.log(`Mots difficiles les plus fréquents : ${Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([w, n]) => `${w} (${n})`).join(", ")}`);

if (EXEMPLES) {
  const ex = (titre: string, l: string[]) => console.log(`\n--- ${titre} (${l.length}) ---\n` + (TOUT ? l : l.slice(0, 15)).join("\n"));
  ex("À quoi ça sert : monde des adultes", sertAdulte);
  ex("À quoi ça sert : rien du monde de l'enfant", sertSansEnfant);
  ex("À quoi ça sert : manquant", sertManquant);
  const longs = (c: string, seuil: number) =>
    mesures.filter((m) => m.cat === c && m.mots > seuil).sort((a, b) => b.mots - a.mots).map((m) => `${m.mots} mots | ${m.ou} | ${m.texte.slice(0, 160)}`);
  ex("Textes du cours de plus de 60 mots par écran", longs("Texte du cours (par écran)", 60));
  ex("Astuces de plus de 25 mots", longs("Astuce (aussi l'indice au 1er essai raté)", 25));
  ex("Corrections de plus de 25 mots", longs("Correction", 25));
  ex("Choix de QCM de plus de 8 mots", longs("Choix de QCM", 8));
  ex("Corrections sans explication", correctionsSansPourquoi.map((m) => `${m.ou} | ${m.texte.slice(0, 120)}`));
  ex(
    "Mots difficiles dans les corrections et les astuces",
    mesures.filter((m) => (m.cat === "Correction" || m.cat.startsWith("Astuce")) && m.difficiles.length).map((m) => `${m.difficiles.join(", ")} | ${m.ou} | ${m.texte.slice(0, 120)}`),
  );
}
