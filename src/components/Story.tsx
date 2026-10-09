import { useEffect, useState } from "react";
import { activeChild, getState, markStory } from "../lib/store";
import { speak, stopSpeaking, useTts } from "../lib/tts";
import type { Choix, Line } from "../lib/types";
import { Mascot, NAMES, poseParole } from "./Mascot";
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
  choix,
}: {
  lines: Line[];
  titre?: string;
  decor?: string;
  couleur?: string;
  k: string;
  onDone?: () => void;
  doneLabel?: string;
  autoplay?: boolean;
  /** un choix sans enjeu pédagogique : l'enfant décide de la suite de la scène */
  choix?: Choix;
}) {
  const t = useTts();
  const [pick, setPick] = useState<number | null>(() => {
    const st = activeChild()?.story ?? {};
    const prev = choix?.options.findIndex((_, i) => st[`choix:${k}:${i}`]);
    return prev !== undefined && prev >= 0 ? prev : null;
  });
  const suite = pick !== null && choix ? choix.options[pick].suite : [];
  const playing = t.playing && t.key === k;
  useEffect(() => {
    if (autoplay && getState().settings.autoRead) speak(lines.map((l) => ({ who: l.who, text: l.text })), { key: k });
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  return (
    <div className="story" style={{ "--wc": couleur ?? "var(--c-violet)" } as React.CSSProperties}>
      <div className={`story-head ${decor ? "avec-decor" : ""}`} style={decor ? ({ "--decor": `url(${decor})` } as React.CSSProperties) : undefined}>
        <div className="story-head-in">
          <span className="story-book">📖</span>
          {titre && <h2>{titre}</h2>}
        </div>
      </div>
      <div className="story-panels">
        {lines.map((l, i) => renderLine(l, i, playing && t.index === i, k))}
        {choix && (
          <div className="story-choice">
            <div className={`bubble-row ${choix.qui === "neo" || choix.qui === "nuage" || choix.qui === "ixe" ? "right" : "left"} who-${choix.qui}`}>
              <span className="bubble-avatar">
                <Mascot who={choix.qui} humeur="reflexion" size={64} />
              </span>
              <div className="bubble">
                <div className="bubble-name">{NAMES[choix.qui]}</div>
                <Md text={choix.question} />
              </div>
            </div>
            <div className="choices story-options" role="group" aria-label="Que fais-tu ?">
              {choix.options.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  className={`choice ${pick === i ? "sel" : ""}`}
                  disabled={pick !== null && pick !== i}
                  onClick={() => {
                    if (pick !== null) return;
                    setPick(i);
                    markStory(`choix:${k}:${i}`);
                    speak(o.suite.map((l) => ({ who: l.who, text: l.text })), { key: `${k}:suite` });
                  }}
                >
                  👉 {o.texte}
                </button>
              ))}
            </div>
            {suite.map((l, i) => renderLine(l, i, t.playing && t.key === `${k}:suite` && t.index === i, `${k}:suite`))}
          </div>
        )}
      </div>
      <div className="story-actions">
        <button type="button" className="btn btn-soft" onClick={() => (playing ? stopSpeaking() : speak(lines.map((l) => ({ who: l.who, text: l.text })), { key: k }))}>
          {playing ? "⏹ Stop" : "🔊 Écouter l'histoire"}
        </button>
        {onDone && (!choix || pick !== null) && (
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

function renderLine(l: Line, i: number, now: boolean, k: string) {
  if (l.who === "narrateur")
    return (
      <div key={`${k}-${i}`} className={`story-caption ${now ? "now" : ""}`}>
        <Md text={l.text} />
      </div>
    );
  const right = l.who === "neo" || l.who === "nuage" || l.who === "ixe";
  return (
    <div key={`${k}-${i}`} className={`bubble-row ${right ? "right" : "left"} who-${l.who} ${now ? "now" : ""}`}>
      <button type="button" className="bubble-avatar" onClick={() => speak([{ who: l.who, text: l.text }], { key: `${k}:${i}` })} aria-label={`Écouter ${NAMES[l.who]}`}>
        <Mascot who={l.who} humeur={l.humeur ?? poseParole(l.who, right ? "right" : "left", i)} size={72} talking={now} />
      </button>
      <div className="bubble">
        <div className="bubble-name">{NAMES[l.who]}</div>
        <Md text={l.text} />
      </div>
    </div>
  );
}
