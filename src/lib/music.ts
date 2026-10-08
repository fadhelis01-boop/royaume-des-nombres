// Musique d'ambiance douce, générée en direct (aucun fichier à télécharger) :
// une boîte à musique en gamme pentatonique, très lente et très basse.
// Chaque monde a sa propre tonalité. Désactivée par défaut (Espace parents).

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let timer: number | undefined;
let root = 261.63; // do
let playing = false;

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];

function note(freq: number, t: number, dur: number, vol: number) {
  if (!ctx || !gain) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(gain);
  o.start(t);
  o.stop(t + dur + 0.1);
}

function bar() {
  if (!ctx || !playing) return;
  const t0 = ctx.currentTime + 0.05;
  const beat = 0.75;
  for (let i = 0; i < 4; i++) {
    if (Math.random() < 0.75) {
      const step = PENTA[Math.floor(Math.random() * PENTA.length)];
      note(root * 2 ** (step / 12), t0 + i * beat, 1.8, 0.05);
    }
  }
  note(root / 2, t0, 3, 0.035); // basse douce
}

export function setMusicKey(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  root = 220 * 2 ** ((h % 7) / 12);
}

export function startMusic() {
  if (playing) return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    gain = ctx.createGain();
    gain.gain.value = 0.6;
    gain.connect(ctx.destination);
    playing = true;
    bar();
    timer = window.setInterval(bar, 3000);
  } catch {
    playing = false;
  }
}

export function stopMusic() {
  playing = false;
  clearInterval(timer);
  try {
    gain?.disconnect();
  } catch {
    /* ignoré */
  }
  gain = null;
}
