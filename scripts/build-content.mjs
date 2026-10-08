// Compile les mondes (content-src/*.yaml) en JSON servis par l'application.
//
//   content-src/NN-<monde>.yaml    un monde = un domaine des maths (leçons, exercices)
//   content-src/_glossaire.yaml    le Grand Livre (définitions sourcées)
//   content-src/_enigmes.yaml      énigmes du jour
//   content-src/_diagnostic.yaml   test de positionnement
//   content-src/_jeux.yaml         familles de questions des jeux (Calcul éclair…)
//   content-src/_changelog.yaml    journal des mises à jour
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
    glossaire: opt("_glossaire.yaml", []),
    enigmes: opt("_enigmes.yaml", []),
    diagnostic: [],
    jeux: {},
    changelog: opt("_changelog.yaml", []),
  };
  let lessons = 0;
  const worldIds = new Set();
  const files = readdirSync(SRC).filter((f) => f.endsWith(".yaml") && !f.startsWith("_")).sort();
  const loaded = [];
  for (const f of files) {
    let w;
    try {
      w = load(f);
    } catch (e) {
      errors.push(`${f} : YAML invalide — ${e.message.split("\n").slice(0, 3).join(" ")}`);
      continue;
    }
    const nw = normalizeWorld(w, f);
    if (worldIds.has(nw.id)) errors.push(`${f} : monde en double ${nw.id}`);
    worldIds.add(nw.id);
    loaded.push(nw);
    lessons += nw.lecons.length;
  }
  for (const w of loaded) {
    for (const p of w.prerequis) if (!worldIds.has(p)) errors.push(`${w.id} : prérequis inconnu ${p}`);
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
  for (const [i, e] of manifest.enigmes.entries()) {
    for (const k of ["id", "niveau", "titre", "texte", "reponse", "solution"]) if (e[k] === undefined) errors.push(`énigme ${e.id ?? i + 1} : champ « ${k} » manquant`);
    e.reponse = String(e.reponse);
  }
  for (const g of manifest.glossaire) {
    if (!g.mot || !g.def) errors.push(`glossaire : entrée incomplète ${g.mot ?? "?"}`);
    if (g.monde && !worldIds.has(g.monde)) errors.push(`glossaire ${g.mot} : monde inconnu ${g.monde}`);
  }
  // L'aventure (fil rouge narratif)
  const h = opt("_histoire.yaml", null);
  // Un choix narratif : une question, 2 ou 3 options, chacune suivie de quelques répliques.
  const choix = (c, where) => {
    if (!c) return undefined;
    if (!c.question || !Array.isArray(c.options) || c.options.length < 2) {
      errors.push(`${where} : il faut « question » et au moins 2 « options »`);
      return undefined;
    }
    return { qui: c.qui ?? "mia", question: String(c.question), options: c.options.map((o, i) => ({ texte: String(o.texte ?? ""), suite: lines(o.suite ?? [], `${where} option ${i + 1}`) })) };
  };
  if (h) {
    manifest.histoire = {
      prologue: lines(h.prologue ?? [], "histoire prologue"),
      prologueChoix: choix(h.prologue_choix, "histoire prologue choix"),
      arcs: (h.arcs ?? []).map((a) => {
        if (!worldIds.has(a.final)) errors.push(`histoire ${a.id} : monde final inconnu ${a.final}`);
        return { id: a.id, titre: a.titre, sousTitre: a.sous_titre, final: a.final, fin: lines(a.fin ?? [], `histoire ${a.id} fin`) };
      }),
      chapitres: {},
    };
    for (const [id, c] of Object.entries(h.chapitres ?? {})) {
      if (!worldIds.has(id)) errors.push(`histoire : chapitre pour un monde inconnu ${id}`);
      manifest.histoire.chapitres[id] = { titre: c.titre, objet: c.objet, avant: lines(c.avant ?? [], `histoire ${id} avant`), apres: lines(c.apres ?? [], `histoire ${id} apres`), choix: choix(c.choix, `histoire ${id} choix`) };
    }
    for (const id of worldIds) if (!manifest.histoire.chapitres[id]) warns.push(`histoire : pas de chapitre pour le monde ${id}`);
  }
  manifest.version = manifest.changelog[0]?.version ?? "1.0.0";
  writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest));
  console.log(
    `${manifest.worlds.length} mondes · ${lessons} leçons · ${getExerciseCount()} exercices paramétrés · ${manifest.glossaire.length} mots du Grand Livre · ${manifest.enigmes.length} énigmes`,
  );
  if (warns.length) console.log("Avertissements :\n- " + warns.join("\n- "));
  if (errors.length) {
    console.error("ERREURS :\n- " + errors.join("\n- "));
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/build-content.mjs")) main();
