// Un jeu propre à chaque planète de sciences et d'arts (audit 2.1) :
// chimie (potions), biologie (chaîne alimentaire), physique (circuit), univers (planètes),
// dessin (silhouettes), musique (rythme frappé et note chantée au micro).
import { useEffect, useMemo, useRef, useState } from "react";
import { go } from "../../lib/router";
import { addXp, bump, updateChild, useChild } from "../../lib/store";
import { sfx } from "../../lib/sound";
import { Bubble } from "../../components/Mascot";
import { jouerNote, jouerRythme, midi, nomMidi } from "../../lib/musique";
import type { Who } from "../../lib/types";

const melange = <T,>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

function enregistrer(id: string, score: number, mieux: "haut" | "bas" = "haut") {
  updateChild((c) => {
    const prev = c.games[id];
    c.games[id] = prev === undefined ? score : mieux === "haut" ? Math.max(prev, score) : Math.min(prev, score);
  });
  bump("jeux");
  addXp(Math.max(5, mieux === "haut" ? score * 2 : 20));
}

/** Coque commune : titre, consigne, manche, fin de partie. */
function Coque({ titre, emoji, qui, consigne, children }: { titre: string; emoji: string; qui: Who; consigne: string; children: React.ReactNode }) {
  return (
    <div className="page jeu-planete">
      <div className="lecon-top">
        <button className="back" onClick={() => go("/jeux")} aria-label="Quitter le jeu">
          ✕
        </button>
        <h1 className="lecon-title small">
          {emoji} {titre}
        </h1>
      </div>
      <Bubble who={qui} text={consigne} />
      {children}
    </div>
  );
}

function Fin({ score, total, record, unite = "points", onRejouer, lecon }: { score: number; total?: number; record?: number; unite?: string; onRejouer: () => void; lecon: string }) {
  return (
    <div className="center stack jeu-fin">
      <div className="big-score">
        {score}
        {total ? ` / ${total}` : ""} <small>{unite}</small>
      </div>
      {record !== undefined && <p className="small muted">Ton record : {record} {unite}</p>}
      <Bubble who="mia" humeur="joie" text={lecon} />
      <button className="btn btn-primary btn-xl" onClick={onRejouer}>
        🔁 Rejouer
      </button>
      <button className="btn btn-ghost" onClick={() => go("/jeux")}>
        ← Salle de jeux
      </button>
    </div>
  );
}

// ---------- Chimie : les potions du chou rouge ----------
type Ph = "acide" | "neutre" | "basique";
const SUBSTANCES: [string, string, Ph][] = [
  ["🍋", "jus de citron", "acide"], ["🍶", "vinaigre", "acide"], ["🥤", "soda", "acide"], ["🍊", "jus d'orange", "acide"], ["🍅", "jus de tomate", "acide"],
  ["💧", "eau pure", "neutre"], ["🧂", "eau salée", "neutre"], ["🍬", "eau sucrée", "neutre"],
  ["🧼", "eau savonneuse", "basique"], ["🥄", "bicarbonate dans l'eau", "basique"], ["🧺", "lessive diluée", "basique"], ["🦷", "dentifrice dilué", "basique"],
];
const COULEUR: Record<Ph, { c: string; n: string }> = { acide: { c: "#e84393", n: "rose" }, neutre: { c: "#7b4bb3", n: "violet" }, basique: { c: "#2bb07f", n: "vert" } };

export function JeuPotions() {
  const child = useChild()!;
  const [tours, setTours] = useState(() => melange(SUBSTANCES).slice(0, 8));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [rep, setRep] = useState<Ph | null>(null);
  const fin = i >= tours.length;
  const [emoji, nom, ph] = tours[Math.min(i, tours.length - 1)];
  const choisir = (p: Ph) => {
    if (rep) return;
    setRep(p);
    if (p === ph) {
      sfx.ok();
      setScore((s) => s + 1);
    } else sfx.oops();
  };
  const suivant = () => {
    setRep(null);
    if (i + 1 >= tours.length) enregistrer("potions", score);
    setI(i + 1);
  };
  return (
    <Coque titre="Les potions de Dame Acidia" emoji="🧪" qui="acidia" consigne="Le jus de chou rouge est un détective : il devient ROSE avec un acide, reste VIOLET si c'est neutre, devient VERT avec une base. Devine la couleur avant de verser !">
      {fin ? (
        <Fin score={score} total={tours.length} record={child.games["potions"]} unite="bonnes prédictions" lecon="Acide : citron, vinaigre, soda. Basique : savon, bicarbonate, lessive. Au vrai labo, on ne goûte jamais : on observe la couleur !" onRejouer={() => { setTours(melange(SUBSTANCES).slice(0, 8)); setI(0); setScore(0); }} />
      ) : (
        <div className="potions center">
          <p className="small muted">Potion {i + 1} / {tours.length}</p>
          <div className="potion-scene">
            <span className="potion-subst">{emoji}</span>
            <span className="potion-plus">+ jus de chou rouge →</span>
            <span className="potion-fiole" style={{ "--pc": rep ? COULEUR[ph].c : "#7b4bb3" } as React.CSSProperties} aria-label={rep ? `la potion devient ${COULEUR[ph].n}` : "la potion"}>
              ⚗️
            </span>
          </div>
          <strong className="potion-nom">{nom}</strong>
          <div className="choices grid">
            {(Object.keys(COULEUR) as Ph[]).map((p) => (
              <button key={p} type="button" className={`choice ${rep && p === ph ? "good" : rep === p ? "bad" : ""}`} disabled={!!rep} onClick={() => choisir(p)} style={{ borderColor: COULEUR[p].c }}>
                <span className="pastille" style={{ background: COULEUR[p].c }} /> {COULEUR[p].n} ({p})
              </button>
            ))}
          </div>
          {rep && (
            <>
              <Bubble who={rep === ph ? "neo" : "zero"} text={rep === ph ? `Exact : ${nom}, c'est ${ph} → la potion devient ${COULEUR[ph].n} !` : `Raté : ${nom} est ${ph}, la potion devient ${COULEUR[ph].n}.`} />
              <button className="btn btn-primary" onClick={suivant}>Potion suivante ➜</button>
            </>
          )}
        </div>
      )}
    </Coque>
  );
}

// ---------- Biologie : la chaîne alimentaire ----------
const CHAINES: [string, string][][] = [
  [["🌿", "herbe"], ["🐇", "lapin"], ["🦊", "renard"]],
  [["🌾", "graines"], ["🐭", "souris"], ["🦉", "chouette"]],
  [["🥬", "salade"], ["🐌", "escargot"], ["🦔", "hérisson"]],
  [["🍃", "feuille"], ["🐛", "chenille"], ["🐦", "mésange"], ["🦅", "épervier"]],
  [["🌱", "algue"], ["🐟", "petit poisson"], ["🐠", "gros poisson"], ["🦈", "requin"]],
  [["🌰", "gland"], ["🐿️", "écureuil"], ["🦊", "renard"]],
  [["🌸", "nectar"], ["🦋", "papillon"], ["🐸", "grenouille"], ["🐍", "couleuvre"]],
  [["🌾", "herbe"], ["🦗", "sauterelle"], ["🦎", "lézard"], ["🦅", "aigle"]],
];
export function JeuChaine() {
  const child = useChild()!;
  const [ordre, setOrdre] = useState(() => melange(CHAINES).slice(0, 6));
  const [i, setI] = useState(0);
  const [pris, setPris] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [erreur, setErreur] = useState(false);
  const fin = i >= ordre.length;
  const chaine = ordre[Math.min(i, ordre.length - 1)];
  const pool = useMemo(() => melange(chaine.map((_, k) => k)), [chaine]);
  const toucher = (k: number) => {
    if (pris.includes(k)) return;
    if (k !== pris.length) {
      sfx.oops();
      setErreur(true);
      return;
    }
    sfx.tap();
    const p = [...pris, k];
    setPris(p);
    if (p.length === chaine.length) {
      sfx.ok();
      if (!erreur) setScore((s) => s + 1);
    }
  };
  const suivant = () => {
    if (i + 1 >= ordre.length) enregistrer("chaine", score);
    setI(i + 1);
    setPris([]);
    setErreur(false);
  };
  const complete = pris.length === chaine.length;
  return (
    <Coque titre="La chaîne alimentaire" emoji="🦊" qui="seve" consigne="Range les êtres vivants du MANGÉ au MANGEUR : touche d'abord celui qui fabrique sa nourriture (la plante), puis celui qui le mange, et ainsi de suite.">
      {fin ? (
        <Fin score={score} total={ordre.length} record={child.games["chaine"]} unite="chaînes parfaites" lecon="Une chaîne commence toujours par un végétal, le producteur. La flèche veut dire « est mangé par » : si un maillon disparaît, toute la chaîne est en danger." onRejouer={() => { setOrdre(melange(CHAINES).slice(0, 6)); setI(0); setScore(0); setPris([]); setErreur(false); }} />
      ) : (
        <div className="center chaine">
          <p className="small muted">Chaîne {i + 1} / {ordre.length}</p>
          <div className="chaine-ligne" aria-label="ta chaîne">
            {chaine.map((_, k) => (
              <span key={k} className="chaine-case">
                {pris[k] !== undefined ? `${chaine[pris[k]][0]} ${chaine[pris[k]][1]}` : "?"}
                {k < chaine.length - 1 && <span className="chaine-fleche">→</span>}
              </span>
            ))}
          </div>
          <div className="chaine-pool">
            {pool.map((k) => (
              <button key={k} type="button" className="chip big" disabled={pris.includes(k) || complete} onClick={() => toucher(k)}>
                {chaine[k][0]} {chaine[k][1]}
              </button>
            ))}
          </div>
          {erreur && !complete && <p className="small">Pas encore : qui est mangé par l'autre ? Commence par la plante.</p>}
          {complete && (
            <>
              <Bubble who="neo" text={erreur ? "Chaîne terminée ! La prochaine, du premier coup ?" : "Parfait, du premier coup !"} />
              <button className="btn btn-primary" onClick={suivant}>Chaîne suivante ➜</button>
            </>
          )}
        </div>
      )}
    </Coque>
  );
}

// ---------- Physique : allume la lampe ----------
// Une boucle à 4 côtés (haut : pile, droite : lampe, bas : interrupteur, gauche : fil).
// Certains fils sont coupés : l'enfant les répare puis ferme l'interrupteur.
const SEGMENTS = ["haut-g", "haut-d", "droite-b", "bas-d", "bas-g", "gauche"] as const;
type Seg = (typeof SEGMENTS)[number];
const SEG_XY: Record<Seg, [number, number, number, number]> = {
  "haut-g": [40, 40, 120, 40], "haut-d": [200, 40, 280, 40], "droite-b": [280, 120, 280, 180], "bas-d": [280, 180, 200, 180], "bas-g": [120, 180, 40, 180], gauche: [40, 180, 40, 40],
};
export function JeuCircuit() {
  const child = useChild()!;
  const nouveau = (n: number) => ({ coupes: melange([...SEGMENTS]).slice(0, Math.min(3, 1 + Math.floor(n / 3))) as Seg[], ferme: false });
  const [manche, setManche] = useState(0);
  const [etat, setEtat] = useState(() => nouveau(0));
  const [debut] = useState(() => Date.now());
  const [fini, setFini] = useState<number | null>(null);
  const allume = etat.coupes.length === 0 && etat.ferme;
  const TOTAL = 6;
  useEffect(() => {
    if (allume) sfx.ok();
  }, [allume]);
  const reparer = (s: Seg) => setEtat((e) => ({ ...e, coupes: e.coupes.filter((x) => x !== s) }));
  const suivant = () => {
    if (manche + 1 >= TOTAL) {
      const sec = Math.round((Date.now() - debut) / 1000);
      setFini(sec);
      enregistrer("circuit", sec, "bas");
      return;
    }
    setManche(manche + 1);
    setEtat(nouveau(manche + 1));
  };
  return (
    <Coque titre="Allume la lampe" emoji="💡" qui="gravis" consigne="Le courant a besoin d'une boucle complète. Touche les fils coupés (en pointillés rouges) pour les réparer, puis ferme l'interrupteur.">
      {fini !== null ? (
        <Fin score={fini} record={child.games["circuit"]} unite="secondes" lecon="Une lampe brille seulement si le circuit est FERMÉ : pile, fils, lampe et interrupteur forment une boucle sans trou. Un interrupteur ouvert, c'est un pont levé." onRejouer={() => { setManche(0); setEtat(nouveau(0)); setFini(null); }} />
      ) : (
        <div className="center circuit">
          <p className="small muted">Circuit {manche + 1} / {TOTAL}</p>
          <svg viewBox="0 0 320 220" className="circuit-svg" role="img" aria-label={allume ? "La lampe est allumée" : `Lampe éteinte : ${etat.coupes.length} fil(s) coupé(s), interrupteur ${etat.ferme ? "fermé" : "ouvert"}`}>
            {SEGMENTS.map((s) => {
              const [x1, y1, x2, y2] = SEG_XY[s];
              const coupe = etat.coupes.includes(s);
              return (
                <g key={s} onClick={() => coupe && reparer(s)} style={{ cursor: coupe ? "pointer" : "default" }}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={coupe ? "#e2574c" : "currentColor"} strokeWidth={coupe ? 4 : 5} strokeDasharray={coupe ? "6 10" : undefined} />
                  {coupe && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={34} />}
                  {coupe && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 10} textAnchor="middle" fontSize={18}>✂️</text>}
                </g>
              );
            })}
            {/* pile en haut */}
            <rect x={120} y={22} width={80} height={36} rx={6} fill="#ffcf33" stroke="currentColor" strokeWidth={3} />
            <text x={160} y={46} textAnchor="middle" fontSize={14} fontWeight={700} fill="#2b2140">+ pile −</text>
            {/* lampe à droite */}
            <line x1={280} y1={40} x2={280} y2={80} stroke="currentColor" strokeWidth={5} />
            <circle cx={280} cy={100} r={20} fill={allume ? "#ffe066" : "#e0e0e0"} stroke="currentColor" strokeWidth={3} />
            {allume && <circle cx={280} cy={100} r={34} fill="#ffe066" opacity={0.35} />}
            <text x={280} y={106} textAnchor="middle" fontSize={16}>💡</text>
            {/* interrupteur en bas */}
            <g onClick={() => setEtat((e) => ({ ...e, ferme: !e.ferme }))} style={{ cursor: "pointer" }} role="button" aria-label={etat.ferme ? "ouvrir l'interrupteur" : "fermer l'interrupteur"}>
              <rect x={110} y={150} width={100} height={60} fill="transparent" />
              <circle cx={130} cy={180} r={5} fill="currentColor" />
              <circle cx={190} cy={180} r={5} fill="currentColor" />
              <line x1={130} y1={180} x2={etat.ferme ? 190 : 180} y2={etat.ferme ? 180 : 150} stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
              <text x={160} y={210} textAnchor="middle" fontSize={11} fill="currentColor">interrupteur {etat.ferme ? "fermé" : "ouvert"}</text>
            </g>
          </svg>
          {allume ? (
            <>
              <Bubble who="neo" text="La boucle est fermée : le courant circule et la lampe s'allume !" />
              <button className="btn btn-primary" onClick={suivant}>Circuit suivant ➜</button>
            </>
          ) : (
            <p className="small">{etat.coupes.length ? `Encore ${etat.coupes.length} fil${etat.coupes.length > 1 ? "s" : ""} à réparer.` : "Tous les fils sont réparés : ferme l'interrupteur !"}</p>
          )}
        </div>
      )}
    </Coque>
  );
}

// ---------- Terre & Univers : les planètes dans l'ordre ----------
const PLANETES: [string, string][] = [["Mercure", "#a1887f"], ["Vénus", "#ffcc80"], ["Terre", "#2f6fdf"], ["Mars", "#e2574c"], ["Jupiter", "#d7a86e"], ["Saturne", "#e8d28a"], ["Uranus", "#80deea"], ["Neptune", "#5c6bc0"]];
export function JeuPlanetes() {
  const child = useChild()!;
  const [pool, setPool] = useState(() => melange(PLANETES.map((_, k) => k)));
  const [pris, setPris] = useState<number[]>([]);
  const [fautes, setFautes] = useState(0);
  const [debut, setDebut] = useState(() => Date.now());
  const [fini, setFini] = useState<number | null>(null);
  const toucher = (k: number) => {
    if (k !== pris.length) {
      sfx.oops();
      setFautes((f) => f + 1);
      return;
    }
    sfx.tap();
    const p = [...pris, k];
    setPris(p);
    if (p.length === PLANETES.length) {
      const sec = Math.round((Date.now() - debut) / 1000) + fautes * 3;
      sfx.fanfare();
      setFini(sec);
      enregistrer("planetes", sec, "bas");
    }
  };
  return (
    <Coque titre="Le grand tour du Soleil" emoji="🌍" qui="uranie" consigne="Touche les planètes dans l'ordre, de la plus proche du Soleil à la plus lointaine. Astuce : « Mon Vieux Tu M'as Jeté Sur Une Navette ». Chaque erreur coûte 3 secondes !">
      {fini !== null ? (
        <Fin score={fini} record={child.games["planetes"]} unite="secondes" lecon="Mercure, Vénus, Terre, Mars : les planètes rocheuses. Jupiter, Saturne, Uranus, Neptune : les géantes gazeuses et glacées." onRejouer={() => { setPool(melange(PLANETES.map((_, k) => k))); setPris([]); setFautes(0); setDebut(Date.now()); setFini(null); }} />
      ) : (
        <div className="center">
          <div className="planetes-rangees" aria-label="planètes déjà rangées">
            <span className="soleil-mini">☀️</span>
            {pris.map((k) => (
              <span key={k} className="pl-mini" style={{ background: PLANETES[k][1] }} title={PLANETES[k][0]} />
            ))}
          </div>
          <div className="chaine-pool">
            {pool.map((k) => (
              <button key={k} type="button" className="chip big" disabled={pris.includes(k)} onClick={() => toucher(k)}>
                <span className="pastille" style={{ background: PLANETES[k][1] }} /> {PLANETES[k][0]}
              </button>
            ))}
          </div>
          <p className="small muted">{pris.length} / 8 · erreurs : {fautes}</p>
        </div>
      )}
    </Coque>
  );
}

// ---------- Dessin : devine la silhouette ----------
const OBJETS: [string, string][] = [
  ["🐘", "un éléphant"], ["🦒", "une girafe"], ["🐌", "un escargot"], ["🎸", "une guitare"], ["✂️", "des ciseaux"], ["🚲", "un vélo"], ["🌵", "un cactus"], ["⚓", "une ancre"],
  ["🦋", "un papillon"], ["🐇", "un lapin"], ["🍐", "une poire"], ["☂️", "un parapluie"], ["🔑", "une clé"], ["🐢", "une tortue"], ["🚀", "une fusée"], ["🦆", "un canard"],
];
export function JeuSilhouettes() {
  const child = useChild()!;
  const nouveaux = () => melange(OBJETS).slice(0, 8).map((o) => ({ o, choix: melange([o, ...melange(OBJETS.filter((x) => x !== o)).slice(0, 2)]) }));
  const [tours, setTours] = useState(nouveaux);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [rep, setRep] = useState<string | null>(null);
  const fin = i >= tours.length;
  const t = tours[Math.min(i, tours.length - 1)];
  return (
    <Coque titre="Devine la silhouette" emoji="👤" qui="pinceau" consigne="Les dessinateurs savent qu'une bonne forme se reconnaît rien qu'à sa silhouette. Qu'est-ce qui se cache dans cette ombre ?">
      {fin ? (
        <Fin score={score} total={tours.length} record={child.games["silhouettes"]} unite="silhouettes" lecon="Une silhouette réussie suffit pour reconnaître un objet : quand tu dessines, commence par la grande forme, les détails viennent après." onRejouer={() => { setTours(nouveaux()); setI(0); setScore(0); setRep(null); }} />
      ) : (
        <div className="center">
          <p className="small muted">Silhouette {i + 1} / {tours.length}</p>
          <div className={`silhouette ${rep ? "revele" : ""}`} aria-label={rep ? t.o[1] : "une silhouette noire"}>
            {t.o[0]}
          </div>
          <div className="choices grid">
            {t.choix.map((c) => (
              <button key={c[1]} type="button" disabled={!!rep} className={`choice ${rep && c === t.o ? "good" : rep === c[1] ? "bad" : ""}`} onClick={() => { setRep(c[1]); if (c === t.o) { sfx.ok(); setScore((s) => s + 1); } else sfx.oops(); }}>
                {c[1]}
              </button>
            ))}
          </div>
          {rep && (
            <button className="btn btn-primary" onClick={() => { if (i + 1 >= tours.length) enregistrer("silhouettes", score); setI(i + 1); setRep(null); }}>
              Suivante ➜
            </button>
          )}
        </div>
      )}
    </Coque>
  );
}

// ---------- Musique : frappe le rythme, chante la note ----------
const MOTIFS = ["x.x.x.x.", "x.x.xx..", "xx.xx.x.", "x..xx.x.", "x.xxx.x.", "xx..x.x.", "x.x..xxx", "x.xx.xx."];
const TEMPO = 80;
const PAS = 60 / TEMPO / 2;
export function JeuRythme() {
  const child = useChild()!;
  const [mode, setMode] = useState<"rythme" | "chant">("rythme");
  const [motif, setMotif] = useState(() => MOTIFS[Math.floor(Math.random() * MOTIFS.length)]);
  const [phase, setPhase] = useState<"pret" | "ecoute" | "a-toi" | "fini">("pret");
  const taps = useRef<number[]>([]);
  const t0 = useRef(0);
  const [res, setRes] = useState<{ ok: number; total: number } | null>(null);
  const ecouter = () => {
    setRes(null);
    setPhase("ecoute");
    const d = jouerRythme(motif, TEMPO, "claves");
    window.setTimeout(() => {
      // décompte de 4 temps, puis à toi
      jouerRythme("X.x.x.x.", TEMPO, "grosse");
      window.setTimeout(() => {
        taps.current = [];
        t0.current = performance.now();
        setPhase("a-toi");
        window.setTimeout(() => juger(), motif.length * PAS * 1000 + 600);
      }, 8 * PAS * 1000);
    }, d * 1000 + 400);
  };
  const juger = () => {
    const attendus = [...motif].map((c, k) => (c === "x" ? k * PAS : -1)).filter((x) => x >= 0);
    const t = taps.current.map((x) => (x - t0.current) / 1000);
    const pris = new Set<number>();
    let ok = 0;
    for (const a of attendus) {
      const j = t.findIndex((x, k) => !pris.has(k) && Math.abs(x - a) < 0.16);
      if (j >= 0) {
        pris.add(j);
        ok++;
      }
    }
    const extra = t.length - pris.size;
    const note = Math.max(0, ok - extra);
    setRes({ ok: note, total: attendus.length });
    setPhase("fini");
    if (note === attendus.length) sfx.fanfare();
    enregistrer("rythme", note);
  };
  const frapper = () => {
    if (phase !== "a-toi") return;
    taps.current.push(performance.now());
    jouerRythme("x", TEMPO, "claves");
  };
  return (
    <Coque titre="Frappe et chante" emoji="🥁" qui="resonance" consigne={mode === "rythme" ? "Écoute le rythme, puis, après les 4 coups de grosse caisse, frappe-le sur le gros bouton (ou la barre d'espace)." : "Écoute la note, puis chante-la dans le micro : « laaaa ». Je te dirai si tu es juste."}>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={mode === "rythme"} className={`tab ${mode === "rythme" ? "active" : ""}`} onClick={() => setMode("rythme")}>🥁 Rythme</button>
        <button role="tab" aria-selected={mode === "chant"} className={`tab ${mode === "chant" ? "active" : ""}`} onClick={() => setMode("chant")}>🎤 Chant</button>
      </div>
      {mode === "rythme" ? (
        <div className="center stack rythme">
          <div className="motif" aria-label={`rythme : ${[...motif].map((c) => (c === "x" ? "frappe" : "silence")).join(", ")}`}>
            {[...motif].map((c, k) => (
              <span key={k} className={`m-pas ${c === "x" ? "on" : ""} ${k % 2 === 0 ? "temps" : ""}`}>{c === "x" ? "●" : "·"}</span>
            ))}
          </div>
          {phase === "pret" || phase === "fini" ? (
            <button className="btn btn-primary btn-xl" onClick={ecouter}>{phase === "fini" ? "🔁 Réessayer" : "▶️ Écouter"}</button>
          ) : (
            <button className={`btn btn-xl tap-pad ${phase === "a-toi" ? "actif" : ""}`} onPointerDown={frapper} onKeyDown={(e) => e.key === " " && frapper()} aria-label="frapper">
              {phase === "ecoute" ? "👂 Écoute…" : "👏 Frappe !"}
            </button>
          )}
          {res && <Bubble who={res.ok === res.total ? "mia" : "zero"} humeur={res.ok === res.total ? "joie" : "reflexion"} text={res.ok === res.total ? `Parfait : ${res.ok}/${res.total} frappes au bon moment !` : `${res.ok}/${res.total} frappes au bon moment. Compte « 1, 2, 3, 4 » dans ta tête pendant le décompte, et réessaie !`} />}
          {phase === "fini" && <button className="btn btn-soft" onClick={() => { setMotif(MOTIFS[Math.floor(Math.random() * MOTIFS.length)]); setPhase("pret"); setRes(null); }}>Nouveau rythme</button>}
          {child.games["rythme"] !== undefined && <p className="small muted">Record : {child.games["rythme"]} frappes justes</p>}
        </div>
      ) : (
        <Chant />
      )}
    </Coque>
  );
}

/** Détection de hauteur par autocorrélation (voix d'enfant : environ 200 à 700 Hz). */
function hauteur(buf: Float32Array, sr: number): number | null {
  let rms = 0;
  for (const v of buf) rms += v * v;
  if (Math.sqrt(rms / buf.length) < 0.02) return null;
  let best = -1, bestCorr = 0;
  for (let lag = Math.floor(sr / 900); lag < Math.floor(sr / 150); lag++) {
    let c = 0;
    for (let i = 0; i + lag < buf.length; i++) c += buf[i] * buf[i + lag];
    if (c > bestCorr) {
      bestCorr = c;
      best = lag;
    }
  }
  return best > 0 ? sr / best : null;
}
const NOTES_CHANT = ["do4", "ré4", "mi4", "fa4", "sol4", "la4"];
function Chant() {
  const [cible, setCible] = useState(() => NOTES_CHANT[Math.floor(Math.random() * NOTES_CHANT.length)]);
  const [actif, setActif] = useState(false);
  const [lue, setLue] = useState<number | null>(null);
  const [juste, setJuste] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), []);
  const m = midi(cible)!;
  const ecart = lue !== null ? (((lue - m) % 12) + 18) % 12 - 6 : null; // à l'octave près, en demi-tons
  useEffect(() => {
    if (ecart !== null && Math.abs(ecart) < 0.5) setJuste((j) => j + 1);
    else setJuste(0);
  }, [lue]); // eslint-disable-line react-hooks/exhaustive-deps
  const reussi = juste >= 8;
  useEffect(() => {
    if (reussi) {
      sfx.fanfare();
      stop.current();
      setActif(false);
      bump("chant-juste");
      enregistrer("chant", 1);
    }
  }, [reussi]);
  const ecouterMicro = async () => {
    setErreur(null);
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(flux);
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);
      let raf = 0;
      const boucle = () => {
        an.getFloatTimeDomainData(buf);
        const f = hauteur(buf, ctx.sampleRate);
        setLue(f ? 69 + 12 * Math.log2(f / 440) : null);
        raf = requestAnimationFrame(boucle);
      };
      boucle();
      setActif(true);
      stop.current = () => {
        cancelAnimationFrame(raf);
        flux.getTracks().forEach((t) => t.stop());
        void ctx.close();
      };
    } catch {
      setErreur("Le micro n'est pas disponible (ou n'a pas été autorisé). Tu peux demander à un adulte de l'autoriser dans le navigateur.");
    }
  };
  return (
    <div className="center stack chant">
      <p>
        Note à chanter : <strong>{cible.replace(/\d/, "")}</strong>
      </p>
      <button className="btn btn-soft" onClick={() => jouerNote(cible, 1.2, "piano", 0.35)}>🔊 Écouter la note</button>
      {!actif && !reussi && <button className="btn btn-primary btn-xl" onClick={ecouterMicro}>🎤 Je chante</button>}
      {actif && (
        <div className="jauge-chant" aria-live="polite">
          <div className="jc-barre">
            <span className="jc-cible" />
            {ecart !== null && <span className="jc-voix" style={{ left: `${50 + Math.max(-6, Math.min(6, ecart)) * 8}%` }} />}
          </div>
          <p className="small">{lue === null ? "Je n'entends rien… chante un peu plus fort !" : Math.abs(ecart!) < 0.5 ? "Juste ! Tiens la note…" : ecart! < 0 ? `Un peu trop grave (tu chantes ${nomMidi(Math.round(lue))}) : monte !` : `Un peu trop aigu (tu chantes ${nomMidi(Math.round(lue))}) : descends !`}</p>
        </div>
      )}
      {reussi && (
        <>
          <Bubble who="resonance" text="Bravo, tu as tenu la note juste ! Ton oreille et ta voix travaillent ensemble." />
          <button className="btn btn-primary" onClick={() => { setCible(NOTES_CHANT[Math.floor(Math.random() * NOTES_CHANT.length)]); setJuste(0); setLue(null); }}>Une autre note</button>
        </>
      )}
      {erreur && <p className="small">{erreur}</p>}
      <p className="small muted">Le son du micro reste sur cet appareil : il n'est ni enregistré ni envoyé.</p>
    </div>
  );
}
