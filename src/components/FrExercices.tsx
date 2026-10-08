import { useEffect, useState } from "react";
import { speak, stopSpeaking } from "../lib/tts";
import { sfx } from "../lib/sound";
import { normOrtho, variantes1990 } from "../lib/fr/morpho";

// Les activités propres au français : barre d'accents, dictée, mots à toucher, mots à classer.

const ACCENTS = ["é", "è", "ê", "à", "â", "ù", "û", "ç", "ô", "î", "ï", "ë", "œ", "’", "-"];

/** Barre d'accents : insère la lettre à l'endroit du curseur (indispensable sur tablette). */
export function AccentBar({ inputId, value, onChange, disabled }: { inputId: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [maj, setMaj] = useState(false);
  const insert = (ch: string) => {
    const el = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement | null;
    const c = maj ? ch.toUpperCase() : ch;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const v = value.slice(0, start) + c + value.slice(end);
    onChange(v);
    sfx.tap();
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + c.length, start + c.length);
    });
  };
  return (
    <div className="accent-bar" role="group" aria-label="lettres accentuées">
      <button type="button" className={`accent-key maj ${maj ? "on" : ""}`} onClick={() => setMaj(!maj)} aria-pressed={maj} aria-label="majuscule" disabled={disabled}>
        ⇧
      </button>
      {ACCENTS.map((a) => (
        <button key={a} type="button" className="accent-key" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(a === "’" ? "'" : a)} disabled={disabled}>
          {maj ? a.toUpperCase() : a}
        </button>
      ))}
    </div>
  );
}

/** Découpe une dictée en petits groupes lus lentement, ponctuation dite à voix haute (comme en classe). */
function groupesLents(texte: string): string[] {
  const dit = texte
    .replace(/\s*,/g, " virgule,")
    .replace(/\s*\.\s*$/g, " point.")
    .replace(/\s*\?\s*$/g, " point d'interrogation.")
    .replace(/\s*!\s*$/g, " point d'exclamation.")
    .replace(/\s*;/g, " point-virgule,")
    .replace(/\s*:/g, " deux-points,");
  const mots = dit.split(/\s+/);
  const out: string[] = [];
  for (let i = 0; i < mots.length; i += 3) out.push(mots.slice(i, i + 3).join(" "));
  return out;
}

export function DicteeControles({ texte, k }: { texte: string; k: string }) {
  const lire = (lent: boolean) => {
    stopSpeaking();
    speak((lent ? groupesLents(texte) : [texte]).map((t) => ({ who: "narrateur" as const, text: t })), { key: k + (lent ? ":lent" : "") });
  };
  useEffect(() => {
    const t = window.setTimeout(() => lire(false), 300);
    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte]);
  return (
    <div className="dictee-ctrl">
      <button type="button" className="btn btn-primary" onClick={() => lire(false)}>
        🔊 Écouter
      </button>
      <button type="button" className="btn btn-soft" onClick={() => lire(true)}>
        🐢 Lentement, avec la ponctuation
      </button>
    </div>
  );
}

/** Correction mot à mot d'une dictée : les mots fautifs sont surlignés. */
export function DicteeCorrection({ attendu, donne }: { attendu: string; donne: string }) {
  const b = attendu.split(/\s+/);
  const a = normOrtho(donne).split(" ");
  return (
    <p className="dictee-corr">
      {b.map((w, i) => {
        const nw = normOrtho(w);
        const bon = a[i] === nw || variantes1990(nw).includes(a[i] ?? "");
        return (
          <span key={i} className={bon ? "dc-ok" : "dc-ko"} title={bon ? undefined : `tu as écrit : ${a[i] ?? "(rien)"}`}>
            {w}{" "}
          </span>
        );
      })}
    </p>
  );
}

/** Toucher des mots dans une phrase (le verbe, le sujet, les mots d'une chaîne d'accord…). */
export function Surligner({ words, selected, onChange, reveal, disabled }: { words: string[]; selected: number[]; onChange: (s: number[]) => void; reveal?: number[]; disabled?: boolean }) {
  return (
    <p className="surligner" role="group" aria-label="touche les bons mots">
      {words.map((w, i) => {
        const on = selected.includes(i);
        const cls = reveal ? (reveal.includes(i) ? (on ? "good" : "missed") : on ? "bad" : "") : on ? "on" : "";
        return (
          <button
            key={i}
            type="button"
            className={`mot-chip ${cls}`}
            aria-pressed={on}
            disabled={disabled}
            onClick={() => {
              sfx.tap();
              onChange(on ? selected.filter((x) => x !== i) : [...selected, i]);
            }}
          >
            {w}
          </button>
        );
      })}
    </p>
  );
}

const COULEURS = ["#7c4dff", "#ff8a1f", "#14b8a6", "#e2574c", "#2f6fdf", "#3fa34d"];

/** Ranger des mots dans des boîtes : on touche une boîte pour chaque mot. */
export function Classer({ items, categories, values, onChange, reveal, disabled }: { items: string[]; categories: string[]; values: (number | null)[]; onChange: (v: (number | null)[]) => void; reveal?: number[]; disabled?: boolean }) {
  return (
    <div className="classer">
      <div className="classer-legende">
        {categories.map((c, k) => (
          <span key={k} className="cl-cat" style={{ "--cc": COULEURS[k % COULEURS.length] } as React.CSSProperties}>
            {c}
          </span>
        ))}
      </div>
      {items.map((it, i) => (
        <div key={i} className={`classer-row ${reveal ? (values[i] === reveal[i] ? "good" : "bad") : ""}`}>
          <strong className="classer-mot">{it}</strong>
          <div className="classer-btns">
            {categories.map((c, k) => (
              <button
                key={k}
                type="button"
                className={`cl-btn ${values[i] === k ? "on" : ""} ${reveal && reveal[i] === k ? "answer" : ""}`}
                style={{ "--cc": COULEURS[k % COULEURS.length] } as React.CSSProperties}
                disabled={disabled}
                aria-pressed={values[i] === k}
                onClick={() => {
                  sfx.tap();
                  onChange(values.map((v, j) => (j === i ? k : v)));
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
