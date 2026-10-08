import { useEffect, useState } from "react";
import { fmtNum } from "../lib/expr";
import { sfx } from "../lib/sound";
import type { Instance } from "../lib/gen";
import { Blocs, Droite, Horloge } from "./Visuel";

// Activités de manipulation : l'étape « concrète » de la méthode de Singapour,
// faite avec le doigt. Chaque activité remonte son état à l'exercice (onChange).

type OnChange = (values: number[] | null) => void;

export function Manip({ inst, onChange, disabled }: { inst: Instance; onChange: OnChange; disabled: boolean }) {
  switch (inst.type) {
    case "blocs":
      return <BlocsBuilder onChange={onChange} disabled={disabled} />;
    case "partage":
      return <Partage total={inst.total!} parts={inst.parts!} emoji={inst.emoji ?? "🍎"} onChange={onChange} disabled={disabled} />;
    case "sauts":
      return <Sauts inst={inst} onChange={onChange} disabled={disabled} />;
    case "colorier":
      return <Colorier d={inst.d!} forme={inst.spec.dessin === "barre" ? "barre" : "disque"} onChange={onChange} disabled={disabled} />;
    case "horloge":
      return <RegleHorloge onChange={onChange} disabled={disabled} />;
    case "payer":
      return <Payer pieces={inst.pieces!} onChange={onChange} disabled={disabled} />;
  }
  return null;
}

function Stepper({ label, value, set, disabled, color }: { label: string; value: number; set: (v: number) => void; disabled: boolean; color: string }) {
  return (
    <div className="stepper" style={{ "--sc": color } as React.CSSProperties}>
      <div className="stepper-label">{label}</div>
      <button type="button" className="step-btn" disabled={disabled || value >= 9} onClick={() => (sfx.tap(), set(value + 1))} aria-label={`ajouter une ${label}`}>
        ＋
      </button>
      <div className="stepper-val">{value}</div>
      <button type="button" className="step-btn" disabled={disabled || value <= 0} onClick={() => (sfx.tap(), set(value - 1))} aria-label={`enlever une ${label}`}>
        −
      </button>
    </div>
  );
}

function BlocsBuilder({ onChange, disabled }: { onChange: OnChange; disabled: boolean }) {
  const [c, setC] = useState(0);
  const [d, setD] = useState(0);
  const [u, setU] = useState(0);
  const total = c * 100 + d * 10 + u;
  useEffect(() => onChange(total > 0 ? [total] : null), [total]);
  return (
    <div className="manip manip-blocs">
      <div className="steppers">
        <Stepper label="centaines" value={c} set={setC} disabled={disabled} color="var(--c-violet)" />
        <Stepper label="dizaines" value={d} set={setD} disabled={disabled} color="var(--c-orange)" />
        <Stepper label="unités" value={u} set={setU} disabled={disabled} color="var(--c-turquoise)" />
      </div>
      <div className="manip-scene">{total > 0 ? <Blocs nombre={total} /> : <p className="muted center">Touche ＋ pour ajouter des blocs.</p>}</div>
      <div className="manip-total">{fmtNum(total)}</div>
    </div>
  );
}

function Partage({ total, parts, emoji, onChange, disabled }: { total: number; parts: number; emoji: string; onChange: OnChange; disabled: boolean }) {
  const [baskets, setBaskets] = useState<number[]>(() => Array(parts).fill(0));
  const left = total - baskets.reduce((a, b) => a + b, 0);
  useEffect(() => onChange(left === 0 ? baskets : null), [baskets]);
  const add = (i: number) => {
    if (disabled || left <= 0) return;
    sfx.tap();
    setBaskets((b) => b.map((x, j) => (j === i ? x + 1 : x)));
  };
  const remove = (i: number) => {
    if (disabled || baskets[i] <= 0) return;
    setBaskets((b) => b.map((x, j) => (j === i ? x - 1 : x)));
  };
  return (
    <div className="manip manip-partage">
      <div className="pool" aria-label={`${left} objets à distribuer`}>
        {Array.from({ length: left }, (_, i) => (
          <span key={i} className="pop-in">
            {emoji}
          </span>
        ))}
        {left === 0 && <span className="muted">Tout est distribué !</span>}
      </div>
      <p className="small muted center">Touche un panier pour y déposer un objet. (− pour en reprendre un)</p>
      <div className="baskets">
        {baskets.map((b, i) => (
          <div key={i} className="basket-wrap">
            <button type="button" className="basket" onClick={() => add(i)} disabled={disabled} aria-label={`panier ${i + 1} : ${b} objets`}>
              <div className="basket-items">
                {Array.from({ length: b }, (_, k) => (
                  <span key={k} className="pop-in">
                    {emoji}
                  </span>
                ))}
              </div>
              <div className="basket-icon">🧺</div>
            </button>
            <button type="button" className="mini-btn" onClick={() => remove(i)} disabled={disabled || b === 0} aria-label="reprendre un objet">
              −
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sauts({ inst, onChange, disabled }: { inst: Instance; onChange: OnChange; disabled: boolean }) {
  const [path, setPath] = useState<number[]>([inst.depart!]);
  const pos = path[path.length - 1];
  useEffect(() => onChange(path.length > 1 ? [pos] : null), [path]);
  const span = inst.max! - inst.min!;
  const pas = span > 60 ? 10 : span > 30 ? 5 : 1;
  const jump = (s: number) => {
    const p = pos + s;
    if (disabled || p < inst.min! || p > inst.max!) return;
    sfx.tap();
    setPath((h) => [...h, p]);
  };
  const sauts = path.slice(1).map((p, i) => ({ de: path[i], a: p, label: `${p - path[i] > 0 ? "+" : "−"}${Math.abs(p - path[i])}` }));
  return (
    <div className="manip manip-sauts">
      <Droite v={{ min: inst.min, max: inst.max, pas, sauts, point: { v: pos, label: "🐸" } }} />
      <div className="jump-btns">
        {inst.sauts!.map((s) => (
          <button key={s} type="button" className="chip big" disabled={disabled} onClick={() => jump(s)}>
            {s > 0 ? "+" : "−"}
            {Math.abs(s)}
          </button>
        ))}
        <button type="button" className="chip" disabled={disabled || path.length < 2} onClick={() => setPath((h) => h.slice(0, -1))}>
          ↶ Annuler
        </button>
      </div>
      <p className="center small">
        La grenouille est sur <strong>{fmtNum(pos)}</strong> — {path.length - 1} saut{path.length > 2 ? "s" : ""}
      </p>
    </div>
  );
}

function Colorier({ d, forme, onChange, disabled }: { d: number; forme: "disque" | "barre"; onChange: OnChange; disabled: boolean }) {
  const [on, setOn] = useState<boolean[]>(() => Array(d).fill(false));
  const count = on.filter(Boolean).length;
  useEffect(() => onChange(count > 0 ? [count] : null), [on]);
  const toggle = (k: number) => {
    if (disabled) return;
    sfx.tap();
    setOn((o) => o.map((x, j) => (j === k ? !x : x)));
  };
  if (forme === "barre")
    return (
      <div className="manip">
        <svg viewBox="0 0 320 70" className="svg-colorier" role="group" aria-label="barre à colorier">
          {on.map((x, k) => (
            <rect key={k} x={8 + (k * 304) / d} y={8} width={304 / d} height={54} fill={x ? "var(--c-turquoise)" : "var(--paper)"} stroke="var(--ink)" strokeWidth={2} onClick={() => toggle(k)} style={{ cursor: "pointer" }} />
          ))}
        </svg>
        <p className="center small">Parts coloriées : {count} sur {d}</p>
      </div>
    );
  const r = 90,
    cx = 100,
    cy = 100;
  return (
    <div className="manip">
      <svg viewBox="0 0 200 200" className="svg-colorier disque" role="group" aria-label="disque à colorier">
        {on.map((x, k) => {
          const a0 = (k / d) * 2 * Math.PI - Math.PI / 2,
            a1 = ((k + 1) / d) * 2 * Math.PI - Math.PI / 2;
          const p = `M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
          return <path key={k} d={p} fill={x ? "var(--c-orange)" : "var(--paper)"} stroke="var(--ink)" strokeWidth={2} onClick={() => toggle(k)} style={{ cursor: "pointer" }} />;
        })}
      </svg>
      <p className="center small">Parts coloriées : {count} sur {d}</p>
    </div>
  );
}

function RegleHorloge({ onChange, disabled }: { onChange: OnChange; disabled: boolean }) {
  const [h, setH] = useState(12);
  const [m, setM] = useState(0);
  const [touched, setTouched] = useState(false);
  useEffect(() => onChange(touched ? [h % 12, m] : null), [h, m, touched]);
  const ch = (dh: number, dm: number) => {
    if (disabled) return;
    sfx.tick();
    setTouched(true);
    let mm = m + dm,
      hh = h + dh;
    if (mm >= 60) {
      mm -= 60;
      hh++;
    }
    if (mm < 0) {
      mm += 60;
      hh--;
    }
    hh = ((hh - 1 + 12) % 12) + 1;
    setH(hh);
    setM(mm);
  };
  return (
    <div className="manip manip-horloge">
      <Horloge h={h} m={m} numerique={false} />
      <div className="clock-btns">
        <div>
          <div className="small center">petite aiguille (heures)</div>
          <button type="button" className="chip big" disabled={disabled} onClick={() => ch(-1, 0)}>
            −1 h
          </button>
          <button type="button" className="chip big" disabled={disabled} onClick={() => ch(1, 0)}>
            +1 h
          </button>
        </div>
        <div>
          <div className="small center">grande aiguille (minutes)</div>
          <button type="button" className="chip big" disabled={disabled} onClick={() => ch(0, -5)}>
            −5 min
          </button>
          <button type="button" className="chip big" disabled={disabled} onClick={() => ch(0, 5)}>
            +5 min
          </button>
        </div>
      </div>
    </div>
  );
}

function Payer({ pieces, onChange, disabled }: { pieces: number[]; onChange: OnChange; disabled: boolean }) {
  const [tray, setTray] = useState<number[]>([]);
  const sum = Math.round(tray.reduce((a, b) => a + b, 0) * 100) / 100;
  useEffect(() => onChange(tray.length ? [sum] : null), [tray]);
  const coin = (v: number, onClick: () => void, key: string | number) =>
    v >= 5 ? (
      <button key={key} type="button" className={`billet b${v}`} onClick={onClick} disabled={disabled}>
        {v} €
      </button>
    ) : (
      <button key={key} type="button" className={`piece ${v >= 1 ? "bimetal" : v >= 0.1 ? "or" : "cuivre"}`} onClick={onClick} disabled={disabled}>
        {v >= 1 ? `${v} €` : `${Math.round(v * 100)} c`}
      </button>
    );
  return (
    <div className="manip manip-payer">
      <div className="small muted">Ta tirelire : touche une pièce ou un billet pour le donner.</div>
      <div className="monnaie">{pieces.map((v, i) => coin(v, () => !disabled && (sfx.tap(), setTray((t) => [...t, v])), i))}</div>
      <div className="tray">
        <div className="small muted">Sur le comptoir (touche pour reprendre) :</div>
        <div className="monnaie">{tray.length ? tray.map((v, i) => coin(v, () => !disabled && setTray((t) => t.filter((_, j) => j !== i)), `t${i}`)) : <span className="muted">rien pour l'instant</span>}</div>
      </div>
    </div>
  );
}
