import { useEffect, useState } from "react";
import { go } from "../lib/router";
import { histoireDe, matiereDe, prologueId, useContent } from "../lib/content";
import { currentSession, useChild } from "../lib/store";
import { say } from "../lib/tts";
import { Mascot } from "./Mascot";
import { Avatar } from "./Avatar";

// Une séance a un début et une fin, comme un épisode :
// « Précédemment dans le Royaume… » à l'arrivée, et une vraie clôture vers 15 minutes.

/** Rappel de l'histoire en arrivant (seulement au début d'une nouvelle séance). */
export function Recap() {
  const child = useChild()!;
  const { manifest, worlds } = useContent();
  const [hidden, setHidden] = useState(false);
  const mat = matiereDe(child);
  const h = histoireDe(manifest, mat);
  if (hidden || !h || currentSession(child) || !child.story?.[prologueId(mat)]) return null;
  const seen = Object.entries(child.story ?? {}).sort((a, b) => b[1] - a[1]);
  let text = "";
  for (const [id] of seen) {
    if (id.startsWith("avant:")) {
      const w = worlds.find((x) => x.id === id.slice(6) && x.matiere === mat);
      const ch = h.chapitres[id.slice(6)];
      if (w && ch) {
        const lit = child.crystals?.includes(w.id);
        text = lit ? `Tu as rallumé ${ch.objet} dans ${w.titre}. Mais le Grignoteur rôde encore ailleurs…` : `Tu étais dans ${w.titre}. ${ch.objet} attend toujours d'être rallumé !`;
        break;
      }
    }
    if (id.startsWith("fin-")) {
      const arc = h.arcs.find((a) => `fin-${a.id}` === id);
      if (arc) {
        text = `Tu as terminé « ${arc.titre} ». Un nouveau mystère commence…`;
        break;
      }
    }
    if (id === prologueId(mat)) {
      text = mat === "francais" ? "Gribouille, la tache d'encre, a commencé à effacer les mots de l'Archipel. Mia, Néo et Zéro comptent sur toi !" : "Le Grignoteur a commencé à éteindre les cristaux du Royaume. Mia, Néo et Zéro comptent sur toi !";
      break;
    }
  }
  if (!text) return null;
  return (
    <div className="recap card" role="note">
      <Mascot who="narrateur" size={48} />
      <div>
        <div className="recap-title">Précédemment dans le Royaume…</div>
        <p>{text}</p>
      </div>
      <div className="recap-actions">
        <button className="btn btn-small btn-soft" onClick={() => say("narrateur", "Précédemment dans le Royaume… " + text)} aria-label="Écouter">
          🔊
        </button>
        <button className="btn btn-small" onClick={() => setHidden(true)} aria-label="Fermer">
          ✕
        </button>
      </div>
    </div>
  );
}

const SESSION_MIN = 15;

/** Vers 15 minutes, une clôture douce (on peut continuer : ce n'est pas une limite). */
export function FinDeSeance() {
  const child = useChild();
  const s = currentSession(child);
  const [closedFor, setClosedFor] = useState<number>(() => {
    try {
      return Number(sessionStorage.getItem("rdn-fin-seance") ?? 0);
    } catch {
      return 0;
    }
  });
  const show = !!child && !!s && s.min >= SESSION_MIN && closedFor !== s.start;
  useEffect(() => {
    if (show) say("zero", `Quinze minutes de maths ! ${s!.q} questions ! Ton cerveau est tout chaud.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);
  if (!show) return null;
  const close = () => {
    setClosedFor(s!.start);
    try {
      sessionStorage.setItem("rdn-fin-seance", String(s!.start));
    } catch {
      /* rien */
    }
  };
  return (
    <div className="celebration" role="dialog" aria-modal aria-label="Fin de séance">
      <div className="celebration-card">
        <Avatar child={child!} size={90} humeur="fier" />
        <h2>Belle séance !</h2>
        <p>
          {s!.q} réponses en {s!.min} minutes. C'est le moment idéal pour faire une pause : ton cerveau range ce que tu as appris pendant que tu joues ailleurs.
        </p>
        <p className="muted small">Pendant ce temps, le Grignoteur prépare un mauvais coup… À demain ?</p>
        <div className="stack">
          <button
            className="btn btn-primary"
            onClick={() => {
              close();
              go("/aventure");
            }}
          >
            👋 À demain ! (voir l'aventure)
          </button>
          <button className="btn btn-soft" onClick={close}>
            Encore un peu
          </button>
        </div>
      </div>
    </div>
  );
}
