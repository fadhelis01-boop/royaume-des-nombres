import { useEffect, useMemo, useRef, useState } from "react";
import { go } from "../../lib/router";
import { sfx } from "../../lib/sound";
import { addXp, bump, collectWord, updateChild, useChild } from "../../lib/store";
import { avecPronom, formes, TEMPS_NOMS, type Temps } from "../../lib/fr/conjugaison";
import { normOrtho } from "../../lib/fr/morpho";
import { AccentBar, DicteeCorrection } from "../../components/FrExercices";
import { Bubble, Mascot } from "../../components/Mascot";
import { chargerDico, type Entree } from "../Dico";

// Les trois jeux de l'Archipel des Mots : conjugaison éclair (automatiser les formes
// fréquentes), mot mystère (vocabulaire par la définition) et dictée flash
// (mémoire orthographique : voir, retenir, écrire).

const record = (key: string, score: number) =>
  updateChild((c) => {
    c.games[key] = Math.max(c.games[key] ?? 0, score);
  });

function Saisie({ id, val, setVal, onSubmit, disabled, label }: { id: string; val: string; setVal: (v: string) => void; onSubmit: () => void; disabled?: boolean; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), [disabled]);
  return (
    <>
      <input
        ref={ref}
        id={id}
        className="answer-input xl"
        value={val}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={disabled}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        aria-label={label}
      />
      <AccentBar inputId={id} value={val} onChange={setVal} disabled={disabled} />
      <div className="center">
        <button className="btn btn-primary btn-xl" onClick={onSubmit} disabled={disabled || !val.trim()}>
          Valider ✔
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Conjugaison éclair
const NIVEAUX: { id: string; titre: string; verbes: string[]; temps: Temps[] }[] = [
  { id: "present", titre: "Présent des verbes fréquents", verbes: ["être", "avoir", "aller", "faire", "dire", "venir", "chanter", "jouer", "finir", "prendre", "voir", "pouvoir"], temps: ["present"] },
  { id: "recit", titre: "Futur et imparfait", verbes: ["être", "avoir", "aller", "faire", "venir", "chanter", "finir", "prendre", "voir", "vouloir", "manger", "appeler"], temps: ["futur", "imparfait"] },
  { id: "compose", titre: "Passé composé (être ou avoir ?)", verbes: ["chanter", "finir", "prendre", "faire", "voir", "partir", "arriver", "venir", "tomber", "naître", "mettre", "écrire"], temps: ["passe_compose"] },
  { id: "maitre", titre: "Passé simple, conditionnel, subjonctif", verbes: ["être", "avoir", "aller", "faire", "venir", "prendre", "voir", "pouvoir", "savoir", "vouloir", "chanter", "finir"], temps: ["passe_simple", "conditionnel", "subjonctif"] },
];

function tirerConj(n: (typeof NIVEAUX)[number]) {
  const v = n.verbes[Math.floor(Math.random() * n.verbes.length)];
  const t = n.temps[Math.floor(Math.random() * n.temps.length)];
  const p = 1 + Math.floor(Math.random() * 6);
  const attendu = formes(v, t, p);
  const complet = avecPronom(v, t, p)[0];
  const pronom = complet.slice(0, complet.length - attendu[0].length).trimEnd();
  return { v, t, attendu, pronom };
}

export function ConjugaisonEclair() {
  const child = useChild()!;
  const [niv, setNiv] = useState<(typeof NIVEAUX)[number] | null>(null);
  const [q, setQ] = useState<ReturnType<typeof tirerConj> | null>(null);
  const [val, setVal] = useState("");
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(60);
  const [flash, setFlash] = useState<"ok" | "ko" | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const over = !!niv && left <= 0;

  useEffect(() => {
    if (!niv || over) return;
    const id = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, [niv, over]);
  useEffect(() => {
    if (!over || !niv) return;
    sfx.fanfare();
    record(`conj:${niv.id}`, score);
    record("conj", score);
    bump("conj-parties");
    addXp(Math.min(60, score * 3));
  }, [over]);

  const start = (n: (typeof NIVEAUX)[number]) => {
    setNiv(n);
    setQ(tirerConj(n));
    setScore(0);
    setLeft(60);
    setErreurs([]);
    setVal("");
  };
  const submit = () => {
    if (!q || !niv || over || !val.trim()) return;
    const ok = q.attendu.some((a) => normOrtho(a) === normOrtho(val));
    ok ? sfx.ok() : sfx.oops();
    setFlash(ok ? "ok" : "ko");
    if (ok) setScore((s) => s + 1);
    else setErreurs((e) => [...e, `${q.v}, ${TEMPS_NOMS[q.t]} : ${q.pronom}${q.pronom.endsWith("'") ? "" : " "}${q.attendu[0]}`]);
    setTimeout(() => setFlash(null), 250);
    setVal("");
    setQ(tirerConj(niv));
  };

  if (!niv)
    return (
      <div className="page">
        <button className="back" onClick={() => go("/jeux")}>
          ← Jeux
        </button>
        <h1>⚡ Conjugaison éclair</h1>
        <Bubble who="neo" text="60 secondes pour conjuguer un maximum de verbes. Les formes que tu connais par cœur, tu n'as plus besoin d'y penser !" />
        <div className="fam-grid">
          {NIVEAUX.map((n) => (
            <button key={n.id} className="fam-card" onClick={() => start(n)}>
              <strong>{n.titre}</strong>
              {child.games[`conj:${n.id}`] !== undefined && <span className="gc-best">🏅 {child.games[`conj:${n.id}`]}</span>}
            </button>
          ))}
        </div>
      </div>
    );

  if (over)
    return (
      <div className="page center">
        <h1>⏱ Temps écoulé !</h1>
        <div className="score-big">{score}</div>
        <Bubble who={score >= 12 ? "zero" : "mia"} text={score >= 12 ? `${score} verbes ! Ma plume en tremble ! 😳` : "Chaque partie grave un peu plus les formes dans ta mémoire."} />
        {erreurs.length > 0 && (
          <div className="card left">
            <strong>À retenir :</strong>
            <ul>
              {erreurs.slice(0, 8).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="stack">
          <button className="btn btn-primary btn-xl" onClick={() => start(niv)}>
            🔁 Rejouer
          </button>
          <button className="btn btn-soft" onClick={() => setNiv(null)}>
            Changer de niveau
          </button>
        </div>
      </div>
    );

  return (
    <div className="page eclair">
      <div className="lecon-top">
        <button className="back" onClick={() => setNiv(null)}>
          ✕
        </button>
        <div className={`timer ${left <= 10 ? "hurry" : ""}`}>⏱ {left}s</div>
        <div className="score-pill">⭐ {score}</div>
      </div>
      {q && (
        <>
          <p className="center muted">
            {q.v} — {TEMPS_NOMS[q.t]}
          </p>
          <div className={`eclair-q ${flash ?? ""}`}>
            {q.pronom}
            {q.pronom.endsWith("'") ? "" : " "}…
          </div>
        </>
      )}
      <Saisie id="conj-eclair" val={val} setVal={setVal} onSubmit={submit} label="forme conjuguée" />
      <Mascot who="neo" size={60} className="eclair-neo" talking={flash === "ok"} />
    </div>
  );
}

// ---------------------------------------------------------------- Mot mystère
const MANCHES = 8;

export function MotMystere() {
  const child = useChild()!;
  const [dico, setDico] = useState<Entree[] | null>(null);
  const [manche, setManche] = useState(0);
  const [score, setScore] = useState(0);
  const [indices, setIndices] = useState(1);
  const [val, setVal] = useState("");
  const [fin, setFin] = useState<null | boolean>(null);
  useEffect(() => {
    chargerDico().then(setDico).catch(() => setDico([]));
  }, []);
  const pool = useMemo(() => {
    if (!dico) return [];
    const max = child.age < 9 ? 1 : child.age < 12 ? 2 : 3;
    const ok = dico.filter((e) => e.niveau <= max && !/\s/.test(e.mot) && e.mot.length >= 3);
    return [...ok].sort(() => Math.random() - 0.5).slice(0, MANCHES);
  }, [dico]);
  const e = pool[manche];
  const over = !!dico && manche >= Math.min(MANCHES, pool.length);

  useEffect(() => {
    if (!over || !dico) return;
    sfx.fanfare();
    record("mystere", score);
    bump("mystere-parties");
    addXp(Math.min(60, score * 2));
  }, [over]);

  if (!dico) return <p className="page muted center">Chargement du dictionnaire…</p>;

  // l'indice : première lettre, puis une lettre de plus à chaque indice demandé
  const masque = e ? [...e.mot].map((ch, i) => (i < indices || /[-' ]/.test(ch) ? ch : "_")).join(" ") : "";
  const points = e ? Math.max(1, e.mot.length - indices + 1) : 0;

  const submit = () => {
    if (!e || fin !== null || !val.trim()) return;
    const ok = normOrtho(val) === normOrtho(e.mot);
    if (ok) {
      sfx.ok();
      setScore((s) => s + points);
      collectWord(e.mot);
      setFin(true);
    } else {
      sfx.oops();
      setVal("");
      if (indices + 1 >= e.mot.length) setFin(false);
      else setIndices(indices + 1);
    }
  };
  const suivant = () => {
    setManche(manche + 1);
    setIndices(1);
    setVal("");
    setFin(null);
  };

  if (over)
    return (
      <div className="page center">
        <h1>🔍 Partie terminée !</h1>
        <div className="score-big">{score}</div>
        <p>{child.games["mystere"] === score && score > 0 ? "🏅 Nouveau record !" : `Ton record : ${child.games["mystere"] ?? 0}`}</p>
        <Bubble who="mia" text="Les mots trouvés sont rangés dans ton carnet du dictionnaire. Va les relire de temps en temps !" />
        <div className="stack">
          <button
            className="btn btn-primary btn-xl"
            onClick={() => {
              setDico([...dico]);
              setManche(0);
              setScore(0);
              setIndices(1);
              setFin(null);
            }}
          >
            🔁 Rejouer
          </button>
          <button className="btn btn-soft" onClick={() => go("/dico")}>
            Ouvrir mon carnet
          </button>
        </div>
      </div>
    );

  return (
    <div className="page narrow">
      <div className="lecon-top">
        <button className="back" onClick={() => go("/jeux")}>
          ✕
        </button>
        <span>
          🔍 {manche + 1}/{Math.min(MANCHES, pool.length)}
        </span>
        <span className="score-pill">⭐ {score}</span>
      </div>
      <h1>Mot mystère</h1>
      <div className="card">
        <p className="muted">
          {e.nature}
          {e.genre === "f" ? " féminin" : e.genre === "m" ? " masculin" : ""}
        </p>
        <p className="lead">{e.def}</p>
        <p className="mystere-masque" aria-label={`${e.mot.length} lettres`}>
          {masque}
        </p>
        {fin === null && <p className="muted small">Ce mot vaut encore {points} point(s). Une erreur dévoile une lettre.</p>}
      </div>
      {fin === null ? (
        <>
          <Saisie id="mot-mystere" val={val} setVal={setVal} onSubmit={submit} label="ta réponse" />
          <div className="center">
            <button className="btn btn-ghost" onClick={() => (indices + 1 >= e.mot.length ? setFin(false) : setIndices(indices + 1))}>
              💡 Une lettre de plus
            </button>
          </div>
        </>
      ) : (
        <div className="center">
          <Bubble who={fin ? "zero" : "mia"} text={fin ? `Bravo ! « ${e.mot} » ! ${e.exemple ?? ""}` : `C'était « ${e.mot} ». ${e.exemple ?? ""}`} />
          <button className="btn btn-primary btn-xl" onClick={suivant}>
            Mot suivant ➜
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Dictée flash
const PHRASES = 6;

export function DicteeFlash() {
  const child = useChild()!;
  const [dico, setDico] = useState<Entree[] | null>(null);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"voir" | "ecrire" | "corrige">("voir");
  const [val, setVal] = useState("");
  const [score, setScore] = useState(0);
  useEffect(() => {
    chargerDico().then(setDico).catch(() => setDico([]));
  }, []);
  const phrases = useMemo(() => {
    if (!dico) return [];
    const max = child.age < 9 ? 1 : child.age < 12 ? 2 : 3;
    // les exemples du dictionnaire : de vraies phrases courtes, sans guillemets ni citation
    const ok = dico.filter((e) => e.niveau <= max && e.exemple && e.exemple.length <= 60 && !/[«»"()]/.test(e.exemple)).map((e) => e.exemple!);
    return [...new Set(ok)].sort(() => Math.random() - 0.5).slice(0, PHRASES);
  }, [dico]);
  const p = phrases[i];
  const duree = p ? Math.min(7000, 2500 + p.length * 60) : 0;
  const over = !!dico && i >= phrases.length;

  useEffect(() => {
    if (phase !== "voir" || !p) return;
    const id = setTimeout(() => setPhase("ecrire"), duree);
    return () => clearTimeout(id);
  }, [phase, p]);
  useEffect(() => {
    if (!over || !dico) return;
    sfx.fanfare();
    record("flash", score);
    bump("flash-parties");
    addXp(Math.min(60, score * 8));
  }, [over]);

  if (!dico) return <p className="page muted center">Chargement…</p>;
  if (over)
    return (
      <div className="page center">
        <h1>📸 Dictée flash terminée !</h1>
        <div className="score-big">
          {score}/{phrases.length}
        </div>
        <Bubble who="neo" text="Photographier les mots dans sa tête, c'est le secret des champions d'orthographe." />
        <div className="stack">
          <button
            className="btn btn-primary btn-xl"
            onClick={() => {
              setDico([...dico]);
              setI(0);
              setScore(0);
              setPhase("voir");
            }}
          >
            🔁 Rejouer
          </button>
          <button className="btn btn-soft" onClick={() => go("/jeux")}>
            Autres jeux
          </button>
        </div>
      </div>
    );

  const juste = normOrtho(val) === normOrtho(p);
  return (
    <div className="page narrow">
      <div className="lecon-top">
        <button className="back" onClick={() => go("/jeux")}>
          ✕
        </button>
        <span>
          📸 {i + 1}/{phrases.length}
        </span>
        <span className="score-pill">⭐ {score}</span>
      </div>
      <h1>Dictée flash</h1>
      {phase === "voir" && (
        <>
          <Bubble who="mia" text="Regarde bien cette phrase… elle va disparaître !" />
          <div className="card flash-phrase lead">{p}</div>
          <div className="flash-barre" style={{ animationDuration: `${duree}ms` }} />
        </>
      )}
      {phase === "ecrire" && (
        <>
          <Bubble who="mia" text="À toi ! Écris la phrase de mémoire." />
          <Saisie
            id="dictee-flash"
            val={val}
            setVal={setVal}
            label="la phrase"
            onSubmit={() => {
              if (!val.trim()) return;
              juste ? sfx.ok() : sfx.oops();
              if (juste) setScore(score + 1);
              setPhase("corrige");
            }}
          />
        </>
      )}
      {phase === "corrige" && (
        <div className="center">
          <DicteeCorrection attendu={p} donne={val} />
          <button
            className="btn btn-primary btn-xl"
            onClick={() => {
              setI(i + 1);
              setVal("");
              setPhase("voir");
            }}
          >
            Phrase suivante ➜
          </button>
        </div>
      )}
    </div>
  );
}
