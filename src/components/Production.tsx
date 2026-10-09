// Exercices de production (2.4) : relier des paires, et le rappel libre (écrire ou dicter ce qu'on a retenu).
// Ils obligent à retrouver ou à construire la réponse, là où un QCM se contente de la reconnaître.
import { useRef, useState } from "react";
import { idees, type Instance } from "../lib/gen";
import { dicteeSupported, startDictee } from "../lib/dictee";
import { sfx } from "../lib/sound";
import { Md } from "./Md";

const COULEURS = ["#7c4dff", "#ff8a1f", "#14b8a6", "#ff5c8a", "#2f6fdf", "#3fa34d", "#c48a00", "#8e44ad"];

/** Relier : on touche un élément à gauche, puis sa réponse à droite. values[i] = case choisie à droite. */
export function Relier({ inst, values, onChange, reveal, disabled }: { inst: Instance; values: (number | null)[]; onChange: (v: (number | null)[]) => void; reveal?: boolean; disabled?: boolean }) {
  const [sel, setSel] = useState<number | null>(null);
  const gauche = inst.items!;
  const droite = inst.texts!;
  const couleurDroite = (j: number) => {
    const i = values.indexOf(j);
    return i >= 0 ? COULEURS[i % COULEURS.length] : undefined;
  };
  const choisirDroite = (j: number) => {
    if (sel === null) return;
    sfx.tap();
    onChange(values.map((v, i) => (i === sel ? j : v === j ? null : v)));
    const suivant = values.findIndex((v, i) => v === null && i !== sel);
    setSel(suivant >= 0 ? suivant : null);
  };
  return (
    <div className="relier" role="group" aria-label="Relie chaque élément à sa réponse">
      <p className="hint-small">Touche un élément à gauche, puis sa réponse à droite.</p>
      <div className="relier-cols">
        <div className="relier-col">
          {gauche.map((g, i) => {
            const ok = reveal ? values[i] === inst.itemCats![i] : undefined;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                className={`relier-item ${sel === i ? "sel" : ""} ${ok === true ? "good" : ok === false ? "bad" : ""}`}
                style={values[i] !== null ? ({ "--rc": COULEURS[i % COULEURS.length] } as React.CSSProperties) : undefined}
                aria-pressed={sel === i}
                onClick={() => {
                  // toucher un élément le sélectionne toujours (le suivant est déjà proposé après chaque paire)
                  sfx.tap();
                  setSel(i);
                }}

              >
                <Md text={g} inline />
                {reveal && ok === false && (
                  <span className="relier-sol">
                    → <Md text={droite[inst.itemCats![i]]} inline />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relier-col">
          {droite.map((d, j) => {
            const c = couleurDroite(j);
            return (
              <button key={j} type="button" disabled={disabled || sel === null} className={`relier-item droite ${c ? "lie" : ""}`} style={c ? ({ "--rc": c } as React.CSSProperties) : undefined} onClick={() => choisirDroite(j)}>
                <Md text={d} inline />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Rappel libre : l'enfant écrit (ou dit au micro) ce qu'il a retenu ; on retrouve les idées attendues. */
export function RappelLibre({ inst, text, onChange, done, disabled }: { inst: Instance; text: string; onChange: (t: string) => void; done?: boolean; disabled?: boolean }) {
  const [ecoute, setEcoute] = useState(false);
  const stop = useRef<() => void>(() => undefined);
  const micro = () => {
    if (ecoute) return stop.current();
    setEcoute(true);
    stop.current = startDictee(
      (t) => onChange((text ? text + " " : "") + t),
      () => setEcoute(false),
    );
  };
  const trouves = done ? idees(inst, text) : [];
  return (
    <div className="libre">
      <textarea className="answer-input libre-input" rows={4} value={text} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder="Écris avec tes mots… (l'orthographe ne compte pas ici)" aria-label="ta réponse" />
      {!disabled && dicteeSupported() && (
        <button type="button" className={`btn btn-soft btn-small ${ecoute ? "on" : ""}`} onClick={micro}>
          {ecoute ? "⏹ J'ai fini de parler" : "🎤 Le dire au lieu de l'écrire"}
        </button>
      )}
      {done && (
        <div className="libre-bilan">
          <p className="small"><strong>Les idées importantes :</strong></p>
          <ul>
            {inst.cles!.map((g, i) => (
              <li key={i} className={trouves.includes(i) ? "ok-text" : "muted"}>
                {trouves.includes(i) ? "✅" : "⬜"} {g[0]}
              </li>
            ))}
          </ul>
          <div className="libre-modele">
            <p className="small"><strong>Ce qu'il fallait retenir :</strong></p>
            <Md text={inst.modele!} />
          </div>
        </div>
      )}
    </div>
  );
}
