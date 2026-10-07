import { useRef, useState } from "react";
import { go } from "../lib/router";
import { aiConfigured } from "../lib/ai-config";
import { addXp, bump, updateChild, useChild } from "../lib/store";
import { Bubble } from "../components/Mascot";
import { Md } from "../components/Md";

// Du calcul vers le problème : l'enfant invente une histoire qui correspond à
// un calcul. C'est l'inverse de « mettre un problème en équation » — et c'est
// ce qui montre qu'on a vraiment compris le SENS des opérations.

const CALCULS: { niveau: number; calcul: string; aide: string }[] = [
  { niveau: 1, calcul: "5 + 3", aide: "Une histoire où l'on RÉUNIT deux groupes." },
  { niveau: 1, calcul: "9 − 4", aide: "Une histoire où l'on ENLÈVE, ou où l'on cherche une DIFFÉRENCE." },
  { niveau: 1, calcul: "3 × 4", aide: "Une histoire avec 3 groupes PAREILS de 4 (ou 4 groupes de 3)." },
  { niveau: 1, calcul: "12 ÷ 3", aide: "Une histoire où l'on PARTAGE 12 objets en 3 parts égales." },
  { niveau: 2, calcul: "20 − 3 × 4", aide: "On dépense 3 fois 4 € sur un billet de 20 €…" },
  { niveau: 2, calcul: "(8 + 4) × 2", aide: "On réunit deux choses, puis on double le tout." },
  { niveau: 2, calcul: "3/4 de 20", aide: "On prend les trois quarts d'une quantité." },
  { niveau: 2, calcul: "25 % de 80", aide: "Une réduction, une promotion…" },
  { niveau: 3, calcul: "2x + 5 = 17", aide: "Une histoire où un nombre inconnu est pris 2 fois, puis on ajoute 5." },
  { niveau: 3, calcul: "x + (x + 4) = 30", aide: "Deux personnes ; l'une a 4 de plus que l'autre ; ensemble elles ont 30." },
  { niveau: 3, calcul: "1,2 × 50", aide: "Un prix au kilo, une vitesse, une augmentation de 20 %…" },
];

export function Inventer() {
  const child = useChild()!;
  const lvl = child.age < 10 ? 1 : child.age < 13 ? 2 : 3;
  const pool = CALCULS.filter((c) => c.niveau <= lvl);
  const [i, setI] = useState(() => Math.floor(Math.random() * pool.length));
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const c = pool[i % pool.length];

  const save = () => {
    updateChild((x) => {
      x.inventions = [{ at: Date.now(), calcul: c.calcul, histoire: text.trim() }, ...x.inventions].slice(0, 50);
    });
    bump("invente");
    addXp(15);
    setSaved(true);
  };
  const askReview = async () => {
    setBusy(true);
    abort.current = new AbortController();
    try {
      const { reviewInvention } = await import("../lib/ai");
      const r = await reviewInvention(child.age, c.calcul, text, abort.current.signal, setReview);
      setReview(r.text);
    } catch (e) {
      setReview("⚠️ " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow">
      <button className="back" onClick={() => go("/jeux")}>
        ← Jeux
      </button>
      <h1>✍️ Invente un problème</h1>
      <Bubble who="mia" text="D'habitude, on te donne une histoire et tu trouves le calcul. Aujourd'hui, c'est l'inverse : je te donne le calcul, et TU inventes l'histoire !" />
      <div className="card center">
        <div className="calc-big">{c.calcul}</div>
        <p className="small muted">💡 {c.aide}</p>
      </div>
      <textarea className="big-input" rows={5} value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} placeholder="Il était une fois… (n'oublie pas de finir par une QUESTION !)" />
      <div className="checklist small">
        <div>{/\?/.test(text) ? "✅" : "⬜"} Mon histoire se termine par une question</div>
        <div>{/\d/.test(text) ? "✅" : "⬜"} J'ai mis les nombres du calcul</div>
        <div>{text.trim().split(/\s+/).length >= 12 ? "✅" : "⬜"} On comprend la situation</div>
      </div>
      <div className="row">
        <button className="btn btn-primary" disabled={text.trim().length < 10 || saved} onClick={save}>
          {saved ? "Enregistré ✔" : "Enregistrer mon problème"}
        </button>
        {aiConfigured() && (
          <button className="btn btn-soft" disabled={text.trim().length < 10 || busy} onClick={askReview}>
            {busy ? "Mia lit…" : "🐱 Demander l'avis de Mia"}
          </button>
        )}
        <button
          className="btn btn-ghost"
          onClick={() => {
            setI(i + 1);
            setText("");
            setSaved(false);
            setReview("");
          }}
        >
          Autre calcul ⟳
        </button>
      </div>
      {!aiConfigured() && saved && <Bubble who="neo" text="Montre ton problème à un adulte ou à un ami : peut-il le résoudre avec le bon calcul ? C'est la meilleure vérification !" side="right" />}
      {review && (
        <div className="card">
          <Md text={review} />
        </div>
      )}
      {child.inventions.length > 0 && (
        <details className="card">
          <summary>📚 Mes problèmes inventés ({child.inventions.length})</summary>
          {child.inventions.map((x, k) => (
            <p key={k}>
              <strong>{x.calcul}</strong> — {x.histoire}
            </p>
          ))}
        </details>
      )}
    </div>
  );
}
