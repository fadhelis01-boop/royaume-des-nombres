// Visuels ajoutés après l'audit 2.1 : frise, phrase analysée, astres, couches, cycle, schéma légendé.
// Tous en SVG ou HTML simple, lisibles en mode clair et sombre, avec une description pour les lecteurs d'écran.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = Record<string, any>;
const s = (x: unknown) => (x === undefined || x === null ? "" : String(x));
const arr = (x: unknown): any[] => (Array.isArray(x) ? x : []);
const PAL = ["#7c4dff", "#ff8a1f", "#14b8a6", "#e2574c", "#2f6fdf", "#3fa34d", "#d4a017", "#ff5c8a"];

/** Frise : des étapes ou des époques dans l'ordre, une flèche du temps. */
export function FriseVis({ v }: { v: Any }) {
  const pts = arr(v.points);
  const ici = typeof v.marque === "number" ? v.marque : -1;
  return (
    <div className="v-frise" role="img" aria-label={`Frise : ${pts.map((p) => s(p.label)).join(", ")}`}>
      {v.titre && <div className="v-titre">{s(v.titre)}</div>}
      <ol>
        {pts.map((p, i) => (
          <li key={i} className={i === ici ? "ici" : ""} style={{ "--c": p.couleur ?? PAL[i % PAL.length] } as React.CSSProperties}>
            <span className="f-point">{s(p.emoji) || "●"}</span>
            <strong>{s(p.label)}</strong>
            {p.sous && <small>{s(p.sous)}</small>}
          </li>
        ))}
      </ol>
      {v.fleche !== false && <div className="f-fleche" aria-hidden>{s(v.fleche) || "le temps"} ➜</div>}
    </div>
  );
}

const ROLES: Record<string, { c: string; n: string }> = {
  sujet: { c: "#2f6fdf", n: "sujet" }, verbe: { c: "#e2574c", n: "verbe" }, cod: { c: "#3fa34d", n: "COD" }, coi: { c: "#14b8a6", n: "COI" },
  cc: { c: "#d4a017", n: "complément circonstanciel" }, ccl: { c: "#d4a017", n: "CC de lieu" }, cct: { c: "#d4a017", n: "CC de temps" }, ccm: { c: "#d4a017", n: "CC de manière" },
  attribut: { c: "#7c4dff", n: "attribut du sujet" }, determinant: { c: "#8d6e63", n: "déterminant" }, nom: { c: "#2f6fdf", n: "nom" },
  adjectif: { c: "#ff5c8a", n: "adjectif" }, pronom: { c: "#5c6bc0", n: "pronom" }, adverbe: { c: "#ff8a1f", n: "adverbe" },
  "complement-du-nom": { c: "#26a69a", n: "complément du nom" }, epithete: { c: "#ff5c8a", n: "épithète" }, ponctuation: { c: "#9e9e9e", n: "ponctuation" },
  principale: { c: "#2f6fdf", n: "proposition principale" }, subordonnee: { c: "#7c4dff", n: "subordonnée" }, liaison: { c: "#9e9e9e", n: "mot de liaison" },
};
/** Phrase analysée : chaque groupe souligné de la couleur de sa fonction (ou de sa nature), avec l'étiquette. */
export function PhraseVis({ v }: { v: Any }) {
  const gs = arr(v.groupes);
  return (
    <div className="v-phrase" role="img" aria-label={gs.map((g) => `${s(g.mots)} : ${ROLES[g.role]?.n ?? s(g.role)}`).join(" ; ")}>
      <div className="p-ligne">
        {gs.map((g, i) => {
          const r = ROLES[g.role] ?? { c: "#9e9e9e", n: s(g.role) };
          return (
            <span key={i} className="p-groupe" style={{ "--c": r.c } as React.CSSProperties}>
              <span className="p-mots">{s(g.mots)}</span>
              {g.role && <span className="p-role">{s(g.etiquette) || r.n}</span>}
            </span>
          );
        })}
      </div>
      {v.legende && <small className="v-legende">{s(v.legende)}</small>}
    </div>
  );
}

/** Astres : schémas fixes et justes pour les idées fausses fréquentes (phases, éclipses, saisons, jour/nuit). */
export function AstresVis({ v }: { v: Any }) {
  const mode = s(v.mode) || "phases";
  const W = 360, H = 200;
  const soleil = (x: number, y: number, r = 26) => (
    <g>
      <circle cx={x} cy={y} r={r} fill="#ffcf33" stroke="#e0a800" strokeWidth={2} />
      <text x={x} y={y + r + 14} textAnchor="middle" fontSize={11} fill="currentColor">Soleil</text>
    </g>
  );
  const terre = (x: number, y: number, r = 18, label = "Terre", tilt = 0) => (
    <g transform={`rotate(${tilt} ${x} ${y})`}>
      <circle cx={x} cy={y} r={r} fill="#2f6fdf" />
      <path d={`M${x - r * 0.5} ${y - r * 0.3} q${r * 0.4} -${r * 0.4} ${r * 0.8} 0 q-${r * 0.2} ${r * 0.5} -${r * 0.8} 0z`} fill="#3fa34d" />
      <line x1={x} y1={y - r - 6} x2={x} y2={y + r + 6} stroke="currentColor" strokeDasharray="3 3" />
      {label && <text x={x} y={y + r + 18} textAnchor="middle" fontSize={11} fill="currentColor" transform={`rotate(${-tilt} ${x} ${y + r + 18})`}>{label}</text>}
    </g>
  );
  const lune = (x: number, y: number, r = 9, label = "Lune") => (
    <g>
      <circle cx={x} cy={y} r={r} fill="#cfd3dc" stroke="#9aa0ab" />
      {label && <text x={x} y={y + r + 12} textAnchor="middle" fontSize={10} fill="currentColor">{label}</text>}
    </g>
  );
  let body: React.ReactNode, desc = "";
  if (mode === "phases") {
    desc = "Les phases de la Lune : nouvelle lune, premier croissant, premier quartier, gibbeuse, pleine lune, puis la Lune décroît.";
    const ph = [["Nouvelle", 0], ["Croissant", 0.25], ["1er quartier", 0.5], ["Gibbeuse", 0.75], ["Pleine", 1], ["Dernier quartier", -0.5]] as const;
    body = ph.map(([n, f], i) => {
      const x = 32 + i * 59, y = 90, r = 22;
      // partie éclairée : à droite quand la Lune croît (hémisphère nord)
      const k = Math.abs(f);
      const right = f >= 0;
      const ex = r * Math.abs(1 - 2 * k);
      const sweepOuter = right ? 1 : 0;
      const inner = k > 0.5 ? (right ? 1 : 0) : right ? 0 : 1;
      return (
        <g key={n}>
          <circle cx={x} cy={y} r={r} fill="#3a3550" />
          {k > 0 && (k >= 1 ? <circle cx={x} cy={y} r={r} fill="#f4f1e0" /> : <path d={`M${x} ${y - r} A${r} ${r} 0 0 ${sweepOuter} ${x} ${y + r} A${ex} ${r} 0 0 ${inner} ${x} ${y - r}z`} fill="#f4f1e0" />)}
          <text x={x} y={y + r + 16} textAnchor="middle" fontSize={10} fill="currentColor">
            {n.split(" ").map((w, j) => (
              <tspan key={j} x={x} dy={j ? 12 : 0}>
                {w}
              </tspan>
            ))}
          </text>
        </g>
      );
    });
  } else if (mode === "eclipse-soleil" || mode === "eclipse-lune") {
    const sol = mode === "eclipse-soleil";
    desc = sol ? "Éclipse de Soleil : la Lune passe entre le Soleil et la Terre ; son ombre tombe sur la Terre." : "Éclipse de Lune : la Terre passe entre le Soleil et la Lune ; la Lune entre dans l'ombre de la Terre.";
    body = (
      <>
        {soleil(40, 100, 30)}
        {sol ? (
          <>
            {lune(190, 100)}
            <polygon points="190,91 300,96 300,104 190,109" fill="#3a3550" opacity={0.35} />
            {terre(310, 100)}
          </>
        ) : (
          <>
            {terre(200, 100)}
            <polygon points="200,82 320,92 320,108 200,118" fill="#3a3550" opacity={0.35} />
            {lune(320, 100, 9)}
          </>
        )}
        <text x={180} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill="currentColor">{sol ? "Soleil — Lune — Terre" : "Soleil — Terre — Lune"}</text>
      </>
    );
  } else if (mode === "saisons") {
    desc = "Les saisons : l'axe de la Terre est penché et garde la même direction. En juin, l'hémisphère nord est tourné vers le Soleil : c'est l'été chez nous.";
    body = (
      <>
        <ellipse cx={180} cy={100} rx={140} ry={58} fill="none" stroke="currentColor" strokeDasharray="4 4" opacity={0.5} />
        {soleil(180, 100, 22)}
        {terre(40, 100, 14, "juin : été (nord)", 23)}
        {terre(320, 100, 14, "décembre : hiver (nord)", 23)}
        {terre(180, 42, 12, "", 23)}
        {terre(180, 158, 12, "", 23)}
      </>
    );
  } else if (mode === "jour-nuit") {
    desc = "Le jour et la nuit : la Terre tourne sur elle-même en 24 heures. Le côté tourné vers le Soleil est dans le jour, l'autre dans la nuit.";
    body = (
      <>
        {soleil(50, 100, 30)}
        <line x1={84} y1={80} x2={200} y2={80} stroke="#ffcf33" strokeWidth={2} />
        <line x1={84} y1={100} x2={200} y2={100} stroke="#ffcf33" strokeWidth={2} />
        <line x1={84} y1={120} x2={200} y2={120} stroke="#ffcf33" strokeWidth={2} />
        <circle cx={250} cy={100} r={48} fill="#2f6fdf" />
        <path d="M250 52 A48 48 0 0 1 250 148z" fill="#14112a" opacity={0.75} />
        <text x={226} y={104} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">jour</text>
        <text x={276} y={104} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">nuit</text>
        <path d="M222 40 q28 -16 56 0" fill="none" stroke="currentColor" markerEnd="url(#fl)" />
        <text x={250} y={26} textAnchor="middle" fontSize={11} fill="currentColor">la Terre tourne (24 h)</text>
      </>
    );
  } else {
    desc = "Le système solaire : Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus, Neptune.";
    const pl: [string, number, string][] = [["Mercure", 4, "#a1887f"], ["Vénus", 6, "#ffcc80"], ["Terre", 6, "#2f6fdf"], ["Mars", 5, "#e2574c"], ["Jupiter", 14, "#d7a86e"], ["Saturne", 12, "#e8d28a"], ["Uranus", 9, "#80deea"], ["Neptune", 9, "#5c6bc0"]];
    body = (
      <>
        <circle cx={-20} cy={100} r={60} fill="#ffcf33" />
        {pl.map(([n, r, c], i) => {
          const x = 60 + i * 39;
          return (
            <g key={n}>
              <circle cx={x} cy={100} r={r} fill={c} />
              {n === "Saturne" && <ellipse cx={x} cy={100} rx={r + 7} ry={3} fill="none" stroke="#bfa65a" />}
              <text x={x} y={i % 2 ? 140 : 70} textAnchor="middle" fontSize={10} fill="currentColor">{n}</text>
            </g>
          );
        })}
        <text x={180} y={190} textAnchor="middle" fontSize={10} fill="currentColor">(tailles et distances non respectées)</text>
      </>
    );
  }
  return (
    <figure className="v-astres">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={desc}>
        <defs>
          <marker id="fl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="currentColor" />
          </marker>
        </defs>
        {body}
      </svg>
      <figcaption>{s(v.legende) || desc}</figcaption>
    </figure>
  );
}

/** Couches : de l'extérieur vers l'intérieur (cercles) ou de haut en bas (pile). */
export function CouchesVis({ v }: { v: Any }) {
  const cs = arr(v.couches);
  if (v.forme === "cercle") {
    // cercles concentriques ; chaque étiquette est reliée par un trait horizontal à sa couche,
    // en escalier de l'extérieur (en haut) vers le centre : les traits ne se croisent jamais.
    const R = 96, cx = 104, cy = 110, n = cs.length;
    return (
      <figure className="v-couches">
        <svg viewBox="0 0 360 220" role="img" aria-label={`De l'extérieur vers le centre : ${cs.map((c) => `${s(c.nom)}${c.detail ? ` (${s(c.detail)})` : ""}`).join(", ")}`}>
          {cs.map((c, i) => (
            <circle key={i} cx={cx} cy={cy} r={R * (1 - i / n)} fill={c.couleur ?? PAL[i % PAL.length]} stroke="#fff" strokeWidth={1.5} />
          ))}
          {cs.map((c, i) => {
            const rm = R * (1 - (i + 0.5) / n);
            const a = n > 1 ? -0.9 + (1.8 * i) / (n - 1) : 0;
            const x0 = cx + rm * Math.cos(a), y0 = cy + rm * Math.sin(a);
            const y = n > 1 ? cy - 80 + (160 * i) / (n - 1) : cy;
            return (
              <g key={"l" + i}>
                <circle cx={x0} cy={y0} r={2.5} fill="currentColor" />
                <polyline points={`${x0},${y0} 206,${y} 214,${y}`} fill="none" stroke="currentColor" opacity={0.6} />
                <text x={218} y={y + 1} fontSize={12} fontWeight={700} fill="currentColor">
                  {s(c.nom)}
                </text>
                {c.detail && (
                  <text x={218} y={y + 13} fontSize={10} fill="currentColor" opacity={0.8}>
                    {s(c.detail)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {v.legende && <figcaption>{s(v.legende)}</figcaption>}
      </figure>
    );
  }
  return (
    <figure className="v-couches pile" role="img" aria-label={`De haut en bas : ${cs.map((c) => s(c.nom)).join(", ")}`}>
      {cs.map((c, i) => (
        <div key={i} className="c-couche" style={{ "--c": c.couleur ?? PAL[i % PAL.length], flexGrow: c.epaisseur ?? 1 } as React.CSSProperties}>
          <strong>{s(c.emoji)} {s(c.nom)}</strong>
          {c.detail && <small>{s(c.detail)}</small>}
        </div>
      ))}
      {v.legende && <figcaption>{s(v.legende)}</figcaption>}
    </figure>
  );
}

/** Cycle : des étapes qui reviennent au début (cycle de l'eau, de vie, du carbone…). */
export function CycleVis({ v }: { v: Any }) {
  const es = arr(v.etapes);
  const n = Math.max(1, es.length);
  const R = 70, cx = 180, cy = 105;
  return (
    <figure className="v-cycle">
      <svg viewBox="0 0 360 215" role="img" aria-label={`Cycle : ${es.map((e) => s(e.label)).join(", puis ")}, et on recommence.`}>
        <defs>
          <marker id="cy-fl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" fill="currentColor" />
          </marker>
        </defs>
        {es.map((_, i) => {
          const a0 = (2 * Math.PI * i) / n - Math.PI / 2 + 0.32, a1 = (2 * Math.PI * (i + 1)) / n - Math.PI / 2 - 0.32;
          return <path key={"a" + i} d={`M${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)}`} fill="none" stroke="currentColor" strokeWidth={2} opacity={0.6} markerEnd="url(#cy-fl)" />;
        })}
        {es.map((e, i) => {
          const a = (2 * Math.PI * i) / n - Math.PI / 2;
          const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
          const tx = cx + (R + 34) * Math.cos(a), ty = cy + (R + 30) * Math.sin(a);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={17} fill={e.couleur ?? PAL[i % PAL.length]} opacity={0.18} />
              <text x={x} y={y + 7} textAnchor="middle" fontSize={20}>{s(e.emoji) || "•"}</text>
              <text x={tx} y={ty + 4} textAnchor={Math.abs(Math.cos(a)) < 0.3 ? "middle" : Math.cos(a) > 0 ? "start" : "end"} fontSize={12} fontWeight={700} fill="currentColor">{s(e.label)}</text>
            </g>
          );
        })}
        {v.centre && <text x={cx} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill="currentColor">{s(v.centre)}</text>}
      </svg>
      {v.legende && <figcaption>{s(v.legende)}</figcaption>}
    </figure>
  );
}

/** Schéma légendé : un grand dessin (émoji ou image) au centre, les parties nommées autour. */
export function SchemaVis({ v }: { v: Any }) {
  const ls = arr(v.legendes);
  const gauche = ls.filter((_, i) => i % 2 === 0), droite = ls.filter((_, i) => i % 2 === 1);
  const item = (l: Any, i: number) => (
    <li key={i}>
      <strong>{s(l.label)}</strong>
      {l.detail && <small>{s(l.detail)}</small>}
    </li>
  );
  return (
    <figure className="v-schema" role="img" aria-label={`${s(v.titre)} : ${ls.map((l) => `${s(l.label)}${l.detail ? ` (${s(l.detail)})` : ""}`).join(", ")}`}>
      {v.titre && <div className="v-titre">{s(v.titre)}</div>}
      <div className="sc-corps">
        <ul className="sc-g">{gauche.map(item)}</ul>
        <div className="sc-centre" aria-hidden>
          {v.image ? <img src={s(v.image)} alt="" /> : <span>{s(v.emoji)}</span>}
        </div>
        <ul className="sc-d">{droite.map(item)}</ul>
      </div>
      {v.legende && <figcaption>{s(v.legende)}</figcaption>}
    </figure>
  );
}
