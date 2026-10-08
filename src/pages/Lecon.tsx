import { useEffect, useMemo, useState } from "react";
import { go } from "../lib/router";
import { findLesson, lessonKey } from "../lib/content";
import { saveStep, useChild, getState, bump, addXp, updateChild } from "../lib/store";
import { speak, stopSpeaking, useTts, type Seg } from "../lib/tts";
import { instantiate, newSeed } from "../lib/gen";
import { Bubble, Dialogue, Mascot } from "../components/Mascot";
import { Md } from "../components/Md";
import { Visuel } from "../components/Visuel";
import { ExercisePlayer } from "../components/ExercisePlayer";
import type { Step, Who } from "../lib/types";

/** Ce que la voix lit pour une étape. */
export function stepSegments(s: Step): Seg[] {
  switch (s.kind) {
    case "dialogue":
      return s.lines.map((l) => ({ who: l.who, text: l.text }));
    case "texte":
    case "histoire":
      return [{ who: "narrateur", text: (s.titre ? s.titre + ". " : "") + s.texte }];
    case "astuce":
      return [{ who: s.qui ?? "mia", text: "Astuce ! " + s.texte }];
    case "attention":
      return [{ who: s.qui ?? "neo", text: "Attention ! " + s.texte }];
    case "a_quoi_ca_sert":
      return [{ who: "neo", text: "À quoi ça sert ? " + s.texte }];
    case "retiens":
      return [{ who: "narrateur", text: "Je retiens. " + s.texte }];
    case "exemple":
      return [{ who: "narrateur", text: `Exemple. ${s.titre ? s.titre + ". " : ""}${s.enonce} ${s.etapes.join(" ")} ${s.reponse ?? ""}` }];
    case "visuel":
      return s.legende ? [{ who: "narrateur", text: s.legende }] : [];
    case "question":
      return [];
    case "explique":
      return [{ who: s.qui, text: s.texte + " " + s.choix.map((c) => c.texte).join(" ? Ou : ") + " ?" }];
    case "vraie_vie":
      return [{ who: "zero", text: `${s.titre}. ${s.texte}` }];
  }
}

export function LeconPage({ worldId, lessonId, restart }: { worldId: string; lessonId: string; restart: boolean }) {
  const found = findLesson(worldId, lessonId);
  const child = useChild()!;
  const key = `${worldId}/${lessonId}`;
  const saved = child.progress[key]?.step ?? 0;
  const [i, setI] = useState(() => (restart || !found ? 0 : Math.min(saved, found.lesson.etapes.length - 1)));
  const [continuous, setContinuous] = useState(false);
  const [answered, setAnswered] = useState<Record<number, boolean>>({});
  const tts = useTts();

  const lesson = found?.lesson;
  const steps = lesson?.etapes ?? [];
  const step = steps[i];

  useEffect(() => {
    if (found) saveStep(key, i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // Lecture automatique de l'étape (et enchaînement en mode écoute continue)
  useEffect(() => {
    if (!step) return;
    const segs = stepSegments(step);
    const auto = continuous || getState().settings.autoRead;
    if (!auto || !segs.length) {
      if (continuous && step.kind === "question") setContinuous(false);
      return;
    }
    speak(segs, {
      key: `step:${key}:${i}`,
      onEnd: () => {
        if (continuous && i < steps.length - 1 && step.kind !== "question") setI((x) => x + 1);
        else if (continuous) setContinuous(false);
      },
    });
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, continuous]);

  if (!found || !lesson)
    return (
      <div className="page center">
        <p>Leçon introuvable.</p>
        <button className="btn" onClick={() => go("/")}>
          Retour
        </button>
      </div>
    );

  const isLast = i === steps.length - 1;
  const blocked = (step.kind === "question" || step.kind === "explique") && !answered[i];
  const goNext = () => {
    if (isLast) go(`/defi/${worldId}/${lessonId}`);
    else setI(i + 1);
  };

  return (
    <div className="page lecon" style={{ "--wc": found.world.couleur } as React.CSSProperties}>
      <div className="lecon-top">
        <button className="back" onClick={() => go(`/monde/${worldId}`)} aria-label="Quitter la leçon">
          ✕
        </button>
        <div className="steps-bar" aria-label={`étape ${i + 1} sur ${steps.length}`}>
          {steps.map((_, k) => (
            <button key={k} className={`sb ${k < i ? "past" : k === i ? "cur" : ""}`} onClick={() => setI(k)} aria-label={`aller à l'étape ${k + 1}`} />
          ))}
        </div>
        <button
          className={`listen-toggle ${continuous ? "on" : ""}`}
          onClick={() => {
            if (continuous) {
              setContinuous(false);
              stopSpeaking();
            } else setContinuous(true);
          }}
          title="Écoute continue : la leçon est lue et avance toute seule"
        >
          {continuous ? "⏸" : "🎧"}
        </button>
      </div>
      <h1 className="lecon-title">
        {found.world.emoji} {lesson.titre}
      </h1>
      {i === 0 && <p className="objectif">🎯 {lesson.objectif}</p>}

      <div className="step-card" key={i}>
        <StepView step={step} k={`step:${key}:${i}`} onAnswered={() => setAnswered((a) => ({ ...a, [i]: true }))} statKey={lessonKey(found.world, lesson.id)} />
      </div>

      <div className="lecon-nav">
        <button className="btn btn-soft" disabled={i === 0} onClick={() => setI(i - 1)}>
          ← Précédent
        </button>
        {step.kind !== "question" && stepSegments(step).length > 0 && (
          <button className="btn btn-soft" onClick={() => (tts.playing && tts.key === `step:${key}:${i}` ? stopSpeaking() : speak(stepSegments(step), { key: `step:${key}:${i}` }))}>
            {tts.playing && tts.key === `step:${key}:${i}` ? "⏹ Stop" : "🔊 Relire"}
          </button>
        )}
        {blocked ? (
          <button className="btn btn-ghost" onClick={() => setAnswered((a) => ({ ...a, [i]: true }))}>
            Passer
          </button>
        ) : (
          <button className="btn btn-primary" onClick={goNext}>
            {isLast ? "⭐ Au défi !" : "Suivant →"}
          </button>
        )}
      </div>
    </div>
  );
}

function StepView({ step, k, onAnswered, statKey }: { step: Step; k: string; onAnswered: () => void; statKey: string }) {
  switch (step.kind) {
    case "dialogue":
      return <Dialogue lines={step.lines} k={k} />;
    case "texte":
      return (
        <div className="st-texte">
          {step.titre && <h2>{step.titre}</h2>}
          <Md text={step.texte} />
        </div>
      );
    case "histoire":
      return (
        <div className="st-histoire">
          <div className="st-label">📜 {step.titre ?? "Un peu d'histoire"}</div>
          <Md text={step.texte} />
        </div>
      );
    case "visuel":
      return <Visuel v={step.visuel} legende={step.legende} />;
    case "a_quoi_ca_sert":
      return (
        <div className="st-utile">
          <div className="st-label">🌍 À quoi ça sert ?</div>
          <div className="st-row">
            <Mascot who="neo" size={64} />
            <Md text={step.texte} />
          </div>
        </div>
      );
    case "astuce":
      return (
        <div className="st-astuce">
          <div className="st-label">💡 Astuce</div>
          <Bubble who={(step.qui ?? "mia") as Who} text={step.texte} k={k} />
        </div>
      );
    case "attention":
      return (
        <div className="st-attention">
          <div className="st-label">⚠️ Attention, piège !</div>
          <Bubble who={(step.qui ?? "neo") as Who} text={step.texte} k={k} />
        </div>
      );
    case "retiens":
      return (
        <div className="st-retiens">
          <div className="st-label">📌 Je retiens</div>
          <Md text={step.texte} />
        </div>
      );
    case "exemple":
      return <Exemple step={step} />;
    case "question":
      return <InlineQuestion spec={step.ex} onAnswered={onAnswered} statKey={statKey} />;
    case "explique":
      return <Explique step={step} onAnswered={onAnswered} />;
    case "vraie_vie":
      return <VraieVie step={step} id={`${statKey}:${k}`} />;
  }
}

/** « Explique à Néo » : l'enfant choisit la méthode qu'il a utilisée (métacognition). */
function Explique({ step, onAnswered }: { step: Extract<Step, { kind: "explique" }>; onAnswered: () => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const c = pick !== null ? step.choix[pick] : null;
  return (
    <div className="st-explique">
      <div className="st-label">🗣️ Explique-moi comment tu fais !</div>
      <Bubble who={step.qui} text={step.texte} humeur="reflexion" />
      <div className="choices grid">
        {step.choix.map((ch, j) => (
          <button
            key={j}
            type="button"
            className={`choice ${pick === j ? (ch.ok ? "good" : "sel") : ""}`}
            onClick={() => {
              setPick(j);
              if (ch.ok) {
                bump("explique");
                onAnswered();
              }
            }}
          >
            <Md text={ch.texte} inline />
          </button>
        ))}
      </div>
      {c && <Bubble who={step.qui} text={c.retour || (c.ok ? "Oui ! C'est une très bonne méthode." : "Hmm… est-ce que ça marche vraiment ? Essaie une autre idée.")} humeur={c.ok ? "joie" : "reflexion"} />}
      {c?.ok && <p className="small muted center">💬 Dis-le aussi à voix haute à quelqu'un : expliquer, c'est le meilleur moyen de bien comprendre !</p>}
    </div>
  );
}

/** Défi à faire « pour de vrai » avec un adulte : les maths quittent l'écran. */
function VraieVie({ step, id }: { step: Extract<Step, { kind: "vraie_vie" }>; id: string }) {
  const child = useChild()!;
  const done = child.vraieVie?.includes(id);
  return (
    <div className="st-vraievie">
      <div className="st-label">🏡 {step.titre}</div>
      <div className="st-row">
        <Mascot who="zero" size={64} humeur="joie" />
        <div>
          <Md text={step.texte} />
          {step.materiel && <p className="small">🧰 Il te faut : {step.materiel}</p>}
        </div>
      </div>
      <div className="center">
        {done ? (
          <p className="ok-text">✅ Défi réalisé, bravo !</p>
        ) : (
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => {
              updateChild((x) => {
                x.vraieVie = [...(x.vraieVie ?? []), id];
              });
              bump("vraievie");
              addXp(20);
            }}
          >
            ✅ Je l'ai fait avec un adulte !
          </button>
        )}
        <p className="small muted">Tu peux aussi le faire plus tard et continuer la leçon.</p>
      </div>
    </div>
  );
}

function Exemple({ step }: { step: Extract<Step, { kind: "exemple" }> }) {
  const [shown, setShown] = useState(0);
  const all = shown >= step.etapes.length;
  return (
    <div className="st-exemple">
      <div className="st-label">✏️ Exemple résolu{step.titre ? ` : ${step.titre}` : ""}</div>
      <Md text={step.enonce} className="ex-enonce" />
      {step.visuel && <Visuel v={step.visuel} />}
      <ol className="ex-steps">
        {step.etapes.slice(0, shown).map((e, i) => (
          <li key={i} className="pop">
            <Md text={e} inline />
          </li>
        ))}
      </ol>
      {!all ? (
        <div className="row">
          <button className="btn btn-soft" onClick={() => setShown(shown + 1)}>
            👀 Étape {shown + 1} — réfléchis d'abord, puis regarde !
          </button>
          <button className="btn btn-ghost small" onClick={() => setShown(step.etapes.length)}>
            Tout montrer
          </button>
        </div>
      ) : (
        step.reponse && (
          <div className="ex-answer pop">
            ✅ <Md text={step.reponse} inline />
          </div>
        )
      )}
    </div>
  );
}

function InlineQuestion({ spec, onAnswered, statKey }: { spec: Parameters<typeof instantiate>[0]; onAnswered: () => void; statKey: string }) {
  const [seed, setSeed] = useState(newSeed);
  const [done, setDone] = useState(false);
  const inst = useMemo(() => instantiate(spec, seed), [spec, seed]);
  return (
    <div className="st-question">
      <div className="st-label">🧠 À toi de jouer !</div>
      {!done ? (
        <ExercisePlayer
          key={seed}
          inst={inst}
          statKey={statKey}
          onResult={() => {
            setDone(true);
            onAnswered();
          }}
        />
      ) : (
        <div className="center">
          <p>Bien ! Tu peux continuer, ou t'entraîner encore une fois.</p>
          <button
            className="btn btn-soft"
            onClick={() => {
              setSeed(newSeed());
              setDone(false);
            }}
          >
            🔁 Une autre question
          </button>
        </div>
      )}
    </div>
  );
}
