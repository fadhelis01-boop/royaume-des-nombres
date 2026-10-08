import { useRef, useState } from "react";
import { addXp, bump, toast, updateChild, useChild } from "../lib/store";
import { sfx } from "../lib/sound";
import type { Step } from "../lib/types";
import { Bubble, Mascot } from "./Mascot";
import { Md } from "./Md";
import { ajouterOeuvre, Toile, type ToileApi } from "./Dessin";

// Étapes de leçon des nouvelles planètes :
//  - l'expérience à faire pour de vrai (bible §10 : niveau de sécurité, prédiction, observation)
//  - le dessin pas à pas (bible §32 : couches successives, guide en pointillés, jamais de note)

const SECU = {
  vert: { emoji: "🟢", titre: "Tu peux la faire seul", texte: "Sans danger. Range et nettoie après !" },
  orange: { emoji: "🟠", titre: "Avec un adulte", texte: "Demande à un adulte de rester avec toi pendant toute l'expérience." },
  rouge: { emoji: "🔴", titre: "À regarder seulement", texte: "⚠️ Ne fais JAMAIS cette expérience chez toi : on la découvre ici, sans danger." },
};

export function Experience({ step, id }: { step: Extract<Step, { kind: "experience" }>; id: string }) {
  const child = useChild()!;
  const done = child.vraieVie?.includes(id);
  const [pred, setPred] = useState<number | null>(null);
  const [coches, setCoches] = useState<number[]>([]);
  const [vu, setVu] = useState(step.securite === "rouge");
  const sec = SECU[step.securite];
  return (
    <div className={`st-experience secu-${step.securite}`}>
      <div className="st-label">🧪 Expérience : {step.titre}</div>
      <div className={`secu-badge secu-${step.securite}`}>
        <strong>
          {sec.emoji} {sec.titre}
        </strong>
        <span>{sec.texte}</span>
      </div>
      {step.materiel.length > 0 && (
        <div className="xp-materiel">
          <strong>🧰 Le matériel</strong>
          <ul>
            {step.materiel.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {step.prediction && (
        <div className="xp-prediction">
          <Bubble who="zero" text={`Avant de commencer : ${step.prediction.question} Fais un pari ! (Ici, se tromper n'est pas grave : les scientifiques parient puis vérifient.)`} />
          <div className="choices grid">
            {step.prediction.choix.map((c, i) => (
              <button key={i} type="button" className={`choice ${pred === i ? "sel" : ""}`} onClick={() => setPred(i)}>
                <Md text={c} inline />
              </button>
            ))}
          </div>
        </div>
      )}
      {step.securite !== "rouge" && step.etapes.length > 0 && (
        <ol className="xp-etapes">
          {step.etapes.map((e, i) => (
            <li key={i}>
              <label>
                <input type="checkbox" checked={coches.includes(i)} onChange={() => setCoches((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))} /> <Md text={e} inline />
              </label>
            </li>
          ))}
        </ol>
      )}
      {!vu ? (
        <div className="center">
          <button type="button" className="btn btn-primary" disabled={!!step.prediction && pred === null} onClick={() => setVu(true)}>
            👀 J'ai observé : qu'est-ce qui se passe ?
          </button>
          <p className="small muted">Pas de matériel sous la main ? Tu peux aussi regarder directement le résultat.</p>
        </div>
      ) : (
        <div className="xp-resultat">
          <div className="st-row">
            <Mascot who="neo" size={56} humeur="joie" />
            <div>
              <p>
                <strong>Ce qu'on observe :</strong> <Md text={step.observation} inline />
              </p>
              <p>
                <strong>Pourquoi ?</strong> <Md text={step.explication} inline />
              </p>
            </div>
          </div>
          {step.securite !== "rouge" &&
            (done ? (
              <p className="ok-text center">✅ Expérience réalisée, bravo, jeune savant !</p>
            ) : (
              <div className="center">
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={() => {
                    updateChild((x) => {
                      x.vraieVie = [...(x.vraieVie ?? []), id];
                    });
                    bump("experience");
                    addXp(25);
                    sfx.star();
                  }}
                >
                  ✅ Je l'ai faite pour de vrai !
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function DessinPasAPas({ step, onAnswered }: { step: Extract<Step, { kind: "dessin" }>; onAnswered?: () => void }) {
  const [k, setK] = useState(0);
  const [fini, setFini] = useState(false);
  const [modele, setModele] = useState(false);
  const [msg, setMsg] = useState<string>();
  const toile = useRef<ToileApi>(null);
  const et = step.etapes[k];
  const guides = modele ? step.etapes.map((e) => ({ d: e.trace, etat: "actuel" as const })) : step.etapes.slice(0, fini ? step.etapes.length : k + 1).map((e, i) => ({ d: e.trace, etat: (i < k || fini ? "fait" : "actuel") as "fait" | "actuel" }));
  const suivant = () => {
    // vérification tolérante : on encourage, on ne bloque jamais
    const c = et.trace ? toile.current?.couverture(et.trace) ?? 1 : 1;
    setMsg(c >= 0.6 ? "Bravo, ton trait suit bien le guide !" : c >= 0.25 ? "Pas mal ! Tu peux t'approcher encore un peu des pointillés." : "Essaie de passer ton doigt sur les pointillés orange : c'est ton guide.");
    if (c >= 0.25 || !et.trace) {
      sfx.ok();
      if (k + 1 < step.etapes.length) setK(k + 1);
      else {
        setFini(true);
        onAnswered?.();
        bump("dessin");
        addXp(20);
      }
    } else sfx.oops();
  };
  return (
    <div className="st-dessin">
      <div className="st-label">✏️ Dessin pas à pas : {step.titre}</div>
      {!fini ? (
        <Bubble who="mia" text={`Étape ${k + 1} sur ${step.etapes.length}${et.couche ? ` (${et.couche})` : ""} : ${et.consigne}`} k={`dessin-${step.titre}-${k}`} />
      ) : (
        <Bubble who="mia" humeur="joie" text="Ton dessin est fini ! Tu vois : un dessin compliqué, c'est juste des formes simples, ajoutées une par une. Tu peux le colorier, puis le ranger dans ta galerie." />
      )}
      <Toile ref={toile} guides={guides} miroir={step.miroir} />
      {msg && !fini && <p className="center small">{msg}</p>}
      <div className="center st-dessin-btns">
        <button type="button" className="btn btn-ghost btn-small" onMouseDown={() => setModele(true)} onMouseUp={() => setModele(false)} onTouchStart={() => setModele(true)} onTouchEnd={() => setModele(false)}>
          👁️ Maintiens pour voir le modèle
        </button>
        {!fini ? (
          <button type="button" className="btn btn-primary" onClick={suivant}>
            {k + 1 < step.etapes.length ? "Étape suivante ➜" : "J'ai fini ! ✔"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              const png = toile.current?.png();
              if (png) await ajouterOeuvre(step.titre, png);
              toast("Rangé dans ta galerie !", "🖼️");
            }}
          >
            🖼️ Ranger dans ma galerie
          </button>
        )}
      </div>
    </div>
  );
}
