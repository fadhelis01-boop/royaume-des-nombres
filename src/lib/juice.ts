// « Juice » : tout ce qui rend une bonne réponse délicieuse.
// Combos, gerbes de symboles proportionnées à l'exploit, gemmes qui s'envolent,
// petites phrases des mascottes. Respecte « réduire les animations ».

import { addGems, activeChild, getState, toast, updateChild } from "./store";
import { sfx } from "./sound";
import { say } from "./tts";
import type { Who } from "./types";

let combo = 0;
export const getCombo = () => combo;
export function resetCombo() {
  combo = 0;
  emitCombo();
}

const comboListeners = new Set<(n: number) => void>();
export function onCombo(fn: (n: number) => void) {
  comboListeners.add(fn);
  return () => comboListeners.delete(fn);
}
const emitCombo = () => comboListeners.forEach((f) => f(combo));

const calm = () => getState().settings.reduceMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;

function layer() {
  let el = document.getElementById("fx-layer");
  if (!el) {
    el = document.createElement("div");
    el.id = "fx-layer";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  return el;
}

export function centerOf(el?: Element | null): [number, number] {
  if (!el) return [innerWidth / 2, innerHeight / 2];
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}

const SYMBOLS = ["★", "✦", "●", "▲", "■", "π", "+", "×", "✚", "💎"];
const COLORS = ["#7c4dff", "#ff8a1f", "#18c5b5", "#ffd23f", "#ff5c8a", "#4caf50"];

/** Gerbe de symboles. power 1 = discret, 4 = feu d'artifice. */
export function burst(x: number, y: number, power = 1) {
  if (calm()) return;
  const L = layer();
  const n = 6 + power * 6;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.className = "fx-bit";
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    const dist = 40 + Math.random() * 40 * power;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
    s.style.setProperty("--dy", `${Math.sin(ang) * dist - 20}px`);
    s.style.color = COLORS[i % COLORS.length];
    s.style.fontSize = `${12 + Math.random() * 10 + power * 2}px`;
    s.textContent = SYMBOLS[(i + power) % SYMBOLS.length];
    L.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
}

/** Texte qui s'envole (« +2 💎 », « Combo ×5 ! »). */
export function floatText(x: number, y: number, text: string, cls = "") {
  const L = layer();
  const s = document.createElement("span");
  s.className = `fx-float ${cls}`;
  s.style.left = `${x}px`;
  s.style.top = `${y}px`;
  s.textContent = text;
  L.appendChild(s);
  setTimeout(() => s.remove(), calm() ? 1200 : 1400);
}

const COMBO_LINES: Record<number, [Who, string][]> = {
  3: [
    ["neo", "Trois d'affilée ! Défi accepté !"],
    ["mia", "Trois de suite ! Ça brille !"],
  ],
  5: [
    ["zero", "CINQ d'affilée ! 😳"],
    ["neo", "Cinq ! Tu es en feu !"],
  ],
  10: [
    ["zero", "DIX ! Moi derrière un 1… et toi, dix bonnes réponses ! 🤯"],
    ["mia", "Dix d'affilée ! Incroyable !"],
  ],
};

/**
 * Bonne réponse : gemmes, combo, gerbe. Renvoie le nombre de gemmes gagnées.
 * `scored` est faux quand la réponse ne doit rien rapporter (QCM réussi au 2ᵉ essai).
 */
export function rewardCorrect(opts: { firstTry: boolean; scored: boolean; anchor?: Element | null; speakCombo?: boolean }): { gems: number; combo: number; spoke: boolean } {
  const [x, y] = centerOf(opts.anchor);
  if (!opts.firstTry) {
    combo = 0;
    emitCombo();
  } else combo++;
  emitCombo();
  const c = combo;
  let gems = 0;
  if (opts.scored) gems = opts.firstTry ? 1 + (c >= 5 ? 1 : 0) + (c >= 10 ? 1 : 0) : 0;
  if (gems) {
    addGems(gems);
    floatText(x, y - 20, `+${gems} 💎`, "gem");
  }
  if (c > (activeChild()?.counters.comboMax ?? 0))
    updateChild((ch) => {
      ch.counters.comboMax = c;
    });
  burst(x, y, Math.min(4, 1 + Math.floor(c / 3)));
  let spoke = false;
  const milestone = c === 3 || c === 5 || (c >= 10 && c % 5 === 0) ? Math.min(c, 10) : 0;
  if (milestone) {
    sfx.combo(c);
    floatText(innerWidth / 2, innerHeight * 0.35, `🔥 Combo ×${c} !`, "combo");
    const lines = COMBO_LINES[milestone];
    if (lines && opts.speakCombo !== false) {
      const [who, t] = lines[Math.floor(Math.random() * lines.length)];
      say(who, t);
      spoke = true;
    }
  }
  return { gems, combo: c, spoke };
}

export function rewardWrong() {
  if (combo >= 3) toast(`Série de ${combo} terminée… on repart !`, "💪");
  combo = 0;
  emitCombo();
}

/** Petite secousse d'un élément (Grignoteur touché…). */
export function shake(el?: Element | null) {
  if (!el || calm()) return;
  el.classList.remove("fx-shake");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("fx-shake");
}
