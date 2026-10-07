import { sfx } from "../lib/sound";

// Grand clavier tactile pensé pour de petits doigts : évite le clavier du
// téléphone (qui cache l'exercice) et propose les symboles mathématiques utiles.

export type KeypadMode = "nombre" | "algebre";

const NUM = [["7", "8", "9"], ["4", "5", "6"], ["1", "2", "3"], [",", "0", "⌫"]];
const EXTRA_NUM = ["−", "/", ";"];
const ALG = [["+", "−", "×", "÷"], ["²", "^", "√", "π"], ["e", "ln(", "exp(", "sin("]];

export function Keypad({ mode, onKey, onSubmit, canSubmit, letters = ["x"] }: { mode: KeypadMode; onKey: (k: string) => void; onSubmit: () => void; canSubmit: boolean; letters?: string[] }) {
  const press = (k: string) => {
    sfx.tap();
    onKey(k);
  };
  return (
    <div className={`keypad keypad-${mode}`} role="group" aria-label="clavier">
      {mode === "algebre" && (
        <div className="keypad-alg">
          {[...letters.slice(0, 2), "(", ")", ...ALG.flat()].map((k) => (
            <button key={k} type="button" className={`key key-op ${/^[a-z]$/.test(k) && k !== "e" ? "key-var" : ""}`} onClick={() => press(k)} aria-label={k}>
              {k.length > 1 ? k.replace("(", "") : k}
            </button>
          ))}
        </div>
      )}
      <div className="keypad-main">
        <div className="keypad-digits">
          {NUM.flat().map((k) => (
            <button key={k} type="button" className={`key ${k === "⌫" ? "key-back" : ""}`} onClick={() => press(k)} aria-label={k === "⌫" ? "effacer" : k}>
              {k}
            </button>
          ))}
        </div>
        <div className="keypad-side">
          {EXTRA_NUM.map((k) => (
            <button key={k} type="button" className="key key-op" onClick={() => press(k)} title={k === ";" ? "séparer plusieurs réponses" : undefined}>
              {k}
            </button>
          ))}
          <button type="button" className="key key-ok" onClick={onSubmit} disabled={!canSubmit} aria-label="valider">
            ✔
          </button>
        </div>
      </div>
    </div>
  );
}

/** Applique une touche du clavier à une saisie. */
export function applyKey(value: string, k: string): string {
  if (k === "⌫") return value.slice(0, -1);
  if (k === ";") return value + " ; ";
  return value + k;
}
