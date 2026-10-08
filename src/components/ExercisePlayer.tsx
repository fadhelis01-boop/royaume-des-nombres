import { useEffect, useMemo, useRef, useState } from "react";
import { check, prettyExpr, readNumber, type Answer, type Instance, type Verdict } from "../lib/gen";
import { ENCOURAGE, pick, PRAISE } from "../lib/rewards";
import { sfx } from "../lib/sound";
import { activeChild, getState, recordAnswer, bump, touchSession } from "../lib/store";
import { rewardCorrect, rewardWrong } from "../lib/juice";
import { say, speak, stopSpeaking } from "../lib/tts";
import type { Who } from "../lib/types";
import { applyKey, Keypad, keypadExtras } from "./Keypad";
import { Bubble, SpeakBtn } from "./Mascot";
import { Md } from "./Md";
import { Droite, Visuel } from "./Visuel";
import { Manip } from "./Manip";
import { Icone } from "./Icone";
import { AccentBar, Classer, DicteeControles, DicteeCorrection, Surligner } from "./FrExercices";
import type { Lead } from "../lib/habillage";

const MANIP = ["blocs", "partage", "sauts", "colorier", "horloge", "payer"];
/** Types « à choix » : réussir au 2ᵉ essai ne rapporte rien (sinon cliquer au hasard paierait). */
const CHOICE = ["qcm", "vf", "comparer"];

export interface ExResult {
  ok: boolean;
  firstTry: boolean;
  hint: boolean;
}

type Phase = "answer" | "retry" | "done";

const WHOS: Who[] = ["mia", "neo", "zero"];

export function ExercisePlayer({
  inst,
  statKey,
  onResult,
  maxTries = 2,
  autoRead,
  continueLabel = "Continuer",
  removed = [],
  powerHint,
  lead,
  onVerdict,
}: {
  inst: Instance;
  statKey: string;
  onResult: (r: ExResult) => void;
  maxTries?: number;
  autoRead?: boolean;
  continueLabel?: string;
  /** choix retirés par un pouvoir (coup de queue de Néo) */
  removed?: number[];
  /** indice donné par un pouvoir (dessin de Lya) */
  powerHint?: string;
  /** petite mise en scène : l'habitant du monde qui pose la question */
  lead?: Lead;
  /** appelé dès que la réponse est définitive (avant « Continuer ») : pour réagir tout de suite */
  onVerdict?: (r: ExResult) => void;
}) {
  const isChoice = CHOICE.includes(inst.type);
  // Vrai/faux : un 2ᵉ essai serait gagné d'avance, donc un seul essai.
  if (inst.type === "vf") maxTries = 1;
  const rootRef = useRef<HTMLDivElement>(null);
  const [struck, setStruck] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [fields, setFields] = useState<string[]>(() => (inst.champs ?? []).map(() => ""));
  const [focusField, setFocusField] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [point, setPoint] = useState<number | null>(null);
  const [manipVals, setManipVals] = useState<number[] | null>(null);
  const [sel, setSel] = useState<number[]>([]); // surligner
  const [cls, setCls] = useState<(number | null)[]>(() => (inst.type === "classer" ? (inst.items ?? []).map(() => null) : [])); // classer
  const isFrText = inst.type === "mot" || inst.type === "dictee";
  const isManip = MANIP.includes(inst.type);
  const [phase, setPhase] = useState<Phase>("answer");
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [message, setMessage] = useState<{ who: Who; text: string; humeur?: string } | null>(null);
  const [okFinal, setOkFinal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const k = `ex:${inst.seed}`;
  const isTouch = useMemo(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches, []);

  const readable = useMemo(() => {
    let t = inst.enonce;
    if (inst.type === "comparer") t += ` ${inst.gauche} … ${inst.droite}`;
    if (inst.choix && (inst.type === "qcm" || inst.type === "vf")) t += " " + inst.choix.join(" ? ou : ") + " ?";
    return t;
  }, [inst]);

  useEffect(() => {
    if (inst.type !== "dictee" && (autoRead ?? (getState().settings.autoRead || activeChild()?.lecteur === "non"))) speak([{ who: "narrateur", text: readable }], { key: k });
    if (!isTouch) inputRef.current?.focus();
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inst.seed]);

  const answer = (): Answer | null => {
    switch (inst.type) {
      case "qcm":
      case "vf":
      case "comparer":
        return choice === null ? null : { kind: "choice", index: choice };
      case "ordre":
        return order.length === inst.items!.length ? { kind: "order", order: order.map((i) => i) } : null;
      case "droite":
        return point === null ? null : { kind: "point", value: point };
      case "champs":
        return fields.every((f) => f.trim()) ? { kind: "fields", values: fields } : null;
      case "blocs":
      case "partage":
      case "sauts":
      case "colorier":
      case "horloge":
      case "payer":
        return manipVals ? { kind: "state", values: manipVals } : null;
      case "surligner":
        return sel.length ? { kind: "state", values: sel } : null;
      case "classer":
        return cls.every((c) => c !== null) ? { kind: "state", values: cls as number[] } : null;
      default:
        return text.trim() ? { kind: "text", value: text } : null;
    }
  };

  const givenText = () => {
    switch (inst.type) {
      case "qcm":
      case "vf":
      case "comparer":
        return choice !== null ? inst.choix![choice] : "";
      case "ordre":
        return order.map((i) => inst.items![i]).join(" → ");
      case "droite":
        return point !== null ? point.toFixed(2) : "";
      case "champs":
        return fields.join(" · ");
      case "surligner":
        return sel.map((i) => inst.words![i]).join(", ");
      case "classer":
        return inst.items!.map((it, i) => `${it} → ${cls[i] !== null ? inst.categories![cls[i]!] : "?"}`).join(", ");
      default:
        return isManip ? (manipVals ?? []).join(" · ") : text;
    }
  };

  const submit = (forced?: Answer) => {
    if (phase === "done") return;
    const a = forced ?? answer();
    if (!a) return;
    const v = check(inst, a);
    if (v.invalid) {
      setMessage({ who: "neo", text: v.invalid });
      say("neo", v.invalid);
      return;
    }
    setVerdict(v);
    const n = tries + 1;
    setTries(n);
    touchSession();
    if (v.ok) {
      sfx.ok();
      const who = pick(WHOS);
      const scored = n === 1 || !isChoice;
      const t = scored ? pick(PRAISE[who as "mia"]) : "Oui, c'est ça ! La prochaine fois, prends le temps de réfléchir avant de choisir : au hasard, ça ne rapporte rien.";
      setMessage({ who, text: t, humeur: "joie" });
      if (isManip) bump("manip");
      const juice = rewardCorrect({ firstTry: n === 1, scored, anchor: rootRef.current?.querySelector(".ex-actions, .keypad") });
      if (!juice.spoke) say(who, t);
      setOkFinal(true);
      setPhase("done");
      recordAnswer({ key: statKey, ok: true, firstTry: n === 1, hint, scored });
      onVerdict?.({ ok: true, firstTry: n === 1, hint });
      return;
    }
    sfx.oops();
    rewardWrong();
    if (isChoice && choice !== null) setStruck((s) => [...s, choice]);
    const given = givenText();
    const isZero = /^\s*0\s*$/.test(given) && inst.value !== 0 && inst.type === "nombre";
    if (n < maxTries) {
      // erreur fréquente reconnue : Néo explique précisément ce qui s'est passé
      const who: Who = isZero ? "zero" : v.why || v.almost ? "neo" : pick(WHOS);
      const t = isZero ? "Zéro ? …C'était MA réponse ! 😄 Mais ici, ce n'est pas ça. Réessaie !" : v.why ? `${v.why} Réessaie !` : v.almost ?? pick(ENCOURAGE[who as "mia"]);
      setMessage({ who, text: t, humeur: "reflexion" });
      say(who, t);
      setPhase("retry");
      return;
    }
    recordAnswer({ key: statKey, ok: false, firstTry: false, hint, q: inst.enonce, given, expected: inst.expectedText, isZero });
    onVerdict?.({ ok: false, firstTry: false, hint });
    const t = v.why
      ? `${v.why} La bonne réponse : ${inst.expectedText}.`
      : v.almost
        ? `${v.almost} La réponse attendue : ${inst.expectedText}.`
        : `La bonne réponse était : ${inst.expectedText}. Ce n'est pas grave, on apprend en se trompant !`;
    setMessage({ who: "mia", text: t, humeur: "reflexion" });
    speak([{ who: "mia", text: t }, ...(inst.correction ? [{ who: "neo" as Who, text: inst.correction }] : [])], { key: k + ":fb" });
    setPhase("done");
  };

  const finish = () => {
    stopSpeaking();
    onResult({ ok: okFinal, firstTry: tries === 1 && okFinal, hint });
  };

  const retry = () => {
    setPhase("answer");
    setMessage(null);
    setChoice(null);
    setPoint(null);
    setOrder([]);
    setSel([]);
    if (inst.type !== "champs" && inst.type !== "dictee") setText("");
    if (!isTouch) setTimeout(() => inputRef.current?.focus(), 30);
  };

  const onKey = (key: string) => {
    if (phase !== "answer") return;
    if (inst.type === "champs") {
      setFields((f) => f.map((x, i) => (i === focusField ? applyKey(x, key) : x)));
    } else setText((t) => applyKey(t, key));
  };

  const showHint = () => {
    setHint(true);
    if (inst.indice) say("mia", inst.indice);
  };

  // Touche Entrée (un appui maintenu ou doublé ne doit pas sauter la correction)
  const lastEnter = useRef(0);
  // posé directement sur les champs : plus fiable que l'écouteur global (vu en test réel)
  const onFieldEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat || Date.now() - lastEnter.current < 700) return;
    lastEnter.current = Date.now();
    if (phase === "answer") submit();
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement && phase === "answer")) {
        e.preventDefault();
        if (e.repeat || Date.now() - lastEnter.current < 700) return;
        lastEnter.current = Date.now();
        if (phase === "answer") submit();
        else if (phase === "retry") retry();
        else finish();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const disabled = phase !== "answer";
  const canSubmit = !!answer() && phase === "answer";
  const usesKeypad = ["nombre", "liste", "expression", "champs"].includes(inst.type);

  return (
    <div ref={rootRef} className={`exercise phase-${phase} ${phase === "done" ? (okFinal ? "is-ok" : "is-ko") : ""}`}>
      {lead && (
        <div className="ex-lead">
          <Icone cat="habitants" id={lead.id} emoji={lead.emoji} size={40} /> {lead.text}
        </div>
      )}
      <div className="ex-head">
        <SpeakBtn segs={[{ who: "narrateur", text: readable }]} k={k} small label="Écouter la consigne" />
        <Md text={inst.enonce} className="ex-enonce" />
      </div>
      {inst.visuel && inst.type !== "droite" && <Visuel v={inst.visuel} />}

      {/* ----- Zone de réponse ----- */}
      {(inst.type === "qcm" || inst.type === "vf") && (
        <div className={`choices ${inst.choix!.length > 2 ? "grid" : "two"}`}>
          {inst.choix!.map((c, i) => (
            <button
              key={i}
              type="button"
              hidden={removed.includes(i) && phase !== "done"}
              disabled={disabled || struck.includes(i)}
              className={`choice ${choice === i ? "sel" : ""} ${phase === "done" && i === inst.correct ? "good" : ""} ${phase !== "answer" && choice === i && i !== inst.correct ? "bad" : ""}`}
              onClick={() => {
                setChoice(i);
                sfx.tap();
              }}
            >
              <Md text={c} inline />
            </button>
          ))}
        </div>
      )}

      {inst.type === "comparer" && (
        <div className="compare">
          <div className="compare-side">
            <Md text={inst.gauche!} inline />
          </div>
          <div className="compare-box">{choice !== null ? inst.choix![choice] : "?"}</div>
          <div className="compare-side">
            <Md text={inst.droite!} inline />
          </div>
          <div className="compare-btns">
            {inst.choix!.map((c, i) => (
              <button key={c} type="button" hidden={removed.includes(i) && phase !== "done"} disabled={disabled || struck.includes(i)} className={`choice big ${choice === i ? "sel" : ""} ${phase === "done" && i === inst.correct ? "good" : ""}`} onClick={() => setChoice(i)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {inst.type === "ordre" && (
        <div className="ordre">
          <div className="ordre-slots">
            {inst.items!.map((_, i) => (
              <button key={i} type="button" className={`slot ${order[i] !== undefined ? "filled" : ""}`} disabled={disabled || order[i] === undefined} onClick={() => setOrder((o) => o.filter((_, j) => j !== i))}>
                {order[i] !== undefined ? <Md text={inst.items![order[i]]} inline /> : i + 1}
              </button>
            ))}
          </div>
          <div className="ordre-pool">
            {inst.shuffled!.map((idx) => (
              <button key={idx} type="button" className="chip" disabled={disabled || order.includes(idx)} onClick={() => setOrder((o) => [...o, idx])}>
                <Md text={inst.items![idx]} inline />
              </button>
            ))}
          </div>
        </div>
      )}

      {isManip && <Manip inst={inst} onChange={setManipVals} disabled={phase === "done"} />}

      {inst.type === "dictee" && <DicteeControles texte={inst.dictee!} k={k + ":dictee"} />}
      {isFrText && (
        <div className="answer-line fr">
          {inst.type === "dictee" ? (
            <textarea id={`fr-${inst.seed}`} value={text} disabled={disabled} rows={3} className="answer-input dictee-input" placeholder="Écris ce que tu entends…" spellCheck={false} autoCorrect="off" autoCapitalize="sentences" onChange={(e) => setText(e.target.value)} aria-label="ta dictée" />
          ) : (
            <input id={`fr-${inst.seed}`} ref={inputRef} value={text} disabled={disabled} className="answer-input" placeholder="ta réponse" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} onChange={(e) => setText(e.target.value)}
              onKeyDown={onFieldEnter}
              aria-label="ta réponse"
            />
          )}
        </div>
      )}
      {isFrText && phase === "answer" && <AccentBar inputId={`fr-${inst.seed}`} value={text} onChange={setText} />}
      {inst.type === "surligner" && <Surligner words={inst.words!} selected={sel} onChange={setSel} reveal={phase === "done" ? inst.targets : undefined} disabled={phase !== "answer"} />}
      {inst.type === "classer" && <Classer items={inst.items!} categories={inst.categories!} values={cls} onChange={setCls} reveal={phase === "done" ? inst.itemCats : undefined} disabled={phase !== "answer"} />}

      {inst.type === "droite" && (
        <div className="droite-ex">
          <Droite v={{ min: inst.min, max: inst.max, pas: inst.pas, etiquettes: (inst.visuel as Record<string, unknown> | undefined)?.etiquettes, fractions: (inst.visuel as Record<string, unknown> | undefined)?.fractions }} onPick={disabled ? undefined : (x) => setPoint(x)} picked={point} reveal={phase === "done" ? inst.value! : null} />
          <p className="hint-small">Touche la droite pour placer {inst.cibleAffiche}.</p>
        </div>
      )}

      {inst.type === "champs" && (
        <div className="champs">
          {inst.champs!.map((c, i) => (
            <label key={i} className="champ">
              {c.avant && <Md text={c.avant} inline />}
              <input
                ref={i === 0 ? inputRef : undefined}
                value={fields[i]}
                inputMode={isTouch ? "none" : "decimal"}
                disabled={disabled}
                className={`answer-input small ${focusField === i ? "focus" : ""}`}
                onFocus={() => setFocusField(i)}
                onChange={(e) => setFields((f) => f.map((x, j) => (j === i ? e.target.value : x)))}
                onKeyDown={onFieldEnter}
                aria-label={`case ${i + 1}`}
              />
              {c.apres && <Md text={c.apres} inline />}
            </label>
          ))}
        </div>
      )}

      {["nombre", "liste", "expression", "texte"].includes(inst.type) && (
        <div className="answer-line">
          <input
            ref={inputRef}
            value={text}
            disabled={disabled}
            inputMode={inst.clavier === "texte" ? "text" : isTouch ? "none" : "decimal"}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="answer-input"
            placeholder={inst.type === "liste" ? "ex. 3 ; −3" : inst.type === "expression" ? "ex. 3x + 2" : inst.type === "texte" ? "ta réponse" : "?"}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onFieldEnter}
            aria-label="ta réponse"
          />
          {inst.unite && <span className="unite">{inst.unite}</span>}
        </div>
      )}

      {inst.type === "expression" && text.trim() && (
        <p className="expr-preview" aria-live="polite">
          Tu as écrit : <strong>{prettyExpr(text.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/²/g, "^2"))}</strong>
        </p>
      )}
      {inst.type === "nombre" && text && readNumber(text) === null && /[^\d\s,./−-]/.test(text) && <p className="hint-small">Écris seulement un nombre.</p>}

      {usesKeypad && phase === "answer" && <Keypad mode={inst.clavier === "algebre" ? "algebre" : "nombre"} letters={inst.exprVars?.length ? inst.exprVars : ["x"]} extras={inst.clavier === "algebre" ? undefined : keypadExtras(inst.type, [inst.value ?? 0, ...(inst.values ?? []), ...(inst.champs ?? []).map((c) => c.value)])} onKey={onKey} onSubmit={() => submit()} canSubmit={canSubmit} />}

      {/* ----- Actions ----- */}
      <div className="ex-actions">
        {phase === "answer" && inst.indice && !hint && (
          <button type="button" className="btn btn-soft" onClick={showHint}>
            💡 Indice
          </button>
        )}
        {phase === "answer" && (!usesKeypad || isFrText) && (
          <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={() => submit()} aria-label="Valider">
            <span className="btn-txt">Valider </span>✔
          </button>
        )}
      </div>
      {powerHint && phase !== "done" && (
        <div className="hint-box power-hint">
          <Bubble who="mia" humeur="reflexion" text={powerHint} size={56} />
        </div>
      )}
      {hint && inst.indice && (
        <div className="hint-box">
          <Bubble who="mia" humeur="reflexion" text={inst.indice} size={56} />
        </div>
      )}

      {message && (
        <div className={`feedback ${phase === "done" ? (okFinal ? "ok" : "ko") : "retry"}`} aria-live="polite">
          <Bubble who={message.who} text={message.text} size={64} humeur={message.humeur} />
          {phase === "done" && !okFinal && inst.type === "dictee" && <DicteeCorrection attendu={inst.dictee!} donne={text} />}
          {phase === "done" && !okFinal && verdict && (
            <div className="correction">
              <div className="correction-title">✏️ La bonne réponse</div>
              <Md text={inst.expectedText + (inst.unite && !inst.expectedText.endsWith(inst.unite) ? " " + inst.unite : "")} className="correction-answer" />
              {inst.correction && <Md text={inst.correction} />}
            </div>
          )}
          {phase === "done" && okFinal && inst.correction && (
            <details className="correction-details">
              <summary>Voir l'explication</summary>
              <Md text={inst.correction} />
            </details>
          )}
          <div className="ex-actions">
            {phase === "retry" && (
              <button type="button" className="btn btn-primary" onClick={retry} autoFocus aria-label="Réessayer">
                <span className="btn-txt">Réessayer </span>🔁
              </button>
            )}
            {phase === "done" && (
              <button type="button" className="btn btn-primary" onClick={finish} autoFocus aria-label={continueLabel}>
                <span className="btn-txt">{continueLabel} </span>➜
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
