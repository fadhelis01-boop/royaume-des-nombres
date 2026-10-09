import { useEffect, useMemo, useRef, useState } from "react";
import { useContent } from "../lib/content";
import { go } from "../lib/router";
import { addXp, bump, updateChild, useChild } from "../lib/store";
import { speak, stopSpeaking } from "../lib/tts";
import { Bubble } from "../components/Mascot";
import type { EssaiFluence, TexteFluence } from "../lib/types";

// Lecture chronométrée (fluence). Méthode des enseignants : l'enfant lit à voix haute pendant
// une minute, l'adulte touche les mots mal lus, puis le dernier mot atteint.
// Résultat : mots correctement lus par minute (MCLM), comparé aux repères des livrets
// d'accompagnement Éduscol (programme du 31 octobre 2024).
// L'enregistrement audio éventuel reste en mémoire le temps de l'écoute : il n'est jamais conservé.

const NIVEAUX: TexteFluence["niveau"][] = ["CP", "CE1", "CE2", "CM"];
/** repères de fin d'année : [sans préparation, après préparation] */
const REPERES: Record<string, { sans: number; prep: number; label: string }> = {
  CP: { sans: 30, prep: 50, label: "fin de CP" },
  CE1: { sans: 70, prep: 70, label: "fin de CE1" },
  CE2: { sans: 90, prep: 90, label: "fin de CE2" },
  // au CM, le repère de fin de CE2 doit être acquis ; l'enjeu devient la lecture expressive et la compréhension
  CM: { sans: 90, prep: 90, label: "fin de CE2" },
};
const PROSODIE = ["J'ai respecté les points et les virgules", "J'ai mis le ton (questions, dialogues)", "J'ai lu par groupes de mots, pas mot à mot"];
const DUREE = 60;

const niveauPourAge = (age: number): TexteFluence["niveau"] => (age <= 6 ? "CP" : age === 7 ? "CE1" : age === 8 ? "CE2" : "CM");

type Phase = "choix" | "pret" | "lecture" | "dernier" | "resultat";

export function Fluence() {
  const child = useChild()!;
  const { manifest } = useContent();
  const textes = manifest?.fluence ?? [];
  const [niveau, setNiveau] = useState<TexteFluence["niveau"]>(() => niveauPourAge(child.age));
  const [texte, setTexte] = useState<TexteFluence | null>(null);
  const [prepare, setPrepare] = useState(false);
  const [enregistrer, setEnregistrer] = useState(false);
  const [phase, setPhase] = useState<Phase>("choix");
  const [erreurs, setErreurs] = useState<Set<number>>(new Set());
  const [dernier, setDernier] = useState<number | null>(null);
  const [reste, setReste] = useState(DUREE);
  const [secondes, setSecondes] = useState(DUREE);
  const [prosodie, setProsodie] = useState<number[]>([]);
  const [audio, setAudio] = useState<string | null>(null);
  const debut = useRef(0);
  const rec = useRef<MediaRecorder | null>(null);
  const mots = useMemo(() => (texte ? texte.texte.split(" ") : []), [texte]);

  // le chrono
  useEffect(() => {
    if (phase !== "lecture") return;
    const t = setInterval(() => {
      const r = DUREE - Math.floor((Date.now() - debut.current) / 1000);
      setReste(Math.max(0, r));
      if (r <= 0) {
        clearInterval(t);
        arreter(DUREE);
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  useEffect(() => () => libererAudio(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const libererAudio = () => {
    try {
      rec.current?.stream.getTracks().forEach((tr) => tr.stop());
    } catch {
      /* rien à libérer */
    }
    rec.current = null;
  };

  const demarrer = async () => {
    stopSpeaking();
    setErreurs(new Set());
    setDernier(null);
    setProsodie([]);
    if (audio) URL.revokeObjectURL(audio);
    setAudio(null);
    if (enregistrer && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const r = new MediaRecorder(stream);
        const morceaux: Blob[] = [];
        r.ondataavailable = (e) => morceaux.push(e.data);
        r.onstop = () => {
          setAudio(URL.createObjectURL(new Blob(morceaux, { type: r.mimeType })));
          stream.getTracks().forEach((tr) => tr.stop());
        };
        r.start();
        rec.current = r;
      } catch {
        setEnregistrer(false); // micro refusé : on lit sans enregistrer
      }
    }
    debut.current = Date.now();
    setReste(DUREE);
    setPhase("lecture");
  };

  const arreter = (s: number) => {
    if (rec.current?.state === "recording") rec.current.stop();
    const sec = Math.max(5, Math.min(DUREE, s));
    setSecondes(sec);
    // texte fini avant la minute… sauf si c'est trop rapide pour être vrai (plus de 250 mots/min)
    const plausible = (mots.length * 60) / sec <= 250;
    if (s < DUREE && plausible) {
      setDernier(mots.length - 1);
      setPhase("resultat");
    } else {
      setDernier(null);
      setPhase("dernier");
    }

  };

  const toggleErreur = (i: number) => {
    if (phase === "dernier") {
      setDernier(i);
      return;
    }
    if (phase !== "lecture") return;
    setErreurs((e) => {
      const n = new Set(e);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  const lus = dernier === null ? 0 : dernier + 1;
  const nbErreurs = [...erreurs].filter((i) => dernier === null || i <= dernier).length;
  const mclm = Math.round(((lus - nbErreurs) * 60) / secondes);
  const rep = REPERES[texte?.niveau ?? niveau];
  const cible = prepare ? rep.prep : rep.sans;

  const sauver = () => {
    if (!texte) return;
    const essai: EssaiFluence = { at: Date.now(), texte: texte.id, niveau: texte.niveau, prepare, lus, erreurs: nbErreurs, secondes, mclm, prosodie };
    updateChild((c) => {
      c.fluence = [essai, ...(c.fluence ?? [])].slice(0, 50);
    });
    bump("fluence");
    addXp(15);
    setPhase("choix");
    setTexte(null);
  };

  const historique = (child.fluence ?? []).slice(0, 8);
  const titre = (
    <div className="lecon-top">
      <button
        className="back"
        onClick={() => {
          stopSpeaking();
          libererAudio();
          go("/");
        }}
        aria-label="Quitter"
      >
        ✕
      </button>
      <h1 className="lecon-title small">⏱️ Lecture chronométrée</h1>
    </div>
  );

  if (phase === "choix" || !texte)
    return (
      <div className="page fluence">
        {titre}
        <Bubble who="mia" text="Lire vite ET bien, ça s'entraîne comme un sport ! Lis un texte à voix haute pendant une minute, avec un adulte à côté de toi. Il touchera les mots difficiles." k="fluence:intro" />
        <div className="chips" role="group" aria-label="Niveau">
          {NIVEAUX.map((n) => (
            <button key={n} className={`chip ${n === niveau ? "sel" : ""}`} aria-pressed={n === niveau} onClick={() => setNiveau(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="fluence-liste">
          {textes
            .filter((t) => t.niveau === niveau)
            .map((t) => (
              <button
                key={t.id}
                className="card fluence-carte"
                onClick={() => {
                  setTexte(t);
                  setPhase("pret");
                }}
              >
                <strong>{t.titre}</strong>
                <span className="small muted">{t.texte.split(" ").length} mots</span>
              </button>
            ))}
        </div>
        {historique.length > 0 && (
          <div className="card">
            <h2>Mes lectures</h2>
            <ul className="fluence-histo">
              {historique.map((e) => (
                <li key={e.at}>
                  <span>{new Date(e.at).toLocaleDateString("fr-FR")}</span>
                  <span>{textes.find((t) => t.id === e.texte)?.titre ?? e.texte}</span>
                  <strong>{e.mclm} mots/min</strong>
                  <span className="small muted">{e.prepare ? "préparé" : "découverte"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="small muted">Repères officiels (livrets d'accompagnement Éduscol, programme 2024) : fin de CP 30 mots/min sans préparation et 50 après préparation ; fin de CE1 70 ; fin de CE2 90. Ce sont des objectifs de fin d'année : en cours d'année, c'est la progression qui compte.</p>
      </div>
    );

  return (
    <div className="page fluence">
      {titre}
      <h2 className="center">{texte.titre}</h2>
      {phase === "pret" && (
        <div className="card stack">
          <p>
            <strong>Pour l'adulte :</strong> quand l'enfant lit, touchez chaque mot <em>mal lu ou sauté</em> (il devient rouge ; retouchez pour annuler). À la fin de la minute, touchez le dernier mot atteint.
          </p>
          <label className="row">
            <input type="checkbox" checked={prepare} onChange={(e) => setPrepare(e.target.checked)} /> Texte déjà préparé (lu ou écouté avant)
          </label>
          <label className="row">
            <input type="checkbox" checked={enregistrer} onChange={(e) => setEnregistrer(e.target.checked)} /> M'enregistrer pour me réécouter (rien n'est conservé)
          </label>
          <div className="row">
            <button className="btn btn-soft" onClick={() => speak([{ who: "narrateur", text: texte.texte }], { key: "fluence:modele" })}>
              🔊 Écouter le texte d'abord
            </button>
            <button className="btn btn-primary btn-xl" onClick={demarrer}>
              ▶ C'est parti (1 minute)
            </button>
          </div>
        </div>
      )}
      {phase === "lecture" && (
        <div className="fluence-chrono" aria-live="polite">
          ⏱️ {reste} s
          <button className="btn btn-soft" onClick={() => arreter((Date.now() - debut.current) / 1000)}>
            J'ai fini le texte
          </button>
        </div>
      )}
      {phase === "dernier" && <p className="fluence-consigne">{secondes >= DUREE ? "⏰ Temps écoulé !" : "🤔 C'était très rapide !"} Touche le <strong>dernier mot lu</strong>.</p>}

      {phase !== "pret" && phase !== "resultat" && (
        <p className="fluence-texte">
          {mots.map((m, i) => (
            <span key={i}>
              <button type="button" className={`fluence-mot ${erreurs.has(i) ? "err" : ""} ${dernier !== null && i > dernier ? "apres" : ""}`} onClick={() => toggleErreur(i)}>
                {m}
              </button>{" "}
            </span>
          ))}
        </p>
      )}
      {phase === "dernier" && dernier !== null && (
        <div className="center">
          <button className="btn btn-primary" onClick={() => setPhase("resultat")}>
            Voir mon résultat ➜
          </button>
        </div>
      )}
      {phase === "resultat" && (
        <div className="card stack center">
          <div className="big-score">
            {mclm} <small>mots par minute</small>
          </div>
          <p className="small muted">
            {lus} mots lus, {nbErreurs} erreur{nbErreurs > 1 ? "s" : ""}, en {Math.round(secondes)} s.
          </p>
          <Bubble
            who="mia"
            humeur="joie"
            text={
              mclm >= cible
                ? `Bravo ! Tu as atteint le repère de ${rep.label} (${cible} mots par minute). Maintenant, travaille la lecture expressive : le ton, les pauses.`
                : `Tu progresses ! Le repère de ${rep.label} est de ${cible} mots par minute : c'est un objectif de fin d'année. Relis ce même texte demain : tu verras la différence.`
            }
          />
          {audio && (
            <div>
              <p className="small">🎧 Réécoute-toi :</p>
              <audio controls src={audio} />
            </div>
          )}
          <div className="stack">
            <p className="small">Comment as-tu lu ? (touche ce qui est vrai)</p>
            {PROSODIE.map((p, i) => (
              <button key={i} className={`chip ${prosodie.includes(i) ? "sel" : ""}`} aria-pressed={prosodie.includes(i)} onClick={() => setProsodie((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))}>
                {prosodie.includes(i) ? "✅" : "⬜"} {p}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-xl" onClick={sauver}>
            💾 Garder ce résultat
          </button>
          <button className="btn btn-ghost" onClick={() => setPhase("pret")}>
            🔁 Relire ce texte
          </button>
        </div>
      )}
    </div>
  );
}
