import { useSyncExternalStore } from "react";
import { dbGet, dbSet } from "./db";
import { BADGES, levelOf, MASTERY, starsFor, XP } from "./rewards";
import { configureTts } from "./tts";
import { setSoundEnabled, sfx } from "./sound";
import type { Child, Settings, World } from "./types";

// État de l'application : profils des enfants (plusieurs enfants par appareil),
// réglages de l'Espace parents. Tout est stocké sur l'appareil (IndexedDB) :
// aucun compte, aucune donnée envoyée sur internet.

export const DEFAULT_SETTINGS: Settings = {
  pin: "",
  apiKey: "",
  model: "claude-opus-5-5",
  voices: {},
  rate: 1,
  autoRead: true,
  sounds: true,
  music: false,
  fontScale: 1,
  dys: false,
  reduceMotion: false,
  unlockAll: false,
  dailyLimit: 0,
  theme: "auto",
};

export function newChild(name: string, avatar: Child["avatar"], age: number): Child {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name,
    avatar,
    age,
    createdAt: Date.now(),
    xp: 0,
    stars: 0,
    streak: 0,
    bestStreak: 0,
    lastDay: "",
    days: {},
    badges: [],
    progress: {},
    srs: {},
    skills: {},
    mistakes: [],
    games: {},
    tables: {},
    enigmes: [],
    validatedWorlds: [],
    counters: {},
    inventions: [],
    crystals: [],
    story: {},
    vraieVie: [],
    gems: 0,
    owned: [],
    equipped: {},
    cabane: Array(9).fill(null),
    lecteur: age <= 6 ? "non" : "oui",
    abandons: {},
    sessions: [],
    recordsJeux: {},
    matiere: "maths",
    carnet: [],
  };
}

export interface Celebration {
  kind: "badge" | "level" | "stars" | "world";
  emoji: string;
  title: string;
  text: string;
}

export interface State {
  ready: boolean;
  settings: Settings;
  children: Child[];
  activeId: string;
  parentUnlocked: boolean;
  toast: { text: string; emoji?: string } | null;
  celebration: Celebration | null;
}

let state: State = {
  ready: false,
  settings: DEFAULT_SETTINGS,
  children: [],
  activeId: "",
  parentUnlocked: false,
  toast: null,
  celebration: null,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let saveTimer: number | undefined;

export const getState = () => state;
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => sel(state),
  );
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void dbSet("settings", state.settings);
    void dbSet("children", state.children);
    void dbSet("activeId", state.activeId);
  }, 250);
}

export function setState(patch: Partial<State>, save = true) {
  state = { ...state, ...patch };
  if (save) persist();
  emit();
}

function applySettings(s: Settings) {
  configureTts(s.voices, s.rate);
  setSoundEnabled(s.sounds);
  const root = document.documentElement;
  root.style.setProperty("--font-scale", String(s.fontScale));
  root.dataset.dys = s.dys ? "1" : "";
  root.dataset.motion = s.reduceMotion ? "reduce" : "";
  root.dataset.theme = s.theme === "auto" ? "" : s.theme;
}

export async function loadState() {
  const settings = { ...DEFAULT_SETTINGS, ...((await dbGet<Settings>("settings")) ?? {}) };
  const children = ((await dbGet<Child[]>("children")) ?? []).map((c) => ({ ...newChild(c.name, c.avatar, c.age), ...c }));
  const activeId = (await dbGet<string>("activeId")) ?? "";
  applySettings(settings);
  setState({ ready: true, settings, children, activeId: children.some((c) => c.id === activeId) ? activeId : "" }, false);
  applyChildMode();
}

/** Mode « je ne lis pas encore » : classe sur la racine pour agrandir les pictogrammes. */
export function applyChildMode() {
  const c = activeChild();
  document.documentElement.dataset.lecteur = c?.lecteur === "non" ? "non" : "";
}

export function updateSettings(p: Partial<Settings>) {
  const settings = { ...state.settings, ...p };
  applySettings(settings);
  setState({ settings });
}

// ---------- Enfant actif ----------
export const useChild = () => useStore((s) => s.children.find((c) => c.id === s.activeId) ?? null);
export const activeChild = () => state.children.find((c) => c.id === state.activeId) ?? null;

export function updateChild(fn: (c: Child) => Child | void, id = state.activeId) {
  const children = state.children.map((c) => {
    if (c.id !== id) return c;
    const copy = structuredClone(c);
    return fn(copy) ?? copy;
  });
  setState({ children });
}

export function addChild(c: Child) {
  setState({ children: [...state.children, c], activeId: c.id });
  applyChildMode();
}
export function removeChild(id: string) {
  setState({ children: state.children.filter((c) => c.id !== id), activeId: state.activeId === id ? "" : state.activeId });
}
export function selectChild(id: string) {
  setState({ activeId: id });
  applyChildMode();
}

// ---------- Jours, séries, temps ----------
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dayNumber = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);

function touchDay(c: Child) {
  const today = dayKey();
  c.days[today] ??= { min: 0, xp: 0, ok: 0, ko: 0 };
  if (c.lastDay !== today) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    c.streak = c.lastDay === dayKey(y) ? c.streak + 1 : 1;
    c.bestStreak = Math.max(c.bestStreak, c.streak);
    c.lastDay = today;
  }
  return c.days[today];
}

/** Appelé chaque minute d'activité réelle (onglet visible et interaction récente). */
export function tickMinute() {
  if (!activeChild()) return;
  updateChild((c) => {
    touchDay(c).min++;
  });
}
export function minutesToday(c: Child | null) {
  return c?.days[dayKey()]?.min ?? 0;
}

// ---------- Points, badges, célébrations ----------
export function toast(text: string, emoji?: string) {
  setState({ toast: { text, emoji } }, false);
  window.setTimeout(() => {
    if (state.toast?.text === text) setState({ toast: null }, false);
  }, 2600);
}

let worldsRef: World[] = [];
export const setWorldsForBadges = (w: World[]) => (worldsRef = w);

export function addXp(n: number) {
  if (!activeChild()) return;
  const before = levelOf(activeChild()!.xp).level;
  updateChild((c) => {
    c.xp += n;
    touchDay(c).xp += n;
  });
  const after = levelOf(activeChild()!.xp);
  if (after.level > before) {
    sfx.fanfare();
    setState({ celebration: { kind: "level", emoji: after.emoji, title: `Niveau ${after.level} !`, text: `Tu es maintenant « ${after.title} ». Ton cerveau grandit !` } }, false);
  }
  checkBadges();
}

export function bump(counter: string, by = 1) {
  updateChild((c) => {
    c.counters[counter] = (c.counters[counter] ?? 0) + by;
  });
}

export function checkBadges() {
  const c = activeChild();
  if (!c) return;
  const fresh = BADGES.filter((b) => !c.badges.includes(b.id) && b.test(c, worldsRef));
  if (!fresh.length) return;
  updateChild((x) => {
    x.badges.push(...fresh.map((b) => b.id));
  });
  const b = fresh[0];
  sfx.star();
  if (!state.celebration) setState({ celebration: { kind: "badge", emoji: b.emoji, title: `Nouveau badge : ${b.titre}`, text: b.desc } }, false);
  else toast(`Badge : ${b.titre}`, b.emoji);
}

// ---------- Réponses ----------
export function recordAnswer(opts: { key: string; ok: boolean; firstTry: boolean; hint: boolean; q?: string; given?: string; expected?: string; isZero?: boolean; scored?: boolean }) {
  if (!activeChild()) return 0;
  let xp = 0;
  updateChild((c) => {
    const d = touchDay(c);
    const sk = (c.skills[opts.key] ??= { ok: 0, ko: 0 });
    if (opts.ok) {
      d.ok++;
      sk.ok++;
      c.counters.ok = (c.counters.ok ?? 0) + 1;
      if (!opts.firstTry) c.counters.comeback = (c.counters.comeback ?? 0) + 1;
      xp = opts.scored === false ? 0 : opts.firstTry ? (opts.hint ? XP.correctAfterHint : XP.correct) : XP.correctSecondTry;
    } else {
      d.ko++;
      sk.ko++;
      c.counters.ko = (c.counters.ko ?? 0) + 1;
      if (opts.isZero) c.counters.zero = (c.counters.zero ?? 0) + 1;
      if (opts.q)
        c.mistakes = [{ key: opts.key, q: opts.q, given: opts.given ?? "", expected: opts.expected ?? "", at: Date.now() }, ...c.mistakes].slice(0, 60);
    }
  });
  if (xp) addXp(xp);
  else checkBadges();
  return xp;
}

export function saveStep(key: string, step: number) {
  updateChild((c) => {
    const p = (c.progress[key] ??= { step: 0, done: false, stars: 0, best: 0, attempts: 0, lastAt: 0 });
    p.step = step;
    p.lastAt = Date.now();
  });
}

const BOX_DAYS = [0, 1, 3, 7, 16, 35];

/** Fin d'un défi de leçon : étoiles, XP, carte de révision espacée. */
export function finishDefi(key: string, score: number) {
  const stars = starsFor(score);
  const c0 = activeChild();
  if (!c0) return { stars, gained: 0, newBest: false };
  const prev = c0.progress[key];
  const prevStars = prev?.stars ?? 0;
  const gained = Math.max(0, stars - prevStars);
  updateChild((c) => {
    const p = (c.progress[key] ??= { step: 0, done: false, stars: 0, best: 0, attempts: 0, lastAt: 0 });
    p.attempts++;
    p.best = Math.max(p.best, score);
    p.stars = Math.max(p.stars, stars);
    p.lastAt = Date.now();
    if (score >= MASTERY - 1e-9) {
      p.done = true;
      c.srs[key] ??= { key, box: 1, due: dayNumber() + 1 };
    }
    c.stars += gained;
    if (score >= 0.999) c.counters.perfect = (c.counters.perfect ?? 0) + 1;
  });
  let xp = gained * XP.star;
  if (score >= MASTERY - 1e-9 && !prev?.done) xp += XP.lessonDone;
  addGems(gained * 3 + (score >= MASTERY - 1e-9 && !prev?.done ? 5 : 0));
  if (xp) addXp(xp);
  else checkBadges();
  return { stars, gained, newBest: stars > prevStars };
}

/** Révision espacée (boîtes de Leitner) : réussite → la carte revient plus tard ; erreur → demain. */
export function reviewCard(key: string, ok: boolean) {
  updateChild((c) => {
    const card = (c.srs[key] ??= { key, box: 1, due: dayNumber() });
    card.box = ok ? Math.min(5, card.box + 1) : 1;
    card.due = dayNumber() + BOX_DAYS[card.box];
  });
}

export function dueCards(c: Child | null) {
  if (!c) return [];
  const today = dayNumber();
  return Object.values(c.srs)
    .filter((x) => x.due <= today)
    .sort((a, b) => a.due - b.due || a.box - b.box);
}

// ---------- Sauvegarde / restauration (Espace parents) ----------
export function exportBackup(): string {
  return JSON.stringify({ app: "royaume-des-nombres", version: 1, at: new Date().toISOString(), settings: { ...state.settings, apiKey: "" }, children: state.children }, null, 1);
}
export function importBackup(json: string): number {
  const data = JSON.parse(json);
  if (data.app !== "royaume-des-nombres" || !Array.isArray(data.children)) throw new Error("Ce fichier n'est pas une sauvegarde du Royaume des Nombres.");
  const byId = new Map(state.children.map((c) => [c.id, c]));
  for (const c of data.children as Child[]) byId.set(c.id, { ...newChild(c.name, c.avatar, c.age), ...c });
  setState({ children: [...byId.values()], settings: { ...state.settings, ...data.settings, apiKey: state.settings.apiKey, pin: state.settings.pin || data.settings?.pin || "" } });
  return data.children.length;
}

// ---------- Aventure ----------
export function markStory(id: string) {
  updateChild((c) => {
    c.story = { ...(c.story ?? {}), [id]: Date.now() };
  });
  checkBadges();
}
export const storySeen = (c: Child | null, id: string) => !!c?.story?.[id];

/** Défi du Gardien réussi : le cristal du monde se rallume. */
export function addCrystal(worldId: string) {
  const c = activeChild();
  if (!c || c.crystals?.includes(worldId)) return false;
  updateChild((x) => {
    x.crystals = [...(x.crystals ?? []), worldId];
  });
  addXp(XP.lessonDone * 2);
  addGems(25);
  return true;
}

// ---------- Gemmes, boutique, cabane ----------
/** Gemmes gagnées en apprenant. Aucune n'est achetable : pas d'argent réel dans le Royaume. */
export function addGems(n: number) {
  if (!activeChild() || n <= 0) return;
  updateChild((c) => {
    c.gems = (c.gems ?? 0) + n;
    c.counters.gemsTotal = (c.counters.gemsTotal ?? 0) + n;
  });
  checkBadges();
}

export function buyItem(id: string, prix: number) {
  const c = activeChild();
  if (!c || (c.gems ?? 0) < prix || c.owned?.includes(id)) return false;
  updateChild((x) => {
    x.gems -= prix;
    x.owned = [...(x.owned ?? []), id];
    x.counters.achats = (x.counters.achats ?? 0) + 1;
  });
  checkBadges();
  return true;
}

export function equip(slot: keyof Child["equipped"], id: string | undefined) {
  updateChild((c) => {
    c.equipped = { ...(c.equipped ?? {}), [slot]: id };
    if (!id) delete c.equipped[slot];
  });
}

export function placeInCabane(index: number, id: string | null) {
  updateChild((c) => {
    const cab = [...(c.cabane ?? Array(9).fill(null))];
    // un objet n'existe qu'une fois dans la cabane
    for (let i = 0; i < cab.length; i++) if (id && cab[i] === id) cab[i] = null;
    cab[index] = id;
    c.cabane = cab;
  });
}

export function setLecteur(v: Child["lecteur"]) {
  updateChild((c) => {
    c.lecteur = v;
  });
  applyChildMode();
}

// ---------- Séances (pour finir proprement après ~15 min, et pour les parents) ----------
const SESSION_GAP = 30 * 60000; // 30 min sans activité = nouvelle séance

/** Appelé à chaque réponse : prolonge la séance en cours ou en ouvre une nouvelle. */
export function touchSession(): { isNew: boolean; min: number } {
  const c = activeChild();
  if (!c) return { isNew: false, min: 0 };
  const now = Date.now();
  let isNew = false;
  let min = 0;
  updateChild((x) => {
    const ss = x.sessions ?? [];
    const last = ss[ss.length - 1];
    if (!last || now - (last.start + last.min * 60000) > SESSION_GAP) {
      ss.push({ day: dayKey(), start: now, min: 0, q: 1 });
      isNew = true;
    } else {
      last.min = Math.round((now - last.start) / 60000);
      last.q++;
      min = last.min;
    }
    x.sessions = ss.slice(-40);
  });
  return { isNew, min };
}

export function currentSession(c: Child | null) {
  const last = c?.sessions?.[c.sessions.length - 1];
  if (!last || Date.now() - (last.start + last.min * 60000) > SESSION_GAP) return null;
  return last;
}

/** Une leçon ou un défi quitté avant la fin : utile aux parents pour voir où ça coince. */
export function recordAbandon(key: string) {
  updateChild((c) => {
    c.abandons = { ...(c.abandons ?? {}), [key]: (c.abandons?.[key] ?? 0) + 1 };
  });
}

// ---------- Royaume (matière) ----------
export function setMatiere(m: Child["matiere"]) {
  updateChild((c) => {
    c.matiere = m;
  });
}

/** Ajoute un mot à « Mon carnet de mots » (la collection du dictionnaire). Renvoie true s'il est nouveau. */
export function collectWord(mot: string) {
  const c = activeChild();
  if (!c || c.carnet?.includes(mot)) return false;
  updateChild((x) => {
    x.carnet = [...(x.carnet ?? []), mot];
    x.counters.mots = (x.counters.mots ?? 0) + 1;
  });
  addGems(1);
  checkBadges();
  return true;
}
