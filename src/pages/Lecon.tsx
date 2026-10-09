import { useEffect, useMemo, useState } from "react";
import { go } from "../lib/router";
import { findLesson, lessonKey } from "../lib/content";
import { saveStep, useChild, getState, bump, addXp, addGems, updateChild, recordAbandon } from "../lib/store";
import { sfx } from "../lib/sound";
import { speak, stopSpeaking, useTts, type Seg } from "../lib/tts";
import { instantiate, newSeed } from "../lib/gen";
import { DessinPasAPas, Experience } from "../components/EtapesSavoirs";
import { Bubble, Dialogue, Mascot } from "../components/Mascot";
import { Md } from "../components/Md";
import { Visuel } from "../components/Visuel";
import { ExercisePlayer } from "../components/ExercisePlayer";
import type { Step, Who, World } from "../lib/types";

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
    case "experience":
      return [{ who: "neo", text: `Expérience : ${s.titre}. ${s.securite === "rouge" ? "Celle-ci, on la regarde seulement, jamais à la maison." : s.securite === "orange" ? "À faire avec un adulte." : ""} Il te faut : ${s.materiel.join(", ")}. ${s.etapes.join(" ")}` }];
    case "dessin":
      return [{ who: "mia", text: `Dessin pas à pas : ${s.titre}. ${s.etapes[0]?.consigne ?? ""}` }];
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
    const auto = continuous || getState().settings.autoRead || child.lecteur === "non";
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
        <button
          className="back"
          onClick={() => {
            if (!isLast && i > 0) recordAbandon(key);
            go(`/monde/${worldId}`);
          }}
          aria-label="Quitter la leçon"
        >
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
      <h1 className={`lecon-title ${found.world.decor ? "avec-decor" : ""}`} style={found.world.decor ? ({ "--decor": `url(${found.world.decor})` } as React.CSSProperties) : undefined}>
        <span>
          {found.world.emoji} {lesson.titre}
        </span>
      </h1>
      {i === 0 && <p className="objectif">🎯 {lesson.objectif}</p>}

      <div className="step-card" key={i}>
        <StepView step={step} k={`step:${key}:${i}`} onAnswered={() => setAnswered((a) => ({ ...a, [i]: true }))} statKey={lessonKey(found.world, lesson.id)} cycle={found.world.cycle} />
      </div>

      <div className="lecon-nav">
        <button className="btn btn-soft" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="Précédent">
          ←<span className="btn-txt"> Précédent</span>
        </button>
        {step.kind !== "question" && stepSegments(step).length > 0 && (
          <button className="btn btn-soft" aria-label="Relire" onClick={() => (tts.playing && tts.key === `step:${key}:${i}` ? stopSpeaking() : speak(stepSegments(step), { key: `step:${key}:${i}` }))}>
            {tts.playing && tts.key === `step:${key}:${i}` ? (
              <>
                ⏹<span className="btn-txt"> Stop</span>
              </>
            ) : (
              <>
                🔊<span className="btn-txt"> Relire</span>
              </>
            )}
          </button>
        )}
        {blocked ? (
          <button className="btn btn-ghost" onClick={() => setAnswered((a) => ({ ...a, [i]: true }))} aria-label="Passer">
            ⏭<span className="btn-txt"> Passer</span>
          </button>
        ) : (
          <button className="btn btn-primary" onClick={goNext} aria-label={isLast ? "Au défi" : "Suivant"}>
            {isLast ? (
              <>
                ⭐<span className="btn-txt"> Au défi !</span>
              </>
            ) : (
              <>
                <span className="btn-txt">Suivant </span>→
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function StepView({ step, k, onAnswered, statKey, cycle }: { step: Step; k: string; onAnswered: () => void; statKey: string; cycle: World["cycle"] }) {
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
      return <InlineQuestion spec={step.ex} onAnswered={onAnswered} statKey={statKey} cycle={cycle} />;
    case "explique":
      return <Explique step={step} onAnswered={onAnswered} />;
    case "vraie_vie":
      return <VraieVie step={step} id={`${statKey}:${k}`} />;
    case "experience":
      return <Experience step={step} id={`${statKey}:${k}`} />;
    case "dessin":
      return <DessinPasAPas step={step} onAnswered={onAnswered} />;
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

const RENCONTRE: Partial<Record<World["cycle"], { who: Who; avant: string; gagne: string; perdu: string }>> = {
  graines: {
    who: "nuage",
    avant: "Hi hi ! J'ai volé la réponse de cette question ! Si tu la trouves, je te la rends… et je te donne 3 gemmes !",
    gagne: "Grrr… tu l'as trouvée ! Bon, voilà tes gemmes. Mais je reviendrai !",
    perdu: "Hi hi, je garde la réponse… pour l'instant ! Regarde bien la correction.",
  },
  explorateurs: {
    who: "ixe",
    avant: "Coucou ! Je me suis cachée dans la réponse de cette question. Trouve-moi et je te donne 3 gemmes !",
    gagne: "Démasquée ! Quel flair de détective ! Voilà tes gemmes.",
    perdu: "Raté, je change de couleur ! La correction va t'aider à me retrouver la prochaine fois.",
  },
};

function InlineQuestion({ spec, onAnswered, statKey, cycle }: { spec: Parameters<typeof instantiate>[0]; onAnswered: () => void; statKey: string; cycle: World["cycle"] }) {
  const [seed, setSeed] = useState(newSeed);
  const [done, setDone] = useState(false);
  const [issue, setIssue] = useState<boolean | null>(null);
  const inst = useMemo(() => instantiate(spec, seed), [spec, seed]);
  // une question sur trois environ, le Grignoteur (ou Ixe) surgit : la même question devient une petite quête
  const rencontre = RENCONTRE[cycle] && seed % 3 === 0 ? RENCONTRE[cycle] : undefined;
  return (
    <div className="st-question">
      <div className="st-label">🧠 À toi de jouer !</div>
      {rencontre && (
        <div className={`rencontre ${issue === null ? "arrive" : issue ? "fuit" : "rit"}`}>
          <Bubble who={rencontre.who} humeur={issue === null ? "joie" : issue ? "triste" : "joie"} text={issue === null ? rencontre.avant : issue ? rencontre.gagne : rencontre.perdu} size={60} />
        </div>
      )}
      {!done ? (
        <ExercisePlayer
          key={seed}
          inst={inst}
          statKey={statKey}
          onResult={(r) => {
            if (rencontre) {
              setIssue(r.ok);
              if (r.ok) {
                addGems(3);
                sfx.gem();
              }
            }
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
              setIssue(null);
            }}
          >
            🔁 Une autre question
          </button>
        </div>
      )}
    </div>
  );
}
