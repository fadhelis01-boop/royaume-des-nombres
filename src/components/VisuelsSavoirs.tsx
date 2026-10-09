import { useState } from "react";
import { useStore } from "../lib/store";
import { freqMidi, jouerFreq, jouerRythme, jouerSuite, midi, nomMidi, type Timbre } from "../lib/musique";

// Visuels des nouvelles planètes, dessinés à partir de données (aucune image à produire) :
//   son     : un ou plusieurs boutons « écouter » (notes, accords, rythme ou fréquence pure)
//   portee  : des notes sur une portée en clé de sol (durées : ronde, blanche, noire, croche)
//   clavier : un clavier de piano avec des touches colorées
//   atome   : le modèle simple d'un atome (noyau + couches d'électrons)

type Any = Record<string, unknown>;
const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const n = (v: unknown, d = 0) => {
  const x = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return isNaN(x) || v === undefined || v === "" ? d : x;
};

interface Son {
  etiquette?: string;
  notes?: string;
  freq?: number | string;
  rythme?: string;
  tempo?: number | string;
  timbre?: Timbre;
  volume?: number | string;
  duree?: number | string;
  emoji?: string;
}

function jouer(x: Son) {
  const tempo = n(x.tempo, 90);
  const vol = n(x.volume, 0.25);
  if (x.rythme) return jouerRythme(s(x.rythme), tempo);
  if (x.freq !== undefined) {
    const d = n(x.duree, 1.2);
    jouerFreq(n(x.freq, 440), d, x.timbre ?? "pur", vol);
    return d;
  }
  if (x.notes) return jouerSuite(s(x.notes), tempo, x.timbre ?? "piano", vol);
  return 0;
}

export function SonVis({ v }: { v: Any }) {
  const sons: Son[] = Array.isArray(v.sons) ? (v.sons as Son[]) : [v as Son];
  const [actif, setActif] = useState<number | null>(null);
  const visibles = useStore((st) => !!st.settings.sonsVisibles);
  return (
    <div className="son-vis">
      {sons.map((x, i) => (
        <div key={i} className="son-item">
        <button
          key={i}
          type="button"
          className={`son-btn ${actif === i ? "on" : ""}`}
          onClick={() => {
            const d = jouer(x) || 0.8;
            setActif(i);
            window.setTimeout(() => setActif((a) => (a === i ? null : a)), Math.max(400, d * 1000));
          }}
        >
          <span aria-hidden>{x.emoji ?? (actif === i ? "🔊" : "▶️")}</span> {x.etiquette ?? (sons.length > 1 ? `Son ${String.fromCharCode(65 + i)}` : "Écouter")}
        </button>
        {visibles && <SonDessine x={x} />}
        </div>
      ))}
    </div>
  );
}

// ---------- Portée en clé de sol ----------
// Position diatonique : Mi4 = ligne du bas (0), chaque cran = une ligne ou un interligne.
const DIATO: Record<number, number> = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5, 11: 6 };
function cran(m: number) {
  const oct = Math.floor(m / 12) - 1;
  return oct * 7 + DIATO[((m % 12) + 12) % 12] - (4 * 7 + 2); // Mi4 → 0
}
const DUREES: Record<string, { plein: boolean; queue: boolean; crochet: number }> = {
  ronde: { plein: false, queue: false, crochet: 0 },
  blanche: { plein: false, queue: true, crochet: 0 },
  noire: { plein: true, queue: true, crochet: 0 },
  croche: { plein: true, queue: true, crochet: 1 },
  "double-croche": { plein: true, queue: true, crochet: 2 },
};

export function PorteeVis({ v }: { v: Any }) {
  const notes = s(v.notes).split(/\s+/).filter(Boolean);
  const durees = s(v.durees).split(/\s+/).filter(Boolean);
  const noms = v.noms !== false && v.noms !== "non";
  const cache = s(v.cache); // indice (1, 2…) d'une note dont on cache le nom, ou « tout »
  const gap = 10; // demi-interligne
  const x0 = 70;
  const pas = 46;
  const W = x0 + Math.max(1, notes.length) * pas + 20;
  const yLigne = (k: number) => 110 - k * gap; // k : cran (0 = Mi4)
  const H = 170;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="portee-svg" role="img" aria-label={`Portée : ${notes.join(", ")}`}>
      {[0, 2, 4, 6, 8].map((k) => (
        <line key={k} x1={10} x2={W - 8} y1={yLigne(k)} y2={yLigne(k)} stroke="var(--ink, #2b2540)" strokeWidth={1.4} />
      ))}
      <text x={14} y={yLigne(0) + 14} fontSize={78} fontFamily="serif" fill="var(--ink, #2b2540)">
        𝄞
      </text>
      {notes.map((no, i) => {
        if (no === "_" || no === "soupir") {
          const x = x0 + i * pas + 10;
          return (
            <text key={i} x={x} y={yLigne(4) + 8} fontSize={34} fontFamily="serif" fill="var(--ink, #2b2540)">
              𝄽
            </text>
          );
        }
        const m = midi(no);
        if (m === null) return null;
        const k = cran(m);
        const x = x0 + i * pas + 14;
        const y = yLigne(k);
        const d = DUREES[durees[i] ?? s(v.duree) ?? "noire"] ?? DUREES.noire;
        const haut = k < 4; // queue vers le haut sous la 3ᵉ ligne
        const lignesSup: number[] = [];
        for (let c = -2; c >= k; c -= 2) lignesSup.push(c);
        for (let c = 10; c <= k; c += 2) lignesSup.push(c);
        const montrer = noms && cache !== "tout" && cache !== String(i + 1);
        return (
          <g key={i}>
            {lignesSup.map((c) => (
              <line key={c} x1={x - 13} x2={x + 13} y1={yLigne(c)} y2={yLigne(c)} stroke="var(--ink, #2b2540)" strokeWidth={1.4} />
            ))}
            <ellipse cx={x} cy={y} rx={8.5} ry={6.2} transform={`rotate(-20 ${x} ${y})`} fill={d.plein ? "var(--ink, #2b2540)" : "var(--bg, #fff)"} stroke="var(--ink, #2b2540)" strokeWidth={2} />
            {d.queue && <line x1={haut ? x + 7.6 : x - 7.6} x2={haut ? x + 7.6 : x - 7.6} y1={y} y2={haut ? y - 38 : y + 38} stroke="var(--ink, #2b2540)" strokeWidth={1.8} />}
            {Array.from({ length: d.crochet }, (_, c) => (
              <path key={c} d={haut ? `M${x + 7.6} ${y - 38 + c * 8} q10 8 6 20` : `M${x - 7.6} ${y + 38 - c * 8} q10 -8 6 -20`} fill="none" stroke="var(--ink, #2b2540)" strokeWidth={2} />
            ))}
            {montrer && (
              <text x={x} y={H - 6} textAnchor="middle" fontSize={13} fill="var(--muted, #6b6585)">
                {nomMidi(m).replace(/\d+$/, "")}
              </text>
            )}
            {!montrer && cache === String(i + 1) && (
              <text x={x} y={H - 6} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--c-orange, #e0711a)">
                ?
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------- Clavier ----------
export function ClavierVis({ v }: { v: Any }) {
  const de = midi(s(v.de) || "Do4") ?? 60;
  const a = midi(s(v.a) || "Si4") ?? 71;
  const marques = new Set(
    s(v.notes)
      .split(/\s+/)
      .filter(Boolean)
      .map((x) => midi(x))
      .filter((x): x is number => x !== null),
  );
  const blanches: number[] = [];
  for (let m = de; m <= a; m++) if (![1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12)) blanches.push(m);
  const L = 34;
  const W = blanches.length * L;
  return (
    <svg viewBox={`0 0 ${W} 130`} className="clavier-svg" role="img" aria-label="Clavier de piano">
      {blanches.map((m, i) => (
        <g key={m} onClick={() => jouerFreq(freqMidi(m), 0.6)} style={{ cursor: "pointer" }}>
          <rect x={i * L} y={0} width={L - 2} height={124} rx={4} fill={marques.has(m) ? "var(--c-turquoise, #2ec4b6)" : "#fff"} stroke="#5b5675" />
          <text x={i * L + L / 2 - 1} y={116} textAnchor="middle" fontSize={11} fill="#5b5675">
            {nomMidi(m).replace(/\d+$/, "")}
          </text>
        </g>
      ))}
      {blanches.map((m, i) =>
        [1, 3, 6, 8, 10].includes(((m + 1) % 12 + 12) % 12) && m + 1 <= a ? (
          <rect key={`n${m}`} x={i * L + L * 0.66} y={0} width={L * 0.62} height={76} rx={3} fill={marques.has(m + 1) ? "var(--c-orange, #e0711a)" : "#2b2540"} onClick={() => jouerFreq(freqMidi(m + 1), 0.6)} style={{ cursor: "pointer" }} />
        ) : null,
      )}
    </svg>
  );
}

// ---------- Atome (modèle simple : noyau + couches 2, 8, 8, 18…) ----------
const SYMB = ["", "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca"];
export function AtomeVis({ v }: { v: Any }) {
  const Z = Math.max(1, Math.min(20, Math.round(n(v.z, 1))));
  const ion = Math.round(n(v.charge, 0)); // +1 : un électron en moins
  let e = Math.max(0, Z - ion);
  const couches: number[] = [];
  for (const cap of [2, 8, 8, 18]) {
    if (e <= 0) break;
    couches.push(Math.min(cap, e));
    e -= cap;
  }
  const N = n(v.neutrons, -1);
  const R = 34 + couches.length * 26;
  const W = 2 * R + 20;
  return (
    <svg viewBox={`0 0 ${W} ${W}`} className="atome-svg" role="img" aria-label={`Atome de ${SYMB[Z]} : ${Z} protons, ${couches.join(", ")} électrons par couche`}>
      <circle cx={W / 2} cy={W / 2} r={20} fill="var(--c-orange, #e0711a)" opacity={0.9} />
      <text x={W / 2} y={W / 2 + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill="#fff">
        {s(v.symbole) || SYMB[Z]}
      </text>
      {couches.map((nb, c) => {
        const r = 34 + (c + 1) * 26 - 8;
        return (
          <g key={c}>
            <circle cx={W / 2} cy={W / 2} r={r} fill="none" stroke="var(--c-bleu, #1e6fd9)" strokeDasharray="4 4" />
            {Array.from({ length: nb }, (_, k) => {
              const t = (2 * Math.PI * k) / nb - Math.PI / 2;
              return <circle key={k} cx={W / 2 + r * Math.cos(t)} cy={W / 2 + r * Math.sin(t)} r={5} fill="var(--c-bleu, #1e6fd9)" />;
            })}
          </g>
        );
      })}
      {v.legende !== false && (
        <text x={W / 2} y={W - 4} textAnchor="middle" fontSize={11} fill="var(--muted, #6b6585)">
          {Z} p⁺{N >= 0 ? ` · ${N} n` : ""} · {Z - ion} e⁻
        </text>
      )}
    </svg>
  );
}

/** Le son en image : notes (hauteur et durée), rythme (points), fréquence et volume. */
function SonDessine({ x }: { x: Son }) {
  const vol = n(x.volume, 0.25);
  if (x.rythme)
    return (
      <div className="son-dessin" aria-label={`rythme : ${[...s(x.rythme)].map((c) => (c === "." ? "silence" : c === "X" ? "fort" : "coup")).join(", ")}`}>
        {[...s(x.rythme).replace(/\s/g, "")].map((c, k) => (
          <span key={k} className={`sd-pas ${c === "." ? "" : "on"} ${c === "X" ? "fort" : ""}`} />
        ))}
      </div>
    );
  if (x.freq !== undefined) {
    const f = n(x.freq, 440);
    const ondes = Math.max(2, Math.min(24, Math.round(f / 60)));
    const amp = 6 + vol * 40;
    const d = Array.from({ length: ondes * 8 + 1 }, (_, k) => `${k === 0 ? "M" : "L"}${(k * 200) / (ondes * 8)} ${30 - amp * Math.sin((k * Math.PI) / 4)}`).join(" ");
    return (
      <svg className="son-dessin" viewBox="0 0 200 60" role="img" aria-label={`son de ${Math.round(f)} hertz, ${f > 500 ? "aigu" : f < 250 ? "grave" : "moyen"}, volume ${vol > 0.4 ? "fort" : vol < 0.15 ? "doux" : "moyen"}`}>
        <path d={d} fill="none" stroke="currentColor" strokeWidth={2} />
      </svg>
    );
  }
  if (x.notes) {
    // « do4:2 ré4 _ [do4 mi4] » : hauteur verticale, durée horizontale
    const toks = s(x.notes).split(/\s+(?![^[]*\])/).filter(Boolean);
    let t = 0;
    const barres: { m: number; t: number; d: number }[] = [];
    for (const tok of toks) {
      const [corps, du] = tok.split(":");
      const d = Number(du ?? 1) || 1;
      if (corps !== "_") for (const nn of corps.replace(/[[\]]/g, "").split(/\s+/)) { const m = midi(nn); if (m !== null) barres.push({ m, t, d }); }
      t += d;
    }
    if (!barres.length) return null;
    const lo = Math.min(...barres.map((b) => b.m)), hi = Math.max(...barres.map((b) => b.m));
    const H = 70, W = 200, pas = W / Math.max(1, t);
    return (
      <svg className="son-dessin" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`notes : ${barres.map((b) => nomMidi(b.m)).join(", ")} (plus haut = plus aigu, plus long = plus long)`}>
        {barres.map((b, k) => (
          <rect key={k} x={b.t * pas + 1} y={hi === lo ? H / 2 - 4 : 6 + ((hi - b.m) / (hi - lo)) * (H - 20)} width={Math.max(4, b.d * pas - 2)} height={8} rx={3} fill="var(--c-violet, #7c4dff)" opacity={0.4 + vol} />
        ))}
      </svg>
    );
  }
  return null;
}
