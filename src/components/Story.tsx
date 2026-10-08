import { useEffect } from "react";
import { getState } from "../lib/store";
import { speak, stopSpeaking, useTts } from "../lib/tts";
import type { Line } from "../lib/types";
import { Mascot, NAMES } from "./Mascot";
import { Md } from "./Md";

// Une scène de l'aventure, façon bande dessinée : cases du narrateur
// (encadrés) et bulles des personnages, lues avec leurs voix.

export function StoryScene({
  lines,
  titre,
  decor,
  couleur,
  k,
  onDone,
  doneLabel = "Continuer l'aventure ➜",
  autoplay = true,
}: {
  lines: Line[];
  titre?: string;
  decor?: string;
  couleur?: string;
  k: string;
  onDone?: () => void;
  doneLabel?: string;
  autoplay?: boolean;
}) {
  const t = useTts();
  const playing = t.playing && t.key === k;
  useEffect(() => {
    if (autoplay && getState().settings.autoRead) speak(lines.map((l) => ({ who: l.who, text: l.text })), { key: k });
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  return (
    <div className="story" style={{ "--wc": couleur ?? "var(--c-violet)" } as React.CSSProperties}>
      <div className="story-head" style={decor ? { backgroundImage: `url(${decor})` } : undefined}>
        <div className="story-head-in">
          <span className="story-book">📖</span>
          {titre && <h2>{titre}</h2>}
        </div>
      </div>
      <div className="story-panels">
        {lines.map((l, i) => {
          const now = playing && t.index === i;
          if (l.who === "narrateur")
            return (
              <div key={i} className={`story-caption ${now ? "now" : ""}`}>
                <Md text={l.text} />
              </div>
            );
          const right = l.who === "neo" || l.who === "nuage" || l.who === "ixe";
          return (
            <div key={i} className={`bubble-row ${right ? "right" : "left"} who-${l.who} ${now ? "now" : ""}`}>
              <button type="button" className="bubble-avatar" onClick={() => speak([{ who: l.who, text: l.text }], { key: `${k}:${i}` })} aria-label={`Écouter ${NAMES[l.who]}`}>
                <Mascot who={l.who} humeur={l.humeur} size={72} talking={now} />
              </button>
              <div className="bubble">
                <div className="bubble-name">{NAMES[l.who]}</div>
                <Md text={l.text} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="story-actions">
        <button type="button" className="btn btn-soft" onClick={() => (playing ? stopSpeaking() : speak(lines.map((l) => ({ who: l.who, text: l.text })), { key: k }))}>
          {playing ? "⏹ Stop" : "🔊 Écouter l'histoire"}
        </button>
        {onDone && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              stopSpeaking();
              onDone();
            }}
          >
            {doneLabel}
          </button>
        )}
      </div>
    </div>
  );
}
