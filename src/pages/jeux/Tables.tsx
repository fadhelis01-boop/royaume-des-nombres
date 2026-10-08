import { Fragment, useMemo, useRef, useState } from "react";
import { go } from "../../lib/router";
import { sfx } from "../../lib/sound";
import { addXp, updateChild, useChild } from "../../lib/store";
import { additionsMastered, tablesMastered } from "../../lib/rewards";
import { applyKey, Keypad } from "../../components/Keypad";
import { Bubble, Mascot } from "../../components/Mascot";
import type { Child } from "../../lib/types";

// La Tour des Tables : suivi fait par fait (7×8, 6×9…) et entraînement ciblé
// sur les faits pas encore sûrs. On s'appuie sur la commutativité (7×8 = 8×7).

const TRUCS: Record<number, string> = {
  2: "×2, c'est le double : 7 × 2 = 7 + 7.",
  3: "×3 : le double, plus encore une fois. 6 × 3 = 12 + 6 = 18.",
  4: "×4 : le double du double ! 7 × 4 → 14 → 28.",
  5: "×5 : la moitié de ×10. 8 × 5 = 80 ÷ 2 = 40. Ça finit toujours par 0 ou 5.",
  6: "×6 : ×5 plus encore une fois. 7 × 6 = 35 + 7 = 42.",
  7: "×7 : la plus coriace ! Retiens 7 × 8 = 56 avec « 5, 6, 7, 8 » : 56 = 7 × 8.",
  8: "×8 : le double du double du double ! 6 × 8 → 12 → 24 → 48.",
  9: "×9 : ×10 moins une fois. 7 × 9 = 70 − 7 = 63. Et les chiffres du résultat font toujours 9 (6 + 3) !",
  10: "×10 : Zéro vient se coller à droite ! 7 × 10 = 70.",
};

type Op = "x" | "+";
const ADD_TRUCS = "Astuces : les amis de 10 (7 + 3), les doubles (6 + 6 = 12) et les presque-doubles (6 + 7 = 12 + 1), et + 9 = + 10 − 1.";
const known = (c: Child, a: number, b: number, op: Op = "x") => {
  const t1 = c.tables[`${a}${op}${b}`],
    t2 = c.tables[`${b}${op}${a}`];
  const ok = (t1?.ok ?? 0) + (t2?.ok ?? 0),
    ko = (t1?.ko ?? 0) + (t2?.ko ?? 0);
  if (!ok && !ko) return 0; // jamais vu
  return ok >= 2 && ok > ko * 2 ? 2 : 1; // 2 = sûr, 1 = en cours
};

export function Tables({ initialOp = "x" }: { initialOp?: Op }) {
  const [op, setOp] = useState<Op>(initialOp);
  const lo = op === "x" ? 2 : 1;
  const res = (a: number, b: number) => (op === "x" ? a * b : a + b);
  const sym = op === "x" ? "×" : "+";
  const child = useChild()!;
  const [session, setSession] = useState<[number, number][] | null>(null);
  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [fb, setFb] = useState<null | { ok: boolean; ans: number }>(null);
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFacts = (table?: number): [number, number][] => {
    const all: { f: [number, number]; w: number }[] = [];
    for (let a = lo; a <= 10; a++)
      for (let b = lo; b <= 10; b++) {
        if (table && a !== table) continue;
        const k = known(child, a, b, op);
        all.push({ f: [a, b], w: (k === 2 ? 1 : k === 1 ? 5 : 3) + Math.random() * 2 });
      }
    return all
      .sort((x, y) => y.w - x.w)
      .slice(0, 12)
      .map((x) => (Math.random() < 0.5 ? x.f : ([x.f[1], x.f[0]] as [number, number])))
      .sort(() => Math.random() - 0.5);
  };

  const grid = useMemo(() => {
    const rows: number[][] = [];
    for (let a = lo; a <= 10; a++) {
      const r: number[] = [];
      for (let b = lo; b <= 10; b++) r.push(known(child, a, b, op));
      rows.push(r);
    }
    return rows;
  }, [child]);

  const start = (table?: number) => {
    setSession(pickFacts(table));
    setI(0);
    setVal("");
    setFb(null);
    setScore(0);
  };

  const submit = () => {
    if (!session || fb || !val.trim()) return;
    const [a, b] = session[i];
    const ok = Number(val.replace(/\s/g, "")) === res(a, b);
    updateChild((c) => {
      const t = (c.tables[`${a}${op}${b}`] ??= { ok: 0, ko: 0 });
      ok ? t.ok++ : t.ko++;
    });
    if (ok) {
      sfx.ok();
      setScore((s) => s + 1);
    } else sfx.oops();
    setFb({ ok, ans: res(a, b) });
  };
  const next = () => {
    if (!session) return;
    if (i + 1 >= session.length) {
      addXp(score * 3);
      setI(session.length);
      return;
    }
    setI(i + 1);
    setVal("");
    setFb(null);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  if (session && i < session.length) {
    const [a, b] = session[i];
    return (
      <div className="page eclair">
        <div className="lecon-top">
          <button className="back" onClick={() => setSession(null)}>
            ✕
          </button>
          <span>
            {i + 1}/{session.length}
          </span>
          <span className="score-pill">⭐ {score}</span>
        </div>
        <div className={`eclair-q ${fb ? (fb.ok ? "ok" : "ko") : ""}`}>
          {a} {sym} {b} = {fb ? fb.ans : "?"}
        </div>
        {!fb ? (
          <>
            <input ref={inputRef} className="answer-input xl" value={val} inputMode="none" onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} aria-label="réponse" autoFocus />
            <Keypad mode="nombre" extras={[]} onKey={(k) => setVal((v) => applyKey(v, k))} onSubmit={submit} canSubmit={!!val.trim()} />
          </>
        ) : (
          <div className="center">
            {fb.ok ? <Bubble who="neo" text="Exact !" size={50} /> : <Bubble who="mia" text={`${a} ${sym} ${b} = ${fb.ans}. ${op === "x" ? TRUCS[Math.max(a, b)] ?? "" : ADD_TRUCS}`} size={50} />}
            <button className="btn btn-primary" onClick={next} autoFocus onKeyDown={(e) => e.key === "Enter" && next()}>
              Suivant ➜
            </button>
          </div>
        )}
      </div>
    );
  }

  if (session && i >= session.length)
    return (
      <div className="page center">
        <h1>
          {score} / {session.length} !
        </h1>
        <Bubble who="zero" text={score === session.length ? "Sans faute ! Même moi je suis impressionné. Et je ne suis pas facile à impressionner. 😳" : "Les faits que tu as manqués reviendront plus souvent : c'est comme ça qu'on finit par les connaître par cœur !"} />
        <div className="stack">
          <button className="btn btn-primary" onClick={() => start()}>
            🔁 Encore !
          </button>
          <button className="btn btn-soft" onClick={() => setSession(null)}>
            Voir ma Tour
          </button>
        </div>
      </div>
    );

  const m = op === "x" ? tablesMastered(child) : additionsMastered(child);
  const totalFacts = op === "x" ? 64 : 100;
  return (
    <div className="page">
      <button className="back" onClick={() => go("/jeux")}>
        ← Jeux
      </button>
      <h1>{op === "x" ? "✖️ La Tour des Tables" : "➕ La Tour des Additions"}</h1>
      <div className="tabs">
        <button className={`tab ${op === "+" ? "active" : ""}`} onClick={() => setOp("+")}>
          ➕ Additions (1 à 10)
        </button>
        <button className={`tab ${op === "x" ? "active" : ""}`} onClick={() => setOp("x")}>
          ✖️ Tables (2 à 10)
        </button>
      </div>
      <Bubble who="neo" text={`Tu connais ${m} faits sur ${totalFacts}. Chaque case verte est conquise ! Les cases jaunes sont en cours, les grises jamais vues.`} />
      <div className="tables-grid" role="table" aria-label="maîtrise des faits" style={{ gridTemplateColumns: `repeat(${12 - lo}, minmax(0, 1fr))` }}>
        <div className="tg-cell head">{sym}</div>
        {Array.from({ length: 11 - lo }, (_, k) => k + lo).map((b) => (
          <div key={b} className="tg-cell head">
            {b}
          </div>
        ))}
        {grid.map((row, ai) => (
          <Fragment key={ai}>
            <div className="tg-cell head">
              {ai + lo}
            </div>
            {row.map((k, bi) => (
              <div key={`${ai}-${bi}`} className={`tg-cell k${k}`} title={`${ai + lo} ${sym} ${bi + lo} = ${res(ai + lo, bi + lo)}`}>
                {k === 2 ? res(ai + lo, bi + lo) : ""}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
      <div className="stack">
        <button className="btn btn-primary btn-xl" onClick={() => start()}>
          🎯 Entraînement malin (12 questions)
        </button>
      </div>
      <h2>Une table en particulier</h2>
      <div className="table-picks">
        {Array.from({ length: 11 - lo }, (_, k) => k + lo).map((t) => (
          <button key={t} className="chip" onClick={() => start(t)}>
            {op === "x" ? "Table de" : "Ajouter"} {t}
          </button>
        ))}
      </div>
      <h2>Les trucs de Lya</h2>
      <ul className="trucs">
        {Object.entries(TRUCS).map(([t, s]) => (
          <li key={t}>
            <strong>×{t}</strong> — {s}
          </li>
        ))}
      </ul>
      <Mascot who="mia" humeur="reflexion" size={80} />
    </div>
  );
}
