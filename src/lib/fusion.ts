// Fusion de deux progressions d'un même enfant (changement d'appareil, synchronisation).
// Principe : on ne perd jamais une avancée. Les compteurs et scores gardent le maximum,
// les collections sont réunies, les réglages « de forme » (avatar, cabane…) viennent de la
// version la plus récente. Module pur (sans navigateur) : testé par `npm test`.
import type { Child } from "./types";

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => !!x && typeof x === "object" && !Array.isArray(x);

/** Champs pris en entier dans la version la plus récente (choix, pas des avancées). */
const RECENT = new Set(["name", "avatar", "age", "equipped", "cabane", "lecteur", "matiere", "daily", "quetes", "diag", "derniere"]);
/** Listes d'événements datés : réunies, dédoublonnées, les plus récents d'abord, avec une limite. */
const JOURNAUX: Record<string, { cle: (e: Obj) => string; temps: (e: Obj) => number; max: number }> = {
  mistakes: { cle: (e) => `${e.at}|${e.q}`, temps: (e) => Number(e.at), max: 60 },
  sessions: { cle: (e) => `${e.day}|${e.start}`, temps: (e) => Number(e.start), max: 60 },
  inventions: { cle: (e) => `${e.at}`, temps: (e) => Number(e.at), max: 200 },
  fluence: { cle: (e) => `${e.at}`, temps: (e) => Number(e.at), max: 50 },
};

function fusionValeur(a: unknown, b: unknown, bPlusRecent: boolean): unknown {
  if (a === undefined) return b;
  if (b === undefined) return a;
  if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
  if (typeof a === "boolean" && typeof b === "boolean") return a || b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.every((x) => typeof x !== "object") && b.every((x) => typeof x !== "object")) return [...new Set([...a, ...b])];
    const vus = new Map<string, unknown>();
    for (const x of [...a, ...b]) vus.set(JSON.stringify(x), x);
    return [...vus.values()];
  }
  if (isObj(a) && isObj(b)) {
    const out: Obj = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = fusionValeur(a[k], b[k], bPlusRecent);
    return out;
  }
  return bPlusRecent ? b : a;
}

/** Fusionne deux versions d'un même enfant. */
export function fusionnerEnfant(a: Child, b: Child): Child {
  const ta = a.majAt ?? a.createdAt ?? 0;
  const tb = b.majAt ?? b.createdAt ?? 0;
  const bPlusRecent = tb >= ta;
  const out: Obj = {};
  const A = a as unknown as Obj;
  const B = b as unknown as Obj;
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    if (RECENT.has(k)) out[k] = (bPlusRecent ? B[k] : A[k]) ?? A[k] ?? B[k];
    else if (JOURNAUX[k] && Array.isArray(A[k]) && Array.isArray(B[k])) {
      const j = JOURNAUX[k];
      const m = new Map<string, Obj>();
      for (const e of [...(A[k] as Obj[]), ...(B[k] as Obj[])]) m.set(j.cle(e), e);
      out[k] = [...m.values()].sort((x, y) => j.temps(y) - j.temps(x)).slice(0, j.max);
    } else out[k] = fusionValeur(A[k], B[k], bPlusRecent);
  }
  // la série en cours appartient à l'appareil qui a joué le plus récemment
  const recent = (a.lastDay ?? "") >= (b.lastDay ?? "") ? a : b;
  out.streak = recent.streak;
  out.lastDay = recent.lastDay;
  out.bestStreak = Math.max(a.bestStreak ?? 0, b.bestStreak ?? 0, recent.streak ?? 0);
  out.id = a.id;
  out.createdAt = Math.min(a.createdAt ?? Date.now(), b.createdAt ?? Date.now());
  out.majAt = Math.max(ta, tb);
  return out as unknown as Child;
}

const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Fusionne une liste de profils importés dans les profils existants.
 * Un profil est reconnu par son identifiant, sinon par son prénom (même enfant créé sur deux appareils).
 */
export function fusionnerProfils(existants: Child[], importes: Child[]): { enfants: Child[]; fusionnes: number; ajoutes: number } {
  const enfants = [...existants];
  let fusionnes = 0;
  let ajoutes = 0;
  for (const c of importes) {
    const i = enfants.findIndex((x) => x.id === c.id) >= 0 ? enfants.findIndex((x) => x.id === c.id) : enfants.findIndex((x) => norm(x.name) === norm(c.name));
    if (i >= 0) {
      enfants[i] = fusionnerEnfant(enfants[i], c);
      fusionnes++;
    } else {
      enfants.push(c);
      ajoutes++;
    }
  }
  return { enfants, fusionnes, ajoutes };
}
