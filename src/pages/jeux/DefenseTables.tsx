import { useEffect, useRef, useState } from "react";
import { go } from "../../lib/router";
import { sfx } from "../../lib/sound";
import { addGems, addXp, bump, updateChild, useChild } from "../../lib/store";
import { additionsMastered } from "../../lib/rewards";
import { burst, centerOf, rewardCorrect, rewardWrong, shake } from "../../lib/juice";
import { applyKey, Keypad } from "../../components/Keypad";
import { Bubble, Mascot } from "../../components/Mascot";
import type { Child } from "../../lib/types";

// La Défense des Tables : de petits Grignoteurs avancent vers le château en portant
// un calcul. Une bonne réponse, et la tour les dissipe. Les maths SONT la mécanique :
// pour tenir, il faut répondre juste ET vite. Les faits ratés reviennent plus souvent.

type Op = "x" | "+";
interface Foe {
  id: number;
  a: number;
  b: number;
  p: number; // avancée 0 → 1 (1 = château)
  reveal?: number; // horodatage : on montre la bonne réponse un instant
}

const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

function pickFact(c: Child, op: Op, wave: number): [number, number] {
  // tables débloquées au fil des vagues ; les faits fragiles sont tirés plus souvent
  const pool = op === "x" ? [2, 5, 10, 3, 4, 6, 7, 8, 9].slice(0, Math.min(9, 3 + wave * 2)) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].slice(0, Math.min(10, 4 + wave * 2));
  let best: [number, number] = [pool[0], 2];
  let bestW = -1;
  for (let k = 0; k < 6; k++) {
    const a = pool[r(0, pool.length - 1)];
    const b = op === "x" ? r(2, 9) : r(1, 10);
    const t = c.tables[`${a}${op}${b}`];
    const w = Math.random() + (t ? t.ko * 0.6 - t.ok * 0.15 : 0.4);
    if (w > bestW) {
      bestW = w;
      best = Math.random() < 0.5 ? [a, b] : [b, a];
    }
  }
  return best;
}

export function DefenseTables() {
  const child = useChild()!;
  const young = child.age < 8 || additionsMastered(child) < 60;
  const [op, setOp] = useState<Op | null>(null);
  const [wave, setWave] = useState(1);
  const [foes, setFoes] = useState<Foe[]>([]);
  const [lives, setLives] = useState(3);
  const [val, setVal] = useState("");
  const [score, setScore] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const toSpawn = useRef(0);
  const nextId = useRef(1);
  const lastSpawn = useRef(0);
  const laneRef = useRef<HTMLDivElement>(null);
  const castleRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  const speed = (w: number) => 1 / Math.max(6, 15 - w * 1.4); // fraction de piste par seconde

  const startWave = (w: number) => {
    setWave(w);
    toSpawn.current = 3 + w;
    lastSpawn.current = 0;
    setBanner(`Vague ${w} !`);
    paused.current = true;
    window.setTimeout(() => {
      setBanner(null);
      paused.current = false;
    }, 1400);
  };

  const start = (o: Op) => {
    setOp(o);
    setLives(3);
    setScore(0);
    setFoes([]);
    foesRef.current = [];
    setOver(false);
    nextId.current = 1;
    startWave(1);
  };

  // boucle de jeu : l'état vit dans une référence, React ne fait qu'afficher
  const foesRef = useRef<Foe[]>([]);
  const waveEnding = useRef(false);
  useEffect(() => {
    if (!op || over) return;
    let raf = 0;
    let prev = performance.now();
    waveEnding.current = false;
    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - prev) / 1000);
      prev = t;
      if (!paused.current) {
        lastSpawn.current += dt;
        let list = foesRef.current.filter((f) => !(f.reveal && t - f.reveal > 1300));
        const gap = Math.max(1.6, 3.2 - wave * 0.2);
        if (toSpawn.current > 0 && (lastSpawn.current > gap || !list.length)) {
          lastSpawn.current = 0;
          toSpawn.current--;
          const [a, b] = pickFact(child, op, wave);
          list.push({ id: nextId.current++, a, b, p: 0 });
        }
        let hits = 0;
        list = list
          .map((f) => (f.reveal ? f : { ...f, p: f.p + dt * speed(wave) }))
          .filter((f) => {
            if (!f.reveal && f.p >= 1) {
              hits++;
              return false;
            }
            return true;
          });
        foesRef.current = list;
        setFoes(list);
        if (hits) {
          sfx.whoosh();
          shake(castleRef.current);
          setLives((l) => Math.max(0, l - hits));
        }
        if (!list.length && toSpawn.current === 0 && !waveEnding.current) {
          waveEnding.current = true;
          addGems(1);
          startWave(wave + 1);
          return; // le changement de vague relance la boucle
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op, wave, over]);

  useEffect(() => {
    if (op && lives <= 0 && !over) {
      setOver(true);
      const reached = wave;
      updateChild((c) => {
        c.recordsJeux = { ...(c.recordsJeux ?? {}), defense: Math.max(c.recordsJeux?.defense ?? 0, reached) };
        c.games["defense"] = Math.max(c.games["defense"] ?? 0, score);
      });
      addGems(reached * 2);
      addXp(score * 2);
      bump("jeux");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lives]);

  const target = foes.filter((f) => !f.reveal).sort((x, y) => y.p - x.p)[0];

  const submit = () => {
    if (!target || !op || !val.trim()) return;
    const n = Number(val.replace(",", "."));
    const good = op === "x" ? target.a * target.b : target.a + target.b;
    const ok = n === good;
    updateChild((c) => {
      const t = (c.tables[`${target.a}${op}${target.b}`] ??= { ok: 0, ko: 0 });
      ok ? t.ok++ : t.ko++;
    });
    setVal("");
    const el = laneRef.current?.querySelector(`[data-foe="${target.id}"]`);
    if (ok) {
      sfx.hit();
      const [x, y] = centerOf(el);
      burst(x, y, 2);
      rewardCorrect({ firstTry: true, scored: true, anchor: el, speakCombo: false });
      setScore((s) => s + 1);
      foesRef.current = foesRef.current.filter((f) => f.id !== target.id);
      setFoes(foesRef.current);
    } else {
      sfx.oops();
      rewardWrong();
      // on montre la bonne réponse : c'est comme ça qu'on l'apprend
      foesRef.current = foesRef.current.map((f) => (f.id === target.id ? { ...f, reveal: performance.now() } : f));
      setFoes(foesRef.current);
    }
  };

  if (!op)
    return (
      <div className="page">
        <button className="back" onClick={() => go("/jeux")}>
          ← Jeux
        </button>
        <h1>🏰 La Défense du Royaume</h1>
        <Bubble who="neo" text="De petits Grignoteurs foncent vers le château en portant un calcul ! Tape la réponse du plus proche : la tour le dissipe. Trois Grignoteurs au château, et c'est perdu. Défi accepté ?" />
        <div className="fam-grid">
          <button className={`fam-card ${young ? "suggest" : ""}`} onClick={() => start("+")}>
            <strong>➕ Additions jusqu'à 10 + 10</strong>
            {young && <small>Conseillé pour toi</small>}
          </button>
          <button className={`fam-card ${!young ? "suggest" : ""}`} onClick={() => start("x")}>
            <strong>✖️ Tables de multiplication</strong>
            {child.recordsJeux?.defense ? <span className="gc-best">🏅 vague {child.recordsJeux.defense}</span> : null}
          </button>
        </div>
      </div>
    );

  if (over)
    return (
      <div className="page center">
        <Mascot who="nuage" size={110} humeur="joie" />
        <h1>Vague {wave} atteinte !</h1>
        <p>
          {score} Grignoteurs dissipés · +{wave * 2} 💎
        </p>
        <Bubble who="mia" text="Les calculs qui t'ont échappé reviendront plus souvent la prochaine fois : c'est comme ça qu'on les retient pour toujours !" />
        <div className="stack">
          <button className="btn btn-primary btn-xl" onClick={() => start(op)}>
            🔁 Rejouer
          </button>
          <button className="btn btn-soft" onClick={() => setOp(null)}>
            Changer de mode
          </button>
        </div>
      </div>
    );

  const sym = op === "x" ? "×" : "+";
  return (
    <div className="page defense">
      <div className="lecon-top">
        <button className="back" onClick={() => setOp(null)} aria-label="Quitter">
          ✕
        </button>
        <span>Vague {wave}</span>
        <span className="score-pill" aria-label={`${lives} vies`}>
          {"❤️".repeat(lives)}
          {"🤍".repeat(3 - lives)}
        </span>
        <span className="score-pill">⚔️ {score}</span>
      </div>
      <div className="lane" ref={laneRef}>
        {banner && <div className="lane-banner">{banner}</div>}
        {foes.map((f) => (
          <div key={f.id} data-foe={f.id} className={`lane-foe ${f === target ? "target" : ""} ${f.reveal ? "reveal" : ""}`} style={{ left: `${f.p * 82}%` }}>
            <Mascot who="nuage" size={52} humeur={f.reveal ? "joie" : undefined} />
            <span className="lane-q">
              {f.a} {sym} {f.b}
              {f.reveal ? ` = ${op === "x" ? f.a * f.b : f.a + f.b}` : ""}
            </span>
          </div>
        ))}
        <div className="lane-castle" ref={castleRef} aria-hidden>
          🏰
        </div>
      </div>
      <div className="defense-input">
        <div className="vise-target">
          {target ? (
            <>
              {target.a} {sym} {target.b} = <strong>{val || "?"}</strong>
            </>
          ) : (
            "…"
          )}
        </div>
      </div>
      <Keypad mode="nombre" extras={[]} onKey={(k) => setVal((v) => applyKey(v, k).slice(0, 3))} onSubmit={submit} canSubmit={!!val.trim() && !!target} />
    </div>
  );
}
