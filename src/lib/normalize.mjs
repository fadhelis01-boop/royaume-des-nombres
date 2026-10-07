// Normalisation et validation des mondes — partagé par la compilation
// (scripts/build-content.mjs) et l'import de domaines depuis l'Espace parents.
// Pur JavaScript, sans dépendance à Node : fonctionne aussi dans le navigateur.

/** @type {string[]} */
let errors = [];
let exCount = 0;
export function resetReport() { const r = { errors, exCount }; errors = []; exCount = 0; return r; }
export function getErrors() { return errors; }
export function getExerciseCount() { return exCount; }

// ---------- Pré-traitement du YAML ----------
// 1) Les antislashs du LaTeX (\frac, \times…) sont protégés dans les chaînes "…"
//    (sinon YAML lirait « \f » comme un caractère spécial).
// 2) Les valeurs qui commencent par « {{ » (gabarits) ou contiennent « : »
//    (typographie française) sont mises entre guillemets automatiquement.
const quote = (v) => '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
const risky = (v) => /:\s|\s#|^[@`%]|^\{\{|^\*/.test(v) || /:$/.test(v);
export function preprocess(src) {
  let inBlock = -1;
  return src
    .split(/\r?\n/)
    .map((line) => {
      const indent = line.match(/^\s*/)[0].length;
      if (inBlock >= 0) {
        if (line.trim() === "" || indent > inBlock) return line;
        inBlock = -1;
      }
      if (/:\s*[|>][-+]?\s*$/.test(line)) {
        inBlock = indent + (line.trimStart().startsWith("- ") ? 2 : 0);
        return line;
      }
      // chaînes "…" : « \frac » comme « \\frac » sont acceptés — un antislash seul
      // est doublé, une paire déjà échappée est laissée telle quelle (sauf \" ).
      line = line.replace(/"((?:[^"\\]|\\.)*)"/g, (m, body) => '"' + body.replace(/\\\\|\\(?!")/g, (x) => (x.length === 2 ? x : "\\\\")) + '"');
      const kv = line.match(/^(\s*(?:- )?)([A-Za-zÀ-ÿ_][\w-]*)(:\s+)(.*)$/);
      if (kv) {
        const v = kv[4];
        if (!v || /^["'[|>&!]/.test(v) || (/^\{/.test(v) && !/^\{\{/.test(v)) || !risky(v)) return line;
        return kv[1] + kv[2] + kv[3] + quote(v);
      }
      const li = line.match(/^(\s*- )(.*)$/);
      if (li) {
        const v = li[2];
        if (!v || /^["'[|>&!]/.test(v) || (/^\{/.test(v) && !/^\{\{/.test(v)) || /^[\w.-]+:(\s|$)/.test(v) || !risky(v)) return line;
        return li[1] + quote(v);
      }
      return line;
    })
    .join("\n");
}


// ---------- Normalisation ----------
const WHO = { mia: "mia", neo: "neo", "néo": "neo", zero: "zero", "zéro": "zero", narrateur: "narrateur" };
const HUMEURS = ["reflexion", "joie", "surprise"];
function lines(list, where) {
  if (!Array.isArray(list)) {
    errors.push(`${where} : dialogue attendu sous forme de liste`);
    return [];
  }
  return list.map((l, i) => {
    const [k, text] = Object.entries(l ?? {})[0] ?? [];
    const [who, humeur] = String(k ?? "").toLowerCase().split(/[-_]/);
    if (!WHO[who]) errors.push(`${where} réplique ${i + 1} : personnage inconnu « ${k} » (mia, neo, zero, narrateur)`);
    if (humeur && !HUMEURS.includes(humeur)) errors.push(`${where} réplique ${i + 1} : humeur inconnue « ${humeur} »`);
    if (typeof text !== "string" || !text.trim()) errors.push(`${where} réplique ${i + 1} : texte vide`);
    return humeur ? { who: WHO[who], text, humeur } : { who: WHO[who], text };
  });
}

const EX_TYPES = {
  nombre: ["reponse"],
  qcm: ["choix"],
  vf: ["reponse"],
  comparer: ["gauche", "droite"],
  liste: ["reponse"],
  expression: ["reponse"],
  ordre: ["items"],
  droite: ["cible", "min", "max"],
  texte: ["reponse"],
  champs: ["champs"],
};
export function exercise(ex, where) {
  exCount++;
  if (!ex || typeof ex !== "object") {
    errors.push(`${where} : exercice vide`);
    return ex;
  }
  const need = EX_TYPES[ex.type];
  if (!need) errors.push(`${where} : type d'exercice inconnu « ${ex.type} »`);
  for (const k of need ?? []) if (ex[k] === undefined) errors.push(`${where} : champ « ${k} » requis pour le type ${ex.type}`);
  if (!ex.enonce) errors.push(`${where} : énoncé manquant`);
  if (ex.type === "qcm" && (ex.choix ?? []).length < 2) errors.push(`${where} : au moins 2 choix`);
  if (ex.type === "ordre" && (ex.items ?? []).length < 2) errors.push(`${where} : au moins 2 éléments à ranger`);
  return ex;
}

const STEP_KINDS = ["dialogue", "texte", "visuel", "a_quoi_ca_sert", "astuce", "attention", "retiens", "exemple", "question", "histoire"];
function step(s, where) {
  const kind = STEP_KINDS.find((k) => k in (s ?? {}));
  if (!kind) {
    errors.push(`${where} : étape inconnue (${Object.keys(s ?? {}).join(", ")}) — attendu : ${STEP_KINDS.join(", ")}`);
    return null;
  }
  switch (kind) {
    case "dialogue":
      return { kind, lines: lines(s.dialogue, where) };
    case "texte":
    case "histoire": {
      // forme courte « texte: … » (+ « titre: » à côté) ou forme longue « histoire: { titre, texte } »
      const o = typeof s[kind] === "object" && s[kind] ? s[kind] : { texte: s[kind], titre: s.titre };
      if (typeof o.texte !== "string") errors.push(`${where} : texte manquant`);
      return { kind, texte: String(o.texte), ...(o.titre ? { titre: o.titre } : {}) };
    }
    case "visuel":
      if (!s.visuel?.type) errors.push(`${where} : visuel sans type`);
      return { kind, visuel: s.visuel, ...(s.legende ? { legende: s.legende } : {}) };
    case "a_quoi_ca_sert":
    case "retiens":
      return { kind, texte: String(s[kind]) };
    case "astuce":
    case "attention": {
      // forme courte « astuce: texte » ou forme longue « astuce: { texte, qui } »
      const o = typeof s[kind] === "object" && s[kind] ? s[kind] : { texte: s[kind], qui: s.qui };
      const qui = o.qui ? WHO[String(o.qui).toLowerCase()] : undefined;
      if (o.qui && !qui) errors.push(`${where} : personnage inconnu ${o.qui}`);
      if (typeof o.texte !== "string") errors.push(`${where} : texte manquant`);
      return { kind, texte: String(o.texte), ...(qui ? { qui } : {}) };
    }
    case "exemple": {
      const e = s.exemple ?? {};
      if (!e.enonce || !Array.isArray(e.etapes)) errors.push(`${where} : exemple incomplet (enonce + etapes)`);
      return { kind, ...e };
    }
    case "question":
      return { kind, ex: exercise(s.question, where + " (question)") };
  }
}

const CYCLES = ["graines", "explorateurs", "maitres", "astuces"];
export function normalizeWorld(w, file) {
  const where = file;
  for (const k of ["id", "titre", "emoji", "couleur", "cycle", "age", "niveau", "ordre"]) if (w[k] === undefined) errors.push(`${where} : champ « ${k} » manquant`);
  if (!CYCLES.includes(w.cycle)) errors.push(`${where} : cycle inconnu « ${w.cycle} » (${CYCLES.join(", ")})`);
  const ids = new Set();
  const out = {
    id: w.id,
    titre: w.titre,
    sousTitre: w.sous_titre,
    emoji: w.emoji,
    couleur: w.couleur,
    decor: w.decor,
    cycle: w.cycle,
    age: String(w.age),
    niveau: String(w.niveau),
    ordre: w.ordre,
    prerequis: w.prerequis ?? [],
    intro: w.intro ? lines(w.intro, `${where} intro`) : undefined,
    version: String(w.version ?? "1.0.0"),
    lecons: [],
  };
  for (const l of w.lecons ?? []) {
    const lw = `${w.id}/${l.id}`;
    if (!l.id || !l.titre || !l.objectif) errors.push(`${lw} : id, titre et objectif requis`);
    if (ids.has(l.id)) errors.push(`${lw} : identifiant de leçon en double`);
    ids.add(l.id);
    const etapes = (l.etapes ?? []).map((s, i) => step(s, `${lw} étape ${i + 1}`)).filter(Boolean);
    const exercices = (l.exercices ?? []).map((e, i) => exercise(e, `${lw} exercice ${i + 1}`));
    if (!exercices.length) errors.push(`${lw} : aucun exercice — chaque leçon doit avoir des exercices pratiques`);
    if (!etapes.length) errors.push(`${lw} : aucune étape de cours`);
    const words = JSON.stringify(etapes).split(/\s+/).length;
    out.lecons.push({
      id: l.id,
      titre: l.titre,
      objectif: l.objectif,
      duree: l.duree ?? Math.max(5, Math.round(words / 90) + 4),
      etapes,
      exercices,
      nb_defi: l.nb_defi ?? Math.min(8, Math.max(5, exercices.length)),
      mots: l.mots,
    });
  }
  if (!out.lecons.length) errors.push(`${where} : aucune leçon`);
  return out;
}

