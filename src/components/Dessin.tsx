import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { dbGet, dbSet } from "../lib/db";
import { activeChild } from "../lib/store";

// Outil de dessin de l'Atelier de Lya (bible §32) : une toile tactile (doigt, souris, stylet
// avec pression), des guides en pointillés étape par étape, annuler, gomme, couleurs,
// symétrie miroir. Le trait n'est jamais « noté » : on vérifie seulement, avec tolérance,
// que l'enfant a suivi le guide, et on l'encourage.

export const PALETTE = ["#2b2540", "#e63946", "#f4a261", "#ffd23f", "#2a9d8f", "#3a86ff", "#8338ec", "#ff70a6", "#8d5524", "#ffffff"];

interface Stroke {
  pts: [number, number, number][]; // x, y en unités 0–100, pression 0–1
  color: string;
  size: number;
  erase: boolean;
  mirror: boolean;
}
export interface Guide {
  d: string;
  etat: "fait" | "actuel";
}
export interface ToileApi {
  png: () => string;
  couverture: (d: string) => number;
  effacer: () => void;
  vide: () => boolean;
}

/** Proportion des points du guide qu'un trait de l'enfant approche (à `tol` unités près). */
function couverture(d: string, strokes: Stroke[], tol = 7): number {
  if (!d || typeof document === "undefined") return 1;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", d);
  svg.appendChild(p);
  svg.style.position = "absolute";
  svg.style.visibility = "hidden";
  document.body.appendChild(svg);
  try {
    const L = p.getTotalLength();
    if (!L) return 1;
    const pts = strokes.filter((s) => !s.erase).flatMap((s) => (s.mirror ? [...s.pts, ...s.pts.map(([x, y, q]) => [100 - x, y, q] as [number, number, number])] : s.pts));
    if (!pts.length) return 0;
    const N = Math.max(12, Math.round(L / 3));
    let ok = 0;
    for (let i = 0; i <= N; i++) {
      const q = p.getPointAtLength((L * i) / N);
      if (pts.some(([x, y]) => (x - q.x) ** 2 + (y - q.y) ** 2 <= tol * tol)) ok++;
    }
    return ok / (N + 1);
  } finally {
    svg.remove();
  }
}

export const Toile = forwardRef<ToileApi, { guides?: Guide[]; miroir?: boolean; outils?: boolean; fond?: string }>(function Toile({ guides = [], miroir: miroirInit = false, outils = true, fond }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState(PALETTE[0]);
  const [size, setSize] = useState(2.2);
  const [erase, setErase] = useState(false);
  const [miroir, setMiroir] = useState(miroirInit);
  const cur = useRef<Stroke | null>(null);
  const [, force] = useState(0);

  const draw = () => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const k = c.width / 100;
    ctx.clearRect(0, 0, c.width, c.height);
    const all = cur.current ? [...strokes, cur.current] : strokes;
    for (const s of all) {
      const passes = s.mirror ? [false, true] : [false];
      for (const flip of passes) {
        ctx.save();
        ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
        ctx.strokeStyle = s.color;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = 1; i < s.pts.length; i++) {
          const [x0, y0] = s.pts[i - 1];
          const [x1, y1, pr] = s.pts[i];
          ctx.lineWidth = (s.erase ? s.size * 3 : s.size) * k * (0.6 + 0.8 * pr);
          ctx.beginPath();
          ctx.moveTo((flip ? 100 - x0 : x0) * k, y0 * k);
          ctx.lineTo((flip ? 100 - x1 : x1) * k, y1 * k);
          ctx.stroke();
        }
        if (s.pts.length === 1) {
          const [x, y] = s.pts[0];
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc((flip ? 100 - x : x) * k, y * k, (s.size * k) / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  };
  useEffect(draw);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const fit = () => {
      const w = c.getBoundingClientRect().width;
      const px = Math.round(w * Math.min(2, window.devicePixelRatio || 1));
      if (px && c.width !== px) {
        c.width = px;
        c.height = px;
        draw();
      }
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(c);
    return () => ro?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent): [number, number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    const pr = e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5;
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100, pr];
  };

  useImperativeHandle(ref, () => ({
    png: () => {
      const c = canvas.current!;
      const out = document.createElement("canvas");
      out.width = c.width;
      out.height = c.height;
      const ctx = out.getContext("2d")!;
      ctx.fillStyle = "#fffdf7";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(c, 0, 0);
      return out.toDataURL("image/webp", 0.85);
    },
    couverture: (d: string) => couverture(d, strokes),
    effacer: () => setStrokes([]),
    vide: () => !strokes.some((s) => !s.erase),
  }));

  return (
    <div className="toile">
      <div className="toile-zone" style={fond ? { backgroundImage: `url(${fond})` } : undefined}>
        <svg viewBox="0 0 100 100" className="toile-guides" aria-hidden>
          {miroir && <line x1={50} x2={50} y1={0} y2={100} className="g-axe" />}
          {guides.map((g, i) => (
            <path key={i} d={g.d} className={`g-${g.etat}`} />
          ))}
        </svg>
        <canvas
          ref={canvas}
          className="toile-canvas"
          aria-label="Zone de dessin"
          onPointerDown={(e) => {
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
            cur.current = { pts: [pos(e)], color, size, erase, mirror: miroir };
            force((x) => x + 1);
          }}
          onPointerMove={(e) => {
            if (!cur.current) return;
            cur.current.pts.push(pos(e));
            draw();
          }}
          onPointerUp={() => {
            if (cur.current) setStrokes((s) => [...s, cur.current!]);
            cur.current = null;
          }}
          onPointerCancel={() => {
            cur.current = null;
            draw();
          }}
        />
      </div>
      {outils && (
        <div className="toile-outils">
          <div className="toile-palette" role="group" aria-label="Couleurs">
            {PALETTE.map((p) => (
              <button key={p} type="button" className={`pastille ${color === p && !erase ? "on" : ""}`} style={{ background: p }} aria-label={`couleur ${p}`} onClick={() => (setColor(p), setErase(false))} />
            ))}
          </div>
          <div className="toile-btns">
            {[1.2, 2.2, 4, 7].map((t) => (
              <button key={t} type="button" className={`epaisseur ${size === t ? "on" : ""}`} onClick={() => setSize(t)} aria-label={`épaisseur ${t}`}>
                <i style={{ width: t * 3, height: t * 3 }} />
              </button>
            ))}
            <button type="button" className={`btn btn-small ${erase ? "btn-primary" : "btn-soft"}`} onClick={() => setErase(!erase)}>
              🧽 Gomme
            </button>
            <button type="button" className={`btn btn-small ${miroir ? "btn-primary" : "btn-soft"}`} onClick={() => setMiroir(!miroir)} aria-pressed={miroir}>
              ↔️ Miroir
            </button>
            <button type="button" className="btn btn-small btn-soft" onClick={() => setStrokes((s) => s.slice(0, -1))} disabled={!strokes.length}>
              ↩️ Annuler
            </button>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setStrokes([])} disabled={!strokes.length}>
              🗑️ Tout effacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ---------- Galerie (stockée sur l'appareil, par enfant) ----------
export interface Oeuvre {
  id: string;
  titre: string;
  date: number;
  png: string;
}
const MAX = 40;
const cle = () => `galerie:${activeChild()?.id ?? "?"}`;
export async function galerie(): Promise<Oeuvre[]> {
  return (await dbGet<Oeuvre[]>(cle())) ?? [];
}
export async function ajouterOeuvre(titre: string, png: string) {
  const g = await galerie();
  g.unshift({ id: Math.random().toString(36).slice(2), titre, date: Date.now(), png });
  await dbSet(cle(), g.slice(0, MAX));
}
export async function retirerOeuvre(id: string) {
  await dbSet(
    cle(),
    (await galerie()).filter((o) => o.id !== id),
  );
}
