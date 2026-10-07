import { useEffect, useMemo, useRef, useState } from "react";
import { check, prettyExpr, readNumber, type Answer, type Instance, type Verdict } from "../lib/gen";
import { ENCOURAGE, pick, PRAISE } from "../lib/rewards";
import { sfx } from "../lib/sound";
import { getState, recordAnswer, bump } from "../lib/store";
import { say, speak, stopSpeaking } from "../lib/tts";
import type { Who } from "../lib/types";
import { applyKey, Keypad } from "./Keypad";
import { Bubble, SpeakBtn } from "./Mascot";
import { Md } from "./Md";
import { Droite, Visuel } from "./Visuel";

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
}: {
  inst: Instance;
  statKey: string;
  onResult: (r: ExResult) => void;
  maxTries?: number;
  autoRead?: boolean;
  continueLabel?: string;
}) {
  const [text, setText] = useState("");
  const [fields, setFields] = useState<string[]>(() => (inst.champs ?? []).map(() => ""));
  const [focusField, setFocusField] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [point, setPoint] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("answer");
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [message, setMessage] = useState<{ who: Who; text: string } | null>(null);
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
    if (autoRead ?? getState().settings.autoRead) speak([{ who: "narrateur", text: readable }], { key: k });
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
      default:
        return text;
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
    if (v.ok) {
      sfx.ok();
      const who = pick(WHOS);
      const t = pick(PRAISE[who as "mia"]);
      setMessage({ who, text: t });
      say(who, t);
      setOkFinal(true);
      setPhase("done");
      recordAnswer({ key: statKey, ok: true, firstTry: n === 1, hint });
      return;
    }
    sfx.oops();
    const given = givenText();
    const isZero = /^\s*0\s*$/.test(given) && inst.value !== 0 && inst.type === "nombre";
    if (isZero) bump("zero");
    if (n < maxTries) {
      const who: Who = isZero ? "zero" : v.almost ? "neo" : pick(WHOS);
      const t = isZero ? "Zéro ? …C'était MA réponse ! 😄 Mais ici, ce n'est pas ça. Réessaie !" : v.almost ?? pick(ENCOURAGE[who as "mia"]);
      setMessage({ who, text: t });
      say(who, t);
      setPhase("retry");
      return;
    }
    recordAnswer({ key: statKey, ok: false, firstTry: false, hint, q: inst.enonce, given, expected: inst.expectedText, isZero });
    const t = v.almost ? `${v.almost} La réponse attendue : ${inst.expectedText}.` : `La bonne réponse était : ${inst.expectedText}. Ce n'est pas grave, on apprend en se trompant !`;
    setMessage({ who: "mia", text: t });
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
    if (inst.type !== "champs") setText("");
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

  // Touche Entrée
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
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
    <div className={`exercise phase-${phase} ${phase === "done" ? (okFinal ? "is-ok" : "is-ko") : ""}`}>
      <div className="ex-head">
        <SpeakBtn segs={[{ who: "narrateur", text: readable }]} k={k} small />
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
              disabled={disabled}
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
              <button key={c} type="button" disabled={disabled} className={`choice big ${choice === i ? "sel" : ""} ${phase === "done" && i === inst.correct ? "good" : ""}`} onClick={() => setChoice(i)}>
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

      {usesKeypad && phase === "answer" && <Keypad mode={inst.clavier === "algebre" ? "algebre" : "nombre"} letters={inst.exprVars?.length ? inst.exprVars : ["x"]} onKey={onKey} onSubmit={() => submit()} canSubmit={canSubmit} />}

      {/* ----- Actions ----- */}
      <div className="ex-actions">
        {phase === "answer" && inst.indice && !hint && (
          <button type="button" className="btn btn-soft" onClick={showHint}>
            💡 Indice
          </button>
        )}
        {phase === "answer" && !usesKeypad && (
          <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={() => submit()}>
            Valider ✔
          </button>
        )}
      </div>
      {hint && inst.indice && (
        <div className="hint-box">
          <Bubble who="mia" humeur="reflexion" text={inst.indice} size={56} />
        </div>
      )}

      {message && (
        <div className={`feedback ${phase === "done" ? (okFinal ? "ok" : "ko") : "retry"}`} aria-live="polite">
          <Bubble who={message.who} text={message.text} size={64} />
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
              <button type="button" className="btn btn-primary" onClick={retry} autoFocus>
                Réessayer 🔁
              </button>
            )}
            {phase === "done" && (
              <button type="button" className="btn btn-primary" onClick={finish} autoFocus>
                {continueLabel} ➜
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
