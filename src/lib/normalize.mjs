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
const WHO = { mia: "mia", neo: "neo", "néo": "neo", zero: "zero", "zéro": "zero", narrateur: "narrateur", nuage: "nuage", grignoteur: "nuage", ixe: "ixe", enfant: "enfant", toi: "enfant", gribouille: "gribouille", neutre: "neutre", "grand-neutre": "neutre", acidia: "acidia", gravis: "gravis", seve: "seve", uranie: "uranie", resonance: "resonance", "résonance": "resonance", pinceau: "pinceau" };
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
  // Une correction fixe sur un exercice à variantes tirées au hasard peut parler d'une autre variante
  // que celle affichée : on la présente comme un rappel général, pas comme l'explication de la question.
  const variantes = Object.values(ex.vars ?? {}).some((v) => Array.isArray(v) && v.length > 1);
  if ((ex.type === "vf" || ex.type === "classer") && variantes && typeof ex.correction === "string" && !/\{\{/.test(ex.correction) && !/^💡/.test(ex.correction))
    return { ...ex, correction: "💡 À retenir : " + ex.correction };
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

/**
 * Effet tuteur (audit 2.1) : avant « Je retiens », l'enfant explique la leçon à Zéro en choisissant
 * la bonne phrase parmi celle de la leçon et deux phrases d'autres leçons du même monde.
 * Expliquer à quelqu'un est l'un des moyens les plus efficaces de retenir.
 */
function ajouterExplique(w) {
  const ret = (l) => l.etapes.find((s) => s.kind === "retiens")?.texte;
  const avec = w.lecons.filter((l) => ret(l));
  if (avec.length < 3) return;
  for (const [i, l] of avec.entries()) {
    if (l.etapes.some((s) => s.kind === "explique")) continue;
    const autres = avec.filter((x) => x !== l);
    const d1 = autres[(i * 7 + 1) % autres.length], d2 = autres[(i * 7 + 2) % autres.length];
    if (!d1 || !d2 || d1 === d2) continue;
    const bon = { texte: ret(l), ok: true, retour: "Bravo ! Tu viens de l'expliquer comme un vrai prof. Expliquer, c'est la meilleure façon de retenir." };
    const faux = (x) => ({ texte: ret(x), ok: false, retour: `Cette phrase est juste, mais elle vient de la leçon « ${x.titre} ». Ici, on apprend : ${l.objectif.charAt(0).toLowerCase() + l.objectif.slice(1)}` });
    const choix = [faux(d1), faux(d2)];
    choix.splice(i % 3, 0, bon);
    const k = l.etapes.findIndex((s) => s.kind === "retiens");
    l.etapes.splice(k, 0, { kind: "explique", texte: "Zéro n'a pas tout suivi… Quelle phrase lui expliques-tu pour résumer CETTE leçon ?", qui: "zero", choix, auto: true });
  }
}

/** Coupe un texte de plus de 550 caractères à la limite de paragraphe (ou de puce) la plus proche du milieu, hors tableau. */
function couperTexte(s) {
  const t = s.texte;
  if (t.length <= 550) return [s];
  const lignes = t.split("\n");
  let best = -1, ecart = Infinity, pos = 0;
  lignes.forEach((l, i) => {
    pos += l.length + 1;
    const suiv = lignes[i + 1];
    if (suiv === undefined) return;
    const frontiere = l.trim() === "" || /^\s*[-•]\s/.test(suiv);
    const tableau = /^\s*\|/.test(l) && /^\s*\|/.test(suiv);
    if (!frontiere || tableau) return;
    const d = Math.abs(pos - t.length / 2);
    if (d < ecart && pos > 150 && t.length - pos > 150) {
      ecart = d;
      best = i;
    }
  });
  if (best < 0) return [s];
  const a = lignes.slice(0, best + 1).join("\n").trimEnd();
  const b = lignes.slice(best + 1).join("\n").trimStart();
  return [{ ...s, texte: a }, { kind: "texte", texte: b }];
}

/** Exercice « texte à trous » tiré du « Je retiens » : un mot en gras est caché, l'enfant l'écrit. */
const MOTS_OUTILS = new Set(["le", "la", "les", "un", "une", "des", "et", "ou", "de", "du", "à", "au", "aux", "en", "est", "sont", "pas", "ne", "plus", "très"]);
function clozeFromRetiens(texte, mots = []) {
  if (typeof texte !== "string" || /\$|\{\{/.test(texte)) return null;
  const plain = texte.replace(/\*\*/g, "");
  const terms = [...texte.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
  // les mots-clés de la leçon présents tels quels dans la phrase à retenir
  for (const m of (Array.isArray(mots) ? mots : []).map(String).filter((x) => /^[A-Za-zÀ-ÿœŒæ' -]{3,24}$/.test(x))) {
    const re = new RegExp(`(^|[^A-Za-zÀ-ÿ])(${m})(?=[^A-Za-zÀ-ÿ]|$)`, "i");
    const hit = plain.match(re);
    if (hit) terms.push(hit[2]);
  }
  const seen = new Set();
  const t = [];
  for (const term of terms) {
    if (!/^[A-Za-zÀ-ÿœŒæ' -]{3,24}$/.test(term) || term.split(/\s+/).length > 3 || MOTS_OUTILS.has(term.toLowerCase()) || seen.has(term.toLowerCase())) continue;
    seen.add(term.toLowerCase());
    // le mot ne doit pas rester visible ailleurs dans la phrase (sinon la réponse est donnée)
    const idx = plain.indexOf(term);
    if (idx < 0) continue;
    const reste = plain.slice(0, idx) + plain.slice(idx + term.length);
    if (reste.toLowerCase().includes(term.toLowerCase())) continue;
    const phrase = plain.slice(0, idx) + "……" + plain.slice(idx + term.length);
    t.push([phrase, term]);
  }
  if (t.length < 2) return null;
  return {
    type: "mot",
    vars: { t },
    enonce: "🧠 Complète ce que tu as retenu (écris le mot qui manque) :\n\n« {{t_0}} »",
    reponse: "{{t_1}}",
    correction: "Le mot qui manquait : **{{t_1}}**.",
    niveau: 3,
  };
}
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
    // une seule échelle de niveaux pour toutes les planètes : on garde les classes (« Explorateur (CE2 – CM1) » → « CE2 – CM1 »)
    niveau: (() => {
      const n = String(w.niveau).replace(/^[^(]*\((.*)\)\s*$/, "$1").trim();
      return n.charAt(0).toUpperCase() + n.slice(1);
    })(),
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
    const raw0 = (l.etapes ?? []).map((s, i) => step(s, `${lw} étape ${i + 1}`)).filter(Boolean);
    // Pour les plus jeunes (cycle « graines »), un texte trop long est coupé en deux écrans.
    const raw = w.cycle === "graines" ? raw0.flatMap((s) => (s.kind === "texte" ? couperTexte(s) : [s])) : raw0;
    // Indice par défaut : l'astuce de la leçon (sinon « Je retiens »), proposé au premier échec.
    const tip = raw.find((s) => s.kind === "astuce")?.texte ?? raw.find((s) => s.kind === "retiens")?.texte;
    const exercices = (l.exercices ?? []).map((e, i) => {
      const ex = exercise(e, `${lw} exercice ${i + 1}`);
      return ex && typeof ex === "object" && !ex.indice && tip && !/\{\{/.test(tip) ? { ...ex, indice: tip } : ex;
    });
    const etapes = l.auto_questions === false ? raw : withQuestions(raw, exercices);
    // Rappel actif : « complète ce que tu as retenu » à partir des mots en gras du « Je retiens »
    // (réponse à produire, pas à reconnaître). Hors maths, où les réponses sont déjà produites.
    const trou = (w.matiere ?? "maths") !== "maths" ? clozeFromRetiens(raw.find((s) => s.kind === "retiens")?.texte, l.mots) : null;
    if (trou) exercices.push(trou);
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
  ajouterExplique(out);
  return out;
}

