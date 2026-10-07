import { say, speak, stopSpeaking, useTts, type Seg } from "../lib/tts";
import type { Line, Who } from "../lib/types";
import { Md } from "./Md";

export const NAMES: Record<Who, string> = { mia: "Mia π", neo: "Néo Fibo", zero: "Zéro", narrateur: "Le Livre" };

export function mascotSrc(who: Who, humeur?: string) {
  if (who === "mia") return humeur === "reflexion" ? "img/mascottes/mia-reflexion.webp" : "img/mascottes/mia.webp";
  if (who === "neo") return "img/mascottes/neo.webp";
  if (who === "zero") return "img/mascottes/zero.webp";
  return "";
}

export function Mascot({ who, humeur, size = 72, talking = false, className = "" }: { who: Who; humeur?: string; size?: number; talking?: boolean; className?: string }) {
  if (who === "narrateur")
    return (
      <span className={`mascot mascot-narrateur ${talking ? "talking" : ""} ${className}`} style={{ width: size, height: size, fontSize: size * 0.6 }} aria-hidden>
        📖
      </span>
    );
  return <img src={mascotSrc(who, humeur)} alt={NAMES[who]} className={`mascot mascot-${who} ${talking ? "talking" : ""} ${className}`} style={{ width: size, height: size }} draggable={false} />;
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
  const sides: Record<Who, "left" | "right"> = { mia: "left", neo: "right", zero: "left", narrateur: "left" };
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
