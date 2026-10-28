import { useState } from "react";
import { go } from "../lib/router";
import { addChild, newChild, selectChild, useStore } from "../lib/store";
import { levelOf } from "../lib/rewards";
import { Bubble, Mascot, NAMES } from "../components/Mascot";
import type { Child } from "../lib/types";
import { AccueilSpectacle } from "../components/AccueilSpectacle";
import { CLASSES, classeDeLAge } from "../lib/parcours";

export function Accueil() {
  const children = useStore((s) => s.children);
  if (!children.length)
    return (
      <div className="page accueil-spectacle">
        <AccueilSpectacle />
      </div>
    );
  return (
    <div className="page">
      <h1 className="center">Qui joue aujourd'hui ?</h1>
      <div className="profiles">
        {children.map((c) => (
          <ProfileCard key={c.id} c={c} />
        ))}
        <button className="profile-card add" onClick={() => go("/nouveau")}>
          <span className="add-plus">＋</span>
          <span>Nouvel enfant</span>
        </button>
      </div>
    </div>
  );
}

function ProfileCard({ c }: { c: Child }) {
  const l = levelOf(c.xp);
  return (
    <button
      className={`profile-card av-${c.avatar}`}
      onClick={() => {
        selectChild(c.id);
        go("/");
      }}
    >
      <Mascot who={c.avatar} size={96} />
      <strong>{c.name}</strong>
      <span className="muted">
        {l.emoji} Niveau {l.level} · ⭐ {c.stars}
      </span>
    </button>
  );
}

export function NouvelEnfant() {
  const [name, setName] = useState("");
  const [age, setAge] = useState(7);
  const [avatar, setAvatar] = useState<Child["avatar"]>("mia");
  // la classe : proposée d'après l'âge, modifiable (né en fin d'année, saut ou redoublement)
  const [classe, setClasse] = useState<number | null | undefined>(undefined);
  const classeAff = classe === undefined ? classeDeLAge(age) : classe;
  const ok = name.trim().length >= 1;
  const create = () => {
    const c = newChild(name.trim(), avatar, age);
    if (age < 18 && classeAff !== null) c.classe = classeAff;
    addChild(c);
    // L'enfant choisit d'abord sa planète dans la Galaxie ; la carte de la planète
    // propose ensuite son prologue (l'histoire avant tout test).
    go("/galaxie");
  };
  return (
    <div className="page narrow">
      <Bubble who="mia" text="Comment t'appelles-tu ? (Un prénom ou un surnom suffit.)" />
      <input className="big-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom" maxLength={20} autoFocus />
      <Bubble who="neo" text="Quel âge as-tu ?" side="right" />
      <div className="age-picker">
        {[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((a) => (
          <button key={a} className={`chip ${age === a ? "sel" : ""}`} onClick={() => { setAge(a); setClasse(undefined); }}>
            {a === 18 ? "18 +" : a}
          </button>
        ))}
      </div>
      {age < 18 && (
        <>
          <Bubble who="mia" text="Et tu es dans quelle classe ? (Demande à un adulte si tu ne sais pas.)" />
          <div className="age-picker" role="group" aria-label="Ta classe">
            {CLASSES.slice(0, 13)
              .map((n, i) => ({ n, i }))
              .filter(({ i }) => Math.abs(i - classeDeLAge(age)) <= 2)
              .map(({ n, i }) => (
                <button key={n} className={`chip ${classeAff === i ? "sel" : ""}`} onClick={() => setClasse(i)}>
                  {n}
                </button>
              ))}
            <button className={`chip ${classeAff === null ? "sel" : ""}`} onClick={() => setClasse(null)}>
              Je ne sais pas
            </button>
          </div>
        </>
      )}
      <Bubble who="zero" text="Choisis ton compagnon d'aventure ! (Moi, de préférence.)" />
      <div className="avatar-picker">
        {(["mia", "neo", "zero"] as const).map((a) => (
          <button key={a} className={`avatar-opt ${avatar === a ? "sel" : ""}`} onClick={() => setAvatar(a)} aria-label={NAMES[a]} aria-pressed={avatar === a}>
            <Mascot who={a} size={92} />
            <span>{NAMES[a]}</span>
          </button>
        ))}
      </div>
      <div className="stack center">
        <button className="btn btn-primary btn-xl" disabled={!ok} onClick={create}>
          C'est parti ! 🚀
        </button>
      </div>
    </div>
  );
}
