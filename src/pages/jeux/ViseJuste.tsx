import { useState } from "react";
import { go } from "../../lib/router";
import { fmtNum, fracStr } from "../../lib/expr";
import { sfx } from "../../lib/sound";
import { addXp, updateChild, useChild } from "../../lib/store";
import { Droite } from "../../components/Visuel";
import { Bubble } from "../../components/Mascot";
import { Md } from "../../components/Md";

// Estimer la position d'un nombre sur une droite : une compétence-clé du « sens
// du nombre », très corrélée à la réussite en mathématiques.

interface Mode {
  id: string;
  titre: string;
  min: number;
  max: number;
  pas: number;
  etiquettes: number[] | "bouts";
  tirer: () => { v: number; label: string };
}
const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const MODES: Mode[] = [
  { id: "0-20", titre: "🌱 De 0 à 20", min: 0, max: 20, pas: 1, etiquettes: [0, 10, 20], tirer: () => { const v = r(1, 19); return { v, label: String(v) }; } },
  { id: "0-100", titre: "🔢 De 0 à 100", min: 0, max: 100, pas: 10, etiquettes: [0, 50, 100], tirer: () => { const v = r(1, 99); return { v, label: String(v) }; } },
  { id: "0-1000", titre: "🌳 De 0 à 1 000", min: 0, max: 1000, pas: 100, etiquettes: [0, 500, 1000], tirer: () => { const v = r(10, 990); return { v, label: fmtNum(v) }; } },
  { id: "fractions", titre: "🍰 Fractions entre 0 et 2", min: 0, max: 2, pas: 1, etiquettes: [0, 1, 2], tirer: () => { const d = [2, 3, 4, 5, 6, 8, 10][r(0, 6)]; const n = r(1, 2 * d - 1); return { v: n / d, label: `$${fracStr(n, d, false)}$` }; } },
  { id: "decimaux", titre: "⚓ Décimaux entre 0 et 1", min: 0, max: 1, pas: 0.1, etiquettes: [0, 0.5, 1], tirer: () => { const v = r(1, 99) / 100; return { v, label: fmtNum(v) }; } },
  { id: "relatifs", titre: "🌡️ Relatifs de −20 à 20", min: -20, max: 20, pas: 5, etiquettes: [-20, 0, 20], tirer: () => { const v = r(-19, 19); return { v, label: fmtNum(v) }; } },
];
const ROUNDS = 10;

export function ViseJuste() {
  const child = useChild()!;
  const [mode, setMode] = useState<Mode | null>(null);
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<{ v: number; label: string } | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([]);

  const start = (m: Mode) => {
    setMode(m);
    setRound(0);
    setScores([]);
    setPick(null);
    setTarget(m.tirer());
  };

  if (!mode)
    return (
      <div className="page">
        <button className="back" onClick={() => go("/jeux")}>
          ← Jeux
        </button>
        <h1>🎯 Vise juste</h1>
        <Bubble who="mia" text="Je te donne un nombre, tu touches la droite là où il habite. Plus tu es près, plus tu gagnes de points ! Regarde bien le milieu : il aide beaucoup." />
        <div className="fam-grid">
          {MODES.map((m) => (
            <button key={m.id} className="fam-card" onClick={() => start(m)}>
              <strong>{m.titre}</strong>
              {child.games[`vise:${m.id}`] !== undefined && <span className="gc-best">🏅 {child.games[`vise:${m.id}`]}</span>}
            </button>
          ))}
        </div>
      </div>
    );

  const total = scores.reduce((a, b) => a + b, 0);
  if (round >= ROUNDS) {
    return (
      <div className="page center">
        <h1>Score : {total} / 100</h1>
        <Bubble who={total >= 80 ? "zero" : "neo"} text={total >= 80 ? "Un œil de lynx ! 😳" : "Bien joué ! Astuce : repère d'abord le milieu, puis les quarts."} />
        <div className="stack">
          <button className="btn btn-primary btn-xl" onClick={() => start(mode)}>
            🔁 Rejouer
          </button>
          <button className="btn btn-soft" onClick={() => setMode(null)}>
            Changer de droite
          </button>
        </div>
      </div>
    );
  }

  const choose = (x: number) => {
    if (pick !== null || !target) return;
    setPick(x);
    const err = Math.abs(x - target.v) / (mode.max - mode.min);
    const pts = Math.max(0, Math.round(10 - err * 100));
    pts >= 8 ? sfx.ok() : sfx.tap();
    const all = [...scores, pts];
    setScores(all);
    if (all.length === ROUNDS) {
      const sum = all.reduce((a, b) => a + b, 0);
      updateChild((c) => {
        c.games[`vise:${mode.id}`] = Math.max(c.games[`vise:${mode.id}`] ?? 0, sum);
        c.games["vise"] = Math.max(c.games["vise"] ?? 0, sum);
      });
      addXp(Math.round(sum / 3));
    }
  };
  const next = () => {
    setRound(round + 1);
    setPick(null);
    setTarget(mode.tirer());
  };
  return (
    <div className="page vise">
      <div className="lecon-top">
        <button className="back" onClick={() => setMode(null)}>
          ✕
        </button>
        <span>
          Manche {round + 1}/{ROUNDS}
        </span>
        <span className="score-pill">⭐ {total}</span>
      </div>
      <div className="vise-target">
        Place : <Md text={target!.label} inline />
      </div>
      <Droite v={{ min: mode.min, max: mode.max, pas: mode.pas, etiquettes: mode.etiquettes }} onPick={pick === null ? choose : undefined} picked={pick} reveal={pick !== null ? target!.v : null} />
      {pick !== null && (
        <div className="center">
          <p>
            +{scores.at(-1)} points {scores.at(-1)! >= 9 ? "— en plein dans le mille ! 🎯" : ""}
          </p>
          <button className="btn btn-primary" onClick={next} autoFocus>
            {round + 1 < ROUNDS ? "Suivant ➜" : "Voir mon score"}
          </button>
        </div>
      )}
    </div>
  );
}
