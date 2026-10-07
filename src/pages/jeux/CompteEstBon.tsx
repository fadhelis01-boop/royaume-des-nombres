import { useState } from "react";
import { go } from "../../lib/router";
import { sfx } from "../../lib/sound";
import { addXp, bump } from "../../lib/store";
import { Bubble, Mascot } from "../../components/Mascot";

// « Le compte est bon » (jeu télévisé français), version enfant :
// combiner des nombres avec + − × ÷ pour atteindre la cible.

interface Tile {
  id: number;
  v: number;
  used: boolean;
}
type Op = "+" | "−" | "×" | "÷";
const LEVELS = [
  { id: "graine", titre: "🌱 Graine", n: 4, pool: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], min: 10, max: 40 },
  { id: "explorateur", titre: "🧭 Explorateur", n: 5, pool: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 25], min: 30, max: 150 },
  { id: "maitre", titre: "🏰 Maître", n: 6, pool: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 25, 50, 75, 100], min: 101, max: 999 },
];

function apply(a: number, op: Op, b: number): number | null {
  if (op === "+") return a + b;
  if (op === "×") return a * b;
  if (op === "−") return a > b ? a - b : null; // pas de négatifs, comme au jeu télévisé
  if (op === "÷") return b !== 0 && a % b === 0 ? a / b : null;
  return null;
}

/** Recherche d'une solution (exploration exhaustive, rapide pour ≤ 6 nombres). */
export function solve(nums: number[], target: number): string[] | null {
  const seen = new Set<string>();
  const rec = (vals: number[], steps: string[]): string[] | null => {
    if (vals.includes(target)) return steps;
    const key = [...vals].sort((a, b) => a - b).join(",");
    if (seen.has(key)) return null;
    seen.add(key);
    for (let i = 0; i < vals.length; i++)
      for (let j = 0; j < vals.length; j++) {
        if (i === j) continue;
        for (const op of ["+", "×", "−", "÷"] as Op[]) {
          if ((op === "+" || op === "×") && i > j) continue;
          const r = apply(vals[i], op, vals[j]);
          if (r === null || r === vals[i] || r === vals[j]) continue;
          const rest = vals.filter((_, k) => k !== i && k !== j);
          const res = rec([...rest, r], [...steps, `${vals[i]} ${op} ${vals[j]} = ${r}`]);
          if (res) return res;
        }
      }
    return null;
  };
  return rec(nums, []);
}

function newGame(levelIdx: number) {
  const L = LEVELS[levelIdx];
  for (let t = 0; t < 200; t++) {
    const nums = Array.from({ length: L.n }, () => L.pool[Math.floor(Math.random() * L.pool.length)]);
    const target = L.min + Math.floor(Math.random() * (L.max - L.min + 1));
    if (nums.includes(target)) continue;
    const sol = solve(nums, target);
    if (sol && sol.length >= 2) return { nums, target, sol };
  }
  return { nums: [2, 3, 4, 5], target: 26, sol: ["4 × 5 = 20", "2 × 3 = 6", "20 + 6 = 26"] };
}

export function CompteEstBon() {
  const [level, setLevel] = useState<number | null>(null);
  const [game, setGame] = useState<ReturnType<typeof newGame> | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [history, setHistory] = useState<{ text: string; tiles: Tile[] }[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [won, setWon] = useState(false);
  const [showSol, setShowSol] = useState(false);
  const [msg, setMsg] = useState("");

  const start = (li: number) => {
    const g = newGame(li);
    setLevel(li);
    setGame(g);
    setTiles(g.nums.map((v, i) => ({ id: i, v, used: false })));
    setHistory([]);
    setSel(null);
    setOp(null);
    setWon(false);
    setShowSol(false);
    setMsg("");
  };

  const tap = (t: Tile) => {
    if (won || t.used) return;
    sfx.tap();
    if (sel === null || op === null) {
      setSel(t.id === sel ? null : t.id);
      return;
    }
    if (t.id === sel) return;
    const a = tiles.find((x) => x.id === sel)!;
    const r = apply(a.v, op, t.v);
    if (r === null) {
      setMsg(op === "−" ? "On ne peut pas avoir de résultat négatif ou nul ici : commence par le plus grand nombre !" : "Ici, la division doit tomber juste (pas de reste).");
      sfx.oops();
      return;
    }
    const nid = Math.max(...tiles.map((x) => x.id)) + 1;
    const next = [...tiles.map((x) => (x.id === a.id || x.id === t.id ? { ...x, used: true } : x)), { id: nid, v: r, used: false }];
    setHistory([...history, { text: `${a.v} ${op} ${t.v} = ${r}`, tiles }]);
    setTiles(next);
    setSel(null);
    setOp(null);
    setMsg("");
    if (r === game!.target) {
      setWon(true);
      sfx.fanfare();
      bump("compte");
      addXp(20 + level! * 15);
    }
  };

  const undo = () => {
    const last = history.at(-1);
    if (!last) return;
    setTiles(last.tiles);
    setHistory(history.slice(0, -1));
    setSel(null);
    setOp(null);
    setWon(false);
  };

  if (level === null || !game)
    return (
      <div className="page">
        <button className="back" onClick={() => go("/jeux")}>
          ← Jeux
        </button>
        <h1>🧮 Le compte est bon</h1>
        <Bubble who="neo" text="Tu as quelques nombres et un nombre CIBLE. Combine-les avec + − × ÷ pour tomber pile sur la cible ! Chaque nombre ne sert qu'une fois." />
        <Bubble who="mia" text="Astuce : regarde si la cible est proche d'une multiplication facile, puis ajuste avec une addition ou une soustraction !" side="right" />
        <div className="stack">
          {LEVELS.map((l, i) => (
            <button key={l.id} className="btn btn-primary btn-xl" onClick={() => start(i)}>
              {l.titre} — {l.n} nombres, cible jusqu'à {l.max}
            </button>
          ))}
        </div>
      </div>
    );

  const best = tiles.filter((t) => !t.used).reduce((b, t) => (Math.abs(t.v - game.target) < Math.abs(b - game.target) ? t.v : b), Infinity);
  return (
    <div className="page compte">
      <div className="lecon-top">
        <button className="back" onClick={() => setLevel(null)}>
          ✕
        </button>
        <span className="muted">{LEVELS[level].titre}</span>
      </div>
      <div className="cible">
        <small>Cible</small>
        <span>{game.target}</span>
      </div>
      <div className="tiles">
        {tiles
          .filter((t) => !t.used)
          .map((t) => (
            <button key={t.id} className={`tile ${sel === t.id ? "sel" : ""} ${t.id >= game.nums.length ? "made" : ""}`} onClick={() => tap(t)}>
              {t.v}
            </button>
          ))}
      </div>
      <div className="ops">
        {(["+", "−", "×", "÷"] as Op[]).map((o) => (
          <button key={o} className={`op ${op === o ? "sel" : ""}`} disabled={sel === null || won} onClick={() => setOp(o)}>
            {o}
          </button>
        ))}
      </div>
      <p className="small muted center">{sel === null ? "1. Touche un nombre" : op === null ? "2. Choisis une opération" : "3. Touche le deuxième nombre"}</p>
      {msg && <Bubble who="neo" text={msg} size={50} />}
      {history.length > 0 && (
        <ol className="history">
          {history.map((h, i) => (
            <li key={i}>{h.text}</li>
          ))}
        </ol>
      )}
      {won ? (
        <div className="card center">
          <Mascot who="zero" size={90} talking />
          <h2>Le compte est bon ! 🎉</h2>
          <button className="btn btn-primary" onClick={() => start(level)}>
            Nouvelle partie
          </button>
        </div>
      ) : (
        <div className="row center">
          <button className="btn btn-soft" onClick={undo} disabled={!history.length}>
            ↶ Annuler
          </button>
          <button className="btn btn-ghost" onClick={() => setShowSol(true)}>
            🙈 Solution
          </button>
          <button className="btn btn-ghost" onClick={() => start(level)}>
            ⟳ Autre tirage
          </button>
        </div>
      )}
      {!won && isFinite(best) && history.length > 0 && <p className="center small">Ton nombre le plus proche : {best} (écart {Math.abs(best - game.target)})</p>}
      {showSol && (
        <div className="card">
          <strong>Une solution possible :</strong>
          <ol>
            {game.sol.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <p className="small muted">Il en existe souvent plusieurs ! As-tu trouvé une autre façon ?</p>
        </div>
      )}
    </div>
  );
}
