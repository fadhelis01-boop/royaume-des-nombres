// Contrôle qualité du contenu, exécuté à chaque compilation (npm run build).
// Chaque exercice paramétré est tiré au sort de nombreuses fois :
//  • aucune erreur de calcul ni de gabarit (NaN, undefined, « {{ » oublié…) ;
//  • la bonne réponse, saisie comme le ferait un enfant, est bien acceptée ;
//  • tout le LaTeX (formules) se compile ;
//  • les visuels utilisent des types connus.
// Plus des tests unitaires du moteur (nombres en lettres, analyse des saisies…).
import { readFileSync } from "node:fs";
import katex from "katex";
import { instantiate, check, toFraction, type Instance, type Answer } from "../src/lib/gen";
import { enLettres, fmtNum, parse, isExpanded, isFactored, equivalent, evalStr, clean } from "../src/lib/expr";
import type { ExSpec, Manifest, World, Step } from "../src/lib/types";
import { VISUEL_TYPES } from "../src/lib/visuel-types";

const errors: string[] = [];
const warns: string[] = [];
let draws = 0;

// ---------- Tests unitaires du moteur ----------
function eq(label: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) errors.push(`moteur — ${label} : obtenu ${JSON.stringify(got)}, attendu ${JSON.stringify(want)}`);
}
eq("lettres 21", enLettres(21), "vingt-et-un");
eq("lettres 71", enLettres(71), "soixante-et-onze");
eq("lettres 80", enLettres(80), "quatre-vingts");
eq("lettres 81", enLettres(81), "quatre-vingt-un");
eq("lettres 91", enLettres(91), "quatre-vingt-onze");
eq("lettres 200", enLettres(200), "deux-cents");
eq("lettres 280", enLettres(280), "deux-cent-quatre-vingts");
eq("lettres 1000", enLettres(1000), "mille");
eq("lettres 80000", enLettres(80000), "quatre-vingt-mille");
eq("lettres 200000", enLettres(200000), "deux-cent-mille");
eq("lettres 2507340", enLettres(2507340), "deux millions cinq-cent-sept-mille-trois-cent-quarante");
eq("lettres 1000000000", enLettres(1e9), "un milliard");
eq("fmt 12345.6", fmtNum(12345.6), "12 345,6");
eq("fmt 0.1+0.2", fmtNum(0.1 + 0.2), "0,3");
eq("fmt math 1500", fmtNum(1500, true), "1\\,500");
eq("clean -0", clean(-0), 0);
eq("implicite 2x+3 en x=2", evalStr("2x+3", { vars: { x: 2 } }, { implicitMul: true }), 7);
eq("implicite 3(x+1)² en x=1", evalStr("3(x+1)²", { vars: { x: 1 } }, { implicitMul: true }), 12);
eq("-x^2 en x=3", evalStr("-x^2", { vars: { x: 3 } }), -9);
eq("virgule 2,5×4", evalStr("2,5×4", { vars: {} }, { implicitMul: true }), 10);
eq("√16", evalStr("√16", { vars: {} }, { implicitMul: true }), 4);
eq("développé 2x+6", isExpanded(parse("2x+6", { implicitMul: true })), true);
eq("développé 2(x+3)", isExpanded(parse("2(x+3)", { implicitMul: true })), false);
eq("factorisé 2(x+3)", isFactored(parse("2(x+3)", { implicitMul: true })), true);
eq("factorisé (x-1)(x+1)", isFactored(parse("(x-1)(x+1)", { implicitMul: true })), true);
eq("factorisé x²-1", isFactored(parse("x²-1", { implicitMul: true })), false);
eq("équivalence (x+1)² / x²+2x+1", equivalent(parse("(x+1)^2", { implicitMul: true }), parse("x^2+2x+1", { implicitMul: true }), ["x"]), true);
eq("non-équivalence", equivalent(parse("(x+1)^2", { implicitMul: true }), parse("x^2+1", { implicitMul: true }), ["x"]), false);

// ---------- Réponse « idéale » telle qu'un enfant la taperait ----------
const typed = (v: number) => String(clean(v)).replace(".", ",");
function idealAnswer(inst: Instance): Answer {
  switch (inst.type) {
    case "mot":
      return { kind: "text", value: inst.texts![0] };
    case "dictee":
      return { kind: "text", value: inst.dictee! };
    case "surligner":
      return { kind: "state", values: inst.targets! };
    case "classer":
      return { kind: "state", values: inst.itemCats! };
    case "nombre": {
      if (inst.spec.forme === "fraction" || inst.spec.forme === "irreductible") {
        const { n, d } = toFraction(inst.value!);
        return { kind: "text", value: d === 1 ? String(n) : `${n}/${d}` };
      }
      return { kind: "text", value: typed(inst.value!) };
    }
    case "champs":
      return { kind: "fields", values: inst.champs!.map((c) => typed(c.value)) };
    case "liste":
      return { kind: "text", value: inst.values!.map(typed).join(" ; ") };
    case "expression":
      return { kind: "text", value: inst.expectedText };
    case "texte":
      return { kind: "text", value: inst.texts![0] };
    case "ordre":
      return { kind: "order", order: inst.items!.map((_, i) => i) };
    case "droite":
      return { kind: "point", value: inst.value! };
    case "blocs":
    case "sauts":
    case "payer":
      return { kind: "state", values: [inst.value!] };
    case "colorier":
      return { kind: "state", values: [inst.n!] };
    case "horloge":
      return { kind: "state", values: [inst.h!, inst.m!] };
    case "partage":
      return { kind: "state", values: Array(inst.parts!).fill(inst.total! / inst.parts!) };
    default:
      return { kind: "choice", index: inst.correct! };
  }
}

function checkKatex(s: string | undefined, where: string) {
  if (!s) return;
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    try {
      katex.renderToString(m[1] ?? m[2], { throwOnError: true, displayMode: !!m[1], strict: "ignore" });
    } catch (e) {
      errors.push(`${where} : formule LaTeX invalide « ${(m[1] ?? m[2]).slice(0, 60)} » — ${(e as Error).message.split("\n")[0]}`);
      return;
    }
  }
}

const BAD = /NaN|undefined|Infinity|\{\{|\[object/;
function checkText(s: string | undefined, where: string) {
  if (!s) return;
  if (BAD.test(s)) errors.push(`${where} : texte suspect « ${s.slice(0, 120)} »`);
  if (/\\\\[a-zA-Z]/.test(s)) errors.push(`${where} : double antislash devant une commande LaTeX : ${s.slice(0, 120)}`);
  checkKatex(s, where);
}

function checkVisuel(v: unknown, where: string) {
  if (!v || typeof v !== "object") return;
  const t = (v as { type?: string }).type;
  if (!t || !VISUEL_TYPES.includes(t)) errors.push(`${where} : type de visuel inconnu « ${t} » (connus : ${VISUEL_TYPES.join(", ")})`);
  if (/NaN|undefined|Infinity|\{\{|\[object/.test(JSON.stringify(v))) errors.push(`${where} : visuel suspect ${JSON.stringify(v).slice(0, 150)}`);
}

function checkExercise(spec: ExSpec, where: string, n = 160) {
  const seen = new Set<string>();
  for (let seed = 1; seed <= n; seed++) {
    let inst: Instance;
    try {
      inst = instantiate(spec, seed * 7919);
    } catch (e) {
      errors.push(`${where} : ${(e as Error).message}`);
      return;
    }
    draws++;
    seen.add(inst.enonce + JSON.stringify(inst.visuel ?? "") + (inst.choix ?? []).join("|") + inst.gauche + inst.droite + (inst.items ?? []).join("|") + inst.cibleAffiche + (inst.dictee ?? "") + (inst.words ?? []).join(" "));
    const w = `${where} (tirage ${seed})`;
    for (const s of [inst.enonce, inst.indice, inst.correction, inst.expectedText, inst.gauche, inst.droite, inst.unite, ...(inst.choix ?? []), ...(inst.items ?? [])])
      checkText(s, w);
    for (const e of inst.erreurs ?? []) {
      checkText(e.message, w);
      if (Math.abs(e.value - (inst.value ?? NaN)) < 1e-9) errors.push(`${w} : une « erreur fréquente » est égale à la bonne réponse`);
    }
    for (const m of inst.choixMsg ?? []) checkText(m, w);
    for (const c of inst.champs ?? []) {
      checkText(c.avant, w);
      checkText(c.apres, w);
    }
    checkVisuel(inst.visuel, w);
    let verdict;
    try {
      verdict = check(inst, idealAnswer(inst));
    } catch (e) {
      errors.push(`${w} : la correction plante — ${(e as Error).message}`);
      return;
    }
    if (!verdict.ok) {
      errors.push(`${w} : la bonne réponse « ${inst.expectedText} » est refusée${verdict.almost ? " (" + verdict.almost + ")" : ""}${verdict.invalid ? " (" + verdict.invalid + ")" : ""} — énoncé : ${inst.enonce.slice(0, 100)}`);
      return;
    }
    if (inst.type === "qcm" && (inst.choix?.length ?? 0) < 2) errors.push(`${w} : QCM avec moins de 2 choix`);
    if (!spec.vars) break; // exercice fixe : un tirage suffit
  }
  if (spec.vars && seen.size < 3) warns.push(`${where} : peu de variété (${seen.size} questions différentes)`);
}

function checkStep(s: Step, where: string) {
  switch (s.kind) {
    case "dialogue":
      s.lines.forEach((l, i) => checkText(l.text, `${where} réplique ${i + 1}`));
      break;
    case "texte":
    case "histoire":
    case "a_quoi_ca_sert":
    case "astuce":
    case "attention":
    case "retiens":
      checkText(s.texte, where);
      break;
    case "visuel":
      checkVisuel(s.visuel, where);
      if ("legende" in s) checkText(s.legende, where);
      break;
    case "exemple":
      checkText(s.enonce, where);
      s.etapes.forEach((e) => checkText(e, where));
      checkText(s.reponse, where);
      if (s.visuel) checkVisuel(s.visuel, where);
      break;
    case "question":
      if (!s.auto) checkExercise(s.ex, where);
      break;
    case "explique":
      checkText(s.texte, where);
      s.choix.forEach((c) => (checkText(c.texte, where), checkText(c.retour, where)));
      if (!s.choix.some((c) => c.ok)) errors.push(`${where} : explique sans aucune bonne méthode`);
      break;
    case "vraie_vie":
      checkText(s.texte, where);
      break;
  }
}

// ---------- Parcours de tout le contenu ----------
const manifest: Manifest = JSON.parse(readFileSync("public/content/manifest.json", "utf8"));
let lessons = 0;
for (const ref of manifest.worlds) {
  const w: World = JSON.parse(readFileSync("public/content/" + ref.file, "utf8"));
  (w.intro ?? []).forEach((l) => checkText(l.text, `${w.id} intro`));
  for (const l of w.lecons) {
    lessons++;
    const where = `${w.id}/${l.id}`;
    l.etapes.forEach((s, i) => checkStep(s, `${where} étape ${i + 1}`));
    l.exercices.forEach((e, i) => checkExercise(e, `${where} exercice ${i + 1}`));
    if (l.exercices.length < 3) warns.push(`${where} : seulement ${l.exercices.length} exercice(s)`);
  }
}
manifest.diagnostic.forEach((d, i) => checkExercise(d.ex, `diagnostic ${i + 1}`, 40));
for (const [id, j] of Object.entries(manifest.jeux)) j.exercices.forEach((e, i) => checkExercise(e, `jeu ${id} ${i + 1}`));
for (const e of manifest.enigmes) {
  checkText(e.texte, `énigme ${e.id}`);
  checkText(e.solution, `énigme ${e.id}`);
}
if (manifest.histoire) {
  const choixLines = [manifest.histoire.prologueChoix, ...Object.values(manifest.histoire.chapitres).map((c) => c.choix)].filter((x) => !!x).flatMap((x) => [[{ who: x!.qui, text: x!.question }, ...x!.options.map((o) => ({ who: x!.qui, text: o.texte }))], ...x!.options.map((o) => o.suite)]);
  const all = [manifest.histoire.prologue, ...manifest.histoire.arcs.map((a) => a.fin), ...Object.values(manifest.histoire.chapitres).flatMap((c) => [c.avant, c.apres]), ...choixLines];
  all.forEach((ls, i) => ls.forEach((l) => checkText(l.text, `histoire ${i}`)));
}
for (const g of manifest.glossaire) {
  checkText(g.def, `glossaire ${g.mot}`);
  checkText(g.exemple, `glossaire ${g.mot}`);
}

console.log(`Contrôle : ${manifest.worlds.length} mondes, ${lessons} leçons, ${draws} questions tirées et corrigées automatiquement.`);
if (warns.length) console.log("Avertissements :\n- " + warns.slice(0, 60).join("\n- ") + (warns.length > 60 ? `\n… et ${warns.length - 60} autres` : ""));
if (errors.length) {
  console.error(`ERREURS (${errors.length}) :\n- ` + errors.slice(0, 80).join("\n- "));
  process.exit(1);
}
console.log("Tout est correct ✔");
