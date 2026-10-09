// Compile les mondes (content-src/*.yaml) en JSON servis par l'application.
//
//   content-src/_planetes.yaml     les planètes de la Galaxie (une par matière) et leurs familles
//   content-src/NN-<monde>.yaml    un monde = un domaine d'une matière (leçons, exercices)
//   content-src/_histoire*.yaml    l'histoire de chaque planète
//   content-src/_glossaire.yaml    le Grand Livre (définitions sourcées)
//   content-src/_enigmes.yaml      énigmes du jour
//   content-src/_diagnostic.yaml   test de positionnement
//   content-src/_jeux.yaml         familles de questions des jeux (Calcul éclair…)
//   content-src/_changelog.yaml    journal des mises à jour
//   content-src/_autrement*.yaml   « Explique-moi autrement » : image de la vie + schéma par leçon
//   content-src/_fluence.yaml      textes de lecture chronométrée (fluence)


//
// AJOUTER UN DOMAINE SANS RECODER : déposer un nouveau fichier YAML dans
// content-src/ (voir docs/FORMAT-CONTENU.md), puis `npm run deploy`.
// (Ou l'importer directement depuis l'Espace parents de l'application.)
import { readdirSync, writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { preprocess, normalizeWorld, exercise, getErrors, getExerciseCount, lines } from "../src/lib/normalize.mjs";

const SRC = "content-src";
const OUT = "public/content";
const errors = getErrors();
const warns = [];
const load = (f) => yaml.load(preprocess(readFileSync(path.join(SRC, f), "utf8")));

// ---------- Compilation ----------
function main() {
  rmSync(path.join(OUT, "worlds"), { recursive: true, force: true });
  mkdirSync(path.join(OUT, "worlds"), { recursive: true });
  const opt = (f, d) => (existsSync(path.join(SRC, f)) ? load(f) : d);
  const manifest = {
    version: "",
    updatedAt: new Date().toISOString().slice(0, 10),
    worlds: [],
    // le Grand Livre : _glossaire.yaml (maths) + _glossaire_*.yaml (autres planètes)
    glossaire: readdirSync(SRC).filter((f) => /^_glossaire.*\.ya?ml$/.test(f)).sort().flatMap((f) => load(f) ?? []),
    enigmes: opt("_enigmes.yaml", []),
    diagnostic: [],
    jeux: {},
    changelog: opt("_changelog.yaml", []),
    // lecture chronométrée (fluence) : textes gradués CP → CM
    fluence: opt("_fluence.yaml", []),
    // domaines de chaque planète (test de niveau et parcours personnalisé)
    domaines: opt("_domaines.yaml", {}),
  };
  let lessons = 0;
  const worldIds = new Set();
  const files = readdirSync(SRC).filter((f) => f.endsWith(".yaml") && !f.startsWith("_")).sort();
  const loaded = [];
  // « Explique-moi autrement » rédigé à part : _autrement*.yaml, clés « monde/leçon »
  const autre = Object.assign({}, ...readdirSync(SRC).filter((f) => /^_autrement.*\.ya?ml$/.test(f)).sort().map((f) => load(f) ?? {}));
  const autreVus = new Set();
  for (const f of files) {
    let w;
    try {
      w = load(f);
    } catch (e) {
      errors.push(`${f} : YAML invalide — ${e.message.split("\n").slice(0, 3).join(" ")}`);
      continue;
    }
    for (const l of w?.lecons ?? []) {
      const a = autre[`${w.id}/${l.id}`];
      if (a) {
        autreVus.add(`${w.id}/${l.id}`);
        l.autrement ??= a;
      }
    }
    const nw = normalizeWorld(w, f);
    if (worldIds.has(nw.id)) errors.push(`${f} : monde en double ${nw.id}`);
    worldIds.add(nw.id);
    loaded.push(nw);
    lessons += nw.lecons.length;
  }
  for (const k of Object.keys(autre)) if (!autreVus.has(k)) errors.push(`_autrement : leçon inconnue ${k}`);
  for (const w of loaded) {
    for (const p of w.prerequis) if (!worldIds.has(p)) errors.push(`${w.id} : prérequis inconnu ${p}`);
    // un décor illustré déposé dans public/img/decors/<id>.webp est utilisé sans rien écrire dans le YAML
    if (!w.decor && existsSync(path.join("public", "img", "decors", w.id + ".webp"))) w.decor = `img/decors/${w.id}.webp`;
    writeFileSync(path.join(OUT, "worlds", w.id + ".json"), JSON.stringify(w));
    manifest.worlds.push({ id: w.id, file: `worlds/${w.id}.json`, version: w.version, titre: w.titre });
  }
  for (const [i, q] of opt("_diagnostic.yaml", []).entries()) {
    if (!worldIds.has(q.monde)) errors.push(`diagnostic ${i + 1} : monde inconnu ${q.monde}`);
    manifest.diagnostic.push({ monde: q.monde, ex: exercise(q.question, `diagnostic ${i + 1}`) });
  }
  for (const [id, j] of Object.entries(opt("_jeux.yaml", {}))) {
    manifest.jeux[id] = { titre: j.titre, niveau: j.niveau, exercices: (j.exercices ?? []).map((e, i) => exercise(e, `jeu ${id} ${i + 1}`)) };
  }
  const NIV_FLUENCE = ["CP", "CE1", "CE2", "CM"];
  for (const [i, t] of manifest.fluence.entries()) {
    for (const k of ["id", "niveau", "titre", "texte"]) if (!t[k]) errors.push(`fluence ${t.id ?? i + 1} : champ « ${k} » manquant`);
    if (!NIV_FLUENCE.includes(t.niveau)) errors.push(`fluence ${t.id} : niveau inconnu « ${t.niveau} » (${NIV_FLUENCE.join(", ")})`);
    t.texte = String(t.texte).trim().replace(/\s+/g, " ");
  }
  for (const [i, e] of manifest.enigmes.entries()) {
    for (const k of ["id", "niveau", "titre", "texte", "reponse", "solution"]) if (e[k] === undefined) errors.push(`énigme ${e.id ?? i + 1} : champ « ${k} » manquant`);
    e.reponse = String(e.reponse);
  }
  for (const g of manifest.glossaire) {
    if (!g.mot || !g.def) errors.push(`glossaire : entrée incomplète ${g.mot ?? "?"}`);
    if (g.monde && !worldIds.has(g.monde)) errors.push(`glossaire ${g.mot} : monde inconnu ${g.monde}`);
  }
  // La Galaxie des Savoirs : les planètes (une par matière) et leurs familles
  const reg = opt("_planetes.yaml", { familles: {}, planetes: [] });
  manifest.familles = Object.entries(reg.familles ?? {}).map(([id, f]) => ({ id, titre: f.titre, emoji: f.emoji, accroche: f.accroche ?? "" }));
  const famIds = new Set(manifest.familles.map((f) => f.id));
  const SPRITES = ["nuage", "ixe", "oubli", "gribouille", "tache", "neutre"];
  manifest.planetes = [];
  manifest.histoires = {};
  // Un choix narratif : une question, 2 ou 3 options, chacune suivie de quelques répliques.
  const choix = (c, where) => {
    if (!c) return undefined;
    if (!c.question || !Array.isArray(c.options) || c.options.length < 2) {
      errors.push(`${where} : il faut « question » et au moins 2 « options »`);
      return undefined;
    }
    return { qui: c.qui ?? "mia", question: String(c.question), options: c.options.map((o, i) => ({ texte: String(o.texte ?? ""), suite: lines(o.suite ?? [], `${where} option ${i + 1}`) })) };
  };
  for (const pl of reg.planetes ?? []) {
    const where = `planète ${pl.id ?? "?"}`;
    for (const k of ["id", "famille", "titre", "matiere", "emoji", "couleur", "prologue", "objet"]) if (pl[k] === undefined) errors.push(`${where} : champ « ${k} » manquant`);
    if (!famIds.has(pl.famille)) errors.push(`${where} : famille inconnue « ${pl.famille} »`);
    const gardiens = {};
    for (const [cy, g] of Object.entries(pl.gardiens ?? {})) {
      if (!SPRITES.includes(g.sprite)) errors.push(`${where} gardien ${cy} : sprite inconnu « ${g.sprite} » (${SPRITES.join(", ")})`);
      gardiens[cy] = { sprite: g.sprite, nom: g.nom, qui: lines([{ [g.qui ?? "narrateur"]: "." }], `${where} gardien ${cy}`)[0].who, ouverture: g.ouverture ?? "", cri: g.cri ?? "", aie: g.aie ?? ["Aïe !"], nargue: g.nargue ?? ["Raté !"], jeton: g.jeton ?? "☁️" };
    }
    manifest.planetes.push({
      id: pl.id, famille: pl.famille, titre: pl.titre, matiere: pl.matiere, emoji: pl.emoji, couleur: pl.couleur, accroche: pl.accroche ?? "",
      prologue: pl.prologue, objet: pl.objet, echauffement: pl.echauffement ?? "2 minutes de questions éclair", astuces: pl.astuces ?? "Méthodes et astuces",
      liens: pl.liens ?? [], jeux: pl.jeux ?? [], gardiens,
    });
    const h = pl.histoire ? opt(pl.histoire, null) : null;
    if (pl.histoire && !h) warns.push(`${where} : histoire ${pl.histoire} introuvable (la planète fonctionne sans)`);
    if (h) {
      const tag = `histoire ${pl.id}`;
      const H = {
        prologue: lines(h.prologue ?? [], `${tag} prologue`),
        prologueChoix: choix(h.prologue_choix, `${tag} prologue choix`),
        arcs: (h.arcs ?? []).map((a) => {
          if (!worldIds.has(a.final)) errors.push(`${tag} ${a.id} : monde final inconnu ${a.final}`);
          return { id: a.id, titre: a.titre, sousTitre: a.sous_titre, final: a.final, fin: lines(a.fin ?? [], `${tag} ${a.id} fin`) };
        }),
        chapitres: {},
      };
      for (const [id, c] of Object.entries(h.chapitres ?? {})) {
        if (!worldIds.has(id)) errors.push(`${tag} : chapitre pour un monde inconnu ${id}`);
        H.chapitres[id] = { titre: c.titre, objet: c.objet, avant: lines(c.avant ?? [], `${tag} ${id} avant`), apres: lines(c.apres ?? [], `${tag} ${id} apres`), choix: choix(c.choix, `${tag} ${id} choix`) };
      }
      for (const w of loaded) if (w.matiere === pl.id && w.cycle !== "astuces" && !H.chapitres[w.id]) warns.push(`${tag} : pas de chapitre pour le monde ${w.id}`);
      manifest.histoires[pl.id] = H;
    }
  }
  const plIds = new Set(manifest.planetes.map((p) => p.id));
  for (const [pl, doms] of Object.entries(manifest.domaines)) {
    if (!plIds.has(pl)) errors.push(`_domaines : planète inconnue ${pl}`);
    const vus = new Set();
    for (const d of doms ?? []) {
      if (!d.id || !d.titre || !Array.isArray(d.mondes)) errors.push(`_domaines ${pl} : domaine incomplet ${d.id ?? "?"}`);
      for (const m of d.mondes ?? []) {
        if (!worldIds.has(m)) errors.push(`_domaines ${pl}/${d.id} : monde inconnu ${m}`);
        vus.add(m);
      }
    }
    for (const w of loaded) if (w.matiere === pl && w.cycle !== "astuces" && !vus.has(w.id)) warns.push(`_domaines ${pl} : le monde ${w.id} n'est dans aucun domaine`);
  }

  for (const w of loaded) if (!plIds.has(w.matiere)) errors.push(`${w.id} : planète (matière) inconnue « ${w.matiere} » — à déclarer dans _planetes.yaml`);
  for (const p of manifest.planetes) if (!loaded.some((w) => w.matiere === p.id)) warns.push(`planète ${p.id} : aucun monde pour l'instant`);
  // Charte de chaque leçon (audit 2.1) : une scène des mascottes, un « À quoi ça sert ? » et une astuce.
  // Les mondes du cycle « astuces » sont eux-mêmes des recueils d'astuces : on n'y exige pas l'étape astuce.
  for (const w of loaded)
    for (const L of w.lecons ?? []) {
      const k = new Set(L.etapes.map((e) => e.kind));
      const manque = [!k.has("dialogue") && "scène des mascottes", !k.has("a_quoi_ca_sert") && !k.has("vraie_vie") && "« À quoi ça sert ? »", w.cycle !== "astuces" && !k.has("astuce") && "astuce"].filter(Boolean);
      if (manque.length) warns.push(`${w.id}/${L.id} : il manque ${manque.join(", ")}`);
    }
  // ---- Dictionnaire du français : content-src/_dico_*.yaml → public/content/dictionnaire.json (chargé à la demande)
  const NAT = { n: "nom", v: "verbe", a: "adjectif", adv: "adverbe", p: "préposition", c: "conjonction", pr: "pronom", d: "déterminant", i: "interjection", loc: "locution" };
  const dico = [];
  const vus = new Set();
  for (const f of readdirSync(SRC).filter((x) => /^_dico.*\.ya?ml$/.test(x)).sort()) {
    for (const e of load(f) ?? []) {
      const where = `${f} ${e?.m ?? "?"}`;
      if (!e?.m || !e?.d || !e?.n) {
        errors.push(`${where} : il faut m (mot), n (nature) et d (définition)`);
        continue;
      }
      if (!NAT[e.n]) errors.push(`${where} : nature inconnue « ${e.n} » (${Object.keys(NAT).join(", ")})`);
      if (e.n === "n" && !["m", "f", "mf"].includes(e.g)) errors.push(`${where} : genre du nom requis (g: m, f ou mf)`);
      const key = e.m + "|" + e.n;
      if (vus.has(key)) errors.push(`${where} : entrée en double`);
      vus.add(key);
      for (const t of [e.d, e.e ?? ""]) if (/·/.test(t)) errors.push(`${where} : point médian interdit`);
      dico.push({ mot: e.m, nature: NAT[e.n] ?? e.n, genre: e.g, def: e.d, exemple: e.e, syn: e.s ?? [], ant: e.a ?? [], famille: e.f ?? [], etym: e.x, niveau: e.l ?? 1, theme: e.t });
    }
  }
  dico.sort((x, y) => x.mot.localeCompare(y.mot, "fr"));
  writeFileSync(path.join(OUT, "dictionnaire.json"), JSON.stringify(dico));
  manifest.dicoCount = dico.length;
  manifest.version = manifest.changelog[0]?.version ?? "1.0.0";
  writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest));
  console.log(
    `${manifest.worlds.length} mondes · ${lessons} leçons · ${manifest.dicoCount ?? 0} mots au dictionnaire · ${getExerciseCount()} exercices paramétrés · ${manifest.glossaire.length} mots du Grand Livre · ${manifest.enigmes.length} énigmes`,
  );
  if (warns.length) console.log("Avertissements :\n- " + warns.join("\n- "));
  if (errors.length) {
    console.error("ERREURS :\n- " + errors.join("\n- "));
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/build-content.mjs")) main();
