// Calque d'ambiance (2.5) : derrière le contenu, la vie propre à chaque planète (chiffres qui flottent,
// bulles du marais, feuilles, étoiles, notes, gouttes d'encre…) et le brouillard gris du Grand Neutre,
// qui s'efface à mesure que l'enfant rend les couleurs à la planète.
// Léger : 6 à 16 éléments, animations CSS sur transform/opacity seulement, aucune image chargée,
// rien en mode « calme », mis en pause quand l'appli est en arrière-plan.
import { memo, type ReactNode } from "react";
import { hasard, type StyleAmbiance } from "../lib/ambiance";

type Mouvement = "monte" | "tombe" | "flotte" | "scintille";
interface Motif {
  mouvement: Mouvement;
  forme: (i: number) => ReactNode;
}

const glyphe = (liste: string[]) => (i: number) => <span className="amb-glyphe">{liste[i % liste.length]}</span>;
const Bulle = () => (
  <svg viewBox="0 0 40 40" aria-hidden>
    <circle cx="20" cy="20" r="17" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="2" />
    <ellipse cx="13" cy="13" rx="5" ry="3" fill="#fff" fillOpacity="0.8" transform="rotate(-35 13 13)" />
  </svg>
);
const Feuille = ({ c }: { c: string }) => (
  <svg viewBox="0 0 40 40" aria-hidden>
    <path d="M6 34 C6 14 18 4 36 4 C36 22 26 34 6 34 Z" fill={c} />
    <path d="M8 32 C16 22 24 14 32 8" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.6" fill="none" />
  </svg>
);
const Etoile = ({ c }: { c: string }) => (
  <svg viewBox="0 0 40 40" aria-hidden>
    <path d="M20 2 C22 14 26 18 38 20 C26 22 22 26 20 38 C18 26 14 22 2 20 C14 18 18 14 20 2 Z" fill={c} />
  </svg>
);
const Goutte = () => (
  <svg viewBox="0 0 40 40" aria-hidden>
    <path d="M20 3 C26 14 32 20 32 27 A12 12 0 0 1 8 27 C8 20 14 14 20 3 Z" fill="currentColor" fillOpacity="0.55" />
    <ellipse cx="15" cy="26" rx="2.5" ry="4" fill="#fff" fillOpacity="0.55" />
  </svg>
);
const Eclair = () => (
  <svg viewBox="0 0 40 40" aria-hidden>
    <path d="M23 2 L8 23 H19 L15 38 L32 15 H21 Z" fill="currentColor" />
  </svg>
);
const Tache = ({ c }: { c: string }) => (
  <svg viewBox="0 0 40 40" aria-hidden>
    <path d="M20 4 C28 4 30 10 35 13 C40 17 36 24 33 28 C30 33 25 37 18 35 C11 34 6 31 5 24 C3 17 8 14 11 9 C13 6 16 4 20 4 Z" fill={c} fillOpacity="0.7" />
    <circle cx="36" cy="34" r="2.5" fill={c} fillOpacity="0.7" />
  </svg>
);
const Parole = ({ mot }: { mot: string }) => (
  <svg viewBox="0 0 64 40" aria-hidden>
    <path d="M8 4 H56 A6 6 0 0 1 62 10 V24 A6 6 0 0 1 56 30 H24 L14 38 L16 30 H8 A6 6 0 0 1 2 24 V10 A6 6 0 0 1 8 4 Z" fill="#ffffff" fillOpacity="0.85" stroke="currentColor" strokeWidth="2" />
    <text x="32" y="22" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor" fontFamily="Fredoka, sans-serif">
      {mot}
    </text>
  </svg>
);
const PetitePlanete = ({ c }: { c: string }) => (
  <svg viewBox="0 0 40 40" aria-hidden>
    <circle cx="20" cy="20" r="9" fill={c} />
    <ellipse cx="20" cy="20" rx="17" ry="5" fill="none" stroke={c} strokeOpacity="0.7" strokeWidth="1.6" transform="rotate(-20 20 20)" />
  </svg>
);

const FEUILLES = ["#3fa34d", "#7cc142", "#f2a33a", "#c9d84a"];
const ETOILES = ["#ffe27a", "#ffffff", "#ffd1f2", "#bfe3ff"];
const PEINTURE = ["#ff5c8a", "#ffcf33", "#14b8a6", "#7c4dff", "#ff8a1f", "#2f6fdf"];
const MOTS = ["Hello!", "Hi!", "Yes!", "Wow!", "Thanks!", "Bye!"];

export const MOTIFS: Record<string, Motif> = {
  maths: { mouvement: "flotte", forme: glyphe(["1", "2", "3", "5", "7", "π", "+", "×", "÷", "=", "∞", "8", "½", "√"]) },
  francais: { mouvement: "flotte", forme: (i) => (i % 3 === 0 ? <Goutte /> : glyphe(["A", "b", "é", "ç", "?", "!", "«", "»", "ê", "g", "Z", "&"])(i)) },
  chimie: { mouvement: "monte", forme: () => <Bulle /> },
  physique: { mouvement: "scintille", forme: (i) => (i % 2 ? <Eclair /> : glyphe(["⚙", "↗", "Ω", "∿"])(i)) },
  biologie: { mouvement: "tombe", forme: (i) => <Feuille c={FEUILLES[i % FEUILLES.length]} /> },
  univers: { mouvement: "scintille", forme: (i) => <Etoile c={ETOILES[i % ETOILES.length]} /> },
  musique: { mouvement: "flotte", forme: glyphe(["♪", "♫", "♩", "♬"]) },
  dessin: { mouvement: "flotte", forme: (i) => <Tache c={PEINTURE[i % PEINTURE.length]} /> },
  anglais: { mouvement: "monte", forme: (i) => <Parole mot={MOTS[i % MOTS.length]} /> },
  galaxie: { mouvement: "scintille", forme: (i) => (i % 5 === 4 ? <PetitePlanete c={PEINTURE[i % PEINTURE.length]} /> : <Etoile c={ETOILES[i % ETOILES.length]} />) },
};

const Nuage = ({ c }: { c: string }) => (
  <svg viewBox="0 0 64 40" aria-hidden>
    <path d="M14 34 A10 10 0 0 1 12 14 A13 13 0 0 1 36 8 A11 11 0 0 1 54 18 A9 9 0 0 1 52 34 Z" fill={c} fillOpacity="0.8" />
  </svg>
);
const Page = () => (
  <svg viewBox="0 0 32 40" aria-hidden>
    <path d="M3 3 H22 L29 10 V37 H3 Z" fill="#fbf7ea" stroke="#b9a77a" strokeWidth="1.5" />
    <path d="M8 15 H24 M8 21 H24 M8 27 H18" stroke="#c9bb94" strokeWidth="1.5" />
  </svg>
);
const Brume = () => (
  <svg viewBox="0 0 60 60" aria-hidden>
    <circle cx="30" cy="30" r="28" fill="#9d99ab" fillOpacity="0.45" />
  </svg>
);
const OR = ["#ffd54a", "#ffe9a0", "#ffb84a", "#fff3c4"];

/** Scènes particulières : le combat du Gardien (selon l'adversaire), les histoires, le diplôme. */
export const SCENES: Record<string, Motif> = {
  "gardien-nuage": { mouvement: "flotte", forme: (i) => <Nuage c={i % 2 ? "#6b5a8e" : "#4a3d66"} /> },
  "gardien-ixe": { mouvement: "flotte", forme: glyphe(["x", "?", "y", "x²", "?", "n"]) },
  "gardien-oubli": { mouvement: "monte", forme: () => <Page /> },
  "gardien-gribouille": { mouvement: "tombe", forme: () => <Goutte /> },
  "gardien-tache": { mouvement: "tombe", forme: () => <Goutte /> },
  "gardien-neutre": { mouvement: "flotte", forme: () => <Brume /> },
  aventure: { mouvement: "scintille", forme: (i) => <Etoile c={OR[i % OR.length]} /> },
  diplome: { mouvement: "scintille", forme: (i) => <Etoile c={OR[i % OR.length]} /> },
};

const NOMBRE: Record<StyleAmbiance, number> = { enchantee: 16, epuree: 7, calme: 6 };

export const Ambiance = memo(function Ambiance({ planete, style, scene }: { planete: string; style: StyleAmbiance; scene?: string }) {
  const m = (scene && SCENES[scene]) || MOTIFS[planete];
  const n = m ? (planete === "galaxie" && !scene ? NOMBRE[style] + 10 : NOMBRE[style]) : 0;
  return (
    <div className={`ambiance amb-${m?.mouvement ?? "aucun"}`} aria-hidden>
      {planete !== "galaxie" && planete !== "neutre" && !scene && (
        <div className="brouillard">
          <i />
          <i />
          <i />
        </div>
      )}
      {m &&
        Array.from({ length: n }, (_, i) => {
          const x = hasard(i, 1);
          const y = hasard(i, 2);
          const t = hasard(i, 3);
          const taille = scene === "gardien-neutre" ? 60 + t * 90 : planete === "galaxie" && !scene ? 8 + t * 16 : 18 + t * 26;
          const style2 = {
            left: `${(x * 96).toFixed(1)}%`,
            top: `${(y * 92).toFixed(1)}%`,
            width: taille,
            height: taille,
            fontSize: taille,
            animationDuration: `${(m.mouvement === "scintille" ? 3 + t * 4 : 14 + t * 14).toFixed(1)}s`,
            animationDelay: `${(-hasard(i, 4) * 20).toFixed(1)}s`,
            "--derive": `${((hasard(i, 5) - 0.5) * 60).toFixed(0)}px`,
          } as React.CSSProperties;
          return (
            <span key={i} className="amb-el" style={style2}>
              {m.forme(i)}
            </span>
          );
        })}
    </div>
  );
});
