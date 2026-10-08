import { useEffect, useMemo, useRef, useState } from "react";
import { go } from "../../lib/router";
import { fmtNum } from "../../lib/expr";
import { sfx } from "../../lib/sound";
import { addGems, addXp, bump, updateChild, useChild } from "../../lib/store";
import { burst, centerOf, floatText, rewardCorrect } from "../../lib/juice";
import { Bubble, Mascot } from "../../components/Mascot";

// La Course de la Grenouille : atteindre un nombre cible avec des sauts (+10, −1, ×2…),
// pendant que le Grignoteur avance tout seul. Chaque cible atteinte fait avancer la
// grenouille ; un trajet parfait (le moins de sauts possible) la fait avancer deux fois.
// On écrit le trajet comme un calcul : « 23 + 10 + 10 − 1 = 42 ».

interface Mode {
  id: string;
  titre: string;
  min: number;
  max: number;
  sauts: string[];
  secondes: number; // le Grignoteur avance d'une case toutes les N secondes
  tirer: () => [number, number];
}
const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const MODES: Mode[] = [
  { id: "petit", titre: "🌱 De 0 à 50", min: 0, max: 50, sauts: ["+1", "−1", "+10"], secondes: 14, tirer: () => { const a = r(0, 20); return [a, r(a + 5, 50)]; } },
  { id: "moyen", titre: "🌳 De 0 à 100", min: 0, max: 100, sauts: ["+1", "−1", "+10", "−10"], secondes: 12, tirer: () => { const a = r(0, 99); let b = r(0, 100); while (Math.abs(b - a) < 8) b = r(0, 100); return [a, b]; } },
  { id: "grand", titre: "🚀 Doubles et dizaines", min: 0, max: 400, sauts: ["+1", "−1", "+10", "×2"], secondes: 12, tirer: () => { const a = r(1, 12); return [a, r(30, 200)]; } },
  { id: "relatifs", titre: "🌡️ Sous zéro", min: -50, max: 50, sauts: ["+1", "−1", "+10", "−10", "−5"], secondes: 12, tirer: () => { const a = r(-20, 20); let b = r(-45, 45); while (Math.abs(b - a) < 8) b = r(-45, 45); return [a, b]; } },
];
const TRACK = 8;

const apply = (x: number, s: string) => (s === "×2" ? x * 2 : x + Number(s.replace("−", "-")));

/** Plus court chemin (en nombre de sauts) entre a et b, par parcours en largeur. */
function minJumps(m: Mode, a: number, b: number) {
  const lo = m.min - 20,
    hi = m.max * 2 + 20;
  const seen = new Map<number, number>([[a, 0]]);
  const q = [a];
  while (q.length) {
    const x = q.shift()!;
    if (x === b) return seen.get(x)!;
    for (const s of m.sauts) {
      const y = apply(x, s);
      if (y < lo || y > hi || seen.has(y)) continue;
      seen.set(y, seen.get(x)! + 1);
      q.push(y);
    }
  }
  return Infinity;
}

export function CourseGrenouille() {
  const child = useChild()!;
  const [mode, setMode] = useState<Mode | null>(null);
  const [pair, setPair] = useState<[number, number]>([0, 0]);
  const [pos, setPos] = useState(0);
  const [path, setPath] = useState<string[]>([]);
  const [frog, setFrog] = useState(0);
  const [foe, setFoe] = useState(0);
  const [end, setEnd] = useState<"" | "win" | "lose">("");
  const frogRef = useRef<HTMLSpanElement>(null);
  const best = useMemo(() => (mode ? minJumps(mode, pair[0], pair[1]) : 0), [mode, pair]);

  const newTarget = (m: Mode) => {
    let p = m.tirer();
    for (let k = 0; k < 20 && minJumps(m, p[0], p[1]) > 9; k++) p = m.tirer();
    setPair(p);
    setPos(p[0]);
    setPath([]);
  };
  const start = (m: Mode) => {
    setMode(m);
    setFrog(0);
    setFoe(0);
    setEnd("");
    newTarget(m);
  };

  // le Grignoteur avance tout seul
  useEffect(() => {
    if (!mode || end) return;
    const id = window.setInterval(() => setFoe((f) => f + 1), mode.secondes * 1000);
    return () => clearInterval(id);
  }, [mode, end]);

  useEffect(() => {
    if (!mode || end) return;
    if (frog >= TRACK) {
      setEnd("win");
      sfx.victory("course" + mode.id);
      addGems(10);
      addXp(60);
      bump("courseGagnee");
      updateChild((c) => {
        c.games[`course:${mode.id}`] = (c.games[`course:${mode.id}`] ?? 0) + 1;
      });
    } else if (foe >= TRACK) {
      setEnd("lose");
      addGems(2);
      addXp(15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frog, foe]);

  const jump = (s: string) => {
    if (!mode || end) return;
    const y = apply(pos, s);
    if (y < mode.min - 20 || y > mode.max * 2 + 20) {
      sfx.oops();
      return;
    }
    sfx.tap();
    const p2 = [...path, s];
    setPath(p2);
    setPos(y);
    if (y === pair[1]) {
      const perfect = p2.length <= best;
      const [x, yy] = centerOf(frogRef.current);
      burst(x, yy, perfect ? 3 : 1);
      rewardCorrect({ firstTry: perfect, scored: true, anchor: frogRef.current, speakCombo: false });
      if (perfect) floatText(x, yy - 30, "Saut parfait ! ×2", "combo");
      sfx.ok();
      setFrog((f) => f + (perfect ? 2 : 1));
      window.setTimeout(() => newTarget(mode), 900);
    }
  };

  if (!mode)
    return (
      <div className="page">
        <button className="back" onClick={() => go("/jeux")}>
          ← Jeux
        </button>
        <h1>🐸 La Course de la Grenouille</h1>
        <Bubble who="neo" text="La grenouille doit atteindre le nombre cible avec ses sauts. Chaque cible atteinte la fait avancer… mais le Grignoteur, lui, avance tout seul ! Trouve le chemin le plus court : un saut parfait compte double." />
        <div className="fam-grid">
          {MODES.map((m) => (
            <button key={m.id} className="fam-card" onClick={() => start(m)}>
              <strong>{m.titre}</strong>
              <small>sauts : {m.sauts.join("  ")}</small>
              {child.games[`course:${m.id}`] ? <span className="gc-best">🏅 {child.games[`course:${m.id}`]} victoire(s)</span> : null}
            </button>
          ))}
        </div>
      </div>
    );

  const expr = `${fmtNum(pair[0])} ${path.map((s) => (s === "×2" ? "× 2" : s.replace(/^([+−])/, "$1 "))).join(" ")}${path.length ? ` = ${fmtNum(pos)}` : ""}`;
  return (
    <div className="page course">
      <div className="lecon-top">
        <button className="back" onClick={() => setMode(null)} aria-label="Quitter">
          ✕
        </button>
        <span>{mode.titre}</span>
      </div>
      <div className="race" aria-label={`Grenouille ${frog} sur ${TRACK}, Grignoteur ${foe} sur ${TRACK}`}>
        <div className="race-lane">
          <span className="race-runner" ref={frogRef} style={{ left: `${(Math.min(frog, TRACK) / TRACK) * 88}%` }}>
            🐸
          </span>
          <span className="race-flag">🏁</span>
        </div>
        <div className="race-lane foe">
          <span className="race-runner" style={{ left: `${(Math.min(foe, TRACK) / TRACK) * 88}%` }}>
            <Mascot who="nuage" size={34} />
          </span>
          <span className="race-flag">🏁</span>
        </div>
      </div>
      {end ? (
        <div className="center stack">
          <Mascot who={end === "win" ? "neo" : "nuage"} size={100} humeur="joie" />
          <h2>{end === "win" ? "Victoire de la grenouille ! 🏆" : "Le Grignoteur a gagné la course…"}</h2>
          <Bubble who="mia" text={end === "win" ? "Tu as trouvé des chemins très malins ! +10 💎" : "Astuce : pour aller loin, utilise d'abord les grands sauts, puis ajuste avec les petits. +2 💎"} />
          <button className="btn btn-primary btn-xl" onClick={() => start(mode)}>
            🔁 Revanche !
          </button>
        </div>
      ) : (
        <>
          <div className="course-goal">
            <div>
              <small>Tu es sur</small>
              <strong className="course-now">{fmtNum(pos)}</strong>
            </div>
            <span className="course-arrow">➜</span>
            <div>
              <small>Cible</small>
              <strong className="course-target">{fmtNum(pair[1])}</strong>
            </div>
          </div>
          <p className="course-expr" aria-live="polite">
            {expr}
          </p>
          <p className="small muted center">Chemin parfait : {best} saut{best > 1 ? "s" : ""} · tu en as fait {path.length}</p>
          <div className="jump-btns">
            {mode.sauts.map((s) => (
              <button key={s} className="btn btn-xl jump-btn" onClick={() => jump(s)}>
                {s}
              </button>
            ))}
          </div>
          <div className="row center">
            <button className="btn btn-soft" disabled={!path.length} onClick={() => (setPath([]), setPos(pair[0]))}>
              ↺ Recommencer ce trajet
            </button>
          </div>
        </>
      )}
    </div>
  );
}
