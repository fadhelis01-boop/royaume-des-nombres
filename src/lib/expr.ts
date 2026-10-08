// Moteur d'expressions mathématiques — sans eval(), sûr et déterministe.
import * as FC from "./fr/conjugaison";
import * as FR from "./fr/morpho";
//
// Deux usages :
//  • « auteur » : les fichiers de contenu décrivent des exercices paramétrés
//    (variables tirées au sort, réponses calculées, contraintes) ;
//  • « élève » : ce que l'enfant tape (« 3x+2 », « 2(x−1)² », « 3/4 », « 0,75 »)
//    est analysé pour être comparé à la réponse attendue.

export type Value = number | string | boolean;

export type Node =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "var"; name: string }
  | { k: "un"; op: "-" | "!"; a: Node }
  | { k: "bin"; op: string; a: Node; b: Node }
  | { k: "call"; name: string; args: Node[] };

export class ExprError extends Error {}

// ---------- Hasard reproductible ----------
export type Rng = () => number;
export function makeRng(seed: number): Rng {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randInt = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

// ---------- Analyse lexicale ----------
type Tok = { t: "num" | "id" | "op" | "str" | "end"; v: string };

const SUPERSCRIPTS: Record<string, string> = { "²": "^2", "³": "^3", "⁴": "^4" };

export function normalizeUser(src: string): string {
  return src
    .replace(/[   ]/g, " ")
    .replace(/[×·∙⋅]/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/π/g, "pi")
    .replace(/[²³⁴]/g, (c) => SUPERSCRIPTS[c])
    .replace(/√/g, "sqrt")
    .replace(/(\d)\s+(?=\d{3}\b)/g, "$1") // 1 000 → 1000
    .replace(/(\d),(\d)/g, "$1.$2") // virgule décimale
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/≠/g, "!=");
}

function lex(src: string, userMode = false): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) throw new ExprError(`nombre invalide près de « ${src.slice(i, i + 5)} »`);
      out.push({ t: "num", v: m[0] });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-zÀ-ÿ_]/.test(c)) {
      // saisie élève : lettres seules (« x2 » = x × 2) ; contenu : chiffres permis (« h1 », « o_1 »)
      const m = (userMode ? /^[A-Za-zÀ-ÿ_]+/ : /^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ_0-9]*/).exec(src.slice(i))!;
      out.push({ t: "id", v: m[0] });
      i += m[0].length;
      continue;
    }
    if (c === "'" || c === '"') {
      const end = src.indexOf(c, i + 1);
      if (end < 0) throw new ExprError("guillemet non fermé");
      out.push({ t: "str", v: src.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (["<=", ">=", "==", "!=", "&&", "||", "**"].includes(two)) {
      out.push({ t: "op", v: two === "**" ? "^" : two });
      i += 2;
      continue;
    }
    if ("+-*/^%(),<>!=;".includes(c)) {
      out.push({ t: "op", v: c === "=" ? "==" : c });
      i++;
      continue;
    }
    throw new ExprError(`caractère inattendu « ${c} »`);
  }
  out.push({ t: "end", v: "" });
  return out;
}

// ---------- Analyse syntaxique (descente récursive) ----------
const FUNCS = new Set([
  "abs", "sqrt", "racine", "cbrt", "round", "arrondi", "floor", "ent", "ceil", "min", "max", "pgcd", "ppcm", "fact", "comb", "perm",
  "pow", "mod", "sin", "cos", "tan", "sind", "cosd", "tand", "asin", "acos", "atan", "asind", "acosd", "atand", "ln", "log", "exp",
  "choix", "prenom", "animal", "fruit", "objet", "alea", "aleanz", "si", "signe", "estpremier", "frac", "fracb", "nb", "dec", "texte", "fixe", "nombrediviseurs",
  "chiffre", "sommechiffres", "fib", "kieme", "lettres", "diviseurs", "majuscule", "pluriel", "heure", "duree", "binaire", "romain", "rac", "tri", "melange",
  // français
  "conj", "conjp", "pp", "ppr", "feminin", "accord", "det", "elision", "nomtemps", "pronom", "aux", "groupe", "minuscule",
]);

export interface ParseOpts {
  implicitMul?: boolean; // « 2x », « 3(x+1) » — saisie élève
}

export function parse(src: string, opts: ParseOpts = {}): Node {
  const toks = opts.implicitMul ? lex(normalizeUser(src), true) : lex(src);
  let p = 0;
  const peek = () => toks[p];
  const eat = (v?: string) => {
    const t = toks[p];
    if (v !== undefined && t.v !== v) throw new ExprError(`« ${v} » attendu`);
    p++;
    return t;
  };

  const startsPrimary = (t: Tok) => t.t === "num" || t.t === "id" || (t.t === "op" && t.v === "(");

  function or(): Node {
    let a = and();
    while (peek().v === "||") {
      eat();
      a = { k: "bin", op: "||", a, b: and() };
    }
    return a;
  }
  function and(): Node {
    let a = cmp();
    while (peek().v === "&&") {
      eat();
      a = { k: "bin", op: "&&", a, b: cmp() };
    }
    return a;
  }
  function cmp(): Node {
    let a = add();
    while (["<", ">", "<=", ">=", "==", "!="].includes(peek().v) && peek().t === "op") {
      const op = eat().v;
      a = { k: "bin", op, a, b: add() };
    }
    return a;
  }
  function add(): Node {
    let a = mul();
    while ((peek().v === "+" || peek().v === "-") && peek().t === "op") {
      const op = eat().v;
      a = { k: "bin", op, a, b: mul() };
    }
    return a;
  }
  function mul(): Node {
    let a = unary();
    for (;;) {
      const t = peek();
      if (t.t === "op" && (t.v === "*" || t.v === "/" || t.v === "%")) {
        eat();
        a = { k: "bin", op: t.v, a, b: unary() };
      } else if (opts.implicitMul && startsPrimary(t)) {
        a = { k: "bin", op: "*", a, b: pow() };
      } else return a;
    }
  }
  function unary(): Node {
    const t = peek();
    if (t.t === "op" && t.v === "-") {
      eat();
      return { k: "un", op: "-", a: unary() };
    }
    if (t.t === "op" && t.v === "+") {
      eat();
      return unary();
    }
    if (t.t === "op" && t.v === "!") {
      eat();
      return { k: "un", op: "!", a: unary() };
    }
    return pow();
  }
  function pow(): Node {
    const base = primary();
    if (peek().v === "^") {
      eat();
      return { k: "bin", op: "^", a: base, b: unary() }; // associatif à droite, -x^2 = -(x^2)
    }
    return base;
  }
  function primary(): Node {
    const t = eat();
    if (t.t === "num") return { k: "num", v: parseFloat(t.v) };
    if (t.t === "str") return { k: "str", v: t.v };
    if (t.t === "op" && t.v === "(") {
      const e = or();
      eat(")");
      return e;
    }
    if (t.t === "id") {
      const name = t.v;
      if (peek().v === "(" && (FUNCS.has(name) || !opts.implicitMul)) {
        eat("(");
        const args: Node[] = [];
        if (peek().v !== ")") {
          args.push(or());
          while (peek().v === "," || peek().v === ";") {
            eat();
            args.push(or());
          }
        }
        eat(")");
        return { k: "call", name, args };
      }
      // saisie élève : « sqrt 9 » ou « sqrt9 »
      if (opts.implicitMul && FUNCS.has(name) && startsPrimary(peek())) return { k: "call", name, args: [pow()] };
      if (opts.implicitMul && name.length > 1 && !["pi", "e", "vrai", "faux", "true", "false"].includes(name) && !FUNCS.has(name)) {
        // « xy » → x*y (variables à une lettre en saisie élève)
        let node: Node = { k: "var", name: name[0] };
        for (const ch of name.slice(1)) node = { k: "bin", op: "*", a: node, b: { k: "var", name: ch } };
        return node;
      }
      return { k: "var", name };
    }
    throw new ExprError(t.t === "end" ? "expression incomplète" : `« ${t.v} » inattendu`);
  }

  const node = or();
  if (peek().t !== "end") throw new ExprError(`« ${peek().v} » inattendu`);
  return node;
}

// ---------- Arithmétique utile ----------
export const gcd = (a: number, b: number): number => {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a;
};
export const lcm = (a: number, b: number) => (a && b ? Math.abs(a * b) / gcd(a, b) : 0);
export const isPrime = (n: number) => {
  if (n < 2 || !Number.isInteger(n)) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
const factorial = (n: number) => {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
};
const combination = (n: number, k: number) => {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
};
export const roundTo = (x: number, n = 0) => {
  const f = 10 ** n;
  return Math.round((x + Math.sign(x) * 1e-12) * f) / f;
};
const fibo = (n: number) => {
  let a = 0,
    b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
};
const toRoman = (n: number) => {
  const t: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let s = "";
  for (const [v, r] of t) while (n >= v) {
    s += r;
    n -= v;
  }
  return s;
};

// ---------- Nombres en lettres (orthographe rectifiée de 1990 : traits d'union partout) ----------
const UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const TENS = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];
function below100(n: number): string {
  if (n <= 16) return UNITS[n];
  if (n < 20) return "dix-" + UNITS[n - 10];
  if (n < 70) {
    const t = Math.floor(n / 10),
      u = n % 10;
    return TENS[t] + (u === 0 ? "" : u === 1 ? "-et-un" : "-" + UNITS[u]);
  }
  if (n < 80) return n === 71 ? "soixante-et-onze" : "soixante-" + below100(n - 60);
  if (n === 80) return "quatre-vingts";
  return "quatre-vingt-" + below100(n - 80);
}
function below1000(n: number, final: boolean): string {
  const c = Math.floor(n / 100),
    r = n % 100;
  let s = "";
  if (c === 1) s = "cent";
  else if (c > 1) s = UNITS[c] + "-cent" + (r === 0 && final ? "s" : "");
  if (r) {
    let w = below100(r);
    if (!final && r === 80) w = "quatre-vingt"; // « quatre-vingt-mille »
    s += (s ? "-" : "") + w;
  }
  return s;
}
export function enLettres(n: number): string {
  if (n === 0) return "zéro";
  if (n < 0) return "moins " + enLettres(-n);
  const parts: string[] = [];
  const md = Math.floor(n / 1e9),
    mi = Math.floor((n % 1e9) / 1e6),
    th = Math.floor((n % 1e6) / 1000),
    un = n % 1000;
  if (md) parts.push(below1000(md, true) + (md > 1 ? " milliards" : " milliard"));
  if (mi) parts.push(below1000(mi, true) + (mi > 1 ? " millions" : " million"));
  let low = "";
  if (th) low = th === 1 ? "mille" : below1000(th, false) + "-mille";
  if (un) low += (low ? "-" : "") + below1000(un, true);
  if (low) parts.push(low);
  return parts.join(" ");
}

// ---------- Mise en forme française des nombres ----------
export function clean(x: number): number {
  if (!isFinite(x)) return x;
  const r = Number(x.toPrecision(12));
  return Object.is(r, -0) ? 0 : r;
}

/** 12345,6 → « 12 345,6 » (texte) ou « 12\,345{,}6 » (KaTeX). */
export function fmtNum(x: number, math = false, decimals?: number): string {
  if (!isFinite(x)) return String(x);
  x = clean(x);
  let s = decimals !== undefined ? Math.abs(x).toFixed(decimals) : String(Math.abs(x));
  if (s.includes("e")) s = Math.abs(x).toFixed(10).replace(/0+$/, "").replace(/\.$/, "");
  let [int, dec] = s.split(".");
  if (int.length >= 5 || (int.length === 4 && x !== Math.trunc(x)) || int.length >= 4) {
    int = int.replace(/\B(?=(\d{3})+(?!\d))/g, math ? "\\," : " ");
  }
  const sign = x < 0 ? (math ? "-" : "−") : "";
  return sign + int + (dec ? (math ? "{,}" : ",") + dec : "");
}

/** Fraction n/d simplifiée en LaTeX (ou en texte si math = false). */
export function fracStr(n: number, d: number, simplify = true, math = true): string {
  if (d === 0) return "∞";
  let g = simplify ? gcd(n, d) || 1 : 1;
  if (!Number.isInteger(n) || !Number.isInteger(d)) g = 1;
  let N = n / g,
    D = d / g;
  if (D < 0) {
    N = -N;
    D = -D;
  }
  if (D === 1) return fmtNum(N, math);
  const neg = N < 0 ? "-" : "";
  return math ? `${neg}\\dfrac{${Math.abs(N)}}{${D}}` : `${neg}${Math.abs(N)}/${D}`;
}

/** 135 min → « 2 h 15 min » */
const durationStr = (min: number) => {
  min = Math.round(min);
  const h = Math.floor(min / 60),
    m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")} min` : `${h} h`;
};

// ---------- Évaluation ----------
export interface EvalCtx {
  vars: Record<string, Value>;
  rng?: Rng;
  math?: boolean; // mise en forme pour KaTeX (frac, nb…)
  angleDeg?: boolean;
}

const num = (v: Value): number => {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = Number(String(v).replace(",", "."));
  if (isNaN(n)) throw new ExprError(`« ${v} » n'est pas un nombre`);
  return n;
};
const truthy = (v: Value) => (typeof v === "number" ? v !== 0 : typeof v === "string" ? v !== "" : v);

export function evaluate(node: Node, ctx: EvalCtx): Value {
  switch (node.k) {
    case "num":
      return node.v;
    case "str":
      return node.v;
    case "var": {
      if (node.name in ctx.vars) return ctx.vars[node.name];
      if (node.name === "pi") return Math.PI;
      if (node.name === "e") return Math.E;
      if (node.name === "vrai" || node.name === "true") return true;
      if (node.name === "faux" || node.name === "false") return false;
      throw new ExprError(`variable inconnue « ${node.name} »`);
    }
    case "un": {
      const a = evaluate(node.a, ctx);
      return node.op === "-" ? -num(a) : !truthy(a);
    }
    case "bin": {
      if (node.op === "&&") return truthy(evaluate(node.a, ctx)) && truthy(evaluate(node.b, ctx));
      if (node.op === "||") return truthy(evaluate(node.a, ctx)) || truthy(evaluate(node.b, ctx));
      const a = evaluate(node.a, ctx),
        b = evaluate(node.b, ctx);
      switch (node.op) {
        case "+": {
          // « 3 » (texte venu d'une liste) + 1 = 4 : on n'enchaîne des textes que s'ils ne sont pas numériques
          const isNumText = (x: Value) => typeof x === "string" && /^\s*-?\d+([.,]\d+)?\s*$/.test(x);
          if ((typeof a === "string" && !isNumText(a)) || (typeof b === "string" && !isNumText(b))) return String(a) + String(b);
          return num(a) + num(b);
        }
        case "-":
          return num(a) - num(b);
        case "*":
          return num(a) * num(b);
        case "/":
          return num(a) / num(b);
        case "%": {
          const m = num(b);
          return ((num(a) % m) + m) % m;
        }
        case "^":
          return Math.pow(num(a), num(b));
        case "==":
          return typeof a === "string" || typeof b === "string" ? String(a) === String(b) : Math.abs(num(a) - num(b)) < 1e-9;
        case "!=":
          return typeof a === "string" || typeof b === "string" ? String(a) !== String(b) : Math.abs(num(a) - num(b)) >= 1e-9;
        case "<":
          return num(a) < num(b) - 1e-12;
        case ">":
          return num(a) > num(b) + 1e-12;
        case "<=":
          return num(a) <= num(b) + 1e-12;
        case ">=":
          return num(a) >= num(b) - 1e-12;
      }
      throw new ExprError(`opérateur ${node.op}`);
    }
    case "call":
      return callFn(node.name, node.args, ctx);
  }
}

function callFn(name: string, argNodes: Node[], ctx: EvalCtx): Value {
  // Fonctions paresseuses
  if (name === "si") {
    if (argNodes.length !== 3) throw new ExprError("si(condition, alors, sinon)");
    return truthy(evaluate(argNodes[0], ctx)) ? evaluate(argNodes[1], ctx) : evaluate(argNodes[2], ctx);
  }
  const args = argNodes.map((a) => evaluate(a, ctx));
  const n = (i: number) => num(args[i]);
  const rng = ctx.rng ?? Math.random;
  const deg = Math.PI / 180;
  switch (name) {
    case "abs":
      return Math.abs(n(0));
    case "sqrt":
    case "racine":
    case "rac":
      return Math.sqrt(n(0));
    case "cbrt":
      return Math.cbrt(n(0));
    case "round":
    case "arrondi":
      return roundTo(n(0), args.length > 1 ? n(1) : 0);
    case "floor":
    case "ent":
      return Math.floor(n(0) + 1e-9);
    case "ceil":
      return Math.ceil(n(0) - 1e-9);
    case "min":
      return Math.min(...args.map(num));
    case "max":
      return Math.max(...args.map(num));
    case "pgcd":
      return args.map(num).reduce((x, y) => gcd(x, y));
    case "ppcm":
      return args.map(num).reduce((x, y) => lcm(x, y));
    case "fact":
      return factorial(n(0));
    case "comb":
      return combination(n(0), n(1));
    case "perm":
      return factorial(n(0)) / factorial(n(0) - n(1));
    case "pow":
      return Math.pow(n(0), n(1));
    case "mod": {
      const m = n(1);
      return ((n(0) % m) + m) % m;
    }
    case "sin":
      return Math.sin(n(0) * (ctx.angleDeg ? deg : 1));
    case "cos":
      return Math.cos(n(0) * (ctx.angleDeg ? deg : 1));
    case "tan":
      return Math.tan(n(0) * (ctx.angleDeg ? deg : 1));
    case "sind":
      return Math.sin(n(0) * deg);
    case "cosd":
      return Math.cos(n(0) * deg);
    case "tand":
      return Math.tan(n(0) * deg);
    case "asin":
      return Math.asin(n(0));
    case "acos":
      return Math.acos(n(0));
    case "atan":
      return Math.atan(n(0));
    case "asind":
      return Math.asin(n(0)) / deg;
    case "acosd":
      return Math.acos(n(0)) / deg;
    case "atand":
      return Math.atan(n(0)) / deg;
    case "ln":
      return Math.log(n(0));
    case "log":
      return Math.log10(n(0));
    case "exp":
      return Math.exp(n(0));
    case "signe":
      return Math.sign(n(0));
    case "estpremier":
      return isPrime(n(0));
    case "nombrediviseurs": {
      let c = 0;
      for (let d = 1; d <= n(0); d++) if (n(0) % d === 0) c++;
      return c;
    }
    case "chiffre": // chiffre(347, 1) = chiffre des dizaines (rang 0 = unités)
      return Math.floor(Math.abs(n(0)) / 10 ** n(1)) % 10;
    case "sommechiffres":
      return String(Math.abs(Math.round(n(0))))
        .split("")
        .reduce((s, c) => s + Number(c), 0);
    case "fib":
      return fibo(n(0));
    case "kieme": // kieme(2, a, b, c) = 2e plus petit
      return args
        .slice(1)
        .map(num)
        .sort((x, y) => x - y)[n(0) - 1];
    case "diviseurs": {
      // texte « 1 ; 2 ; 3 ; 6 » (sert aussi de réponse à un exercice « liste »)
      const N = Math.abs(Math.round(n(0)));
      const out: number[] = [];
      for (let d = 1; d <= N; d++) if (N % d === 0) out.push(d);
      return out.join(" ; ");
    }
    case "lettres":
      return enLettres(Math.round(n(0)));
    case "alea": // entier au hasard entre a et b inclus
      return randInt(rng, Math.ceil(n(0)), Math.floor(n(1)));
    case "aleanz": {
      // entier non nul entre a et b
      for (let i = 0; i < 100; i++) {
        const v = randInt(rng, Math.ceil(n(0)), Math.floor(n(1)));
        if (v !== 0) return v;
      }
      return 1;
    }
    case "choix":
      if (!args.length) throw new ExprError("choix() vide");
      return args[Math.floor(rng() * args.length)];
    // Habillages variés pour les énoncés : prénoms du monde entier, animaux, fruits, objets.
    case "prenom":
      return PRENOMS[Math.floor(rng() * PRENOMS.length)];
    case "animal":
      return ANIMAUX[Math.floor(rng() * ANIMAUX.length)];
    case "fruit":
      return FRUITS[Math.floor(rng() * FRUITS.length)];
    case "objet":
      return OBJETS[Math.floor(rng() * OBJETS.length)];
    case "frac":
      return fracStr(n(0), n(1), true, ctx.math ?? true);
    case "fracb":
      return fracStr(n(0), n(1), false, ctx.math ?? true);
    case "nb":
      return fmtNum(n(0), ctx.math, args.length > 1 ? n(1) : undefined);
    case "dec": // nombre écrit avec exactement k décimales : dec(2.5, 2) = « 2,50 »
      return fmtNum(n(0), ctx.math, n(1));
    case "fixe":
      return fmtNum(roundTo(n(0), n(1)), ctx.math);
    case "texte":
      return String(args[0]);
    case "majuscule": {
      const s = String(args[0]);
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    case "pluriel": // pluriel(n, 'pomme', 'pommes')  ou  pluriel('cheval') → « chevaux »
      if (args.length === 1) return FR.pluriel(String(args[0]));
      return Math.abs(n(0)) >= 2 ? String(args[2]) : String(args[1]);
    // ---- français : conjugaison, accords, déterminants ----
    case "conj": // conj('finir', 'futur', 4) → « finirons » ; conj('aller','passe_compose',3,'f') → « est allée »
      return FC.conjuguer(String(args[0]), String(args[1]) as FC.Temps, n(2), args[3] === "f" ? "f" : "m");
    case "conjp": // avec le pronom et l'élision : « j'aime », « qu'il soit »
      return FC.avecPronom(String(args[0]), String(args[1]) as FC.Temps, n(2), args[3] === "f" ? "f" : "m")[0];
    case "pp": // participe passé accordé : pp('prendre', 'f', 2) → « prises »
      return FC.participe(String(args[0]), args[1] === "f" ? "f" : "m", args.length > 2 && n(2) >= 2 ? 2 : 1);
    case "ppr":
      return FC.participePresent(String(args[0]));
    case "aux":
      return FC.infos(String(args[0])).aux;
    case "groupe":
      return FC.infos(String(args[0])).groupe;
    case "feminin":
      return FR.feminin(String(args[0]));
    case "accord": // accord('beau', 'f', 2) → « belles »
      return FR.accorder(String(args[0]), args[1] === "f" ? "f" : "m", n(2) >= 2 ? 2 : 1);
    case "det": // det('defini', 'arbre', 'm', 1) → « l'arbre »
      return FR.determinant(String(args[0]) as FR.TypeDet, String(args[1]), args[2] === "f" ? "f" : "m", n(3) >= 2 ? 2 : 1);
    case "elision": // elision('le', 'arbre') → « l'arbre »
      return FR.elision(String(args[0]), String(args[1]));
    case "nomtemps":
      return FC.TEMPS_NOMS[String(args[0]) as FC.Temps] ?? String(args[0]);
    case "pronom": // pronom(3, 'f') → « elle »
      return n(0) === 3 ? (args[1] === "f" ? "elle" : "il") : n(0) === 6 ? (args[1] === "f" ? "elles" : "ils") : FC.PRONOMS[n(0) - 1];
    case "minuscule":
      return String(args[0]).toLowerCase();
    case "heure": {
      // heure(h, m) → « 14 h 05 »
      const h = ((Math.round(n(0)) % 24) + 24) % 24,
        m = Math.round(args.length > 1 ? n(1) : 0);
      return `${h} h ${String(m).padStart(2, "0")}`;
    }
    case "duree":
      return durationStr(n(0));
    case "binaire":
      return Math.round(n(0)).toString(2);
    case "romain":
      return toRoman(Math.round(n(0)));
    case "tri": // tri(a,b,c) → « a ; b ; c » croissant (texte)
      return args
        .map(num)
        .sort((x, y) => x - y)
        .map((x) => fmtNum(x, ctx.math))
        .join(" ; ");
    case "melange": {
      const a = [...args];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a.map((x) => (typeof x === "number" ? fmtNum(x, ctx.math) : String(x))).join(" ; ");
    }
  }
  throw new ExprError(`fonction inconnue « ${name} »`);
}

export function evalStr(src: string, ctx: EvalCtx, opts?: ParseOpts): Value {
  return evaluate(parse(src, opts), ctx);
}

// ---------- Analyse de forme (pour « développe », « factorise », « réduis ») ----------
export function hasVar(n: Node): boolean {
  switch (n.k) {
    case "var":
      return !["pi", "e"].includes(n.name);
    case "un":
      return hasVar(n.a);
    case "bin":
      return hasVar(n.a) || hasVar(n.b);
    case "call":
      return n.args.some(hasVar);
    default:
      return false;
  }
}
const isSum = (n: Node): boolean => (n.k === "bin" && (n.op === "+" || n.op === "-")) || (n.k === "un" && isSum(n.a));

/** Forme développée : aucun produit ou puissance ne porte sur une somme contenant l'inconnue. */
export function isExpanded(n: Node): boolean {
  if (n.k === "bin") {
    if ((n.op === "*" || n.op === "/") && ((isSum(n.a) && hasVar(n.a) && hasVar(n.b)) || (isSum(n.b) && hasVar(n.b) && hasVar(n.a)))) return false;
    if (n.op === "*" && ((isSum(n.a) && hasVar(n.a)) || (isSum(n.b) && hasVar(n.b)))) return false;
    if (n.op === "^" && isSum(n.a) && hasVar(n.a)) return false;
    return isExpanded(n.a) && isExpanded(n.b);
  }
  if (n.k === "un") return isExpanded(n.a);
  return true;
}

/** Forme factorisée : un produit (ou une puissance) d'au moins un facteur somme contenant l'inconnue. */
export function isFactored(n: Node): boolean {
  if (n.k === "un") return isFactored(n.a);
  if (n.k === "bin" && n.op === "^") return isSum(n.a) && hasVar(n.a);
  if (n.k === "bin" && n.op === "*") return (isSum(n.a) && hasVar(n.a)) || (isSum(n.b) && hasVar(n.b)) || isFactored(n.a) || isFactored(n.b);
  return false;
}

export function countTerms(n: Node): number {
  if (n.k === "bin" && (n.op === "+" || n.op === "-")) return countTerms(n.a) + countTerms(n.b);
  if (n.k === "un") return countTerms(n.a);
  return 1;
}

export function hasOperation(n: Node): boolean {
  return n.k === "bin" || n.k === "call" || (n.k === "un" && hasOperation(n.a));
}

export function varsOf(n: Node, out = new Set<string>()): Set<string> {
  if (n.k === "var" && !["pi", "e"].includes(n.name)) out.add(n.name);
  if (n.k === "un") varsOf(n.a, out);
  if (n.k === "bin") {
    varsOf(n.a, out);
    varsOf(n.b, out);
  }
  if (n.k === "call") n.args.forEach((a) => varsOf(a, out));
  return out;
}

/** Deux expressions sont-elles égales pour toutes les valeurs des inconnues ? (test en 8 points) */
export function equivalent(a: Node, b: Node, variables: string[], fixed: Record<string, Value> = {}): boolean {
  const rng = makeRng(12345);
  let tested = 0;
  for (let i = 0; i < 40 && tested < 8; i++) {
    const vars: Record<string, Value> = { ...fixed };
    for (const v of variables) vars[v] = roundTo((rng() - 0.3) * 7, 3) || 1.37;
    let x: number, y: number;
    try {
      x = num(evaluate(a, { vars }));
      y = num(evaluate(b, { vars }));
    } catch {
      return false;
    }
    if (!isFinite(x) || !isFinite(y)) continue;
    tested++;
    if (Math.abs(x - y) > 1e-6 * Math.max(1, Math.abs(x), Math.abs(y))) return false;
  }
  return tested >= 3;
}

export const toNumber = num;
export const isTruthy = truthy;

const PRENOMS = ["Léa", "Tom", "Inès", "Sami", "Chloé", "Yanis", "Aïcha", "Lucas", "Mei", "Noah", "Fatou", "Hugo", "Sofia", "Malik", "Jade", "Elio", "Nour", "Gabin", "Lina", "Kenzo", "Zoé", "Adam", "Maya", "Ilyes", "Rose", "Théo", "Yuna", "Samuel", "Amira", "Louis"];
const ANIMAUX = ["écureuils", "lapins", "hérissons", "castors", "marmottes", "loutres", "chouettes", "renards", "tortues", "abeilles"];
const FRUITS = ["pommes", "poires", "cerises", "fraises", "prunes", "abricots", "mandarines", "noix", "noisettes", "figues"];
const OBJETS = ["billes", "cartes", "perles", "crayons", "autocollants", "coquillages", "timbres", "boutons", "images", "jetons"];
