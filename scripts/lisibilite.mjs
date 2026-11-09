// Lisibilité des consignes pour les plus jeunes (mondes « Graines », CP – CM1).
// Repère les consignes trop longues et le vocabulaire difficile sans explication.
// Utilisé par check-content (avertissements) et en ligne de commande : node scripts/lisibilite.mjs [--tout]

/** Mots qu'un enfant de 7-9 ans ne connaît pas forcément : à expliquer dans la leçon ou à remplacer. */
export const MOTS_DIFFICILES = [
  "probablement", "contenance", "verticalement", "horizontalement", "identique", "correspond", "correspondant",
  "respectivement", "suivant", "précédent", "consécutifs", "simultanément", "approximativement", "vraisemblable",
  "décompose", "décomposer", "encadre", "encadrer", "intercale", "détermine", "déterminer", "justifie", "indique",
  "effectue", "associe", "énoncé", "opération", "propriété", "quantité", "valeur",
];
export const MOTS_MAX = 18;

const nettoie = (s) =>
  String(s)
    .replace(/\$[^$]*\$/g, " X ")
    .replace(/\{\{[^}]*\}\}/g, " N ")
    .replace(/[*_`#>«»"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const mots = (s) => nettoie(s).split(/[\s'’]+/).filter((w) => /[a-zà-ÿ]/i.test(w));

/** Problèmes de lisibilité d'une consigne (liste vide si tout va bien). */
export function problemesConsigne(enonce, lecon) {
  const out = [];
  // texte à lire (compréhension) et consigne générée de « relier » : longs par nature
  if (/^\s*(Lis\b|🔗)/u.test(enonce)) return out;
  // le titre de la leçon cité entre guillemets ne compte pas
  const m = mots(String(enonce).replace(/«[^»]*»/g, " "));
  // une petite histoire (des phrases, puis la question) peut être plus longue
  const histoire = /[.!]\s+\S.*\?/.test(nettoie(enonce));
  const max = histoire ? MOTS_MAX + 10 : MOTS_MAX;
  if (m.length > max) out.push(`${m.length} mots`);
  const connus = new Set((lecon?.mots ?? []).map((x) => String(x).toLowerCase()));
  for (const w of m) {
    const l = w.toLowerCase().replace(/[.,;:!?()]/g, "");
    if (MOTS_DIFFICILES.includes(l) && !connus.has(l)) out.push(`« ${l} »`);
  }
  return out;
}

/**
 * Longueur des autres textes lus par les CP–CE1 (audit « 7 ans ») : un écran de cours, une astuce
 * (qui sert aussi d'indice), un « À quoi ça sert ? », une correction. Au-delà, la publication est bloquée.
 * Seuils « conseillés » plus bas, affichés par node scripts/lisibilite.mjs --textes.
 */
export const LIMITES_TEXTES = { texte: 45, astuce: 40, a_quoi_ca_sert: 40, correction: 40 };
export const CONSEIL_TEXTES = { texte: 40, astuce: 30, a_quoi_ca_sert: 30, correction: 30 };
const nbMotsTexte = (s) => nettoie(s).split(/[\s'’]+/).filter((w) => /[a-zà-ÿ0-9]/i.test(w)).length;
/** Problème de longueur d'un texte de leçon (null si tout va bien). Tableaux et listes de corrections exemptés. */
export function problemeTexte(kind, texte, limites = LIMITES_TEXTES) {
  const max = limites[kind];
  if (!max || typeof texte !== "string" || /\|/.test(texte)) return null;
  if (kind === "correction" && /^\s*-\s|·|→/.test(texte)) return null;
  const n = nbMotsTexte(texte);
  return n > max ? `${n} mots (max ${max})` : null;
}
/** Mondes du CP et du CE1 : ceux d'un enfant de 6-7 ans. */
export const pourLesTresJeunes = (w) => w.cycle === "graines" && /^(GS|CP|CE1)\b/.test(String(w.niveau ?? ""));
/** Mondes lus par un enfant de 8 ans : ceux du CP–CE1, plus ceux qui commencent au CE2 (audit « 8 ans »). */
export const pourLes8ans = (w) => pourLesTresJeunes(w) || /^CE2\b/.test(String(w.niveau ?? ""));

/** Une leçon fait-elle partie des mondes des plus jeunes ? (niveau du monde commençant au CP, CE1 ou CE2) */
export const pourLesPlusJeunes = (w) => w.cycle === "graines" && /^(GS|CP|CE1|CE2)\b/.test(String(w.niveau ?? ""));

// ---- ligne de commande
if (process.argv[1] && process.argv[1].endsWith("lisibilite.mjs")) {
  const { readdirSync, readFileSync } = await import("node:fs");
  const tout = process.argv.includes("--tout");
  let n = 0,
    pb = 0;
  for (const f of readdirSync("public/content/worlds")) {
    const w = JSON.parse(readFileSync("public/content/worlds/" + f, "utf8"));
    if (!pourLesPlusJeunes(w)) continue;
    for (const l of w.lecons) {
      const qs = [...l.exercices, ...l.etapes.filter((e) => e.kind === "question" && !e.auto).map((e) => e.ex)];
      for (const q of qs) {
        if (!q?.enonce) continue;
        n++;
        const p = problemesConsigne(q.enonce, l);
        if (p.length) {
          pb++;
          if (tout || pb <= 400) console.log(`${w.id}/${l.id} [${q.type}] ${p.join(", ")} | ${nettoie(q.enonce).slice(0, 170)}`);
        }
      }
    }
  }
  console.log(`\n${pb} consignes à revoir sur ${n} (mondes des plus jeunes).`);
  if (process.argv.includes("--textes")) {
    let t = 0;
    for (const f of readdirSync("public/content/worlds")) {
      const w = JSON.parse(readFileSync("public/content/worlds/" + f, "utf8"));
      if (!pourLesTresJeunes(w)) continue;
      for (const l of w.lecons) {
        const items = [...l.etapes.map((e) => [e.kind, e.texte]), ...l.exercices.map((e) => ["correction", e.correction])];
        for (const [k, x] of items) {
          const p = problemeTexte(k, x, CONSEIL_TEXTES);
          if (p) { t++; console.log(`${w.id}/${l.id} [${k}] ${p} | ${nettoie(x).slice(0, 140)}`); }
        }
      }
    }
    console.log(`\n${t} textes plus longs que conseillé (CP – CE1).`);
  }
}
