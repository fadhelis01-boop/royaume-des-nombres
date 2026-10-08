import { useState } from "react";
import { go } from "../../lib/router";
import { sfx } from "../../lib/sound";
import { addGems, addXp, bump, useChild } from "../../lib/store";
import { burst, centerOf } from "../../lib/juice";
import { Bubble } from "../../components/Mascot";
import { Avatar } from "../../components/Avatar";

// Duel en famille, sur le même écran : chacun son niveau (le grand frère ou le parent
// reçoit des calculs plus durs), le premier à 10 points gagne. Sur une tablette posée
// à plat, le mode « face à face » retourne la moitié du haut.

const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const LEVELS = [
  { id: 1, titre: "🐣 Additions jusqu'à 10", gen: () => { const a = r(0, 10); const b = r(0, 10 - a); return { q: `${a} + ${b}`, a: a + b }; } },
  { id: 2, titre: "🌱 + et − jusqu'à 20", gen: () => { if (Math.random() < 0.5) { const a = r(2, 20), b = r(1, a); return { q: `${a} − ${b}`, a: a - b }; } const a = r(1, 19), b = r(1, 20 - a); return { q: `${a} + ${b}`, a: a + b }; } },
  { id: 3, titre: "✖️ Tables de 2 à 9", gen: () => { const a = r(2, 9), b = r(2, 9); return { q: `${a} × ${b}`, a: a * b }; } },
  { id: 4, titre: "🚀 Calcul mental expert", gen: () => { const k = r(0, 3); if (k === 0) { const a = r(12, 99), b = r(12, 99); return { q: `${a} + ${b}`, a: a + b }; } if (k === 1) { const a = r(40, 99), b = r(11, a - 1); return { q: `${a} − ${b}`, a: a - b }; } if (k === 2) { const a = r(11, 19), b = r(3, 9); return { q: `${a} × ${b}`, a: a * b }; } const b = r(3, 9), q = r(4, 12); return { q: `${b * q} ÷ ${b}`, a: q }; } },
];
const gen = (level: number) => LEVELS[level - 1].gen();
const GOAL = 10;

interface P {
  name: string;
  level: number;
  score: number;
  q: { q: string; a: number };
  val: string;
  frozen: boolean;
  flash: string;
}

export function Duel() {
  const child = useChild()!;
  const [setup, setSetup] = useState(true);
  const [face, setFace] = useState(false);
  const [names, setNames] = useState([child.name, "Adversaire"]);
  const [levels, setLevels] = useState([child.age < 7 ? 1 : child.age < 8 ? 2 : 3, 4]);
  const [ps, setPs] = useState<P[]>([]);
  const [winner, setWinner] = useState<number | null>(null);

  const start = () => {
    setPs([0, 1].map((i) => ({ name: names[i] || `Joueur ${i + 1}`, level: levels[i], score: 0, q: gen(levels[i]), val: "", frozen: false, flash: "" })));
    setWinner(null);
    setSetup(false);
  };

  const press = (i: number, k: string, el: Element) => {
    if (winner !== null) return;
    const p = { ...ps[i] };
    if (p.frozen) return;
    if (k === "⌫") p.val = p.val.slice(0, -1);
    else if (k === "✔") {
      if (!p.val) return;
      if (Number(p.val) === p.q.a) {
        p.score++;
        p.flash = "ok";
        sfx.ok();
        const [x, y] = centerOf(el);
        burst(x, y, 1);
        p.q = gen(p.level);
        p.val = "";
        if (p.score >= GOAL) {
          setWinner(i);
          sfx.victory("duel");
          bump("duel");
          addGems(i === 0 ? 5 : 2);
          addXp(30);
        }
      } else {
        // la bonne réponse s'affiche, et le joueur attend 1,5 s : on apprend en se trompant
        p.flash = `= ${p.q.a}`;
        p.frozen = true;
        sfx.oops();
        window.setTimeout(() => setPs((a2) => a2.map((x, j) => (j === i ? { ...x, frozen: false, flash: "", q: gen(x.level), val: "" } : x))), 1500);
      }
    } else if (p.val.length < 4) p.val += k;
    setPs((all) => all.map((x, j) => (j === i ? p : x)));
  };

  if (setup)
    return (
      <div className="page">
        <button className="back" onClick={() => go("/jeux")}>
          ← Jeux
        </button>
        <h1>🤝 Duel en famille</h1>
        <Bubble who="zero" text="Deux joueurs, un seul écran ! Chacun choisit son niveau : les grands ont des calculs plus durs, c'est plus juste. Le premier à 10 points gagne." />
        <div className="duel-setup">
          {[0, 1].map((i) => (
            <div key={i} className="card">
              <label className="field">
                <span>Joueur {i + 1}</span>
                <input id={`duel-nom-${i}`} value={names[i]} onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))} maxLength={16} />
              </label>
              <div className="stack">
                {LEVELS.map((l) => (
                  <button key={l.id} className={`chip ${levels[i] === l.id ? "sel" : ""}`} onClick={() => setLevels(levels.map((v, j) => (j === i ? l.id : v)))}>
                    {l.titre}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <label className="toggle">
          <input id="duel-face" type="checkbox" checked={face} onChange={(e) => setFace(e.target.checked)} /> Face à face (tablette posée à plat entre les deux joueurs)
        </label>
        <button className="btn btn-primary btn-xl" onClick={start}>
          C'est parti ! ⚔️
        </button>
      </div>
    );

  return (
    <div className={`page duel ${face ? "face" : ""}`}>
      {ps.map((p, i) => (
        <section key={i} className={`duel-half p${i} ${p.flash === "ok" ? "flash-ok" : p.flash ? "flash-ko" : ""} ${winner === i ? "winner" : ""}`}>
          <div className="duel-top">
            <strong>{p.name}</strong>
            <span className="duel-score">
              {p.score} / {GOAL}
            </span>
          </div>
          <div className="duel-bar">
            <span style={{ width: `${(p.score / GOAL) * 100}%` }} />
          </div>
          {winner === null ? (
            <>
              <div className="duel-q">
                {p.q.q} = <strong>{p.flash && p.flash !== "ok" ? p.flash.slice(2) : p.val || "?"}</strong>
              </div>
              <div className="duel-pad">
                {["7", "8", "9", "4", "5", "6", "1", "2", "3", "⌫", "0", "✔"].map((k) => (
                  <button key={k} className={`key ${k === "✔" ? "key-ok" : k === "⌫" ? "key-back" : ""}`} onClick={(e) => press(i, k, e.currentTarget)} disabled={p.frozen}>
                    {k}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="duel-end">
              {winner === i ? "🏆 Gagné !" : "Bravo pour la partie !"}
              {i === 0 && <Avatar child={child} size={60} humeur={winner === 0 ? "joie" : undefined} />}
            </div>
          )}
        </section>
      ))}
      {winner !== null && (
        <div className="duel-actions">
          <button className="btn btn-primary" onClick={start}>
            🔁 Revanche
          </button>
          <button className="btn btn-soft" onClick={() => setSetup(true)}>
            Changer les niveaux
          </button>
        </div>
      )}
    </div>
  );
}
