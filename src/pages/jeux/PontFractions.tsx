import { useMemo, useState } from "react";
import { go } from "../../lib/router";
import { sfx } from "../../lib/sound";
import { addGems, addXp, updateChild, useChild } from "../../lib/store";
import { burst, centerOf, rewardCorrect, rewardWrong } from "../../lib/juice";
import { Bubble } from "../../components/Mascot";
import { Avatar } from "../../components/Avatar";
import { Md } from "../../components/Md";

// Le Pont des Fractions : combler un ravin EXACTEMENT avec des planches de ½, ⅓, ¼…
// Additionner des fractions devient une action concrète : trop court on tombe,
// trop long la planche dépasse. Les longueurs sont comptées en 24ᵉ.

const U = 24;
const PLANKS: Record<number, { n: number; d: number; color: string }> = {
  12: { n: 1, d: 2, color: "#7c4dff" },
  8: { n: 1, d: 3, color: "#ff8a1f" },
  6: { n: 1, d: 4, color: "#18c5b5" },
  4: { n: 1, d: 6, color: "#ff5c8a" },
  3: { n: 1, d: 8, color: "#4caf50" },
  2: { n: 1, d: 12, color: "#e8b100" },
};

interface Level {
  gap: number; // en 24ᵉ
  planks: number[];
}

const pgcd = (a: number, b: number): number => (b ? pgcd(b, a % b) : a);
const frac = (u: number) => {
  const g = pgcd(u, U);
  const n = u / g,
    d = U / g;
  return d === 1 ? `${n}` : `\\frac{${n}}{${d}}`;
};

function level(k: number): Level {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  if (k < 3) return { gap: 24, planks: [12, 6] };
  if (k < 6) return { gap: pick([18, 24, 21]), planks: [12, 6, 3] };
  if (k < 9) return { gap: pick([16, 20, 24]), planks: [12, 8, 4] };
  if (k < 12) return { gap: pick([14, 18, 20, 22]), planks: [12, 8, 6, 4, 2] };
  return { gap: pick([30, 28, 34, 38, 26]), planks: [12, 8, 6, 4, 3, 2] };
}

/** Nombre minimal de planches pour faire exactement `gap` (programmation dynamique). */
function minPlanks(gap: number, planks: number[]) {
  const best = Array(gap + 1).fill(Infinity);
  best[0] = 0;
  for (let x = 1; x <= gap; x++) for (const p of planks) if (p <= x) best[x] = Math.min(best[x], best[x - p] + 1);
  return best[gap];
}

export function PontFractions() {
  const child = useChild()!;
  const done = child.recordsJeux?.pont ?? 0;
  const [k, setK] = useState(done);
  const lv = useMemo(() => level(k), [k]);
  const [bridge, setBridge] = useState<number[]>([]);
  const [state, setState] = useState<"build" | "ok" | "short" | "long">("build");
  const [started, setStarted] = useState(false);
  const total = bridge.reduce((a, b) => a + b, 0);
  const minN = useMemo(() => minPlanks(lv.gap, lv.planks), [lv]);
  // la largeur dessinée : le ravin occupe 70 % de la scène pour 1 unité (24ᵉ), un peu moins au-delà de 1
  const scale = 70 / Math.max(U, lv.gap);

  const cross = (el: Element) => {
    if (total === lv.gap) {
      setState("ok");
      sfx.victory("pont" + k);
      const [x, y] = centerOf(el);
      burst(x, y, 3);
      const stars = bridge.length === minN ? 3 : bridge.length <= minN + 2 ? 2 : 1;
      rewardCorrect({ firstTry: true, scored: true, anchor: el, speakCombo: false });
      addGems(stars);
      addXp(10 + stars * 5);
      updateChild((c) => {
        c.recordsJeux = { ...(c.recordsJeux ?? {}), pont: Math.max(c.recordsJeux?.pont ?? 0, k + 1) };
      });
    } else {
      setState(total < lv.gap ? "short" : "long");
      sfx.oops();
      rewardWrong();
    }
  };
  const next = () => {
    setK(k + 1);
    setBridge([]);
    setState("build");
  };

  if (!started)
    return (
      <div className="page">
        <button className="back" onClick={() => go("/jeux")}>
          ← Jeux
        </button>
        <h1>🌉 Le Pont des Fractions</h1>
        <Bubble who="mia" text="Le ravin a une longueur bien précise. Pose des planches de ½, ⅓, ¼… pour le combler EXACTEMENT. Trop court, on tombe ; trop long, la planche dépasse ! Avec le moins de planches possible, tu gagnes 3 étoiles." />
        <p className="center">Pont n° {done + 1}</p>
        <button className="btn btn-primary btn-xl" onClick={() => setStarted(true)}>
          Construire ! 🔨
        </button>
      </div>
    );

  const stars = bridge.length === minN ? 3 : bridge.length <= minN + 2 ? 2 : 1;
  return (
    <div className="page pont">
      <div className="lecon-top">
        <button className="back" onClick={() => setStarted(false)} aria-label="Quitter">
          ✕
        </button>
        <span>Pont n° {k + 1}</span>
        <span className="score-pill">
          <Md text={`$${frac(total)}$`} inline /> / <Md text={`$${frac(lv.gap)}$`} inline />
        </span>
      </div>
      <div className="vise-target">
        Ravin : <Md text={`$${frac(lv.gap)}$`} inline /> {lv.gap > U ? "(plus d'une unité !)" : ""}
      </div>
      <div className={`pont-scene st-${state}`}>
        <div className="cliff left" />
        <div className="gap" style={{ width: `${lv.gap * scale}%` }}>
          {/* repères d'unités */}
          {Array.from({ length: Math.floor(lv.gap / U) }, (_, i) => (
            <span key={i} className="gap-unit" style={{ left: `${((i + 1) * U * 100) / lv.gap}%` }} />
          ))}
        </div>
        <div className="cliff right" style={{ left: `${8 + lv.gap * scale}%` }} />
        <div className="planks" style={{ width: `${total * scale}%` }}>
          {bridge.map((p, i) => (
            <span key={i} className="plank" style={{ flexGrow: p, background: PLANKS[p].color }}>
              <Md text={`$\\frac{1}{${PLANKS[p].d}}$`} inline />
            </span>
          ))}
        </div>
        <div className={`pont-hero st-${state}`} style={{ left: state === "ok" ? `${10 + lv.gap * scale}%` : "2%" }}>
          <Avatar child={child} size={48} showCompanion={false} />
        </div>
      </div>
      {state === "build" && (
        <>
          <div className="plank-pick" role="group" aria-label="planches disponibles">
            {lv.planks.map((p) => (
              <button
                key={p}
                className="plank-btn"
                style={{ background: PLANKS[p].color, width: `${Math.max(14, p * scale)}%` }}
                onClick={() => {
                  sfx.tap();
                  setBridge([...bridge, p]);
                }}
                aria-label={`ajouter une planche d'un ${["", "", "demi", "tiers", "quart", "", "sixième", "", "huitième", "", "", "", "douzième"][PLANKS[p].d]}`}
              >
                <Md text={`$\\frac{1}{${PLANKS[p].d}}$`} inline />
              </button>
            ))}
          </div>
          <div className="row center">
            <button className="btn btn-soft" disabled={!bridge.length} onClick={() => setBridge(bridge.slice(0, -1))}>
              ↩️ Enlever
            </button>
            <button className="btn btn-primary" disabled={!bridge.length} onClick={(e) => cross(e.currentTarget)}>
              🚶 Traverser
            </button>
          </div>
          <p className="small muted center">
            Ton pont : {bridge.length ? <Md text={`$${bridge.map((p) => `\\frac{1}{${PLANKS[p].d}}`).join(" + ")} = ${frac(total)}$`} inline /> : "aucune planche"}
          </p>
        </>
      )}
      {state !== "build" && (
        <div className="center stack">
          {state === "ok" ? (
            <Bubble who="neo" humeur="joie" text={`Pont solide ! ${bridge.length} planche${bridge.length > 1 ? "s" : ""}${bridge.length === minN ? " : c'est le minimum possible ! ⭐⭐⭐" : `. On pouvait le faire avec ${minN}. ${"⭐".repeat(stars)}`}`} />
          ) : state === "short" ? (
            <Bubble who="zero" humeur="surprise" text="Plouf ! Ton pont est plus court que le ravin. Ajoute des planches !" />
          ) : (
            <Bubble who="mia" humeur="reflexion" text="La planche dépasse : ton pont est trop long. Enlève une planche et essaie une plus petite !" />
          )}
          {state !== "ok" && (
            <p className="small center">
              Manque ou dépasse : <Md text={`$${frac(Math.abs(lv.gap - total))}$`} inline />
            </p>
          )}
          {state === "ok" ? (
            <button className="btn btn-primary btn-xl" onClick={next} autoFocus>
              Pont suivant ➜
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setState("build")} autoFocus>
              Corriger mon pont 🔨
            </button>
          )}
        </div>
      )}
    </div>
  );
}
