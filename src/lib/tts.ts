import { useSyncExternalStore } from "react";
import { toSpeech } from "./speech";
import type { Who } from "./types";

// Voix des personnages, par la synthèse vocale de l'appareil (Web Speech API :
// iPhone/iPad, Android, Windows, Mac — hors connexion avec les voix installées).
// Chaque personnage a sa « musicalité » : Lya claire et pétillante, Néo chaleureux
// et énergique, Zéro rond et un peu nasillard.

export interface Seg {
  who: Who;
  text: string;
}

const PERSONA: Record<Who, { pitch: number; rate: number }> = {
  mia: { pitch: 1.35, rate: 1.04 },
  neo: { pitch: 1.0, rate: 1.08 },
  zero: { pitch: 0.7, rate: 0.92 },
  narrateur: { pitch: 1.05, rate: 0.96 },
  nuage: { pitch: 0.85, rate: 0.9 },
  gribouille: { pitch: 0.7, rate: 0.95 },
  neutre: { pitch: 0.55, rate: 0.85 },
  acidia: { pitch: 1.15, rate: 0.98 },
  gravis: { pitch: 0.75, rate: 0.88 },
  seve: { pitch: 0.9, rate: 0.82 },
  uranie: { pitch: 1.25, rate: 0.95 },
  resonance: { pitch: 1.3, rate: 1.0 },
  pinceau: { pitch: 1.1, rate: 1.02 },
  ixe: { pitch: 1.2, rate: 1.12 },
  enfant: { pitch: 1.4, rate: 1.0 },
};

interface TtsState {
  supported: boolean;
  playing: boolean;
  key: string;
  index: number;
  speaking: Who | null;
}
let st: TtsState = { supported: typeof window !== "undefined" && "speechSynthesis" in window, playing: false, key: "", index: 0, speaking: null };
const listeners = new Set<() => void>();
const set = (p: Partial<TtsState>) => {
  st = { ...st, ...p };
  listeners.forEach((l) => l());
};
export function useTts() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => st,
  );
}
export const ttsSupported = () => st.supported;

// ---------- Réglages ----------
let cfg: { voices: Partial<Record<Who, string>>; rate: number } = { voices: {}, rate: 1 };
export function configureTts(voices: Partial<Record<Who, string>>, rate: number) {
  cfg = { voices, rate };
}

let voicesCache: SpeechSynthesisVoice[] = [];
export function frenchVoices(): SpeechSynthesisVoice[] {
  if (!st.supported) return [];
  const v = speechSynthesis.getVoices().filter((x) => x.lang.toLowerCase().replace("_", "-").startsWith("fr"));
  if (v.length) voicesCache = v;
  return voicesCache;
}
// iPhone/iPad : la synthèse vocale ne démarre qu'après un geste de l'utilisateur.
// On « réveille » le moteur au tout premier toucher, sans rien dire.
if (st.supported && typeof window !== "undefined") {
  const unlock = () => {
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);
    } catch {
      /* ignoré */
    }
  };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
}
if (st.supported) {
  speechSynthesis.onvoiceschanged = () => {
    frenchVoices();
    listeners.forEach((l) => l());
  };
}

const PREF = [/natural|neural|online/i, /premium|enhanced|amélioré/i, /google/i, /amélie|audrey|marie|denise|thomas|henri|julie|paul/i];
function bestVoices(): SpeechSynthesisVoice[] {
  const v = frenchVoices();
  const score = (x: SpeechSynthesisVoice) => {
    let s = x.lang.toLowerCase().includes("fr-fr") ? 10 : 0;
    PREF.forEach((re, i) => re.test(x.name) && (s += 40 - i * 8));
    return s;
  };
  return [...v].sort((a, b) => score(b) - score(a));
}

function voiceFor(who: Who): SpeechSynthesisVoice | undefined {
  const all = frenchVoices();
  const name = cfg.voices[who];
  if (name) {
    const v = all.find((x) => x.name === name);
    if (v) return v;
  }
  const best = bestVoices();
  if (!best.length) return undefined;
  // Si plusieurs voix existent, on donne une voix différente à Néo pour bien distinguer les personnages.
  if (who === "neo" && best.length > 1) return best[1];
  return best[0];
}

// ---------- Lecture ----------
let generation = 0;
let queue: Seg[] = [];
let onEndCb: (() => void) | undefined;
let onSegCb: ((i: number) => void) | undefined;

function splitChunks(text: string): string[] {
  const sentences = text.match(/[^.!?;]+[.!?;]*\s*/g) ?? [text];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > 200 && cur) {
      out.push(cur);
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur);
  return out.map((c) => c.trim()).filter(Boolean);
}

function playFrom(i: number) {
  if (!st.supported) return;
  const gen = ++generation;
  speechSynthesis.cancel();
  if (i >= queue.length) {
    set({ playing: false, speaking: null, index: queue.length });
    const cb = onEndCb;
    onEndCb = undefined;
    cb?.();
    return;
  }
  const seg = queue[i];
  set({ playing: true, index: i, speaking: seg.who });
  onSegCb?.(i);
  const parts = splitChunks(toSpeech(seg.text));
  const persona = PERSONA[seg.who];
  const voice = voiceFor(seg.who);
  let p = 0;
  const next = () => {
    if (gen !== generation) return;
    if (p >= parts.length) return void setTimeout(() => gen === generation && playFrom(i + 1), 180);
    const u = new SpeechSynthesisUtterance(parts[p++]);
    u.lang = "fr-FR";
    if (voice) u.voice = voice;
    u.pitch = persona.pitch;
    u.rate = Math.min(2, persona.rate * cfg.rate);
    u.onend = () => setTimeout(next, 40);
    u.onerror = (e) => {
      if (gen !== generation || e.error === "interrupted" || e.error === "canceled") return;
      setTimeout(next, 40);
    };
    speechSynthesis.speak(u);
  };
  // Safari : un léger délai après cancel() évite que la file soit ignorée.
  setTimeout(next, 70);
}

/** Lit une suite de répliques. `key` identifie ce qui est lu (pour afficher le bon bouton actif). */
export function speak(segs: Seg[], opts: { key?: string; start?: number; onEnd?: () => void; onSegment?: (i: number) => void } = {}) {
  if (!st.supported || !segs.length) {
    opts.onEnd?.();
    return;
  }
  queue = segs.filter((s) => s.text && s.text.trim());
  onEndCb = opts.onEnd;
  onSegCb = opts.onSegment;
  set({ key: opts.key ?? "" });
  playFrom(opts.start ?? 0);
}

export const say = (who: Who, text: string, key?: string) => speak([{ who, text }], { key });

export function stopSpeaking() {
  generation++;
  onEndCb = undefined;
  if (st.supported) speechSynthesis.cancel();
  set({ playing: false, speaking: null, key: "" });
}

/** Pause : on retient la réplique en cours pour reprendre exactement là. */
export function pauseSpeaking() {
  generation++;
  if (st.supported) speechSynthesis.cancel();
  set({ playing: false, speaking: null });
}
export function resumeSpeaking() {
  playFrom(st.index);
}

export function previewVoice(who: Who, name: string) {
  const prev = cfg.voices[who];
  cfg.voices[who] = name;
  const lines: Record<Who, string> = {
    mia: "Et si on essayait autrement ?",
    neo: "Un problème ? Défi accepté !",
    zero: "Moi je sais ! … Zéro.",
    narrateur: "Bienvenue dans la Galaxie des Savoirs.",
    nuage: "Miam… un sept. Euh… pardon.",
    gribouille: "Splotch ! J'ai mangé tous tes accents ! Hé hé.",
    neutre: "Tout… gris… tout… pareil…",
    acidia: "Observe, mesure, puis conclus, jeune savant.",
    gravis: "Galilée, lui aussi, a commencé par une bille.",
    seve: "Le vivant prend son temps… écoute-le.",
    uranie: "Lève les yeux : le ciel raconte une histoire.",
    resonance: "Écoute… chaque son a une couleur.",
    pinceau: "Que dessineras-tu demain ?",
    ixe: "Je peux être n'importe quel nombre !",
    enfant: "C'est moi !",
  };
  speak([{ who, text: lines[who] }], { key: "preview" }); // la voix est choisie au lancement de la réplique
  cfg.voices[who] = prev;
}
