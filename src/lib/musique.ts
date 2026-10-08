// Moteur musical synthétisé (aucun fichier audio) : notes, accords, mélodies, rythmes,
// fréquences pures. Sert la planète Musique, le son en physique et le studio.
// Références (bible §33.2) : tempérament égal, La4 = 440 Hz, f = 440 × 2^((n − 69)/12).

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const BASE: Record<string, number> = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11, c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** « Do4 », « Ré#4 », « Sib3 », « C4 », « F#5 » → numéro MIDI (Do4 = 60, La4 = 69). */
export function midi(note: string): number | null {
  const m = /^(do|re|mi|fa|sol|la|si|[a-g])(#|b|♯|♭)?(-?\d)$/.exec(sansAccents(note.trim()));
  if (!m) return null;
  const alt = m[2] === "#" || m[2] === "♯" ? 1 : m[2] === "b" || m[2] === "♭" ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + BASE[m[1]] + alt;
}
export const freqMidi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
export function freq(note: string): number | null {
  const n = midi(note);
  return n === null ? null : freqMidi(n);
}
const NOMS = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
export const nomMidi = (n: number) => `${NOMS[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;

export type Timbre = "piano" | "flute" | "cloche" | "pur" | "orgue" | "violon";

/** Une note : enveloppe simple + harmoniques selon le timbre (un timbre = un mélange d'harmoniques). */
export function jouerFreq(f: number, dur = 0.6, timbre: Timbre = "piano", vol = 0.25, at = 0) {
  const c = ac();
  if (!c || !isFinite(f) || f <= 0) return;
  const t = c.currentTime + at;
  const out = c.createGain();
  out.connect(c.destination);
  const harm: [number, number][] =
    timbre === "pur" ? [[1, 1]] : timbre === "flute" ? [[1, 1], [2, 0.12], [3, 0.05]] : timbre === "cloche" ? [[1, 1], [2.76, 0.4], [5.4, 0.2], [8.9, 0.1]] : timbre === "orgue" ? [[1, 1], [2, 0.6], [3, 0.4], [4, 0.25], [6, 0.15]] : timbre === "violon" ? [[1, 1], [2, 0.5], [3, 0.33], [4, 0.25], [5, 0.2]] : [[1, 1], [2, 0.45], [3, 0.2], [4, 0.1]];
  const attaque = timbre === "violon" || timbre === "flute" || timbre === "orgue" ? 0.08 : 0.01;
  const tenue = timbre === "piano" || timbre === "cloche" ? 0 : 1;
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(vol, t + attaque);
  if (tenue) {
    out.gain.setValueAtTime(vol, t + Math.max(attaque, dur - 0.08));
    out.gain.linearRampToValueAtTime(0.0001, t + dur);
  } else out.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, 0.3) * (timbre === "cloche" ? 2.2 : 1.3));
  const somme = harm.reduce((s, [, a]) => s + a, 0);
  for (const [k, a] of harm) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = timbre === "violon" ? "sawtooth" : "sine";
    o.frequency.value = f * k;
    g.gain.value = timbre === "violon" ? a * 0.35 : a / somme;
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + Math.max(dur, 0.3) * 2.4 + 0.1);
  }
}

export function jouerNote(note: string, dur = 0.6, timbre: Timbre = "piano", vol = 0.25, at = 0) {
  const f = freq(note);
  if (f) jouerFreq(f, dur, timbre, vol, at);
}

/** Bruit court (caisse claire, charleston) et grosse caisse, pour les rythmes. */
export function percussion(son: "grosse" | "claire" | "charleston" | "claves", at = 0, vol = 0.5) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + at;
  if (son === "grosse") {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.25);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.32);
    return;
  }
  if (son === "claves") {
    jouerFreq(2500, 0.05, "pur", vol * 0.5, at);
    return;
  }
  const len = son === "claire" ? 0.18 : 0.05;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = son === "claire" ? "bandpass" : "highpass";
  filt.frequency.value = son === "claire" ? 1800 : 7000;
  const g = c.createGain();
  g.gain.setValueAtTime(vol * (son === "claire" ? 0.8 : 0.4), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(filt).connect(g).connect(c.destination);
  src.start(t);
}

/**
 * Mélodie en texte : « Do4 Ré4 Mi4:2 _ Sol4:0.5 » — durée en temps après « : » (1 par défaut),
 * « _ » = un silence d'un temps (« _:2 » pour deux temps), « [Do4 Mi4 Sol4] » = accord.
 * Renvoie la durée totale en secondes.
 */
export function jouerSuite(texte: string, tempo = 90, timbre: Timbre = "piano", vol = 0.25): number {
  const temps = 60 / Math.max(30, tempo);
  let at = 0;
  const jetons = texte.match(/\[[^\]]*\](?::[\d.]+)?|\S+/g) ?? [];
  for (const j of jetons) {
    const [corps, d] = j.split(/:(?=[\d.]+$)/);
    const dur = (d ? Number(d) : 1) * temps;
    if (corps.startsWith("[")) for (const n of corps.slice(1, -1).trim().split(/\s+/)) jouerNote(n, dur * 0.95, timbre, vol * 0.7, at);
    else if (corps !== "_") jouerNote(corps, dur * 0.95, timbre, vol, at);
    at += dur;
  }
  return at;
}

/** Rythme en texte, un caractère par pas : « x » frappé, « X » accentué, « . » silence. */
export function jouerRythme(motif: string, tempo = 90, son: "grosse" | "claire" | "charleston" | "claves" = "claves", pasParTemps = 2): number {
  const pas = 60 / Math.max(30, tempo) / pasParTemps;
  [...motif.replace(/\s/g, "")].forEach((ch, i) => {
    if (ch === "x") percussion(son, i * pas, 0.45);
    if (ch === "X") percussion(son === "claves" ? "grosse" : son, i * pas, 0.8);
  });
  return motif.replace(/\s/g, "").length * pas;
}
