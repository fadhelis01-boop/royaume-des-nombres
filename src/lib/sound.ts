// Petits sons synthétisés (aucun fichier audio à télécharger) : bonne réponse,
// encouragement, étoile, fanfare. Désactivables dans l'Espace parents.

let ctx: AudioContext | null = null;
let enabled = true;
export const setSoundEnabled = (v: boolean) => (enabled = v);

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.18) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  ok() {
    tone(784, 0, 0.18, "triangle");
    tone(1046, 0.09, 0.28, "triangle");
  },
  // Pas de son « buzzer » : une erreur n'est pas une punition, juste un essai.
  oops() {
    tone(392, 0, 0.2, "sine", 0.12);
    tone(349, 0.12, 0.25, "sine", 0.1);
  },
  tap() {
    tone(660, 0, 0.06, "square", 0.05);
  },
  star() {
    [880, 1175, 1568].forEach((f, i) => tone(f, i * 0.08, 0.3, "triangle", 0.14));
  },
  fanfare() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.35, "triangle", 0.15));
  },
  tick() {
    tone(1200, 0, 0.03, "square", 0.04);
  },
  /** Arpège qui monte plus haut quand la série s'allonge. */
  combo(n: number) {
    const base = 523 * Math.pow(2, Math.min(n, 12) / 24);
    [1, 1.25, 1.5, 2].forEach((m, i) => tone(base * m, i * 0.06, 0.22, "triangle", 0.13));
  },
  gem() {
    tone(1568, 0, 0.08, "sine", 0.1);
    tone(2093, 0.05, 0.12, "sine", 0.08);
  },
  /** Le Grignoteur est touché. */
  hit() {
    tone(220, 0, 0.12, "square", 0.08);
    tone(660, 0.05, 0.18, "triangle", 0.12);
  },
  /** Il esquive ou croque. */
  whoosh() {
    const c = ac();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(900, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.25);
    g.gain.setValueAtTime(0.06, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.32);
  },
  /** Thème de victoire propre à chaque monde (gamme pentatonique tirée du nom du monde). */
  victory(seed: string) {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16];
    const root = 392 * Math.pow(2, (h % 5) / 12);
    const notes = [0, 2, 4, 5, 4, 5, 7].map((k, i) => scale[(k + ((h >> i) & 1)) % scale.length]);
    notes.forEach((st, i) => tone(root * Math.pow(2, st / 12), i * 0.14, i === notes.length - 1 ? 0.7 : 0.25, "triangle", 0.15));
    tone(root / 2, 0, 1.1, "sine", 0.08);
  },
};
