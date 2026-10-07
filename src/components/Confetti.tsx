import { useMemo } from "react";

const COLORS = ["#7c4dff", "#ff8a1f", "#18c5b5", "#ffd23f", "#ff5c8a", "#4caf50"];
const SHAPES = ["●", "▲", "■", "★", "π", "0", "+", "×"];

/** Pluie de confettis… en forme de symboles mathématiques ! */
export function Confetti({ count = 48 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 1.8 + Math.random() * 1.6,
        color: COLORS[i % COLORS.length],
        shape: SHAPES[i % SHAPES.length],
        size: 14 + Math.random() * 18,
        rot: Math.random() * 360,
      })),
    [count],
  );
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <span key={i} style={{ left: `${b.left}%`, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, color: b.color, fontSize: b.size, transform: `rotate(${b.rot}deg)` }}>
          {b.shape}
        </span>
      ))}
    </div>
  );
}
