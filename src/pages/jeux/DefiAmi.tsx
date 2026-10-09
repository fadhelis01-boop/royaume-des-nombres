// Défi entre amis (2.4) : sans serveur ni compte. Le premier joueur répond à 8 questions d'un monde,
// l'appli fabrique un petit code ; l'ami le colle et reçoit EXACTEMENT les mêmes questions
// (même tirage), puis compare les scores et peut renvoyer son propre code.
// Le code ne contient qu'un prénom (ou surnom), un monde, un tirage, un score et un temps.
import { useMemo, useRef, useState } from "react";
import { matiereDe, useContent } from "../../lib/content";
import { instantiate, type Instance } from "../../lib/gen";
import { makeRng } from "../../lib/expr";
import { addGems, bump, useChild } from "../../lib/store";
import { ExercisePlayer } from "../../components/ExercisePlayer";
import { Bubble } from "../../components/Mascot";
import { Coque } from "./JeuxPlanetes";
import type { World } from "../../lib/types";

const NB = 8;
interface Code {
  v: 1;
  w: string; // monde
  s: number; // tirage
  nom: string;
  score: number;
  t: number; // secondes
  ver?: string; // version du contenu
}
const enCode = (c: Code) => "AMI-" + btoa(unescape(encodeURIComponent(JSON.stringify(c)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function deCode(t: string): Code {
  const s = t.trim().replace(/^AMI-/i, "").replace(/-/g, "+").replace(/_/g, "/");
  const c = JSON.parse(decodeURIComponent(escape(atob(s)))) as Code;
  if (c.v !== 1 || !c.w || typeof c.s !== "number") throw new Error("code");
  return c;
}
/** Les mêmes questions sur tous les appareils : choix des exercices et tirages dérivés du seul nombre s. */
function questions(w: World, s: number): Instance[] {
  const specs = w.lecons.flatMap((l) => l.exercices).filter((e) => e.type !== "libre" && e.type !== "dictee");
  const rng = makeRng(s);
  const out: Instance[] = [];
  for (let i = 0; out.length < NB && i < NB * 6 && specs.length; i++) {
    try {
      out.push(instantiate(specs[Math.floor(rng() * specs.length)], s * 31 + i));
    } catch {
      /* tirage impossible : on passe */
    }
  }
  return out;
}
const duree = (t: number) => (t >= 60 ? `${Math.floor(t / 60)} min ${t % 60} s` : `${t} s`);

export function DefiAmi() {
  const child = useChild()!;
  const { worlds, manifest } = useContent();
  const mesMondes = worlds.filter((w) => w.matiere === matiereDe(child) && w.lecons.some((l) => child.progress[`${w.id}/${l.id}`]));
  const [mode, setMode] = useState<"accueil" | "jeu" | "fin">("accueil");
  const [defi, setDefi] = useState<{ w: World; s: number; adverse?: Code } | null>(null);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [colle, setColle] = useState("");
  const [err, setErr] = useState("");
  const [copie, setCopie] = useState("");
  const debut = useRef(0);
  const [temps, setTemps] = useState(0);
  const qs = useMemo(() => (defi ? questions(defi.w, defi.s) : []), [defi]);

  const lancer = (w: World, s: number, adverse?: Code) => {
    setDefi({ w, s, adverse });
    setI(0);
    setScore(0);
    setCopie("");
    debut.current = Date.now();
    setMode("jeu");
  };
  const relever = () => {
    setErr("");
    try {
      const c = deCode(colle);
      const w = worlds.find((x) => x.id === c.w);
      if (!w) throw new Error("monde");
      if (c.ver && manifest?.version && c.ver !== manifest.version) setErr(`Attention : ton ami a une autre version de l'appli (${c.ver}) ; les questions peuvent légèrement différer.`);
      lancer(w, c.s, c);
    } catch {
      setErr("Ce code n'est pas reconnu. Vérifie qu'il commence par « AMI- » et qu'il est complet.");
    }
  };
  const monCode = defi ? enCode({ v: 1, w: defi.w.id, s: defi.s, nom: child.name, score, t: temps, ver: manifest?.version }) : "";
  const partager = async () => {
    const texte = `${child.name} te défie dans la Galaxie des Savoirs (${defi?.w.titre}) : ${score}/${qs.length} en ${duree(temps)}. Ouvre Jeux › Défi entre amis et colle ce code : ${monCode}`;
    try {
      if (navigator.share) await navigator.share({ title: "Défi Galaxie des Savoirs", text: texte });
      else {
        await navigator.clipboard.writeText(texte);
        setCopie("Copié ! Colle-le dans un message.");
      }
    } catch {
      /* annulé */
    }
  };

  if (mode === "jeu" && defi && qs[i])
    return (
      <Coque titre="Défi entre amis" emoji="🤝" qui="neo" consigne={`${defi.w.emoji} ${defi.w.titre} · question ${i + 1} sur ${qs.length}${defi.adverse ? ` · ${defi.adverse.nom} a fait ${defi.adverse.score}/${NB}` : ""}`}>
        <ExercisePlayer
          key={qs[i].seed}
          inst={qs[i]}
          statKey={`${defi.w.id}/defi-ami`}
          maxTries={1}
          autrement={false}
          continueLabel={i + 1 < qs.length ? "Question suivante" : "Voir le résultat"}
          onResult={(r) => {
            const sc = score + (r.ok ? 1 : 0);
            setScore(sc);
            if (i + 1 < qs.length) setI(i + 1);
            else {
              setTemps(Math.round((Date.now() - debut.current) / 1000));
              bump(defi.adverse ? "defi-ami-releve" : "defi-ami-lance");
              addGems(defi.adverse && sc > defi.adverse.score ? 8 : 4);
              setMode("fin");
            }
          }}
        />
      </Coque>
    );

  if (mode === "fin" && defi) {
    const a = defi.adverse;
    const gagne = a ? score > a.score || (score === a.score && temps < a.t) : false;
    const egal = a ? score === a.score && temps === a.t : false;
    return (
      <Coque titre="Défi entre amis" emoji="🤝" qui="neo" consigne={`${defi.w.emoji} ${defi.w.titre}`}>
        <div className="big-score center">
          {score} / {qs.length} <small>en {duree(temps)}</small>
        </div>
        {a && (
          <div className="card center">
            <p>
              <strong>{a.nom}</strong> : {a.score} / {NB} en {duree(a.t)} · <strong>Toi</strong> : {score} / {qs.length} en {duree(temps)}
            </p>
            <Bubble who="neo" humeur={gagne ? "joie" : "reflexion"} text={egal ? "Égalité parfaite ! Vous êtes aussi forts l'un que l'autre." : gagne ? `Tu remportes le défi contre ${a.nom} ! Renvoie-lui ton code pour qu'il prenne sa revanche.` : `${a.nom} gagne cette fois. Ce n'est qu'une manche : relance-lui un défi sur un autre monde !`} />
          </div>
        )}
        <p className="center">Envoie ce code à un ami (ou à un frère, une sœur sur un autre profil) : il aura exactement les mêmes questions.</p>
        <textarea className="code-transfert" readOnly rows={2} value={monCode} onFocus={(e) => e.currentTarget.select()} aria-label="code du défi" />
        <div className="row center">
          <button className="btn btn-primary" onClick={partager}>
            📤 Envoyer le défi
          </button>
          <button className="btn btn-ghost" onClick={() => setMode("accueil")}>
            Retour
          </button>
        </div>
        {copie && <p className="center small">{copie}</p>}
      </Coque>
    );
  }

  return (
    <Coque titre="Défi entre amis" emoji="🤝" qui="neo" consigne="Défie un ami, un frère ou une sœur : vous aurez exactement les mêmes 8 questions. Celui qui en réussit le plus gagne (en cas d'égalité, le plus rapide).">
      <section className="card stack">
        <h3>🎯 J'ai reçu un code</h3>
        <textarea className="code-transfert" rows={2} value={colle} onChange={(e) => setColle(e.target.value)} placeholder="AMI-…" aria-label="code reçu" />
        <button className="btn btn-primary" disabled={!colle.trim()} onClick={relever}>
          Relever le défi
        </button>
        {err && <p className="small">{err}</p>}
      </section>
      <section className="card stack">
        <h3>🚀 Je lance un défi</h3>
        {mesMondes.length ? (
          <div className="choices grid">
            {mesMondes.map((w) => (
              <button key={w.id} className="choice" onClick={() => lancer(w, Math.floor(Math.random() * 1e9))}>
                {w.emoji} {w.titre}
              </button>
            ))}
          </div>
        ) : (
          <p className="small">Commence d'abord une leçon sur cette planète : tu pourras ensuite lancer un défi sur ce monde.</p>
        )}
      </section>
    </Coque>
  );
}
