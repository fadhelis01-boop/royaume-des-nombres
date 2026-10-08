import { useMemo, useState } from "react";
import { go } from "../../lib/router";
import { getContent, lessonKey, matiereDe, planeteDe, useContent } from "../../lib/content";
import { instantiate, newSeed, type Instance } from "../../lib/gen";
import { sfx } from "../../lib/sound";
import { addXp, bump, dayKey, updateChild, useChild } from "../../lib/store";
import { jouerFreq, freqMidi } from "../../lib/musique";
import { ExercisePlayer } from "../../components/ExercisePlayer";
import { Bubble, Mascot } from "../../components/Mascot";
import type { Child } from "../../lib/types";

// Jeux communs à toutes les planètes : le Quiz éclair (questions tirées des leçons de la
// planète, celles déjà apprises d'abord) et l'Oreille d'or (éducation de l'oreille musicale).

/** Questions rapides de la planète : leçons faites d'abord, sinon les premières leçons ouvertes. */
export function questionsPlanete(c: Child, n: number): { key: string; inst: Instance }[] {
  const { worlds } = getContent();
  const mat = matiereDe(c);
  const ws = worlds.filter((w) => w.matiere === mat && w.cycle !== "astuces");
  let keys = ws.flatMap((w) => w.lecons.filter((l) => c.progress[lessonKey(w, l.id)]?.done).map((l) => `${w.id}/${l.id}`));
  if (!keys.length) keys = ws.slice(0, 2).flatMap((w) => w.lecons.slice(0, 2).map((l) => `${w.id}/${l.id}`));
  const out: { key: string; inst: Instance }[] = [];
  for (let t = 0; out.length < n && t < n * 8 && keys.length; t++) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    const [wid, lid] = key.split("/");
    const l = ws.find((w) => w.id === wid)?.lecons.find((x) => x.id === lid);
    const rapides = (l?.exercices ?? []).filter((e) => ["qcm", "vf", "nombre", "comparer"].includes(e.type));
    if (!rapides.length) continue;
    try {
      out.push({ key, inst: instantiate(rapides[Math.floor(Math.random() * rapides.length)], newSeed()) });
    } catch {
      /* suivant */
    }
  }
  return out;
}

/** Quiz éclair : 10 questions de la planète, avec le lecteur d'exercices habituel (indices, corrections). */
export function QuizEclair({ n = 10, echauffement = false }: { n?: number; echauffement?: boolean }) {
  const child = useChild()!;
  const { manifest } = useContent();
  const pl = planeteDe(manifest, matiereDe(child));
  const qs = useMemo(() => questionsPlanete(child, n), []);
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(0);
  if (!qs.length)
    return (
      <div className="page narrow center">
        <h1>⚡ Quiz éclair</h1>
        <Bubble who="mia" text="Il n'y a pas encore de questions sur cette planète. Commence une leçon, et reviens !" />
        <button className="btn btn-primary" onClick={() => go("/")}>
          Retour à la carte
        </button>
      </div>
    );
  if (i >= qs.length) {
    const key = echauffement ? "echauffement" : `quiz:${pl?.id}`;
    return (
      <div className="page narrow center">
        <h1>{echauffement ? "🏃 Échauffement terminé !" : "⚡ Quiz terminé !"}</h1>
        <div className="score-big">
          {ok}/{qs.length}
        </div>
        <Bubble who={ok >= qs.length * 0.8 ? "zero" : "mia"} text={ok >= qs.length * 0.8 ? "UN MILLIARD DE BRAVOS !!! 🤯" : "Chaque question revue est un souvenir qui s'ancre. Reviens demain : ça marche encore mieux !"} />
        <div className="stack">
          <button
            className="btn btn-primary"
            onClick={() => {
              updateChild((c) => {
                c.games[key] = Math.max(c.games[key] ?? 0, ok);
              });
              if (echauffement && !child.counters[`echauffement:${dayKey()}`]) {
                bump("echauffement");
                bump(`echauffement:${dayKey()}`);
              } else bump("quiz-parties");
              addXp(Math.min(40, ok * 4));
              go("/");
            }}
          >
            Partir à l'aventure ➜
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="page defi">
      <div className="lecon-top">
        <button className="back" onClick={() => go("/")}>
          ✕
        </button>
        <div className="dots">
          {qs.map((_, k) => (
            <span key={k} className={k < i ? "ok" : k === i ? "cur" : ""} />
          ))}
        </div>
        <span className="score-pill">⭐ {ok}</span>
      </div>
      <h1 className="lecon-title small">
        {echauffement ? "🏃 Échauffement" : "⚡ Quiz éclair"} · {pl?.emoji} {pl?.matiere}
      </h1>
      <ExercisePlayer
        key={qs[i].inst.seed}
        inst={qs[i].inst}
        statKey={qs[i].key}
        onResult={(r) => {
          if (r.ok) setOk(ok + 1);
          setI(i + 1);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- L'Oreille d'or
type Manche = { consigne: string; jouer: () => void; choix: string[]; bon: number; explication: string };
const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const NIVEAUX: { id: string; titre: string; age: string; gen: () => Manche }[] = [
  {
    id: "hauteur",
    titre: "Aigu ou grave ?",
    age: "dès 6 ans",
    gen: () => {
      const a = r(55, 72);
      const ecart = r(3, 12) * (Math.random() < 0.5 ? -1 : 1);
      const b = a + ecart;
      return {
        consigne: "Écoute les deux sons. Le deuxième est-il plus aigu ou plus grave que le premier ?",
        jouer: () => {
          jouerFreq(freqMidi(a), 0.6, "piano", 0.3);
          jouerFreq(freqMidi(b), 0.6, "piano", 0.3, 0.8);
        },
        choix: ["Plus aigu ⬆️", "Plus grave ⬇️"],
        bon: b > a ? 0 : 1,
        explication: b > a ? "Le deuxième son vibre plus vite : il est plus aigu." : "Le deuxième son vibre plus lentement : il est plus grave.",
      };
    },
  },
  {
    id: "intensite",
    titre: "Fort ou doux ?",
    age: "dès 6 ans",
    gen: () => {
      const m = r(57, 69);
      const fort = Math.random() < 0.5;
      return {
        consigne: "Même note, deux fois. Le deuxième son est-il plus fort ou plus doux ? (Attention : ce n'est pas aigu/grave !)",
        jouer: () => {
          jouerFreq(freqMidi(m), 0.6, "piano", fort ? 0.08 : 0.35);
          jouerFreq(freqMidi(m), 0.6, "piano", fort ? 0.35 : 0.08, 0.8);
        },
        choix: ["Plus fort 🔊", "Plus doux 🔈"],
        bon: fort ? 0 : 1,
        explication: "La force (l'intensité) n'a rien à voir avec la hauteur : la note est la même, seule l'amplitude de la vibration change.",
      };
    },
  },
  {
    id: "melodie",
    titre: "Ça monte ou ça descend ?",
    age: "dès 7 ans",
    gen: () => {
      const sens = r(0, 2);
      const base = r(60, 67);
      const notes = sens === 0 ? [base, base + 2, base + 4] : sens === 1 ? [base + 4, base + 2, base] : [base, base + 4, base];
      return {
        consigne: "Écoute la petite mélodie de trois notes. Comment bouge-t-elle ?",
        jouer: () => notes.forEach((m, k) => jouerFreq(freqMidi(m), 0.45, "flute", 0.3, k * 0.5)),
        choix: ["Elle monte ↗️", "Elle descend ↘️", "Elle monte puis redescend ⛰️"],
        bon: sens,
        explication: sens === 0 ? "Chaque note est plus aiguë que la précédente : la mélodie monte." : sens === 1 ? "Chaque note est plus grave : la mélodie descend." : "Elle monte puis revient à la note de départ, comme une colline.",
      };
    },
  },
  {
    id: "compter",
    titre: "Combien de notes ?",
    age: "dès 7 ans",
    gen: () => {
      const k = r(1, 5);
      const notes = Array.from({ length: k }, () => r(60, 72));
      return {
        consigne: "Combien de notes entends-tu ?",
        jouer: () => notes.forEach((m, j) => jouerFreq(freqMidi(m), 0.35, "piano", 0.3, j * 0.42)),
        choix: ["1", "2", "3", "4", "5"],
        bon: k - 1,
        explication: `Il y avait ${k} note${k > 1 ? "s" : ""}.`,
      };
    },
  },
  {
    id: "accord",
    titre: "Majeur ou mineur ?",
    age: "dès 10 ans",
    gen: () => {
      const f = r(55, 65);
      const maj = Math.random() < 0.5;
      const notes = [f, f + (maj ? 4 : 3), f + 7];
      return {
        consigne: "Écoute l'accord (trois notes ensemble, puis l'une après l'autre). Est-il majeur (lumineux) ou mineur (plus sombre) ?",
        jouer: () => {
          notes.forEach((m) => jouerFreq(freqMidi(m), 1, "piano", 0.2));
          notes.forEach((m, j) => jouerFreq(freqMidi(m), 0.5, "piano", 0.25, 1.2 + j * 0.45));
        },
        choix: ["Majeur ☀️", "Mineur 🌙"],
        bon: maj ? 0 : 1,
        explication: maj ? "Accord majeur : la tierce est grande (4 demi-tons au-dessus de la base)." : "Accord mineur : la tierce est petite (3 demi-tons au-dessus de la base).",
      };
    },
  },
  {
    id: "intervalle",
    titre: "Quel intervalle ?",
    age: "dès 12 ans",
    gen: () => {
      const types = [
        { nom: "Unisson (même note)", d: 0 },
        { nom: "Tierce majeure", d: 4 },
        { nom: "Quinte juste", d: 7 },
        { nom: "Octave", d: 12 },
      ];
      const k = r(0, types.length - 1);
      const a = r(55, 64);
      return {
        consigne: "Écoute les deux notes. Quel est l'intervalle entre elles ?",
        jouer: () => {
          jouerFreq(freqMidi(a), 0.6, "piano", 0.3);
          jouerFreq(freqMidi(a + types[k].d), 0.6, "piano", 0.3, 0.75);
        },
        choix: types.map((t) => t.nom),
        bon: k,
        explication: `${types[k].nom} : ${types[k].d} demi-tons. ${types[k].d === 12 ? "À l'octave, la fréquence est exactement doublée." : types[k].d === 7 ? "La quinte : rapport de fréquences proche de 3/2." : ""}`,
      };
    },
  },
];
const TOURS = 10;

export function OreilleDor() {
  const child = useChild()!;
  const [niv, setNiv] = useState<(typeof NIVEAUX)[number] | null>(null);
  const [m, setM] = useState<Manche | null>(null);
  const [tour, setTour] = useState(0);
  const [score, setScore] = useState(0);
  const [rep, setRep] = useState<number | null>(null);

  const start = (n: (typeof NIVEAUX)[number]) => {
    setNiv(n);
    setTour(0);
    setScore(0);
    setRep(null);
    const x = n.gen();
    setM(x);
    window.setTimeout(x.jouer, 250);
  };
  const suivant = () => {
    if (!niv) return;
    if (tour + 1 >= TOURS) {
      setTour(TOURS);
      sfx.fanfare();
      updateChild((c) => {
        c.games[`oreille:${niv.id}`] = Math.max(c.games[`oreille:${niv.id}`] ?? 0, score);
        c.games.oreille = Math.max(c.games.oreille ?? 0, score);
      });
      bump("oreille-parties");
      addXp(score * 3);
      return;
    }
    setTour(tour + 1);
    setRep(null);
    const x = niv.gen();
    setM(x);
    window.setTimeout(x.jouer, 250);
  };

  if (!niv || !m)
    return (
      <div className="page">
        <button className="back" onClick={() => go("/jeux")}>
          ← Jeux
        </button>
        <h1>👂 L'Oreille d'or</h1>
        <Bubble who="zero" text="Ferme les yeux, ouvre grand les oreilles ! (Mets un casque ou monte un peu le son.) Chaque partie fait 10 questions." />
        <div className="fam-grid">
          {NIVEAUX.map((n) => (
            <button key={n.id} className="fam-card" onClick={() => start(n)}>
              <strong>{n.titre}</strong>
              <small>{n.age}</small>
              {child.games[`oreille:${n.id}`] !== undefined && <span className="gc-best">🏅 {child.games[`oreille:${n.id}`]}/10</span>}
            </button>
          ))}
        </div>
      </div>
    );

  if (tour >= TOURS)
    return (
      <div className="page center">
        <h1>👂 Partie terminée !</h1>
        <div className="score-big">{score}/10</div>
        <Bubble who={score >= 8 ? "zero" : "mia"} text={score >= 8 ? "Une oreille en or massif ! 🏅" : "L'oreille s'entraîne comme un muscle : rejoue, tu vas progresser vite."} />
        <div className="stack">
          <button className="btn btn-primary btn-xl" onClick={() => start(niv)}>
            🔁 Rejouer
          </button>
          <button className="btn btn-soft" onClick={() => setNiv(null)}>
            Changer de jeu
          </button>
        </div>
      </div>
    );

  return (
    <div className="page narrow">
      <div className="lecon-top">
        <button className="back" onClick={() => setNiv(null)}>
          ✕
        </button>
        <span>
          👂 {tour + 1}/{TOURS}
        </span>
        <span className="score-pill">⭐ {score}</span>
      </div>
      <h1>{niv.titre}</h1>
      <div className="center">
        <Mascot who="zero" size={70} humeur={rep === null ? undefined : rep === m.bon ? "joie" : "surprise"} />
        <p>{m.consigne}</p>
        <button className="btn btn-soft btn-xl" onClick={m.jouer}>
          🔊 Réécouter
        </button>
      </div>
      <div className="choices grid">
        {m.choix.map((c, i) => (
          <button
            key={i}
            type="button"
            disabled={rep !== null}
            className={`choice ${rep === null ? "" : i === m.bon ? "good" : i === rep ? "bad" : ""}`}
            onClick={() => {
              setRep(i);
              if (i === m.bon) {
                sfx.ok();
                setScore(score + 1);
              } else sfx.oops();
            }}
          >
            {c}
          </button>
        ))}
      </div>
      {rep !== null && (
        <div className="center">
          <Bubble who="neo" text={(rep === m.bon ? "Exact ! " : "Pas tout à fait. ") + m.explication} />
          <button className="btn btn-primary btn-xl" onClick={suivant}>
            {tour + 1 >= TOURS ? "Voir mon score" : "Suivant ➜"}
          </button>
        </div>
      )}
    </div>
  );
}
