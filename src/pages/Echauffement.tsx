import { useMemo, useRef, useState } from "react";
import { go } from "../lib/router";
import { sfx } from "../lib/sound";
import { additionsMastered, tablesMastered } from "../lib/rewards";
import { addXp, bump, dayKey, updateChild, useChild } from "../lib/store";
import { applyKey, Keypad } from "../components/Keypad";
import { Bubble } from "../components/Mascot";
import type { Child } from "../lib/types";

// Échauffement du jour : 10 faits numériques en 2 minutes, choisis là où
// l'enfant en a le plus besoin (automatiser les faits libère la mémoire
// de travail pour raisonner sur les problèmes).

type Fact = { a: number; b: number; op: "+" | "x" };

function weight(c: Child, f: Fact) {
  const t = c.tables[`${f.a}${f.op}${f.b}`];
  if (!t) return 3;
  if (t.ok >= 2 && t.ok > t.ko * 2) return 0.6;
  return 5;
}

function pickFacts(c: Child): Fact[] {
  const young = c.age < 9 || additionsMastered(c) < 80;
  // les additions d'abord ; les tables ensuite, puis un mélange quand tout est su
  const op: "+" | "x" = young ? "+" : tablesMastered(c) >= 60 && Math.random() < 0.5 ? "+" : "x";
  const lo = op === "+" ? 1 : 2;
  const all: { f: Fact; w: number }[] = [];
  for (let a = lo; a <= 10; a++) for (let b = lo; b <= 10; b++) all.push({ f: { a, b, op }, w: weight(c, { a, b, op }) * (0.5 + Math.random()) });
  return all
    .sort((x, y) => y.w - x.w)
    .slice(0, 10)
    .sort(() => Math.random() - 0.5)
    .map((x) => x.f);
}

export function Echauffement() {
  const child = useChild()!;
  const facts = useMemo(() => pickFacts(child), []);
  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [ok, setOk] = useState(0);
  const [fb, setFb] = useState<null | boolean>(null);
  const done = i >= facts.length;
  const doneToday = !!child.counters[`echauffement:${dayKey()}`];
  const inputRef = useRef<HTMLInputElement>(null);
  const f = facts[i];
  const ans = f ? (f.op === "+" ? f.a + f.b : f.a * f.b) : 0;

  const submit = () => {
    if (!f || fb !== null || !val.trim()) return;
    const good = Number(val.replace(/\s/g, "")) === ans;
    updateChild((c) => {
      const t = (c.tables[`${f.a}${f.op}${f.b}`] ??= { ok: 0, ko: 0 });
      good ? t.ok++ : t.ko++;
    });
    good ? sfx.ok() : sfx.oops();
    if (good) setOk(ok + 1);
    setFb(good);
    setTimeout(
      () => {
        setFb(null);
        setVal("");
        const next = i + 1;
        setI(next);
        if (next >= facts.length && !doneToday) {
          bump("echauffement");
          bump(`echauffement:${dayKey()}`);
          addXp(15);
        }
      },
      good ? 500 : 1500,
    );
  };

  if (done)
    return (
      <div className="page narrow center">
        <h1>🏃 Échauffement terminé !</h1>
        <p className="lead">
          {ok} / {facts.length}
        </p>
        <Bubble who="neo" text="Ton cerveau est chaud ! Les calculs que tu connais par cœur te laissent plus d'énergie pour réfléchir aux problèmes." />
        <div className="stack">
          <button className="btn btn-primary" onClick={() => go("/")}>
            Partir à l'aventure ➜
          </button>
          <button className="btn btn-soft" onClick={() => go("/jeux/tables")}>
            Voir mes tours de calcul
          </button>
        </div>
      </div>
    );

  return (
    <div className="page eclair">
      <div className="lecon-top">
        <button className="back" onClick={() => go("/")}>
          ✕
        </button>
        <span>
          🏃 {i + 1}/{facts.length}
        </span>
        <span className="score-pill">⭐ {ok}</span>
      </div>
      <div className={`eclair-q ${fb === null ? "" : fb ? "ok" : "ko"}`}>
        {f.a} {f.op === "+" ? "+" : "×"} {f.b} = {fb === false ? ans : "?"}
      </div>
      <input ref={inputRef} className="answer-input xl" value={val} inputMode="none" onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} aria-label="réponse" autoFocus />
      <Keypad mode="nombre" extras={[]} onKey={(k) => setVal((v) => applyKey(v, k))} onSubmit={submit} canSubmit={!!val.trim() && fb === null} />
    </div>
  );
}
