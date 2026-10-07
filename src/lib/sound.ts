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
};
