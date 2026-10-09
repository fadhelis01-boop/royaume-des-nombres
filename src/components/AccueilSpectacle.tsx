// Accueil (2.6) : la première minute doit captiver. L'enfant ne lit pas une présentation, il JOUE
// tout de suite le cœur de l'histoire : la Galaxie est grise (le Grand Neutre est passé),
// chaque planète qu'il touche retrouve ses couleurs. Puis Lya, Néo et Zéro arrivent sur une comète
// et l'invitent à commencer l'aventure. Fonctionne sans animation (mode calme) et au clavier.
import { useState } from "react";
import { go } from "../lib/router";
import { useContent } from "../lib/content";
import { visuel } from "../lib/img";
import { sfx } from "../lib/sound";
import { say } from "../lib/tts";
import { Bubble, Mascot } from "./Mascot";
import type { Planete } from "../lib/types";

const TITRE = "La Galaxie des Savoirs";

export function AccueilSpectacle() {
  const { manifest } = useContent();
  const planetes = manifest?.planetes ?? [];
  const [allumees, setAllumees] = useState<string[]>([]);
  const [derniere, setDerniere] = useState<Planete | null>(null);
  const [vague, setVague] = useState(0);
  const n = allumees.length;
  const toutes = planetes.length > 0 && n === planetes.length;
  const amis = n >= 3;
  const interieur = planetes.slice(0, 4);
  const exterieur = planetes.slice(4);

  const allumer = (p: Planete) => {
    if (allumees.includes(p.id)) {
      setDerniere(p);
      return;
    }
    const suite = [...allumees, p.id];
    setAllumees(suite);
    setDerniere(p);
    setVague(Date.now());
    if (suite.length === planetes.length) {
      sfx.fanfare();
      say("mia", "Incroyable ! Toute la Galaxie brille ! Mais le Grand Neutre reviendra… Seul le savoir le tient à distance. On y va ?");
    } else if (suite.length === 3) {
      sfx.fanfare();
      say("mia", "Bravo ! Tu as un super-pouvoir : rendre les couleurs ! Pour sauver toute la Galaxie, il faut apprendre. Tu viens avec nous ?");
    } else sfx.ok();
  };

  const humeur = n >= 6 ? "triste" : n >= 2 ? "surprise" : "neutre";
  const neutre = visuel("persos", `neutre-${humeur}`) ?? visuel("persos", "neutre-neutre");

  const planete = (p: Planete, i: number, nb: number) => {
    const img = visuel("planetes", p.id);
    const on = allumees.includes(p.id);
    return (
      <div key={p.id} className="orb-place" style={{ "--a": `${(360 / nb) * i}deg` } as React.CSSProperties}>
        <button
          type="button"
          className={`orb-planete ${on ? "allumee" : ""}`}
          style={{ "--pc": p.couleur } as React.CSSProperties}
          onClick={() => allumer(p)}
          aria-pressed={on}
          aria-label={on ? `${p.titre} (${p.matiere}) : couleurs rendues` : `Rendre ses couleurs à ${p.titre} (${p.matiere})`}
        >
          {img ? <img src={img} alt="" width={72} height={72} draggable={false} /> : <span className="orb-emoji">{p.emoji}</span>}
        </button>
      </div>
    );
  };

  return (
    <section className={`spectacle ${amis ? "amis" : ""} ${toutes ? "toutes" : ""}`} style={{ "--allume": planetes.length ? n / planetes.length : 0 } as React.CSSProperties}>
      <h1 className="spec-titre" aria-label={TITRE}>
        {[...TITRE].map((c, i) => (
          <span key={i} className="lettre" style={{ animationDelay: `${0.25 + i * 0.045}s`, "--i": Math.round((i / (TITRE.length - 1)) * 100) } as React.CSSProperties} aria-hidden>
            {c === " " ? " " : c}
          </span>
        ))}
      </h1>
      <p className="spec-accroche">
        {toutes
          ? "La Galaxie brille de toutes ses couleurs !"
          : n === 0
            ? "Le Grand Neutre a rendu toute la Galaxie grise… Touche une planète pour lui rendre ses couleurs !"
            : `${n} planète${n > 1 ? "s" : ""} sur ${planetes.length} ${n > 1 ? "ont retrouvé leurs" : "a retrouvé ses"} couleurs. Continue !`}
      </p>

      <div className="orbites">
        <div className="coeur" aria-hidden>
          {neutre && <img className="coeur-neutre" src={neutre} alt="" width={110} height={110} draggable={false} />}
        </div>
        <div className="anneau anneau-1">{interieur.map((p, i) => planete(p, i, interieur.length))}</div>
        <div className="anneau anneau-2">{exterieur.map((p, i) => planete(p, i, exterieur.length))}</div>
        {vague > 0 && <div key={vague} className="vague-couleurs locale" aria-hidden />}
      </div>

      <p className="spec-nom" aria-live="polite">
        {derniere ? (
          <>
            {derniere.emoji} <strong>{derniere.titre}</strong> · {derniere.matiere}
            <br />
            <small>{derniere.accroche}</small>
          </>
        ) : (
          " "
        )}
      </p>

      {amis && (
        <div className="comete">
          <div className="comete-trio" aria-hidden>
            <Mascot who="mia" size={92} humeur="joie" />
            <Mascot who="zero" size={78} humeur="joie" />
            <Mascot who="neo" size={92} humeur="joie" />
          </div>
          <Bubble
            who="mia"
            text={toutes ? "Incroyable ! Toute la Galaxie brille ! Mais le Grand Neutre reviendra… Seul le savoir le tient à distance. On y va ?" : "Bravo ! Tu as un super-pouvoir : rendre les couleurs ! Pour sauver toute la Galaxie, il faut apprendre. Tu viens avec nous ?"}
          />
        </div>
      )}

      <div className="center">
        <button className={`btn btn-primary btn-xl spec-go ${amis ? "pret" : ""}`} onClick={() => go("/nouveau")}>
          ✨ Commencer l'aventure
        </button>
      </div>

      <ul className="spec-promesses" aria-label="Pour les parents">
        <li>🪐 {planetes.length} planètes : maths, français, anglais, sciences, musique, dessin, du CP au lycée</li>
        <li>📴 Fonctionne sans connexion · sans publicité · sans compte</li>
        <li>🏫 Aligné sur les programmes officiels · bilans pour les parents</li>
      </ul>
    </section>
  );
}
