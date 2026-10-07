import { useState } from "react";
import { go } from "../lib/router";
import { addChild, newChild, selectChild, useStore } from "../lib/store";
import { levelOf } from "../lib/rewards";
import { Bubble, Mascot, NAMES } from "../components/Mascot";
import type { Child } from "../lib/types";

export function Accueil() {
  const children = useStore((s) => s.children);
  if (!children.length)
    return (
      <div className="page accueil">
        <div className="hero">
          <div className="hero-trio">
            <Mascot who="mia" size={130} talking />
            <Mascot who="zero" size={110} talking />
            <Mascot who="neo" size={130} talking />
          </div>
          <h1>Le Royaume des Nombres</h1>
          <p className="lead">Apprends les maths en t'amusant, de 7 ans jusqu'aux mathématiques des grands !</p>
        </div>
        <Bubble who="neo" text="Salut ! Je suis Néo Fibo. Un problème ? Défi accepté !" />
        <Bubble who="mia" text="Moi c'est Mia π. Et si on essayait autrement ? Viens, on va explorer le Royaume ensemble !" side="right" />
        <Bubble who="zero" text="Et moi… Zéro. Je ne vaux rien. Mais derrière un 1, je vaux DIX ! 😳" />
        <div className="center">
          <button className="btn btn-primary btn-xl" onClick={() => go("/nouveau")}>
            ✨ Commencer l'aventure
          </button>
        </div>
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
  const ok = name.trim().length >= 1;
  const create = (diag: boolean) => {
    addChild(newChild(name.trim(), avatar, age));
    go(diag ? "/diagnostic" : "/");
  };
  return (
    <div className="page narrow">
      <Bubble who="mia" text="Comment t'appelles-tu ? (Un prénom ou un surnom suffit.)" />
      <input className="big-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom" maxLength={20} autoFocus />
      <Bubble who="neo" text="Quel âge as-tu ?" side="right" />
      <div className="age-picker">
        {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((a) => (
          <button key={a} className={`chip ${age === a ? "sel" : ""}`} onClick={() => setAge(a)}>
            {a === 18 ? "18 +" : a}
          </button>
        ))}
      </div>
      <Bubble who="zero" text="Choisis ton compagnon d'aventure ! (Moi, de préférence.)" />
      <div className="avatar-picker">
        {(["mia", "neo", "zero"] as const).map((a) => (
          <button key={a} className={`avatar-opt ${avatar === a ? "sel" : ""}`} onClick={() => setAvatar(a)}>
            <Mascot who={a} size={92} />
            <span>{NAMES[a]}</span>
          </button>
        ))}
      </div>
      <div className="stack center">
        {age >= 8 ? (
          <>
            <button className="btn btn-primary btn-xl" disabled={!ok} onClick={() => create(true)}>
              🧭 Faire le petit test pour commencer au bon endroit
            </button>
            <button className="btn btn-soft" disabled={!ok} onClick={() => create(false)}>
              Commencer depuis le début
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-xl" disabled={!ok} onClick={() => create(false)}>
            C'est parti ! 🚀
          </button>
        )}
      </div>
    </div>
  );
}
