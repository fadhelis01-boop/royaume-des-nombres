import { say, speak, stopSpeaking, useTts, type Seg } from "../lib/tts";
import type { Line, Who } from "../lib/types";
import { Md } from "./Md";
import { activeChild } from "../lib/store";

export const NAMES: Record<Who, string> = { mia: "Mia π", neo: "Néo Fibo", zero: "Zéro", narrateur: "Le Livre", nuage: "Le Grignoteur", ixe: "Ixe", enfant: "Toi" };

export function mascotSrc(who: Who, humeur?: string) {
  if (who === "mia") return humeur === "reflexion" ? "img/mascottes/mia-reflexion.webp" : "img/mascottes/mia.webp";
  if (who === "neo") return "img/mascottes/neo.webp";
  if (who === "zero") return "img/mascottes/zero.webp";
  return "";
}

/** Le Grignoteur : un petit nuage gris qui mange les nombres (dessiné en SVG). */
function Nuage({ size, humeur }: { size: number; humeur?: string }) {
  const happy = humeur === "joie" || humeur === "fier";
  const sad = humeur === "triste";
  return (
    <svg viewBox="0 0 120 100" width={size} height={size} aria-hidden className="svg-nuage">
      <defs>
        <radialGradient id="nuage-g" cx="40%" cy="35%">
          <stop offset="0%" stopColor={happy ? "#ffffff" : "#d9dce6"} />
          <stop offset="100%" stopColor={happy ? "#e6dcff" : "#8e93a6"} />
        </radialGradient>
      </defs>
      <path d="M25 78 C8 78 4 58 18 52 C14 34 34 24 46 34 C50 16 78 14 84 32 C100 28 112 44 104 58 C116 64 110 82 94 80 Z" fill="url(#nuage-g)" stroke="#5b5f73" strokeWidth={3} />
      <ellipse cx={48} cy={52} rx={7} ry={sad ? 6 : 8} fill="#2b2140" />
      <ellipse cx={74} cy={52} rx={7} ry={sad ? 6 : 8} fill="#2b2140" />
      <circle cx={50} cy={49} r={2.5} fill="#fff" />
      <circle cx={76} cy={49} r={2.5} fill="#fff" />
      {happy ? <path d="M50 64 Q61 74 72 64" fill="none" stroke="#2b2140" strokeWidth={3} strokeLinecap="round" /> : sad ? <path d="M51 70 Q61 62 71 70" fill="none" stroke="#2b2140" strokeWidth={3} strokeLinecap="round" /> : <ellipse cx={61} cy={67} rx={7} ry={5} fill="#2b2140" />}
      {!happy && <text x={85} y={74} fontSize={13} fontWeight={700} fill="#7c4dff">7</text>}
      <circle cx={38} cy={62} r={4} fill="#ff9db5" opacity={0.6} />
      <circle cx={84} cy={62} r={4} fill="#ff9db5" opacity={0.6} />
    </svg>
  );
}

/** Ixe, le caméléon qui peut devenir n'importe quel nombre (une variable !). */
function Ixe({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 120 100" width={size} height={size} aria-hidden className="svg-ixe">
      <path d="M18 70 C10 50 30 30 58 34 C86 36 102 52 98 70 C94 86 30 88 18 70 Z" fill="#4caf50" stroke="#1b5e20" strokeWidth={3} />
      <path d="M98 66 C112 66 116 82 104 86 C96 88 94 80 100 78" fill="none" stroke="#1b5e20" strokeWidth={5} strokeLinecap="round" />
      <path d="M30 46 C26 30 44 22 54 34" fill="#66bb6a" stroke="#1b5e20" strokeWidth={3} />
      <circle cx={40} cy={50} r={11} fill="#fff" stroke="#1b5e20" strokeWidth={3} />
      <circle cx={43} cy={50} r={5} fill="#2b2140" />
      <path d="M22 66 Q32 72 44 66" fill="none" stroke="#1b5e20" strokeWidth={3} strokeLinecap="round" />
      <text x={66} y={70} fontSize={30} fontStyle="italic" fontFamily="Cambria Math, Times New Roman, serif" fontWeight={700} fill="#ffeb3b" stroke="#1b5e20" strokeWidth={1}>
        x
      </text>
    </svg>
  );
}

const REACTIONS: Record<string, string> = { joie: "✨", surprise: "❗", triste: "💧", fier: "⭐", reflexion: "" };

export function Mascot({ who, humeur, size = 72, talking = false, className = "" }: { who: Who; humeur?: string; size?: number; talking?: boolean; className?: string }) {
  let me = who;
  if (who === "enfant") me = activeChild()?.avatar ?? "mia";
  let body: React.ReactNode;
  if (me === "narrateur")
    body = (
      <span className="mascot mascot-narrateur" style={{ width: size, height: size, fontSize: size * 0.6 }}>
        📖
      </span>
    );
  else if (me === "nuage") body = <Nuage size={size} humeur={humeur} />;
  else if (me === "ixe") body = <Ixe size={size} />;
  else body = <img src={mascotSrc(me, humeur)} alt={NAMES[who]} className={`mascot mascot-${me}`} style={{ width: size, height: size }} draggable={false} />;
  // Réactions animées : joie (saut + étincelles), surprise, réflexion (formes qui flottent, comme sur la fiche de Mia)…
  const deco = humeur ? REACTIONS[humeur] : "";
  return (
    <span className={`mascot-wrap mood-${humeur ?? "none"} ${talking ? "talking" : ""} ${className}`} style={{ width: size, height: size }} aria-label={NAMES[who]} role="img">
      {body}
      {deco && <span className="mood-deco">{deco}</span>}
      {humeur === "reflexion" && (
        <span className="mood-shapes" aria-hidden>
          <i>○</i>
          <i>△</i>
          <i>□</i>
          <i>π</i>
        </span>
      )}
      {who === "enfant" && <span className="mood-toi">toi</span>}
    </span>
  );
}

/** Bouton « haut-parleur » : lit un texte avec la voix d'un personnage. */
export function SpeakBtn({ segs, k, label = "Écouter", small = false }: { segs: Seg[]; k: string; label?: string; small?: boolean }) {
  const t = useTts();
  if (!t.supported) return null;
  const active = t.playing && t.key === k;
  return (
    <button
      type="button"
      className={`speak-btn ${active ? "active" : ""} ${small ? "small" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (active) stopSpeaking();
        else speak(segs, { key: k });
      }}
      aria-label={active ? "Arrêter la lecture" : label}
      title={active ? "Arrêter" : label}
    >
      {active ? "⏹" : "🔊"}
      {!small && <span>{active ? "Stop" : label}</span>}
    </button>
  );
}

/** Une mascotte et sa bulle de parole. */
export function Bubble({ who, text, humeur, k, side = "left", size = 76 }: { who: Who; text: string; humeur?: string; k?: string; side?: "left" | "right"; size?: number }) {
  const t = useTts();
  const key = k ?? `b:${who}:${text.slice(0, 40)}`;
  const talking = t.playing && t.key === key;
  return (
    <div className={`bubble-row ${side} who-${who}`}>
      <button type="button" className="bubble-avatar" onClick={() => (talking ? stopSpeaking() : say(who, text, key))} aria-label={`Écouter ${NAMES[who]}`}>
        <Mascot who={who} humeur={humeur} size={size} talking={talking} />
      </button>
      <div className="bubble">
        <div className="bubble-name">{NAMES[who]}</div>
        <Md text={text} />
      </div>
    </div>
  );
}

/** Dialogue façon bande dessinée, lu réplique par réplique avec les voix des personnages. */
export function Dialogue({ lines, k, autoplay = false }: { lines: Line[]; k: string; autoplay?: boolean }) {
  const t = useTts();
  const playing = t.playing && t.key === k;
  const sides: Record<Who, "left" | "right"> = { mia: "left", neo: "right", zero: "left", narrateur: "left", nuage: "right", ixe: "right", enfant: "left" };
  void autoplay;
  return (
    <div className="dialogue">
      {lines.map((l, i) => {
        const talking = playing && t.index === i;
        return (
          <div key={i} className={`bubble-row ${sides[l.who]} who-${l.who} ${talking ? "now" : ""}`}>
            <button type="button" className="bubble-avatar" onClick={() => speak([{ who: l.who, text: l.text }], { key: `${k}:${i}` })} aria-label={`Écouter ${NAMES[l.who]}`}>
              <Mascot who={l.who} humeur={l.humeur} size={70} talking={talking || (t.playing && t.key === `${k}:${i}`)} />
            </button>
            <div className="bubble">
              <div className="bubble-name">{NAMES[l.who]}</div>
              <Md text={l.text} />
            </div>
          </div>
        );
      })}
      <div className="dialogue-actions">
        <SpeakBtn segs={lines.map((l) => ({ who: l.who, text: l.text }))} k={k} label="Écouter la scène" />
      </div>
    </div>
  );
}
