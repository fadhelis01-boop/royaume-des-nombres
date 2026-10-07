import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { evaluate, fmtNum, fracStr, parse, toNumber, type Node } from "../lib/expr";
import type { VisSpec } from "../lib/types";
import { Md } from "./Md";

// Tous les visuels sont dessinés à partir de données (aucune image à fabriquer) :
// un nouveau monde peut ainsi illustrer ses leçons sans une ligne de code.

type Any = Record<string, unknown>;
const n = (v: unknown, d = 0): number => {
  if (v === undefined || v === null || v === "") return d;
  const x = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return isNaN(x) ? d : x;
};
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : v === undefined || v === null ? [] : [v as T]);
const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));

/** Taille de texte lisible : au moins `min` pixels réels à l'écran, quelle que soit la largeur. */
function useSvgFont(W: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [px, setPx] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setPx(el.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const k = px > 0 ? W / px : 1; // unités SVG par pixel réel
  const f = (base: number, min = 16) => Math.max(base, min * k);
  return { ref, f, px };
}

const PALETTE = ["var(--c-violet)", "var(--c-orange)", "var(--c-turquoise)", "var(--c-jaune)", "var(--c-rose)", "var(--c-vert)", "var(--c-bleu)"];

export function Visuel({ v, legende }: { v: VisSpec; legende?: string }) {
  let body: ReactNode = null;
  try {
    body = renderVis(v);
  } catch (e) {
    body = <div className="vis-error">Visuel illisible : {(e as Error).message}</div>;
  }
  return (
    <figure className={`visuel vis-${v.type}`}>
      {body}
      {legende && (
        <figcaption>
          <Md text={legende} inline />
        </figcaption>
      )}
    </figure>
  );
}

function renderVis(v: Any): ReactNode {
  switch (v.type) {
    case "objets":
      return <Objets v={v} />;
    case "blocs":
      return <Blocs nombre={n(v.nombre)} />;
    case "abaque":
      return <Abaque v={v} />;
    case "droite":
      return <Droite v={v} />;
    case "barres":
      return <Barres v={v} />;
    case "fraction":
      return <Fraction v={v} />;
    case "grille":
      return <Grille v={v} />;
    case "figure":
      return <Figure v={v} />;
    case "horloge":
      return <Horloge h={n(v.h)} m={n(v.m)} numerique={!!v.numerique} />;
    case "monnaie":
      return <Monnaie valeurs={arr<number>(v.valeurs).map((x) => n(x))} />;
    case "graphe":
      return <Graphe v={v} />;
    case "diagramme":
      return <Diagramme v={v} />;
    case "tableau":
      return <Tableau v={v} />;
    case "motif":
      return (
        <div className="motif">
          {arr<string>(v.elements).map((e, i) => (
            <span key={i} className={s(e) === "?" ? "motif-q" : ""}>
              <Md text={s(e)} inline />
            </span>
          ))}
        </div>
      );
    case "balance":
      return <Balance v={v} />;
    case "arbre":
      return <Arbre v={v} />;
    case "solide":
      return <Solide forme={s(v.forme)} labels={v.labels as Any | undefined} />;
    case "image":
      return <img src={s(v.src)} alt={s(v.alt)} className="vis-img" loading="lazy" />;
  }
  throw new Error(`type « ${s(v.type)} » inconnu`);
}

// ---------- Objets (collections d'émojis) ----------
function Objets({ v }: { v: Any }) {
  // « groupes: [3, 2] » ou « nb_groupes: 4, par_groupe: 3 » (groupes égaux)
  const raw = v.par_groupe !== undefined ? Array.from({ length: Math.min(20, Math.round(n(v.nb_groupes, 1))) }, () => v.par_groupe) : arr<unknown>(v.groupes);
  const groups = raw.map((g) => Math.max(0, Math.min(120, Math.round(n(g)))));
  const emoji = s(v.emoji) || "🍎";
  const crossed = n(v.barres);
  const signe = s(v.signe);
  const total = groups.reduce((a, b) => a + b, 0);
  let idx = 0;
  const size = total > 60 ? "xs" : total > 30 ? "s" : total > 12 ? "m" : "l";
  return (
    <div className={`objets objets-${size}`}>
      {groups.map((g, gi) => (
        <div key={gi} className="objets-wrap">
          {gi > 0 && signe && <span className="objets-signe">{signe}</span>}
          <div className="objets-groupe">
            {Array.from({ length: g }, (_, i) => {
              idx++;
              const isCrossed = idx > total - crossed;
              return (
                <span key={i} className={`pop-in ${isCrossed ? "barre" : ""}`} style={{ animationDelay: `${Math.min(idx, 40) * 0.04}s` }}>
                  {emoji}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Blocs base 10 ----------
function Blocs({ nombre }: { nombre: number }) {
  const N = Math.max(0, Math.round(nombre));
  const m = Math.floor(N / 1000),
    c = Math.floor((N % 1000) / 100),
    d = Math.floor((N % 100) / 10),
    u = N % 10;
  const U = 9; // taille d'un petit cube
  const items: ReactNode[] = [];
  let x = 4;
  for (let i = 0; i < m; i++) {
    items.push(
      <g key={"m" + i} transform={`translate(${x},4)`}>
        <rect width={U * 10} height={U * 10} rx={4} fill="var(--c-rose)" stroke="var(--ink)" strokeWidth={1.5} />
        <text x={U * 5} y={U * 5 + 7} textAnchor="middle" fontSize={20} fontWeight={700} fill="var(--ink)">
          1000
        </text>
      </g>,
    );
    x += U * 10 + 10;
  }
  for (let i = 0; i < c; i++) {
    items.push(
      <g key={"c" + i} transform={`translate(${x},4)`}>
        {Array.from({ length: 100 }, (_, k) => (
          <rect key={k} x={(k % 10) * U} y={Math.floor(k / 10) * U} width={U} height={U} fill="var(--c-violet-l)" stroke="var(--c-violet)" strokeWidth={0.6} />
        ))}
      </g>,
    );
    x += U * 10 + 8;
  }
  for (let i = 0; i < d; i++) {
    items.push(
      <g key={"d" + i} transform={`translate(${x},4)`}>
        {Array.from({ length: 10 }, (_, k) => (
          <rect key={k} x={0} y={k * U} width={U} height={U} fill="var(--c-orange-l)" stroke="var(--c-orange)" strokeWidth={0.8} />
        ))}
      </g>,
    );
    x += U + 5;
  }
  if (d) x += 6;
  for (let i = 0; i < u; i++) {
    items.push(<rect key={"u" + i} x={x + (i % 2) * (U + 3)} y={4 + U * 10 - (Math.floor(i / 2) + 1) * (U + 3)} width={U} height={U} fill="var(--c-turquoise-l)" stroke="var(--c-turquoise)" strokeWidth={1} />);
  }
  if (u) x += 2 * (U + 3);
  const W = Math.max(x + 4, 60);
  return (
    <svg viewBox={`0 0 ${W} ${U * 10 + 8}`} className="svg-blocs" style={{ maxWidth: Math.min(W * 2.2, 640) }} role="img" aria-label={`${N} représenté en blocs`}>
      {items}
    </svg>
  );
}

// ---------- Tableau de numération ----------
const RANGS = ["unités", "dizaines", "centaines"];
const CLASSES = ["unités", "milliers", "millions", "milliards"];
function Abaque({ v }: { v: Any }) {
  const raw = n(v.nombre);
  const vide = !!v.vide;
  const [intStr, decStr = ""] = fmtNum(Math.abs(raw)).replace(/ /g, "").split(",");
  const decimals = Math.max(decStr.length, n(v.decimales));
  const nInt = Math.max(intStr.length, n(v.colonnes));
  const cols: { head: string; digit: string; cls: number }[] = [];
  for (let r = nInt - 1; r >= 0; r--) {
    const digit = intStr[intStr.length - 1 - r] ?? "";
    cols.push({ head: RANGS[r % 3], digit, cls: Math.floor(r / 3) });
  }
  const DEC = ["dixièmes", "centièmes", "millièmes"];
  for (let i = 0; i < decimals; i++) cols.push({ head: DEC[i] ?? `10⁻${i + 1}`, digit: decStr[i] ?? "0", cls: -1 });
  const showClasses = !!v.classes || nInt > 3;
  const groups: { cls: number; span: number }[] = [];
  for (const c of cols) {
    const last = groups.at(-1);
    if (last && last.cls === c.cls) last.span++;
    else groups.push({ cls: c.cls, span: 1 });
  }
  return (
    <div className="abaque-wrap">
      <table className="abaque">
        <thead>
          {showClasses && (
            <tr>
              {groups.map((g, i) => (
                <th key={i} colSpan={g.span} className={`cls cls-${g.cls < 0 ? "dec" : g.cls}`}>
                  {g.cls < 0 ? "partie décimale" : `classe des ${CLASSES[g.cls]}`}
                </th>
              ))}
            </tr>
          )}
          <tr>
            {cols.map((c, i) => (
              <th key={i} className={`rang r-${c.head}${c.cls < 0 && i > 0 && cols[i - 1].cls >= 0 ? " virgule" : ""}`}>
                {c.head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {cols.map((c, i) => (
              <td key={i} className={`r-${c.head}${c.cls < 0 && i > 0 && cols[i - 1].cls >= 0 ? " virgule" : ""}`}>
                {vide ? "" : c.digit}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---------- Droite graduée (aussi utilisée en mode interactif) ----------
export function Droite({ v, onPick, picked, reveal }: { v: Any; onPick?: (x: number) => void; picked?: number | null; reveal?: number | null }) {
  const min = n(v.min),
    max = n(v.max, 10),
    pas = n(v.pas, 1) || 1;
  const W = 640,
    H = 130,
    L = 30,
    R = W - 30,
    Y = 60;
  const { ref, f, px } = useSvgFont(W);
  const X = (x: number) => L + ((x - min) / (max - min || 1)) * (R - L);
  const ticks: number[] = [];
  const count = Math.round((max - min) / pas);
  for (let i = 0; i <= Math.min(count, 400); i++) ticks.push(min + i * pas);
  const et = v.etiquettes;
  const fracDen = n(v.fractions);
  const label = (x: number) => (fracDen ? fracStr(Math.round(x * fracDen), fracDen, !!v.simplifier, false) : fmtNum(x));
  // densité des étiquettes adaptée à la largeur réelle de l'écran (pas de chevauchement)
  const maxChars = Math.max(...ticks.map((x) => label(x).length), 1);
  const spacingPx = px > 0 ? (((R - L) / W) * px) / Math.max(1, ticks.length - 1) : 40;
  const every = Math.max(1, Math.ceil((10 + maxChars * 10) / spacingPx));
  const showLabel = (x: number, i: number) => {
    if (Array.isArray(et)) return et.some((e) => Math.abs(n(e) - x) < 1e-9);
    if (et === "bouts") return i === 0 || i === ticks.length - 1;
    if (et === "aucune") return false;
    if (et === "tout") return i % every === 0 || i === ticks.length - 1;
    return i % Math.max(every, ticks.length > 21 ? Math.ceil(ticks.length / 10) : 1) === 0 || i === ticks.length - 1;
  };
  const marques = arr<unknown>(v.marques).map((x) => n(x));
  const point = v.point as Any | undefined;
  const sauts = arr<Any>(v.sauts);
  const click = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPick) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const x = min + ((Math.min(R, Math.max(L, p.x)) - L) / (R - L)) * (max - min);
    onPick(x);
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} ref={ref} className={`svg-droite${onPick ? " pickable" : ""}`} onClick={click} role="img" aria-label={`droite graduée de ${min} à ${max}`}>
      {onPick && <rect x={0} y={0} width={W} height={H} fill="transparent" />}
      <line x1={L - 14} y1={Y} x2={R + 18} y2={Y} stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" />
      <path d={`M${R + 18} ${Y} l-10 -7 v14 z`} fill="var(--ink)" />
      {ticks.map((x, i) => {
        const big = Array.isArray(et) ? showLabel(x, i) : showLabel(x, i);
        return (
          <g key={i}>
            <line x1={X(x)} y1={Y - (big ? 12 : 7)} x2={X(x)} y2={Y + (big ? 12 : 7)} stroke="var(--ink)" strokeWidth={big ? 2.5 : 1.5} />
            {showLabel(x, i) && (
              <text x={X(x)} y={Y + 42} textAnchor="middle" fontSize={f(17)} fill="var(--ink)">
                {label(x)}
              </text>
            )}
          </g>
        );
      })}
      {sauts.map((sj, i) => {
        const a = X(n(sj.de)),
          b = X(n(sj.a));
        const h = Math.min(40, Math.abs(b - a) / 2 + 10);
        return (
          <g key={i}>
            <path className="anim-draw" style={{ animationDelay: `${0.3 + i * 0.9}s` }} pathLength={100} d={`M${a} ${Y - 6} Q ${(a + b) / 2} ${Y - 6 - h * 1.4} ${b} ${Y - 6}`} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={3} />
            <path className="anim-fade" style={{ animationDelay: `${0.9 + i * 0.9}s` }} d={`M${b} ${Y - 6} l${b > a ? -9 : 9} -5 l0 9 z`} fill={PALETTE[i % PALETTE.length]} />
            <text className="anim-fade" style={{ animationDelay: `${0.9 + i * 0.9}s` }} x={(a + b) / 2} y={Y - 12 - h * 0.75} textAnchor="middle" fontSize={f(16)} fontWeight={700} fill={PALETTE[i % PALETTE.length]}>
              {s(sj.label)}
            </text>
          </g>
        );
      })}
      {marques.map((x, i) => (
        <g key={i}>
          <circle cx={X(x)} cy={Y} r={8} fill="var(--c-orange)" stroke="#fff" strokeWidth={2} />
          <text x={X(x)} y={Y - 18} textAnchor="middle" fontSize={f(16)} fontWeight={700} fill="var(--c-orange-d)">
            {label(x)}
          </text>
        </g>
      ))}
      {point && (
        <g>
          <circle cx={X(n(point.v))} cy={Y} r={9} fill="var(--c-violet)" stroke="#fff" strokeWidth={2} />
          <text x={X(n(point.v))} y={Y - 18} textAnchor="middle" fontSize={f(17)} fontWeight={700} fill="var(--c-violet)">
            {s(point.label)}
          </text>
        </g>
      )}
      {picked != null && <path d={`M${X(picked)} ${Y - 4} l-9 -18 h18 z`} fill="var(--c-violet)" stroke="#fff" strokeWidth={1.5} />}
      {reveal != null && (
        <g>
          <circle cx={X(reveal)} cy={Y} r={9} fill="var(--ok)" stroke="#fff" strokeWidth={2} />
        </g>
      )}
    </svg>
  );
}

// ---------- Modèle en barres (méthode de Singapour) ----------
function Barres({ v }: { v: Any }) {
  const lignes = arr<Any>(v.lignes);
  const totals = lignes.map((l) => arr<Any>(l.parts).reduce((t, p) => t + Math.max(0, n(p.v, 1)), 0));
  const maxT = Math.max(...totals, 1);
  const labelW = lignes.some((l) => s(l.nom)) ? 110 : 10;
  const W = 640,
    barH = 44,
    gap = 30;
  const { ref, f } = useSvgFont(W);
  const top = v.total ? 46 : 12;
  const scale = (W - labelW - 70) / maxT;
  const H = top + lignes.length * (barH + gap) + (v.ecart ? 10 : 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} ref={ref} className="svg-barres" role="img" aria-label="modèle en barres">
      {!!v.total && (
        <g>
          <path
            d={`M${labelW} ${top - 6} q0 -14 14 -14 H${labelW + totals[0] * scale / 2 - 10} q10 0 10 -12 q0 12 10 12 H${labelW + totals[0] * scale - 14} q14 0 14 14`}
            fill="none"
            stroke="var(--c-violet)"
            strokeWidth={2.5}
          />
          <text x={labelW + (totals[0] * scale) / 2} y={14} textAnchor="middle" fontSize={f(18)} fontWeight={700} fill="var(--c-violet)">
            {s(v.total)}
          </text>
        </g>
      )}
      {lignes.map((l, li) => {
        let x = labelW;
        const y = top + li * (barH + gap);
        return (
          <g key={li}>
            {s(l.nom) && (
              <text x={labelW - 10} y={y + barH / 2 + 6} textAnchor="end" fontSize={f(17, 13)} fontWeight={600} fill="var(--ink)">
                {s(l.nom)}
              </text>
            )}
            {arr<Any>(l.parts).map((p, pi) => {
              const w = Math.max(0, n(p.v, 1)) * scale;
              const cx = x + w / 2;
              const el = (
                <g key={pi}>
                  <rect
                    className="anim-grow"
                    style={{ animationDelay: `${0.15 + (li * 3 + pi) * 0.25}s` }}
                    x={x}
                    y={y}
                    width={w}
                    height={barH}
                    rx={6}
                    fill={p.couleur ? s(p.couleur) : p.vide ? "transparent" : PALETTE[(li * 2 + pi) % PALETTE.length]}
                    fillOpacity={p.vide ? 1 : 0.35}
                    stroke="var(--ink)"
                    strokeWidth={2}
                    strokeDasharray={p.vide ? "6 5" : undefined}
                  />
                  <text x={cx} y={y + barH / 2 + 7} textAnchor="middle" fontSize={f(19, 14)} fontWeight={700} fill="var(--ink)">
                    {s(p.label)}
                  </text>
                </g>
              );
              x += w;
              return el;
            })}
          </g>
        );
      })}
      {!!v.ecart && lignes.length >= 2 && (
        (() => {
          const a = labelW + totals[0] * scale,
            b = labelW + totals[1] * scale;
          const y1 = top + barH / 2,
            y2 = top + (barH + gap) + barH / 2;
          const xm = Math.max(a, b) + 14;
          return (
            <g>
              <line x1={Math.min(a, b)} y1={a < b ? y1 : y2} x2={Math.max(a, b)} y2={a < b ? y1 : y2} stroke="var(--c-orange)" strokeWidth={2.5} strokeDasharray="6 4" />
              <path d={`M${xm} ${y1} q8 0 8 10 V${(y1 + y2) / 2 - 6} q0 6 8 6 q-8 0 -8 6 V${y2 - 10} q0 10 -8 10`} fill="none" stroke="var(--c-orange)" strokeWidth={2.5} />
              <text x={xm + 22} y={(y1 + y2) / 2 + 6} fontSize={f(18)} fontWeight={700} fill="var(--c-orange-d)">
                {s(v.ecart)}
              </text>
            </g>
          );
        })()
      )}
    </svg>
  );
}

// ---------- Fractions ----------
function Fraction({ v }: { v: Any }) {
  const N = Math.max(0, Math.round(n(v.n))),
    D = Math.max(1, Math.round(n(v.d, 1)));
  const forme = s(v.forme) || "disque";
  const wholes = Math.max(1, Math.ceil(N / D), Math.round(n(v.nombre, 1)));
  const items: ReactNode[] = [];
  for (let w = 0; w < wholes; w++) {
    const filled = Math.max(0, Math.min(D, N - w * D));
    if (forme === "disque") {
      const r = 46,
        cx = 52 + w * 110,
        cy = 52;
      for (let k = 0; k < D; k++) {
        const a0 = (k / D) * 2 * Math.PI - Math.PI / 2,
          a1 = ((k + 1) / D) * 2 * Math.PI - Math.PI / 2;
        const p =
          D === 1
            ? `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`
            : `M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
        items.push(<path key={`${w}-${k}`} className={k < filled ? "anim-fill" : ""} style={{ animationDelay: `${(w * D + k) * 0.12}s` }} d={p} fill={k < filled ? "var(--c-orange)" : "var(--paper)"} stroke="var(--ink)" strokeWidth={2} />);
      }
    } else {
      const bw = forme === "barre" ? 300 : 200,
        bh = forme === "barre" ? 44 : 110;
      const y0 = 8 + w * (bh + 14);
      for (let k = 0; k < D; k++)
        items.push(
          <rect key={`${w}-${k}`} className={k < filled ? "anim-fill" : ""} style={{ animationDelay: `${(w * D + k) * 0.12}s` }} x={8 + (k * bw) / D} y={y0} width={bw / D} height={bh} fill={k < filled ? "var(--c-turquoise)" : "var(--paper)"} stroke="var(--ink)" strokeWidth={2} />,
        );
    }
  }
  const W = forme === "disque" ? wholes * 110 : forme === "barre" ? 316 : 216;
  const H = forme === "disque" ? 106 : wholes * ((forme === "barre" ? 44 : 110) + 14) + 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="svg-fraction" style={{ maxWidth: W * 1.6 }} role="img" aria-label={`fraction ${N} sur ${D}`}>
      {items}
    </svg>
  );
}

// ---------- Quadrillage de points (multiplication) ----------
function Grille({ v }: { v: Any }) {
  const L = Math.min(20, Math.round(n(v.lignes, 3))),
    C = Math.min(20, Math.round(n(v.colonnes, 4)));
  const e = s(v.emoji);
  const cell = 30;
  return (
    <div className="grille-wrap">
      <svg viewBox={`0 0 ${C * cell + 10} ${L * cell + 10}`} className="svg-grille" style={{ maxWidth: Math.min(560, C * cell * 1.5) }} role="img" aria-label={`${L} rangées de ${C}`}>
        {Array.from({ length: L * C }, (_, k) => {
          const x = 5 + (k % C) * cell + cell / 2,
            y = 5 + Math.floor(k / C) * cell + cell / 2;
          return e ? (
            <text key={k} x={x} y={y + 8} textAnchor="middle" fontSize={22}>
              {e}
            </text>
          ) : (
            <circle key={k} cx={x} cy={y} r={10} fill={PALETTE[Math.floor(k / C) % 3]} />
          );
        })}
      </svg>
      {v.legende !== false && (
        <div className="grille-leg">
          {L} rangées de {C}
        </div>
      )}
    </div>
  );
}

// ---------- Figures géométriques ----------
type Pt = [number, number];
function Figure({ v }: { v: Any }) {
  const pts: Record<string, Pt> = {};
  const segs: { a: string; b: string; label?: string; pointille?: boolean }[] = [];
  const polys: string[][] = [];
  const rights: string[][] = [];
  const cercles: { c: Pt; r: number; label?: string }[] = [];
  const unite = s(v.unite);
  const L = (x: unknown) => (x === undefined || x === "" ? undefined : `${s(x)}${unite && /^[\d.,\s]+$/.test(s(x)) ? " " + unite : ""}`);
  const forme = s(v.forme);
  if (forme === "rectangle" || forme === "carre") {
    const a = n(v.longueur ?? v.cote, 4),
      b = forme === "carre" ? a : n(v.largeur, 2);
    Object.assign(pts, { A: [0, 0], B: [a, 0], C: [a, b], D: [0, b] });
    polys.push(["A", "B", "C", "D"]);
    segs.push({ a: "A", b: "B", label: L(v.label_longueur ?? (v.cotes === false ? undefined : fmtNum(a))) }, { a: "B", b: "C", label: L(v.label_largeur ?? (v.cotes === false || forme === "carre" ? undefined : fmtNum(b))) });
    rights.push(["D", "A", "B"], ["A", "B", "C"], ["B", "C", "D"], ["C", "D", "A"]);
  } else if (forme === "triangle-rectangle") {
    const a = n(v.a, 3),
      b = n(v.b, 4);
    Object.assign(pts, { A: [0, 0], B: [b, 0], C: [0, a] });
    polys.push(["A", "B", "C"]);
    segs.push({ a: "A", b: "C", label: L(v.label_a ?? fmtNum(a)) }, { a: "A", b: "B", label: L(v.label_b ?? fmtNum(b)) }, { a: "B", b: "C", label: L(v.label_c) });
    rights.push(["C", "A", "B"]);
  } else if (forme === "cercle") {
    const r = n(v.r, 3);
    Object.assign(pts, { O: [0, 0], M: [r, 0] });
    cercles.push({ c: [0, 0], r });
    segs.push({ a: "O", b: "M", label: L(v.label_r ?? fmtNum(r)) });
  }
  for (const [k, p] of Object.entries((v.points as Record<string, unknown[]>) ?? {})) pts[k] = [n(p[0]), n(p[1])];
  for (const sg of arr<unknown[]>(v.segments)) segs.push({ a: s(sg[0]), b: s(sg[1]), label: sg[2] !== undefined ? s(sg[2]) : undefined, pointille: !!sg[3] });
  for (const p of arr<string[]>(v.polygones)) polys.push(p.map(s));
  for (const r of arr<string[]>(v.angles_droits)) rights.push(r.map(s));
  for (const c of arr<Any>(v.cercles)) cercles.push({ c: typeof c.centre === "string" ? pts[c.centre] : (arr<number>(c.centre).map((x) => n(x)) as Pt), r: n(c.r, 1), label: c.label ? s(c.label) : undefined });
  const all: Pt[] = [...Object.values(pts), ...cercles.flatMap((c) => [[c.c[0] - c.r, c.c[1] - c.r] as Pt, [c.c[0] + c.r, c.c[1] + c.r] as Pt])];
  if (!all.length) throw new Error("figure vide");
  const xs = all.map((p) => p[0]),
    ys = all.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const k = 260 / span;
  const pad = 46;
  const W = (maxX - minX) * k + 2 * pad,
    H = (maxY - minY) * k + 2 * pad;
  const P = (p: Pt): Pt => [pad + (p[0] - minX) * k, pad + (maxY - p[1]) * k];
  const cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2;
  const { ref, f } = useSvgFont(W);
  const showNames = v.noms !== false && forme !== "rectangle" && forme !== "carre" ? true : v.noms === true;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} ref={ref} className="svg-figure" style={{ maxWidth: Math.min(520, W * 1.5) }} role="img" aria-label="figure géométrique">
      {polys.map((poly, i) => (
        <polygon key={i} points={poly.map((q) => P(pts[q]).join(",")).join(" ")} fill={i === 0 ? "var(--c-turquoise-l)" : "var(--c-jaune-l)"} fillOpacity={0.6} stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
      ))}
      {cercles.map((c, i) => {
        const [x, y] = P(c.c);
        return <circle key={i} cx={x} cy={y} r={c.r * k} fill="var(--c-violet-l)" fillOpacity={0.4} stroke="var(--ink)" strokeWidth={2.5} />;
      })}
      {segs.map((sg, i) => {
        if (!pts[sg.a] || !pts[sg.b]) return null;
        const [x1, y1] = P(pts[sg.a]),
          [x2, y2] = P(pts[sg.b]);
        const mx = (x1 + x2) / 2,
          my = (y1 + y2) / 2;
        // étiquette poussée vers l'extérieur de la figure
        const [ccx, ccy] = P([cx, cy]);
        let nx = -(y2 - y1),
          ny = x2 - x1;
        const len = Math.hypot(nx, ny) || 1;
        nx /= len;
        ny /= len;
        if ((mx - ccx) * nx + (my - ccy) * ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink)" strokeWidth={2.5} strokeDasharray={sg.pointille ? "7 5" : undefined} />
            {sg.label && (
              <text x={mx + nx * 20} y={my + ny * 20 + 6} textAnchor="middle" fontSize={f(17)} fontWeight={700} fill="var(--c-violet)">
                {sg.label}
              </text>
            )}
          </g>
        );
      })}
      {rights.map(([a, b, c], i) => {
        if (!pts[a] || !pts[b] || !pts[c]) return null;
        const B = P(pts[b]),
          A = P(pts[a]),
          C = P(pts[c]);
        const u = (p: Pt): Pt => {
          const d = Math.hypot(p[0] - B[0], p[1] - B[1]) || 1;
          return [((p[0] - B[0]) / d) * 14, ((p[1] - B[1]) / d) * 14];
        };
        const ua = u(A),
          uc = u(C);
        return <path key={i} d={`M${B[0] + ua[0]} ${B[1] + ua[1]} l${uc[0]} ${uc[1]} l${-ua[0]} ${-ua[1]}`} fill="none" stroke="var(--c-orange-d)" strokeWidth={2} />;
      })}
      {showNames &&
        Object.entries(pts).map(([name, p]) => {
          const [x, y] = P(p);
          const [ccx, ccy] = P([cx, cy]);
          const d = Math.hypot(x - ccx, y - ccy) || 1;
          return (
            <g key={name}>
              <circle cx={x} cy={y} r={3.5} fill="var(--ink)" />
              <text x={x + ((x - ccx) / d) * 18} y={y + ((y - ccy) / d) * 18 + 6} textAnchor="middle" fontSize={f(18)} fontWeight={700} fill="var(--ink)">
                {name}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

// ---------- Horloge ----------
function Horloge({ h, m, numerique }: { h: number; m: number; numerique: boolean }) {
  const R = 90;
  const ah = (((h % 12) + m / 60) / 12) * 2 * Math.PI,
    am = (m / 60) * 2 * Math.PI;
  return (
    <div className="horloge-wrap">
      <svg viewBox="-100 -100 200 200" className="svg-horloge" role="img" aria-label="horloge">
        <circle r={R} fill="var(--paper)" stroke="var(--c-violet)" strokeWidth={6} />
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * 2 * Math.PI;
          const big = i % 5 === 0;
          return <line key={i} x1={Math.sin(a) * (R - (big ? 12 : 6))} y1={-Math.cos(a) * (R - (big ? 12 : 6))} x2={Math.sin(a) * (R - 2)} y2={-Math.cos(a) * (R - 2)} stroke="var(--ink)" strokeWidth={big ? 3 : 1} />;
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const a = ((i + 1) / 12) * 2 * Math.PI;
          return (
            <text key={i} x={Math.sin(a) * (R - 26)} y={-Math.cos(a) * (R - 26) + 7} textAnchor="middle" fontSize={19} fontWeight={700} fill="var(--ink)">
              {i + 1}
            </text>
          );
        })}
        <line x1={0} y1={0} x2={Math.sin(ah) * 46} y2={-Math.cos(ah) * 46} stroke="var(--c-orange)" strokeWidth={8} strokeLinecap="round" />
        <line x1={0} y1={0} x2={Math.sin(am) * 70} y2={-Math.cos(am) * 70} stroke="var(--c-violet)" strokeWidth={5} strokeLinecap="round" />
        <circle r={6} fill="var(--ink)" />
      </svg>
      {numerique && (
        <div className="horloge-num">
          {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
        </div>
      )}
    </div>
  );
}

// ---------- Monnaie (euros) ----------
function Monnaie({ valeurs }: { valeurs: number[] }) {
  return (
    <div className="monnaie">
      {valeurs.map((v, i) =>
        v >= 5 ? (
          <span key={i} className={`billet b${v}`}>
            {v} €
          </span>
        ) : (
          <span key={i} className={`piece ${v >= 1 ? "bimetal" : v >= 0.1 ? "or" : "cuivre"}`}>
            {v >= 1 ? `${v} €` : `${Math.round(v * 100)} c`}
          </span>
        ),
      )}
    </div>
  );
}

// ---------- Graphique de fonctions / repère ----------
function compile(f: string): Node | null {
  try {
    return parse(f, { implicitMul: true });
  } catch {
    return null;
  }
}
function Graphe({ v }: { v: Any }) {
  const xmin = n(v.xmin, -5),
    xmax = n(v.xmax, 5),
    ymin = n(v.ymin, -5),
    ymax = n(v.ymax, 5);
  const W = 520,
    H = Math.round((W * Math.min(1.2, Math.max(0.5, (ymax - ymin) / (xmax - xmin)))) / 1),
    pad = 28;
  const { ref, f } = useSvgFont(W);
  const X = (x: number) => pad + ((x - xmin) / (xmax - xmin)) * (W - 2 * pad);
  const Y = (y: number) => H - pad - ((y - ymin) / (ymax - ymin)) * (H - 2 * pad);
  const fns = useMemo(() => arr<Any>(v.fonctions).map((f) => ({ ...f, node: compile(s(f.f)) }) as Any & { node: Node | null }), [v.fonctions]);
  const stepX = n(v.pas_x, niceStep(xmax - xmin)),
    stepY = n(v.pas_y, niceStep(ymax - ymin));
  const grid: ReactNode[] = [];
  if (v.grille !== false) {
    for (let x = Math.ceil(xmin / stepX) * stepX; x <= xmax + 1e-9; x += stepX) grid.push(<line key={"gx" + x} x1={X(x)} y1={Y(ymin)} x2={X(x)} y2={Y(ymax)} stroke="var(--grid)" strokeWidth={1} />);
    for (let y = Math.ceil(ymin / stepY) * stepY; y <= ymax + 1e-9; y += stepY) grid.push(<line key={"gy" + y} x1={X(xmin)} y1={Y(y)} x2={X(xmax)} y2={Y(y)} stroke="var(--grid)" strokeWidth={1} />);
  }
  const labels: ReactNode[] = [];
  for (let x = Math.ceil(xmin / stepX) * stepX; x <= xmax + 1e-9; x += stepX)
    if (Math.abs(x) > 1e-9)
      labels.push(
        <text key={"lx" + x} x={X(x)} y={Math.min(H - 6, Math.max(14, Y(0) + 17))} textAnchor="middle" fontSize={f(12, 13)} fill="var(--muted)">
          {fmtNum(Math.round(x * 1000) / 1000)}
        </text>,
      );
  for (let y = Math.ceil(ymin / stepY) * stepY; y <= ymax + 1e-9; y += stepY)
    if (Math.abs(y) > 1e-9)
      labels.push(
        <text key={"ly" + y} x={Math.max(14, Math.min(W - 8, X(0) - 6))} y={Y(y) + 4} textAnchor="end" fontSize={f(12, 13)} fill="var(--muted)">
          {fmtNum(Math.round(y * 1000) / 1000)}
        </text>,
      );
  const curve = (node: Node, de: number, a: number) => {
    let d = "";
    let pen = false;
    const N = 400;
    for (let i = 0; i <= N; i++) {
      const x = de + ((a - de) * i) / N;
      let y: number;
      try {
        y = toNumber(evaluate(node, { vars: { x } }));
      } catch {
        y = NaN;
      }
      if (!isFinite(y) || y < ymin - (ymax - ymin) || y > ymax + (ymax - ymin)) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${X(x).toFixed(1)} ${Y(Math.max(ymin - 1, Math.min(ymax + 1, y))).toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  const aire = v.aire as Any | undefined;
  const aireNode = aire ? compile(s(aire.f)) : null;
  let aireD = "";
  if (aire && aireNode) {
    const de = n(aire.de),
      a = n(aire.a);
    aireD = `M${X(de)} ${Y(0)}`;
    for (let i = 0; i <= 120; i++) {
      const x = de + ((a - de) * i) / 120;
      const y = toNumber(evaluate(aireNode, { vars: { x } }));
      aireD += `L${X(x)} ${Y(Math.max(ymin, Math.min(ymax, y)))}`;
    }
    aireD += `L${X(a)} ${Y(0)}Z`;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} ref={ref} className="svg-graphe" role="img" aria-label="graphique dans un repère">
      <defs>
        <clipPath id="zone">
          <rect x={pad} y={pad - 4} width={W - 2 * pad} height={H - 2 * pad + 8} />
        </clipPath>
      </defs>
      {grid}
      {ymin <= 0 && ymax >= 0 && <line x1={X(xmin)} y1={Y(0)} x2={X(xmax)} y2={Y(0)} stroke="var(--ink)" strokeWidth={2} />}
      {xmin <= 0 && xmax >= 0 && <line x1={X(0)} y1={Y(ymin)} x2={X(0)} y2={Y(ymax)} stroke="var(--ink)" strokeWidth={2} />}
      {labels}
      {xmin <= 0 && xmax >= 0 && ymin <= 0 && ymax >= 0 && (
        <text x={X(0) - 6} y={Y(0) + 16} textAnchor="end" fontSize={f(12, 13)} fill="var(--muted)">
          0
        </text>
      )}
      {aireD && <path d={aireD} fill="var(--c-jaune)" fillOpacity={0.45} clipPath="url(#zone)" />}
      <g clipPath="url(#zone)">
        {fns.map((f, i) =>
          f.node ? <path key={i} d={curve(f.node, n(f.de, xmin), n(f.a, xmax))} fill="none" stroke={s(f.couleur) || PALETTE[i % PALETTE.length]} strokeWidth={3.5} strokeLinejoin="round" /> : null,
        )}
      </g>
      {fns.map((f, i) =>
        f.nom ? (
          <text key={"n" + i} x={W - pad - 4} y={pad + 18 + i * 20} textAnchor="end" fontSize={15} fontWeight={700} fill={s(f.couleur) || PALETTE[i % PALETTE.length]}>
            {s(f.nom)}
          </text>
        ) : null,
      )}
      {arr<Any>(v.segments).map((sg, i) => (
        <line key={"s" + i} x1={X(n(sg.x1))} y1={Y(n(sg.y1))} x2={X(n(sg.x2))} y2={Y(n(sg.y2))} stroke={s(sg.couleur) || "var(--c-orange)"} strokeWidth={2.5} strokeDasharray={sg.pointille ? "6 4" : undefined} />
      ))}
      {arr<Any>(v.points).map((p, i) => (
        <g key={"p" + i}>
          <circle cx={X(n(p.x))} cy={Y(n(p.y))} r={6} fill={s(p.couleur) || "var(--c-orange)"} stroke="#fff" strokeWidth={2} />
          {p.label !== undefined && (
            <text x={X(n(p.x)) + 9} y={Y(n(p.y)) - 9} fontSize={f(15, 14)} fontWeight={700} fill="var(--ink)">
              {s(p.label)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
function niceStep(range: number) {
  const raw = range / 10;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

// ---------- Diagramme en bâtons ----------
function Diagramme({ v }: { v: Any }) {
  const bars = arr<Any>(v.barres);
  const max = n(v.max, Math.max(...bars.map((b) => n(b.v)), 1));
  const W = 520,
    H = 260,
    pad = 40,
    bw = Math.min(70, (W - 2 * pad) / bars.length - 14);
  const { ref, f } = useSvgFont(W);
  const step = niceStep(max) * 2;
  const ticks: number[] = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(t);
  const Y = (y: number) => H - pad - (y / max) * (H - 2 * pad);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} ref={ref} className="svg-diagramme" role="img" aria-label="diagramme en barres">
      {!!v.titre && (
        <text x={W / 2} y={18} textAnchor="middle" fontSize={f(16, 14)} fontWeight={700} fill="var(--ink)">
          {s(v.titre)}
        </text>
      )}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad} y1={Y(t)} x2={W - 10} y2={Y(t)} stroke="var(--grid)" />
          <text x={pad - 6} y={Y(t) + 4} textAnchor="end" fontSize={f(12, 13)} fill="var(--muted)">
            {fmtNum(t)}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const x = pad + 10 + i * ((W - 2 * pad) / bars.length);
        return (
          <g key={i}>
            <rect className="anim-grow-up" style={{ animationDelay: `${i * 0.15}s` }} x={x} y={Y(n(b.v))} width={bw} height={Y(0) - Y(n(b.v))} rx={5} fill={PALETTE[i % PALETTE.length]} />
            <text x={x + bw / 2} y={Y(n(b.v)) - 6} textAnchor="middle" fontSize={f(14)} fontWeight={700} fill="var(--ink)">
              {v.valeurs === false ? "" : fmtNum(n(b.v))}
            </text>
            <text x={x + bw / 2} y={H - pad + 18} textAnchor="middle" fontSize={f(13, 13)} fill="var(--ink)">
              {s(b.label)}
            </text>
          </g>
        );
      })}
      <line x1={pad} y1={Y(0)} x2={W - 10} y2={Y(0)} stroke="var(--ink)" strokeWidth={2} />
    </svg>
  );
}

// ---------- Tableau ----------
function Tableau({ v }: { v: Any }) {
  const rows = arr<unknown[]>(v.lignes);
  const head = v.entete !== false;
  const colHead = !!v.colonne_entete;
  return (
    <div className="table-wrap">
      <table className="tableau">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {arr<unknown>(r).map((c, j) => {
                const Tag = (head && i === 0) || (colHead && j === 0) ? "th" : "td";
                return (
                  <Tag key={j}>
                    <Md text={s(c)} inline />
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Balance (équations) ----------
function Balance({ v }: { v: Any }) {
  const side = (x: unknown) => (Array.isArray(x) ? x.map(s) : [s(x)]);
  const g = side(v.gauche),
    d = side(v.droite);
  const tilt = s(v.penche) === "gauche" ? -8 : s(v.penche) === "droite" ? 8 : 0;
  const plate = (items: string[], cx: number, cy: number) => (
    <g>
      <path d={`M${cx - 80} ${cy} q80 34 160 0`} fill="var(--c-jaune-l)" stroke="var(--ink)" strokeWidth={2.5} />
      {items.map((it, i) => {
        const w = Math.max(30, it.length * 11 + 14);
        const total = items.reduce((t, x) => t + Math.max(30, x.length * 11 + 14) + 4, -4);
        let x0 = cx - total / 2;
        for (let k = 0; k < i; k++) x0 += Math.max(30, items[k].length * 11 + 14) + 4;
        const isX = /[a-z]/i.test(it);
        return (
          <g key={i}>
            <rect x={x0} y={cy - 36} width={w} height={34} rx={7} fill={isX ? "var(--c-violet)" : "var(--c-orange)"} stroke="var(--ink)" strokeWidth={1.5} />
            <text x={x0 + w / 2} y={cy - 13} textAnchor="middle" fontSize={18} fontWeight={700} fill="#fff">
              {it}
            </text>
          </g>
        );
      })}
    </g>
  );
  return (
    <svg viewBox="0 0 520 230" className="svg-balance" role="img" aria-label={`balance : ${g.join(" + ")} et ${d.join(" + ")}`}>
      <path d="M240 215 h40 l-10 -30 h-20 z" fill="var(--c-violet-d)" />
      <line x1={260} y1={190} x2={260} y2={70} stroke="var(--c-violet-d)" strokeWidth={8} />
      <g transform={`rotate(${tilt} 260 70)`}>
        <line x1={110} y1={70} x2={410} y2={70} stroke="var(--c-violet-d)" strokeWidth={7} strokeLinecap="round" />
        <line x1={110} y1={70} x2={110} y2={140} stroke="var(--muted)" strokeWidth={2} />
        <line x1={410} y1={70} x2={410} y2={140} stroke="var(--muted)" strokeWidth={2} />
        {plate(g, 110, 140)}
        {plate(d, 410, 140)}
      </g>
      <circle cx={260} cy={70} r={9} fill="var(--c-jaune)" stroke="var(--ink)" strokeWidth={2} />
    </svg>
  );
}

// ---------- Arbre de probabilités ----------
interface Branche {
  label: string;
  p?: string;
  enfants?: Branche[];
}
function Arbre({ v }: { v: Any }) {
  const root = arr<Branche>(v.branches);
  const leaves = (b: Branche[]): number => b.reduce((t, x) => t + (x.enfants?.length ? leaves(x.enfants) : 1), 0);
  const depth = (b: Branche[]): number => 1 + Math.max(0, ...b.map((x) => (x.enfants?.length ? depth(x.enfants) : 0)));
  const L = leaves(root),
    D = depth(root);
  const W = 140 + D * 170,
    H = Math.max(120, L * 46 + 20);
  const { ref, f } = useSvgFont(W);
  const nodes: ReactNode[] = [];
  let leafIdx = 0;
  const place = (bs: Branche[], x0: number, y0: number, level: number): void => {
    for (const b of bs) {
      const sub = b.enfants?.length ? leaves(b.enfants) : 1;
      const yTop = 10 + leafIdx * 46;
      const y = yTop + (sub * 46) / 2 - 10;
      const x = 40 + level * 170 + 130;
      nodes.push(
        <g key={`${level}-${leafIdx}-${b.label}`}>
          <line x1={x0} y1={y0} x2={x - 18} y2={y} stroke="var(--ink)" strokeWidth={2} />
          {b.p !== undefined && (
            <text x={(x0 + x) / 2 - 6} y={(y0 + y) / 2 - 6} textAnchor="middle" fontSize={f(14)} fontWeight={700} fill="var(--c-violet)">
              {s(b.p)}
            </text>
          )}
          <text x={x} y={y + 5} fontSize={f(16)} fontWeight={700} fill="var(--ink)">
            {s(b.label)}
          </text>
        </g>,
      );
      if (b.enfants?.length) place(b.enfants, x + Math.max(20, s(b.label).length * 9) + 6, y, level + 1);
      else leafIdx++;
    }
  };
  place(root, 30, H / 2, 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} ref={ref} className="svg-arbre" role="img" aria-label="arbre de probabilités">
      <circle cx={26} cy={H / 2} r={5} fill="var(--ink)" />
      {nodes}
    </svg>
  );
}

// ---------- Solides ----------
function Solide({ forme, labels }: { forme: string; labels?: Any }) {
  const st = { fill: "var(--c-turquoise-l)", stroke: "var(--ink)", strokeWidth: 2.5, strokeLinejoin: "round" as const };
  const hid = { fill: "none", stroke: "var(--ink)", strokeWidth: 1.5, strokeDasharray: "6 5" };
  const lab = (x: number, y: number, k: string) =>
    labels?.[k] !== undefined ? (
      <text x={x} y={y} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--c-violet)">
        {s(labels[k])}
      </text>
    ) : null;
  let body: ReactNode;
  switch (forme) {
    case "cube":
    case "pave": {
      const w = forme === "cube" ? 110 : 170,
        h = 110,
        dx = 50,
        dy = -40;
      body = (
        <g transform="translate(40,80)">
          <path d={`M0 0 h${w} v${h} h${-w} z`} {...st} />
          <path d={`M0 0 l${dx} ${dy} h${w} l${-dx} ${-dy} z`} {...st} fill="var(--c-turquoise)" />
          <path d={`M${w} 0 l${dx} ${dy} v${h} l${-dx} ${-dy} z`} {...st} fill="var(--c-turquoise)" fillOpacity={0.6} />
          <path d={`M0 ${h} l${dx} ${dy} h${w} M${dx} ${h + dy} v${-h}`} {...hid} />
          {lab(w / 2, h + 22, "longueur")}
          {lab(w + dx + 30, h / 2 + dy / 2, "hauteur")}
          {lab(w + dx / 2 + 18, h - dy / 2 + 4, "largeur")}
        </g>
      );
      break;
    }
    case "cylindre":
      body = (
        <g transform="translate(150,50)">
          <path d="M-70 0 v140 a70 22 0 0 0 140 0 v-140" {...st} />
          <ellipse cx={0} cy={0} rx={70} ry={22} {...st} fill="var(--c-turquoise)" />
          <path d="M-70 140 a70 22 0 0 1 140 0" {...hid} />
          <line x1={0} y1={0} x2={70} y2={0} stroke="var(--c-orange-d)" strokeWidth={2} />
          {lab(35, -6, "rayon")}
          {lab(98, 76, "hauteur")}
        </g>
      );
      break;
    case "cone":
      body = (
        <g transform="translate(150,30)">
          <path d="M0 0 L-75 160 a75 22 0 0 0 150 0 Z" {...st} />
          <path d="M-75 160 a75 22 0 0 1 150 0" {...hid} />
          <line x1={0} y1={0} x2={0} y2={160} {...hid} />
          <line x1={0} y1={160} x2={75} y2={160} stroke="var(--c-orange-d)" strokeWidth={2} />
          {lab(38, 154, "rayon")}
          {lab(-16, 96, "hauteur")}
        </g>
      );
      break;
    case "sphere":
      body = (
        <g transform="translate(150,110)">
          <circle r={90} {...st} />
          <path d="M-90 0 a90 26 0 0 0 180 0" fill="none" stroke="var(--ink)" strokeWidth={2} />
          <path d="M-90 0 a90 26 0 0 1 180 0" {...hid} />
          <line x1={0} y1={0} x2={90} y2={0} stroke="var(--c-orange-d)" strokeWidth={2} />
          {lab(45, -8, "rayon")}
        </g>
      );
      break;
    case "pyramide":
      body = (
        <g transform="translate(60,40)">
          <path d="M100 0 L0 150 L130 170 Z" {...st} />
          <path d="M100 0 L130 170 L200 140 Z" {...st} fill="var(--c-turquoise)" />
          <path d="M0 150 L70 120 L200 140 M70 120 L100 0" {...hid} />
        </g>
      );
      break;
    default:
      body = (
        <g transform="translate(40,50)">
          <path d="M0 40 L60 0 L120 40 L120 140 L60 180 L0 140 Z" {...st} />
        </g>
      );
  }
  return (
    <svg viewBox="0 0 320 230" className="svg-solide" role="img" aria-label={forme}>
      {body}
    </svg>
  );
}
