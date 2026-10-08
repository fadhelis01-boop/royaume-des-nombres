// Générateur d'exercices : transforme une description paramétrée (content-src)
// en une question concrète tirée au sort, puis corrige la réponse de l'enfant.
// Les mêmes fonctions servent dans l'application et dans le contrôle qualité
// du contenu (scripts/check-content.ts), qui tire chaque exercice des centaines de fois.

import {
  countTerms,
  equivalent,
  evalStr,
  ExprError,
  fmtNum,
  gcd,
  hasOperation,
  isExpanded,
  isFactored,
  makeRng,
  normalizeUser,
  parse,
  randInt,
  toNumber,
  isTruthy,
  varsOf,
  type Node,
  type Rng,
  type Value,
} from "./expr";
import type { ExSpec, VisSpec } from "./types";

export interface Instance {
  spec: ExSpec;
  seed: number;
  type: ExSpec["type"];
  enonce: string;
  visuel?: VisSpec;
  choix?: string[];
  correct?: number; // index de la bonne réponse (qcm, vf, comparer)
  items?: string[]; // ordre : dans le bon ordre
  shuffled?: number[]; // ordre : permutation affichée
  champs?: { avant: string; apres: string; value: number }[];
  value?: number; // nombre / droite
  values?: number[]; // liste
  texts?: string[]; // texte
  exprNode?: Node; // expression attendue
  exprVars?: string[];
  fixedVars?: Record<string, Value>;
  gauche?: string;
  droite?: string;
  min?: number;
  max?: number;
  pas?: number;
  tolerance?: number;
  cibleAffiche?: string;
  unite?: string;
  indice?: string;
  correction?: string;
  expectedText: string; // réponse attendue, affichée après correction
  clavier: "nombre" | "algebre" | "texte" | "aucun";
  /** Erreurs fréquentes résolues (valeur → explication ciblée). */
  erreurs?: { value: number; message: string }[];
  /** QCM : explication de chaque choix affiché (après mélange). */
  choixMsg?: string[];
  // manipulation
  total?: number;
  parts?: number;
  depart?: number;
  sauts?: number[];
  n?: number;
  d?: number;
  h?: number;
  m?: number;
  pieces?: number[];
  emoji?: string;
}

// ---------- Gabarits « {{ expression }} » ----------
/** Remplace chaque {{…}} par sa valeur. Dans une zone $…$ (KaTeX), les nombres sont mis en forme pour KaTeX. */
export function fill(tpl: string, vars: Record<string, Value>, rng?: Rng): string {
  if (typeof tpl !== "string") return String(tpl ?? "");
  let out = "";
  let i = 0;
  let inMath = false;
  while (i < tpl.length) {
    if (tpl.startsWith("{{", i)) {
      const end = tpl.indexOf("}}", i + 2);
      if (end < 0) throw new ExprError("gabarit non fermé « {{ »");
      const src = tpl.slice(i + 2, end);
      const v = evalStr(src, { vars, rng, math: inMath });
      out += typeof v === "number" ? fmtNum(v, inMath) : typeof v === "boolean" ? (v ? "vrai" : "faux") : v;
      i = end + 2;
      continue;
    }
    const c = tpl[i];
    if (c === "$" && tpl[i - 1] !== "\\") inMath = !inMath;
    out += c;
    i++;
  }
  return out;
}

function resolveVis(v: unknown, vars: Record<string, Value>, rng: Rng): unknown {
  if (typeof v === "string") return v.startsWith("=") ? evalStr(v.slice(1), { vars, rng }) : fill(v, vars, rng);
  if (Array.isArray(v)) return v.map((x) => resolveVis(x, vars, rng));
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) o[k] = resolveVis(x, vars, rng);
    return o;
  }
  return v;
}

// ---------- Tirage des variables ----------
function splitRange(s: string): [string, string] | null {
  // « a+1..20 » (au premier niveau, hors parenthèses)
  let depth = 0;
  for (let i = 0; i < s.length - 1; i++) {
    const c = s[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (depth === 0 && c === "." && s[i + 1] === "." && s[i + 2] !== ".") return [s.slice(0, i), s.slice(i + 2)];
  }
  return null;
}

export function drawVars(spec: Record<string, unknown> | undefined, rng: Rng): Record<string, Value> {
  const vars: Record<string, Value> = {};
  for (const [name, raw] of Object.entries(spec ?? {})) {
    if (typeof raw === "number" || typeof raw === "boolean") vars[name] = raw;
    else if (Array.isArray(raw)) {
      const pick = raw[Math.floor(rng() * raw.length)];
      if (pick && typeof pick === "object") {
        for (const [k, x] of Object.entries(pick)) vars[`${name}_${k}`] = x as Value;
        vars[name] = Object.values(pick)[0] as Value;
      } else vars[name] = pick as Value;
    } else if (typeof raw === "string") {
      const r = splitRange(raw);
      if (r) {
        const lo = Math.ceil(toNumber(evalStr(r[0], { vars, rng })));
        const hi = Math.floor(toNumber(evalStr(r[1], { vars, rng })));
        if (hi < lo) throw new ExprError(`intervalle vide pour ${name} (${lo}..${hi})`);
        vars[name] = randInt(rng, lo, hi);
      } else vars[name] = evalStr(raw, { vars, rng });
    } else throw new ExprError(`variable ${name} : valeur non reconnue`);
  }
  return vars;
}

const shuffle = <T,>(a: T[], rng: Rng) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

export const normText = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const COMPARE = ["<", "=", ">"];

/** Tire une question concrète. Lève une ExprError si la description est incohérente. */
export function instantiate(spec: ExSpec, seed: number): Instance {
  const rng = makeRng(seed);
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    let vars: Record<string, Value>;
    try {
      vars = drawVars(spec.vars, rng);
      if (spec.si && !isTruthy(evalStr(spec.si, { vars, rng }))) continue;
    } catch (e) {
      lastErr = e;
      if (e instanceof ExprError && /intervalle vide/.test(e.message)) continue;
      throw e;
    }
    const inst = build(spec, vars, rng, seed);
    if (inst) return inst;
  }
  throw lastErr instanceof Error ? lastErr : new ExprError("impossible de tirer une question qui respecte les contraintes (si / choix distincts)");
}

function build(spec: ExSpec, vars: Record<string, Value>, rng: Rng, seed: number): Instance | null {
  const f = (s: string | undefined) => (s === undefined ? undefined : fill(s, vars, rng));
  const unite = f(spec.unite);
  const base: Instance = {
    spec,
    seed,
    type: spec.type,
    enonce: fill(spec.enonce, vars, rng),
    visuel: spec.visuel ? (resolveVis(spec.visuel, vars, rng) as VisSpec) : undefined,
    unite,
    indice: f(spec.indice),
    correction: f(spec.correction),
    expectedText: "",
    clavier: spec.clavier === "texte" ? "texte" : "nombre",
  };
  const u = unite ? " " + unite : "";
  const num = (e: unknown) => toNumber(evalStr(String(e), { vars, rng }));
  if (spec.erreurs?.length) {
    base.erreurs = spec.erreurs.map((x) => ({ value: num(x.valeur), message: fill(x.message, vars, rng) })).filter((x) => isFinite(x.value));
  }
  switch (spec.type) {
    case "blocs": {
      base.value = Math.round(num(spec.cible));
      if (!(base.value >= 0 && base.value <= 9999)) return null;
      base.expectedText = fmtNum(base.value);
      base.clavier = "aucun";
      return base;
    }
    case "partage": {
      base.total = Math.round(num(spec.total));
      base.parts = Math.round(num(spec.parts));
      if (!(base.parts >= 2 && base.parts <= 8 && base.total >= base.parts && base.total <= 60 && base.total % base.parts === 0)) return null;
      base.emoji = spec.emoji ? fill(spec.emoji, vars, rng) : "🍎";
      base.expectedText = `${base.total / base.parts} dans chaque panier`;
      base.clavier = "aucun";
      return base;
    }
    case "sauts": {
      base.depart = num(spec.depart);
      base.value = num(spec.cible);
      base.min = spec.min !== undefined ? num(spec.min) : Math.min(base.depart, base.value) - 5;
      base.max = spec.max !== undefined ? num(spec.max) : Math.max(base.depart, base.value) + 5;
      base.sauts = spec.sauts_permis ?? [1, 10, -1, -10];
      if (base.value < base.min || base.value > base.max || base.depart < base.min || base.depart > base.max) return null;
      base.expectedText = `arriver sur ${fmtNum(base.value)}`;
      base.clavier = "aucun";
      return base;
    }
    case "colorier": {
      base.n = Math.round(num(spec.n));
      base.d = Math.round(num(spec.d));
      if (!(base.d >= 2 && base.d <= 12 && base.n >= 0 && base.n <= base.d)) return null;
      base.expectedText = `${base.n} part${base.n > 1 ? "s" : ""} sur ${base.d}`;
      base.clavier = "aucun";
      return base;
    }
    case "horloge": {
      base.h = ((Math.round(num(spec.h)) % 12) + 12) % 12;
      base.m = Math.round(num(spec.m));
      if (base.m % 5 !== 0 || base.m < 0 || base.m > 55) return null;
      base.expectedText = `${base.h === 0 ? 12 : base.h} h ${String(base.m).padStart(2, "0")}`;
      base.clavier = "aucun";
      return base;
    }
    case "payer": {
      base.value = Math.round(num(spec.cible) * 100) / 100;
      base.pieces = spec.pieces ?? [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
      if (!(base.value > 0 && base.value <= 500)) return null;
      base.expectedText = `${fmtNum(base.value, false, base.value % 1 ? 2 : undefined)} €`;
      base.clavier = "aucun";
      return base;
    }
    case "nombre": {
      const v = toNumber(evalStr(String(spec.reponse), { vars, rng }));
      if (!isFinite(v)) return null;
      base.value = v;
      base.tolerance = spec.tolerance ?? 0;
      // une « erreur fréquente » qui tombe sur la bonne réponse n'a pas de sens pour ce tirage
      if (base.erreurs) base.erreurs = base.erreurs.filter((e) => Math.abs(e.value - v) > 1e-9);
      if (spec.forme === "fraction" || spec.forme === "irreductible") {
        const { n, d } = toFraction(v);
        base.expectedText = d === 1 ? fmtNum(n) : `${n}/${d}`;
      } else base.expectedText = fmtNum(v) + u;
      return base;
    }
    case "champs": {
      base.champs = (spec.champs ?? []).map((c) => ({
        avant: f(c.avant) ?? "",
        apres: f(c.apres) ?? "",
        value: toNumber(evalStr(String(c.reponse), { vars, rng })),
      }));
      if (base.champs.some((c) => !isFinite(c.value))) return null;
      base.expectedText = base.champs.map((c) => `${c.avant} ${fmtNum(c.value)} ${c.apres}`.replace(/\s+/g, " ").trim()).join(" · ");
      return base;
    }
    case "liste": {
      const list = Array.isArray(spec.reponse) ? spec.reponse : [spec.reponse];
      // une seule expression qui renvoie « 1 ; 2 ; 4 » est aussi acceptée
      base.values = list.flatMap((r) => {
        const v = evalStr(String(r), { vars, rng });
        return typeof v === "string" && v.includes(";") ? v.split(";").map((x) => toNumber(x.trim())) : [toNumber(v)];
      });
      if (base.values.some((x) => !isFinite(x))) return null;
      base.expectedText = [...base.values].sort((a, b) => a - b).map((x) => fmtNum(x)).join(" ; ");
      return base;
    }
    case "qcm": {
      const opts = (spec.choix ?? []).map((c) => fill(String(c), vars, rng));
      if (new Set(opts.map((o) => o.trim())).size !== opts.length) return null; // distracteur identique → nouveau tirage
      const order = spec.ordre_fixe ? opts.map((_, i) => i) : shuffle(opts.map((_, i) => i), rng);
      base.choix = order.map((i) => opts[i]);
      base.correct = order.indexOf(0);
      if (spec.explications?.length) base.choixMsg = order.map((i) => (spec.explications![i] ? fill(spec.explications![i], vars, rng) : ""));
      base.expectedText = opts[0];
      base.clavier = "aucun";
      return base;
    }
    case "vf": {
      const r = typeof spec.reponse === "boolean" ? spec.reponse : isTruthy(evalStr(String(spec.reponse), { vars, rng }));
      base.choix = ["Vrai", "Faux"];
      base.correct = r ? 0 : 1;
      base.expectedText = r ? "Vrai" : "Faux";
      base.clavier = "aucun";
      return base;
    }
    case "comparer": {
      const g = toNumber(evalStr(String(spec.gauche), { vars, rng }));
      const d = toNumber(evalStr(String(spec.droite), { vars, rng }));
      base.gauche = spec.gauche_affiche ? fill(spec.gauche_affiche, vars, rng) : fmtNum(g);
      base.droite = spec.droite_affiche ? fill(spec.droite_affiche, vars, rng) : fmtNum(d);
      base.choix = COMPARE;
      base.correct = Math.abs(g - d) < 1e-9 ? 1 : g < d ? 0 : 2;
      base.expectedText = `${base.gauche} ${COMPARE[base.correct]} ${base.droite}`;
      base.clavier = "aucun";
      return base;
    }
    case "expression": {
      const src = fill(String(spec.reponse), vars, rng).replace(/\$/g, "");
      const node = parse(src, { implicitMul: true });
      base.exprNode = node;
      base.exprVars = spec.variables ?? [...varsOf(node)];
      base.expectedText = prettyExpr(src);
      base.clavier = "algebre";
      return base;
    }
    case "ordre": {
      base.items = (spec.items ?? []).map((s) => fill(String(s), vars, rng));
      if (new Set(base.items).size !== base.items.length) return null;
      let perm = shuffle(base.items.map((_, i) => i), rng);
      if (perm.every((p, i) => p === i) && perm.length > 1) perm = [...perm.slice(1), perm[0]];
      base.shuffled = perm;
      base.expectedText = base.items.join(" → ");
      base.clavier = "aucun";
      return base;
    }
    case "droite": {
      base.min = toNumber(evalStr(String(spec.min ?? 0), { vars, rng }));
      base.max = toNumber(evalStr(String(spec.max ?? 10), { vars, rng }));
      base.pas = toNumber(evalStr(String(spec.pas ?? 1), { vars, rng }));
      base.value = toNumber(evalStr(String(spec.cible), { vars, rng }));
      if (!(base.value >= base.min && base.value <= base.max)) return null;
      base.tolerance = spec.tolerance ?? (base.max - base.min) / 40;
      base.cibleAffiche = spec.cible_affiche ? fill(spec.cible_affiche, vars, rng) : fmtNum(base.value);
      base.expectedText = base.cibleAffiche;
      base.clavier = "aucun";
      return base;
    }
    case "texte": {
      const list = Array.isArray(spec.reponse) ? spec.reponse : [spec.reponse];
      base.texts = list.map((r) => fill(String(r), vars, rng));
      base.expectedText = base.texts[0];
      base.clavier = "texte";
      return base;
    }
  }
  throw new ExprError(`type d'exercice inconnu « ${spec.type} »`);
}

export function toFraction(x: number, maxDen = 10000): { n: number; d: number } {
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(x * d);
    if (Math.abs(n / d - x) < 1e-9) {
      const g = gcd(n, d) || 1;
      return { n: n / g, d: d / g };
    }
  }
  return { n: x, d: 1 };
}

export function prettyExpr(s: string): string {
  return s
    .replace(/\s+/g, "")
    .replace(/\+-/g, "-")
    .replace(/--/g, "+")
    .replace(/\*\*/g, "^")
    .replace(/sqrt/g, "√")
    .replace(/\bpi\b/g, "π")
    .replace(/(\d)\*([a-zA-Z(√])/g, "$1$2")
    .replace(/\)\*\(/g, ")(")
    .replace(/\*/g, " × ")
    .replace(/\^2(?!\d)/g, "²")
    .replace(/\^3(?!\d)/g, "³")
    .replace(/([^ (])([+\-])/g, "$1 $2 ")
    .replace(/\./g, ",")
    .replace(/-/g, "−");
}

// ---------- Correction ----------
export type Answer =
  | { kind: "text"; value: string }
  | { kind: "choice"; index: number }
  | { kind: "order"; order: number[] } // indices des items (dans l'ordre choisi)
  | { kind: "point"; value: number }
  | { kind: "fields"; values: string[] }
  | { kind: "state"; values: number[] };

export interface Verdict {
  ok: boolean;
  /** « presque » : bonne valeur mais mauvaise forme (ex. fraction non simplifiée). */
  almost?: string;
  /** Explication ciblée d'une erreur fréquente. */
  why?: string;
  invalid?: string; // saisie illisible : on ne compte pas d'erreur
}

/** Lit un nombre tapé par un enfant : « 12 », « −3 », « 2,5 », « 3/4 », « 1 000 ». */
export function readNumber(raw: string): { v: number; frac?: { n: number; d: number } } | null {
  const s = normalizeUser(raw).replace(/\s+/g, "").replace(/%$/, "").replace(/€$/, "");
  let m = /^([+-]?\d+(?:\.\d+)?)$/.exec(s);
  if (m) return { v: parseFloat(m[1]) };
  m = /^([+-]?)(\d+)\/([+-]?\d+)$/.exec(s);
  if (m) {
    const n = parseInt(m[2]) * (m[1] === "-" ? -1 : 1),
      d = parseInt(m[3]);
    if (d === 0) return null;
    return { v: n / d, frac: { n, d } };
  }
  m = /^\(?([+-]?\d+)\)?\/\(?([+-]?\d+)\)?$/.exec(s);
  if (m && parseInt(m[2]) !== 0) return { v: parseInt(m[1]) / parseInt(m[2]), frac: { n: parseInt(m[1]), d: parseInt(m[2]) } };
  return null;
}

const close = (a: number, b: number, tol = 0) => Math.abs(a - b) <= Math.max(tol, 1e-9 * Math.max(1, Math.abs(b)));

export function check(inst: Instance, ans: Answer): Verdict {
  const v = checkRaw(inst, ans);
  if (v.ok || v.invalid) return v;
  // erreur fréquente reconnue → explication ciblée
  if (inst.type === "qcm" && ans.kind === "choice" && inst.choixMsg?.[ans.index]) return { ...v, why: inst.choixMsg[ans.index] };
  if (inst.erreurs?.length && ans.kind === "text") {
    const r = readNumber(ans.value);
    const hit = r && inst.erreurs.find((e) => Math.abs(e.value - r.v) < 1e-9);
    if (hit) return { ...v, why: hit.message };
  }
  return v;
}

function checkRaw(inst: Instance, ans: Answer): Verdict {
  switch (inst.type) {
    case "blocs":
    case "sauts":
      return { ok: ans.kind === "state" && Math.abs(ans.values[0] - inst.value!) < 1e-9 };
    case "payer":
      return { ok: ans.kind === "state" && Math.abs(ans.values[0] - inst.value!) < 0.005 };
    case "colorier":
      return { ok: ans.kind === "state" && ans.values[0] === inst.n };
    case "horloge":
      return { ok: ans.kind === "state" && ((ans.values[0] % 12) + 12) % 12 === inst.h && ans.values[1] === inst.m };
    case "partage": {
      if (ans.kind !== "state") return { ok: false };
      const each = inst.total! / inst.parts!;
      return { ok: ans.values.length === inst.parts && ans.values.every((x) => x === each) };
    }
    case "qcm":
    case "vf":
    case "comparer":
      return { ok: ans.kind === "choice" && ans.index === inst.correct };
    case "ordre":
      return { ok: ans.kind === "order" && ans.order.every((x, i) => x === i) && ans.order.length === inst.items!.length };
    case "droite":
      return { ok: ans.kind === "point" && Math.abs(ans.value - inst.value!) <= inst.tolerance! + 1e-9 };
    case "nombre": {
      if (ans.kind !== "text") return { ok: false };
      const r = readNumber(ans.value);
      if (!r) return { ok: false, invalid: "Écris seulement un nombre (par exemple 12, 2,5 ou 3/4)." };
      const ok = close(r.v, inst.value!, inst.tolerance);
      if (!ok) return { ok: false };
      const forme = inst.spec.forme;
      if (forme === "irreductible") {
        if (!r.frac && !Number.isInteger(inst.value!)) return { ok: false, almost: "C'est la bonne valeur ! Mais on te demande une fraction." };
        if (r.frac && gcd(r.frac.n, r.frac.d) !== 1) return { ok: false, almost: "Bonne valeur ! Mais tu peux encore simplifier ta fraction." };
      }
      if (forme === "fraction" && !r.frac && !Number.isInteger(inst.value!)) return { ok: false, almost: "Bonne valeur ! Écris-la sous forme de fraction." };
      return { ok: true };
    }
    case "champs": {
      if (ans.kind !== "fields") return { ok: false };
      const ok = inst.champs!.every((c, i) => {
        const r = readNumber(ans.values[i] ?? "");
        return !!r && close(r.v, c.value);
      });
      if (!ok && ans.values.some((v) => v.trim() && !readNumber(v))) return { ok: false, invalid: "Écris seulement des nombres dans les cases." };
      return { ok };
    }
    case "liste": {
      if (ans.kind !== "text") return { ok: false };
      const parts = normalizeUser(ans.value)
        .split(/[;]|\bet\b|\bou\b/)
        .map((s) => s.trim())
        .filter(Boolean);
      const nums = parts.map(readNumber);
      if (nums.some((x) => !x)) return { ok: false, invalid: "Sépare tes réponses par un point-virgule « ; »." };
      const want = [...inst.values!].sort((a, b) => a - b);
      const got = nums.map((x) => x!.v).sort((a, b) => a - b);
      const uniq = (a: number[]) => a.filter((x, i) => i === 0 || !close(x, a[i - 1]));
      const W = uniq(want),
        G = uniq(got);
      return { ok: W.length === G.length && W.every((x, i) => close(x, G[i])) };
    }
    case "texte": {
      if (ans.kind !== "text") return { ok: false };
      const g = normText(ans.value);
      return { ok: inst.texts!.some((t) => normText(t) === g) };
    }
    case "expression": {
      if (ans.kind !== "text") return { ok: false };
      let node: Node;
      try {
        node = parse(ans.value, { implicitMul: true });
      } catch (e) {
        return { ok: false, invalid: `Je n'arrive pas à lire ton écriture : ${(e as Error).message}.` };
      }
      const extra = [...varsOf(node)].filter((v) => !inst.exprVars!.includes(v));
      if (extra.length) return { ok: false, invalid: `La lettre « ${extra[0]} » n'est pas utilisée dans ce problème.` };
      if (!equivalent(node, inst.exprNode!, inst.exprVars!)) return { ok: false };
      const spec = inst.spec;
      if (spec.calcul && !hasOperation(node)) return { ok: false, almost: "Le résultat est juste, mais on te demande d'écrire le calcul (avec les opérations)." };
      if (spec.forme === "developpee" && !isExpanded(node)) return { ok: false, almost: "C'est égal, mais ce n'est pas encore développé : supprime les parenthèses." };
      if (spec.forme === "reduite" && (!isExpanded(node) || countTerms(node) > countTerms(inst.exprNode!)))
        return { ok: false, almost: "C'est égal, mais tu peux encore réduire (regrouper les termes semblables)." };
      if (spec.forme === "factorisee" && !isFactored(node)) return { ok: false, almost: "C'est égal, mais ce n'est pas une forme factorisée (un produit)." };
      return { ok: true };
    }
  }
  return { ok: false };
}

/** Graine aléatoire (différente à chaque question). */
export const newSeed = () => (Math.random() * 2 ** 31) >>> 0;
