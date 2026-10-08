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
const WHO = { mia: "mia", neo: "neo", "néo": "neo", zero: "zero", "zéro": "zero", narrateur: "narrateur", nuage: "nuage", grignoteur: "nuage", ixe: "ixe", enfant: "enfant", toi: "enfant", gribouille: "gribouille", neutre: "neutre", "grand-neutre": "neutre" };
const HUMEURS = ["reflexion", "joie", "surprise", "triste", "fier"];
export function lines(list, where) {
  if (!Array.isArray(list)) {
    errors.push(`${where} : dialogue attendu sous forme de liste`);
    return [];
  }
  return list.map((l, i) => {
    const [k, text] = Object.entries(l ?? {})[0] ?? [];
    const [who, humeur] = String(k ?? "").toLowerCase().split(/[-_]/);
    if (!WHO[who]) errors.push(`${where} réplique ${i + 1} : personnage inconnu « ${k} » (mia, neo, zero, narrateur, nuage, ixe, enfant)`);
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
  // activités de manipulation (le doigt de l'enfant fait le travail)
  blocs: ["cible"],
  partage: ["total", "parts"],
  sauts: ["depart", "cible"],
  colorier: ["n", "d"],
  horloge: ["h", "m"],
  payer: ["cible"],
  // français
  mot: ["reponse"],
  dictee: ["dictee"],
  surligner: ["phrase"],
  classer: ["categories", "mots"],
};
export const MANIP_TYPES = ["blocs", "partage", "sauts", "colorier", "horloge", "payer"];
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

const STEP_KINDS = ["dialogue", "texte", "visuel", "a_quoi_ca_sert", "astuce", "attention", "retiens", "exemple", "question", "histoire", "explique", "vraie_vie", "experience", "dessin"];
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
    case "explique": {
      // « Explique à Néo comment tu as fait » : choix de stratégies, chacune avec un retour
      const o = s.explique ?? {};
      const qui = WHO[String(o.qui ?? "neo").toLowerCase()] ?? "neo";
      if (!o.texte || !Array.isArray(o.choix) || o.choix.length < 2) errors.push(`${where} : explique incomplet (texte + au moins 2 choix)`);
      const choix = (o.choix ?? []).map((c) => ({ texte: String(c.texte ?? ""), ok: c.ok !== false, retour: String(c.retour ?? "") }));
      return { kind, texte: String(o.texte ?? ""), qui, choix };
    }
    case "experience": {
      const o = s.experience ?? {};
      const sec = String(o.securite ?? "orange");
      if (!["vert", "orange", "rouge"].includes(sec)) errors.push(`${where} : securite « ${sec} » inconnue (vert, orange, rouge)`);
      if (!o.titre || !o.observation || !o.explication) errors.push(`${where} : expérience incomplète (titre, observation, explication)`);
      if (sec !== "rouge" && (!Array.isArray(o.etapes) || !o.etapes.length)) errors.push(`${where} : expérience sans étapes`);
      const pr = o.prediction && Array.isArray(o.prediction.choix) && o.prediction.choix.length >= 2 ? { question: String(o.prediction.question ?? "Que va-t-il se passer ?"), choix: o.prediction.choix.map(String) } : undefined;
      return { kind, titre: String(o.titre ?? ""), securite: sec, materiel: (o.materiel ?? []).map(String), etapes: (o.etapes ?? []).map(String), prediction: pr, observation: String(o.observation ?? ""), explication: String(o.explication ?? "") };
    }
    case "dessin": {
      const o = s.dessin ?? {};
      const et = Array.isArray(o.etapes) ? o.etapes : [];
      if (!o.titre || et.length < 2) errors.push(`${where} : dessin pas à pas incomplet (titre et au moins 2 étapes)`);
      et.forEach((e, k) => {
        if (!e?.consigne) errors.push(`${where} : dessin étape ${k + 1} sans consigne`);
        if (e?.trace && !/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(String(e.trace))) errors.push(`${where} : dessin étape ${k + 1} : tracé SVG invalide`);
      });
      return { kind, titre: String(o.titre ?? ""), miroir: !!o.miroir, etapes: et.map((e) => ({ consigne: String(e?.consigne ?? ""), trace: String(e?.trace ?? ""), couche: e?.couche ? String(e.couche) : undefined })) };
    }
    case "vraie_vie": {
      const o = typeof s.vraie_vie === "object" && s.vraie_vie ? s.vraie_vie : { texte: s.vraie_vie };
      if (typeof o.texte !== "string") errors.push(`${where} : défi vraie vie sans texte`);
      return { kind, texte: String(o.texte), titre: o.titre ? String(o.titre) : "Défi dans la vraie vie", materiel: o.materiel ? String(o.materiel) : undefined };
    }
  }
}

// Concentration : on n'attend jamais plus de 2 écrans sans agir. Des questions
// tirées des exercices de la leçon (les plus simples d'abord) sont insérées
// automatiquement entre les étapes passives (désactivable : auto_questions: false).
const PASSIVE = new Set(["dialogue", "texte", "visuel", "a_quoi_ca_sert", "astuce", "attention", "retiens", "exemple", "histoire"]);
const TEACHING = new Set(["texte", "visuel", "exemple", "retiens"]);
function withQuestions(etapes, exercices) {
  if (!exercices.length) return etapes;
  const ranked = exercices
    .map((e, i) => ({ e, i, r: (e.niveau ?? 2) * 100 + i }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.e);
  const out = [];
  let passive = 0,
    taught = false,
    q = 0;
  etapes.forEach((st, i) => {
    out.push(st);
    if (TEACHING.has(st.kind)) taught = true;
    if (PASSIVE.has(st.kind)) passive++;
    else passive = 0;
    const next = etapes[i + 1];
    if (passive >= 2 && taught && next && PASSIVE.has(next.kind) && i < etapes.length - 1) {
      out.push({ kind: "question", ex: ranked[q % ranked.length], auto: true });
      q++;
      passive = 0;
    }
  });
  return out;
}

const CYCLES = ["graines", "explorateurs", "maitres", "astuces"];
export function normalizeWorld(w, file) {
  const where = file;
  for (const k of ["id", "titre", "emoji", "couleur", "cycle", "age", "niveau", "ordre"]) if (w[k] === undefined) errors.push(`${where} : champ « ${k} » manquant`);
  if (w.matiere !== undefined && !/^[a-z0-9-]+$/.test(String(w.matiere))) errors.push(`${where} : identifiant de matière invalide « ${w.matiere} » (minuscules, chiffres, tirets)`);
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
    matiere: w.matiere ?? "maths",
    lecons: [],
  };
  for (const l of w.lecons ?? []) {
    const lw = `${w.id}/${l.id}`;
    if (!l.id || !l.titre || !l.objectif) errors.push(`${lw} : id, titre et objectif requis`);
    if (ids.has(l.id)) errors.push(`${lw} : identifiant de leçon en double`);
    ids.add(l.id);
    const exercices = (l.exercices ?? []).map((e, i) => exercise(e, `${lw} exercice ${i + 1}`));
    const raw = (l.etapes ?? []).map((s, i) => step(s, `${lw} étape ${i + 1}`)).filter(Boolean);
    const etapes = l.auto_questions === false ? raw : withQuestions(raw, exercices);
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
      // assez de questions pour qu'une réussite ne soit pas due au hasard
      nb_defi: l.nb_defi ?? Math.min(10, Math.max(6, exercices.length + 1)),
      mots: l.mots,
    });
  }
  if (!out.lecons.length) errors.push(`${where} : aucune leçon`);
  return out;
}

