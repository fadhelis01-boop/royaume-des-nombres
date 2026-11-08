import { useState } from "react";
import { bump, useChild } from "../lib/store";
import { say } from "../lib/tts";
import { Bubble } from "./Mascot";

/**
 * « Tu m'entends ? » : une seule fois, pour les enfants qui ont besoin de la voix.
 * L'application ne peut pas savoir si le son de l'appareil est coupé : on le demande à l'enfant
 * (angle mort de l'audit « 7 ans »). Une réponse « non » est notée pour l'Espace parents.
 */
export function VerifSon() {
  const child = useChild();
  const [etat, setEtat] = useState<"question" | "non" | "ok">("question");
  if (!child || child.lecteur === "oui" || (child.counters?.["son-ok"] ?? 0) > 0 || etat === "ok") return null;
  const ecouter = () => say("mia", "Coucou ! Si tu m'entends, touche le bouton vert : Oui, je t'entends !");
  return (
    <div className="verif-son" role="group" aria-label="Vérifier le son">
      {etat === "question" ? (
        <Bubble who="mia" text="🔊 Avant de commencer : touche le haut-parleur. Tu m'entends ?" />
      ) : (
        <Bubble who="mia" humeur="reflexion" text="Monte le son avec le bouton sur le côté de l'appareil, ou demande à un adulte. Puis réessaie 🔊." />
      )}
      <div className="center verif-son-btns">
        <button type="button" className="btn btn-soft btn-xl" onClick={ecouter} aria-label="Écouter Lya">
          🔊
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            bump("son-ok");
            setEtat("ok");
          }}
        >
          ✅ Oui, je t'entends
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            bump("son-non");
            setEtat("non");
          }}
        >
          🔇 Non
        </button>
      </div>
    </div>
  );
}
