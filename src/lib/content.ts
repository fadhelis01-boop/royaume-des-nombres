import { useSyncExternalStore } from "react";
import * as yaml from "js-yaml";
import { dbGet, dbSet } from "./db";
import { normalizeWorld, preprocess, resetReport } from "./normalize.mjs";
import { setWorldsForBadges } from "./store";
import { instantiate } from "./gen";
import type { Child, Gardien, Manifest, Matiere, Planete, Settings, World } from "./types";

// Chargement du contenu : les mondes intégrés (public/content, mis à jour à
// chaque publication) + les mondes importés depuis l'Espace parents (stockés
// sur l'appareil). Tout est mis en cache par le service worker → hors connexion.

interface ContentState {
  ready: boolean;
  error: string;
  manifest: Manifest | null;
  worlds: World[];
}
let st: ContentState = { ready: false, error: "", manifest: null, worlds: [] };
const listeners = new Set<() => void>();
const set = (p: Partial<ContentState>) => {
  st = { ...st, ...p };
  setWorldsForBadges(st.worlds);
  listeners.forEach((l) => l());
};
export function useContent() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => st,
  );
}
export const getContent = () => st;

async function fetchJson<T>(url: string, fresh = false): Promise<T> {
  const r = await fetch(url, fresh ? { cache: "no-cache" } : undefined);
  if (!r.ok) throw new Error(`${url} : ${r.status}`);
  return r.json();
}

export async function loadContent(fresh = false) {
  try {
    const manifest = await fetchJson<Manifest>("./content/manifest.json", fresh);
    const builtIn = await Promise.all(manifest.worlds.map((w) => fetchJson<World>("./content/" + w.file, fresh)));
    const imported = (await dbGet<World[]>("importedWorlds")) ?? [];
    const byId = new Map<string, World>();
    for (const w of builtIn) byId.set(w.id, { ...w, source: "integre" });
    for (const w of imported) byId.set(w.id, { ...w, source: "importe" });
    const worlds = [...byId.values()].sort((a, b) => a.ordre - b.ordre);
    set({ ready: true, error: "", manifest, worlds });
    return manifest;
  } catch (e) {
    set({ ready: true, error: (e as Error).message });
    return null;
  }
}

/** Vérifie s'il existe une version plus récente du contenu et la charge. */
export async function refreshContent(): Promise<{ before: string; after: string }> {
  const before = st.manifest?.version ?? "";
  const m = await loadContent(true);
  return { before, after: m?.version ?? before };
}

// ---------- Import de domaines (sans recoder) ----------
export async function importWorldFile(text: string, fileName: string): Promise<{ world?: World; errors: string[] }> {
  resetReport();
  let raw: unknown;
  try {
    raw = fileName.toLowerCase().endsWith(".json") ? JSON.parse(text) : yaml.load(preprocess(text));
  } catch (e) {
    return { errors: [`Fichier illisible : ${(e as Error).message.split("\n")[0]}`] };
  }
  // un JSON déjà compilé (exporté) est accepté tel quel s'il a la bonne forme
  const isCompiled = !!raw && typeof raw === "object" && Array.isArray((raw as World).lecons) && (raw as World).lecons.every((l) => Array.isArray(l.etapes) && l.etapes.every((s) => "kind" in s));
  const world = isCompiled ? (raw as World) : normalizeWorld(raw, fileName);
  const { errors } = resetReport();
  if (errors.length) return { errors };
  // Contrôle : chaque exercice doit pouvoir être tiré et corrigé
  const problems: string[] = [];
  for (const l of world.lecons)
    for (const [i, ex] of l.exercices.entries()) {
      try {
        for (let s = 1; s <= 25; s++) instantiate(ex, s * 104729);
      } catch (e) {
        problems.push(`${l.id} exercice ${i + 1} : ${(e as Error).message}`);
      }
    }
  if (problems.length) return { errors: problems };
  const list = ((await dbGet<World[]>("importedWorlds")) ?? []).filter((w) => w.id !== world.id);
  list.push(world);
  await dbSet("importedWorlds", list);
  await loadContent();
  return { world, errors: [] };
}

export async function removeImportedWorld(id: string) {
  const list = ((await dbGet<World[]>("importedWorlds")) ?? []).filter((w) => w.id !== id);
  await dbSet("importedWorlds", list);
  await loadContent();
}

// ---------- Déblocage progressif (maîtrise avant d'avancer) ----------
export const lessonKey = (w: World, lessonId: string) => `${w.id}/${lessonId}`;

export function worldProgress(c: Child | null, w: World) {
  const done = w.lecons.filter((l) => c?.progress[lessonKey(w, l.id)]?.done).length;
  const stars = w.lecons.reduce((s, l) => s + (c?.progress[lessonKey(w, l.id)]?.stars ?? 0), 0);
  return { done, total: w.lecons.length, stars, maxStars: w.lecons.length * 3, ratio: w.lecons.length ? done / w.lecons.length : 0 };
}

export function worldUnlocked(c: Child | null, w: World, worlds: World[], s: Settings): boolean {
  if (s.unlockAll || w.cycle === "astuces" || w.source === "importe") return true;
  if (c?.validatedWorlds.includes(w.id)) return true;
  return w.prerequis.every((id) => {
    const p = worlds.find((x) => x.id === id);
    if (!p) return true;
    return c?.validatedWorlds.includes(id) || worldProgress(c, p).ratio >= 0.5;
  });
}

export function lessonUnlocked(c: Child | null, w: World, idx: number, s: Settings): boolean {
  if (idx === 0 || s.unlockAll || c?.validatedWorlds.includes(w.id)) return true;
  return !!c?.progress[lessonKey(w, w.lecons[idx - 1].id)]?.done;
}

export function findLesson(worldId: string, lessonId: string) {
  const w = st.worlds.find((x) => x.id === worldId);
  const idx = w?.lecons.findIndex((l) => l.id === lessonId) ?? -1;
  return w && idx >= 0 ? { world: w, lesson: w.lecons[idx], idx } : null;
}

export const matiereDe = (c: Child | null): Matiere => c?.matiere ?? "maths";
/** La planète (matière) décrite dans content-src/_planetes.yaml. */
export const planeteDe = (m: Manifest | null | undefined, mat: Matiere): Planete | undefined => m?.planetes?.find((p) => p.id === mat) ?? m?.planetes?.[0];
/** L'histoire d'une planète (chaque matière a la sienne). */
export const histoireDe = (m: Manifest | null | undefined, mat: Matiere) => m?.histoires?.[mat];
export const prologueId = (mat: Matiere, m: Manifest | null | undefined = st.manifest) => planeteDe(m, mat)?.prologue.id ?? `prologue-${mat}`;
/** Le gardien (boss) d'un monde : il dépend de la planète et du cycle. */
export function gardienDe(m: Manifest | null | undefined, w: World): Gardien {
  const g = planeteDe(m, w.matiere)?.gardiens;
  return (
    g?.[w.cycle as "graines"] ??
    g?.graines ?? { sprite: "neutre", nom: "Le Grand Neutre", qui: "narrateur", ouverture: "Le Grand Neutre a tout rendu gris. Chaque bonne réponse lui reprend une couleur.", cri: "Gris…", aie: ["Aïe !"], nargue: ["Raté !"], jeton: "🌫️" }
  );
}
/** « 💎 3 cristaux rallumés » — le compteur d'aventure d'une planète. */
export function objetLabel(p: Planete | undefined, n: number) {
  if (!p) return `${n}`;
  return `${p.objet.emoji} ${n} ${n > 1 ? p.objet.des : p.objet.un}`;
}

/** Prochaine leçon conseillée : la première non terminée d'un monde débloqué (du royaume choisi). */
export function nextLesson(c: Child | null, s: Settings, mat: Matiere = matiereDe(c)) {
  // un parcours personnalisé existe (carte des talents) : on suit ses étapes
  const etape = c?.parcours?.[mat]?.etapes.find((e) => !c.progress[e.key]?.done);
  if (etape) {
    const [wid, lid] = etape.key.split("/");
    const w = st.worlds.find((x) => x.id === wid);
    const idx = w?.lecons.findIndex((l) => l.id === lid) ?? -1;
    if (w && idx >= 0) return { world: w, lesson: w.lecons[idx], idx, parcours: true };
  }
  for (const w of st.worlds) {

    if (w.matiere !== mat) continue;
    if (w.cycle === "astuces" || !worldUnlocked(c, w, st.worlds, s)) continue;
    const idx = w.lecons.findIndex((l) => !c?.progress[lessonKey(w, l.id)]?.done);
    if (idx >= 0 && lessonUnlocked(c, w, idx, s)) return { world: w, lesson: w.lecons[idx], idx };
  }
  return null;
}

export const CYCLES: Record<World["cycle"], { titre: string; sous: string; emoji: string }> = {
  graines: { titre: "Les Graines", sous: "7 – 10 ans · les fondations solides", emoji: "🌱" },
  explorateurs: { titre: "Les Explorateurs", sous: "10 – 14 ans · collège", emoji: "🧭" },
  maitres: { titre: "Les Maîtres", sous: "15 ans et + · lycée et au-delà", emoji: "🏰" },
  astuces: { titre: "L'École des Astuces", sous: "Méthode, pensée mathématique, calcul rapide", emoji: "💡" },
};
