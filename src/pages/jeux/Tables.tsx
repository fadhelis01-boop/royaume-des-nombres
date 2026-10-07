import { Fragment, useMemo, useRef, useState } from "react";
import { go } from "../../lib/router";
import { sfx } from "../../lib/sound";
import { addXp, updateChild, useChild } from "../../lib/store";
import { tablesMastered } from "../../lib/rewards";
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

const known = (c: Child, a: number, b: number) => {
  const t1 = c.tables[`${a}x${b}`],
    t2 = c.tables[`${b}x${a}`];
  const ok = (t1?.ok ?? 0) + (t2?.ok ?? 0),
    ko = (t1?.ko ?? 0) + (t2?.ko ?? 0);
  if (!ok && !ko) return 0; // jamais vu
  return ok >= 2 && ok > ko * 2 ? 2 : 1; // 2 = sûr, 1 = en cours
};

export function Tables() {
  const child = useChild()!;
  const [session, setSession] = useState<[number, number][] | null>(null);
  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [fb, setFb] = useState<null | { ok: boolean; ans: number }>(null);
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFacts = (table?: number): [number, number][] => {
    const all: { f: [number, number]; w: number }[] = [];
    for (let a = 2; a <= 10; a++)
      for (let b = 2; b <= 10; b++) {
        if (table && a !== table) continue;
        const k = known(child, a, b);
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
    for (let a = 2; a <= 10; a++) {
      const r: number[] = [];
      for (let b = 2; b <= 10; b++) r.push(known(child, a, b));
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
    const ok = Number(val.replace(/\s/g, "")) === a * b;
    updateChild((c) => {
      const t = (c.tables[`${a}x${b}`] ??= { ok: 0, ko: 0 });
      ok ? t.ok++ : t.ko++;
    });
    if (ok) {
      sfx.ok();
      setScore((s) => s + 1);
    } else sfx.oops();
    setFb({ ok, ans: a * b });
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
          {a} × {b} = {fb ? fb.ans : "?"}
        </div>
        {!fb ? (
          <>
            <input ref={inputRef} className="answer-input xl" value={val} inputMode="none" onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} aria-label="réponse" autoFocus />
            <Keypad mode="nombre" onKey={(k) => setVal((v) => applyKey(v, k))} onSubmit={submit} canSubmit={!!val.trim()} />
          </>
        ) : (
          <div className="center">
            {fb.ok ? <Bubble who="neo" text="Exact !" size={50} /> : <Bubble who="mia" text={`${a} × ${b} = ${fb.ans}. ${TRUCS[Math.max(a, b)] ?? ""}`} size={50} />}
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

  const m = tablesMastered(child);
  return (
    <div className="page">
      <button className="back" onClick={() => go("/jeux")}>
        ← Jeux
      </button>
      <h1>✖️ La Tour des Tables</h1>
      <Bubble who="neo" text={`Tu connais ${m} faits sur 64 (des tables de 2 à 9). Chaque case verte est conquise ! Les cases jaunes sont en cours, les grises jamais vues.`} />
      <div className="tables-grid" role="table" aria-label="maîtrise des tables">
        <div className="tg-cell head">×</div>
        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((b) => (
          <div key={b} className="tg-cell head">
            {b}
          </div>
        ))}
        {grid.map((row, ai) => (
          <Fragment key={ai}>
            <div className="tg-cell head">
              {ai + 2}
            </div>
            {row.map((k, bi) => (
              <div key={`${ai}-${bi}`} className={`tg-cell k${k}`} title={`${ai + 2} × ${bi + 2} = ${(ai + 2) * (bi + 2)}`}>
                {k === 2 ? (ai + 2) * (bi + 2) : ""}
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
        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
          <button key={t} className="chip" onClick={() => start(t)}>
            Table de {t}
          </button>
        ))}
      </div>
      <h2>Les trucs de Mia</h2>
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
