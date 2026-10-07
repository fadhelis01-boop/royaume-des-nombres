import { useEffect, useRef, useState } from "react";
import { go } from "../../lib/router";
import { useContent } from "../../lib/content";
import { instantiate, newSeed, check, type Instance } from "../../lib/gen";
import { sfx } from "../../lib/sound";
import { addXp, bump, recordAnswer, updateChild, useChild } from "../../lib/store";
import { applyKey, Keypad } from "../../components/Keypad";
import { Bubble, Mascot } from "../../components/Mascot";
import { Md } from "../../components/Md";

const DUREE = 60;

export function CalculEclair() {
  const { manifest } = useContent();
  const child = useChild()!;
  const [fam, setFam] = useState<string | null>(null);
  const [q, setQ] = useState<Instance | null>(null);
  const [val, setVal] = useState("");
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState<{ q: string; a: string }[]>([]);
  const [left, setLeft] = useState(DUREE);
  const [flash, setFlash] = useState<"ok" | "ko" | null>(null);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const jeux = manifest?.jeux ?? {};

  const draw = (id: string) => {
    const specs = jeux[id].exercices;
    for (let i = 0; i < 20; i++) {
      try {
        const inst = instantiate(specs[Math.floor(Math.random() * specs.length)], newSeed());
        if (inst.type === "nombre") return inst;
      } catch {
        /* suivant */
      }
    }
    return null;
  };

  useEffect(() => {
    if (!fam || over) return;
    const id = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, [fam, over]);

  useEffect(() => {
    if (fam && left <= 0 && !over) {
      setOver(true);
      sfx.fanfare();
      const key = `eclair:${fam}`;
      updateChild((c) => {
        c.games[key] = Math.max(c.games[key] ?? 0, score);
        c.games["eclair"] = Math.max(c.games["eclair"] ?? 0, score);
      });
      bump("eclair-parties");
      addXp(Math.min(60, score * 3));
    } else if (fam && left <= 5 && left > 0) sfx.tick();
  }, [left]);

  const start = (id: string) => {
    setFam(id);
    setScore(0);
    setErrors([]);
    setLeft(DUREE);
    setOver(false);
    setVal("");
    setQ(draw(id));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const submit = () => {
    if (!q || !val.trim() || over) return;
    const v = check(q, { kind: "text", value: val });
    if (v.invalid) return;
    recordAnswer({ key: "jeu:eclair", ok: v.ok, firstTry: true, hint: false });
    if (v.ok) {
      sfx.ok();
      setScore((s) => s + 1);
      setFlash("ok");
    } else {
      sfx.oops();
      setErrors((e) => [...e, { q: q.enonce, a: q.expectedText }]);
      setFlash("ko");
    }
    setTimeout(() => setFlash(null), 250);
    setVal("");
    setQ(draw(fam!));
  };

  if (!fam)
    return (
      <div className="page">
        <button className="back" onClick={() => go("/jeux")}>
          ← Jeux
        </button>
        <h1>⚡ Calcul éclair</h1>
        <Bubble who="neo" text="60 secondes. Le plus de calculs justes possible. On y va ? Défi accepté !" />
        <div className="fam-grid">
          {Object.entries(jeux).map(([id, j]) => (
            <button key={id} className="fam-card" onClick={() => start(id)}>
              <strong>{j.titre}</strong>
              <small>{j.niveau}</small>
              {child.games[`eclair:${id}`] !== undefined && <span className="gc-best">🏅 {child.games[`eclair:${id}`]}</span>}
            </button>
          ))}
        </div>
      </div>
    );

  if (over) {
    const best = child.games[`eclair:${fam}`] ?? 0;
    return (
      <div className="page center">
        <h1>⏱ Temps écoulé !</h1>
        <div className="score-big">{score}</div>
        <p>{score >= best && score > 0 ? "🏅 Nouveau record ! " : `Ton record : ${best}. `}</p>
        <Bubble who={score >= 15 ? "zero" : "mia"} text={score >= 15 ? `${score} ! ${score >= 30 ? "TRENTE ?! 🤯" : "C'est énorme ! 😳"}` : "Chaque partie entraîne ta mémoire des calculs. Tu vas devenir de plus en plus rapide !"} />
        {errors.length > 0 && (
          <div className="card left">
            <strong>À retenir :</strong>
            <ul>
              {errors.slice(0, 8).map((e, i) => (
                <li key={i}>
                  <Md text={e.q} inline /> → <strong>{e.a}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="stack">
          <button className="btn btn-primary btn-xl" onClick={() => start(fam)}>
            🔁 Rejouer
          </button>
          <button className="btn btn-soft" onClick={() => setFam(null)}>
            Changer de calculs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page eclair">
      <div className="lecon-top">
        <button className="back" onClick={() => setFam(null)}>
          ✕
        </button>
        <div className={`timer ${left <= 10 ? "hurry" : ""}`}>⏱ {left}s</div>
        <div className="score-pill">⭐ {score}</div>
      </div>
      <div className={`eclair-q ${flash ?? ""}`}>{q && <Md text={q.enonce} />}</div>
      <input ref={inputRef} className="answer-input xl" value={val} inputMode="none" onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} aria-label="réponse" />
      <Keypad mode="nombre" onKey={(k) => setVal((v) => applyKey(v, k))} onSubmit={submit} canSubmit={!!val.trim()} />
      <Mascot who="neo" size={60} className="eclair-neo" talking={flash === "ok"} />
    </div>
  );
}
