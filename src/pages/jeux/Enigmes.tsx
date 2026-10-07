import { useState } from "react";
import { go } from "../../lib/router";
import { useContent } from "../../lib/content";
import { normText, readNumber } from "../../lib/gen";
import { sfx } from "../../lib/sound";
import { addXp, updateChild, useChild } from "../../lib/store";
import { XP } from "../../lib/rewards";
import { Bubble } from "../../components/Mascot";
import { Md } from "../../components/Md";
import type { Enigme } from "../../lib/types";

export function enigmeMatches(e: Enigme, answer: string) {
  const want = readNumber(e.reponse);
  const got = readNumber(answer);
  if (want && got) return Math.abs(want.v - got.v) < 1e-9;
  return normText(answer) === normText(e.reponse);
}

export function EnigmeCard({ e, onSolved }: { e: Enigme; onSolved?: () => void }) {
  const child = useChild()!;
  const solved = child.enigmes.includes(e.id);
  const [val, setVal] = useState("");
  const [hint, setHint] = useState(false);
  const [state, setState] = useState<"" | "ok" | "ko" | "abandon">(solved ? "ok" : "");
  const submit = () => {
    if (!val.trim()) return;
    if (enigmeMatches(e, val)) {
      sfx.fanfare();
      setState("ok");
      if (!solved) {
        updateChild((c) => {
          c.enigmes.push(e.id);
        });
        addXp(XP.enigme);
      }
      onSolved?.();
    } else {
      sfx.oops();
      setState("ko");
    }
  };
  return (
    <div className={`enigme card ${state}`}>
      <div className="enigme-head">
        <strong>🧩 {e.titre}</strong>
        <span className="muted small">{"⭐".repeat(e.niveau)}</span>
      </div>
      <Md text={e.texte} />
      {state !== "ok" && state !== "abandon" && (
        <>
          <div className="answer-line">
            <input className="answer-input" value={val} onChange={(x) => setVal(x.target.value)} onKeyDown={(x) => x.key === "Enter" && submit()} placeholder="ta réponse" aria-label="ta réponse" />
            <button className="btn btn-primary" onClick={submit}>
              ✔
            </button>
          </div>
          {state === "ko" && <Bubble who="neo" text="Pas encore… Vérifions : relis bien chaque phrase de l'énigme." size={46} />}
          <div className="row">
            {e.indice && !hint && (
              <button className="btn btn-soft" onClick={() => setHint(true)}>
                💡 Indice
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setState("abandon")}>
              🐱 Je donne ma langue au chat
            </button>
          </div>
          {hint && e.indice && <Bubble who="mia" humeur="reflexion" text={e.indice} size={50} />}
        </>
      )}
      {(state === "ok" || state === "abandon") && (
        <div className="solution">
          {state === "ok" ? <p>🎉 Bravo, tu as trouvé !</p> : <p>La réponse : <strong>{e.reponse}</strong></p>}
          <Md text={e.solution} />
        </div>
      )}
    </div>
  );
}

export function Enigmes() {
  const { manifest } = useContent();
  const [niveau, setNiveau] = useState<1 | 2 | 3>(1);
  const list = (manifest?.enigmes ?? []).filter((e) => e.niveau === niveau);
  return (
    <div className="page">
      <button className="back" onClick={() => go("/jeux")}>
        ← Jeux
      </button>
      <h1>🧩 Les énigmes de Mia</h1>
      <Bubble who="mia" text="Une énigme, ça ne se résout pas en calculant vite : ça se résout en RÉFLÉCHISSANT. Dessine, essaie, cherche… et si on essayait autrement ?" />
      <div className="tabs">
        {([1, 2, 3] as const).map((n) => (
          <button key={n} className={`tab ${niveau === n ? "active" : ""}`} onClick={() => setNiveau(n)}>
            {"⭐".repeat(n)} {n === 1 ? "Graines" : n === 2 ? "Explorateurs" : "Maîtres"}
          </button>
        ))}
      </div>
      <div className="stack">
        {list.map((e) => (
          <EnigmeCard key={e.id} e={e} />
        ))}
      </div>
    </div>
  );
}
