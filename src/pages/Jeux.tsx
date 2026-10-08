import { go } from "../lib/router";
import { useChild } from "../lib/store";
import { additionsMastered, tablesMastered } from "../lib/rewards";
import { matiereDe, planeteDe, useContent } from "../lib/content";
import { Bubble } from "../components/Mascot";
import type { Child, Manifest } from "../lib/types";

// La salle de jeux : d'abord les jeux de la planète où l'on se trouve (liste dans
// content-src/_planetes.yaml), puis tous les autres jeux de la Galaxie.

interface Jeu {
  id: string;
  emoji: string;
  titre: string;
  desc: string;
  best?: number;
  bestLabel?: string;
  vers?: string;
}

function catalogue(child: Child, manifest: Manifest | null): Jeu[] {
  return [
    { id: "defense", emoji: "🏰", titre: "La Défense du Royaume", desc: "Des Grignoteurs foncent sur le château : réponds vite et juste !", best: child.recordsJeux?.defense, bestLabel: "vague" },
    { id: "pont", emoji: "🌉", titre: "Le Pont des Fractions", desc: "Comble le ravin exactement avec des planches de ½, ⅓, ¼…", best: child.recordsJeux?.pont, bestLabel: "ponts" },
    { id: "course", emoji: "🐸", titre: "La Course de la Grenouille", desc: "Atteins la cible en sautant malin, plus vite que le Grignoteur.", best: child.counters["courseGagnee"], bestLabel: "victoires" },
    { id: "duel", emoji: "🤝", titre: "Duel en famille", desc: "À deux sur le même écran, chacun à son niveau !" },
    { id: "eclair", emoji: "⚡", titre: "Calcul éclair", desc: "Un maximum de calculs en 60 secondes !", best: child.games["eclair"] },
    { id: "additions", emoji: "➕", titre: "La Tour des Additions", desc: `Toutes les additions jusqu'à 10 + 10 par cœur (${additionsMastered(child)}/100).` },
    { id: "tables", emoji: "✖️", titre: "La Tour des Tables", desc: `Les tables de multiplication par cœur (${tablesMastered(child)}/64).` },
    { id: "compte", emoji: "🧮", titre: "Le compte est bon", desc: "Atteins le nombre cible avec + − × ÷.", best: child.counters["compte"], bestLabel: "réussis" },
    { id: "vise", emoji: "🎯", titre: "Vise juste", desc: "Place les nombres sur la droite, au plus près !", best: child.games["vise"] },
    { id: "enigmes", emoji: "🧩", titre: "Énigmes de Lya", desc: `Des casse-têtes pour réfléchir (${child.enigmes.length}/${manifest?.enigmes.length ?? 0} résolues).` },
    { id: "conjugaison", emoji: "⚡", titre: "Conjugaison éclair", desc: "Un maximum de verbes conjugués en 60 secondes !", best: child.games["conj"] },
    { id: "mystere", emoji: "🔍", titre: "Mot mystère", desc: "Devine le mot grâce à sa définition… avant que toutes les lettres apparaissent.", best: child.games["mystere"], bestLabel: "pts" },
    { id: "flash", emoji: "📸", titre: "Dictée flash", desc: "Une phrase apparaît, puis disparaît : écris-la de mémoire !", best: child.games["flash"], bestLabel: "phrases" },
    { id: "eclair-sciences", emoji: "⚡", titre: "Quiz éclair", desc: "10 questions sur ce que tu as appris sur cette planète.", best: child.games[`quiz:${matiereDe(child)}`], bestLabel: "/10" },
    { id: "oreille", emoji: "👂", titre: "L'Oreille d'or", desc: "Aigu ou grave, fort ou doux, majeur ou mineur : entraîne ton oreille.", best: child.games["oreille"], bestLabel: "/10" },
    { id: "studio-musique", emoji: "🎹", titre: "Le studio de musique", desc: "Un piano où rien ne sonne faux et la boîte à rythmes de Zéro.", vers: "/studio/musique" },
    { id: "studio-dessin", emoji: "🖌️", titre: "Le studio de dessin", desc: "Dessine librement, en miroir, et range tes œuvres dans ta galerie.", vers: "/studio/dessin" },
  ];
}

function Carte({ g }: { g: Jeu }) {
  return (
    <button className={`game-card g-${g.id}`} onClick={() => go(g.vers ?? `/jeux/${g.id}`)}>
      <span className="gc-emoji">{g.emoji}</span>
      <strong>{g.titre}</strong>
      <small>{g.desc}</small>
      {g.best !== undefined && (
        <span className="gc-best">
          🏅 {g.best} {g.bestLabel ?? "pts"}
        </span>
      )}
    </button>
  );
}

export function Jeux() {
  const child = useChild()!;
  const { manifest } = useContent();
  const pl = planeteDe(manifest, matiereDe(child));
  const tous = catalogue(child, manifest);
  const ici = (pl?.jeux ?? []).map((id) => tous.find((g) => g.id === id)).filter((g): g is Jeu => !!g);
  const autres = tous.filter((g) => !ici.includes(g));
  return (
    <div className="page">
      <h1>🎮 Salle de jeux</h1>
      <Bubble who="zero" text={`Ici on joue… mais chut : en jouant, on devient très fort en ${pl?.matiere.toLowerCase() ?? "tout"} ! 🤫`} />
      {ici.length > 0 && (
        <>
          <h2>
            {pl?.emoji} Les jeux de la planète {pl?.matiere}
          </h2>
          <div className="games">
            {ici.map((g) => (
              <Carte key={g.id} g={g} />
            ))}
            {pl?.id === "maths" && (
              <button className="game-card g-inventer" onClick={() => go("/inventer")}>
                <span className="gc-emoji">✍️</span>
                <strong>Invente un problème</strong>
                <small>Transforme un calcul en histoire… et l'inverse !</small>
              </button>
            )}
          </div>
        </>
      )}
      <h2>🌌 Les autres jeux de la Galaxie</h2>
      <div className="games compact">
        {autres.map((g) => (
          <Carte key={g.id} g={g} />
        ))}
      </div>
    </div>
  );
}
