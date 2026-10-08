import { go } from "../lib/router";
import { useChild } from "../lib/store";
import { additionsMastered, tablesMastered } from "../lib/rewards";
import { useContent } from "../lib/content";
import { Bubble } from "../components/Mascot";

export function Jeux() {
  const child = useChild()!;
  const { manifest } = useContent();
  const games = [
    { id: "eclair", emoji: "⚡", titre: "Calcul éclair", desc: "Un maximum de calculs en 60 secondes !", best: child.games["eclair"], who: "neo" },
    { id: "additions", emoji: "➕", titre: "La Tour des Additions", desc: `Toutes les additions jusqu'à 10 + 10 par cœur (${additionsMastered(child)}/100).`, who: "neo" },
    { id: "tables", emoji: "✖️", titre: "La Tour des Tables", desc: `Les tables de multiplication par cœur (${tablesMastered(child)}/64).`, who: "mia" },
    { id: "compte", emoji: "🧮", titre: "Le compte est bon", desc: "Atteins le nombre cible avec + − × ÷.", best: child.counters["compte"], bestLabel: "réussis", who: "neo" },
    { id: "vise", emoji: "🎯", titre: "Vise juste", desc: "Place les nombres sur la droite, au plus près !", best: child.games["vise"], who: "mia" },
    { id: "enigmes", emoji: "🧩", titre: "Énigmes de Mia", desc: `Des casse-têtes pour réfléchir (${child.enigmes.length}/${manifest?.enigmes.length ?? 0} résolues).`, who: "mia" },
  ];
  return (
    <div className="page">
      <h1>🎮 Salle de jeux</h1>
      <Bubble who="zero" text="Ici on joue… mais chut : en jouant, on devient très fort en maths ! 🤫" />
      <div className="games">
        {games.map((g) => (
          <button key={g.id} className={`game-card g-${g.id}`} onClick={() => go(`/jeux/${g.id}`)}>
            <span className="gc-emoji">{g.emoji}</span>
            <strong>{g.titre}</strong>
            <small>{g.desc}</small>
            {g.best !== undefined && (
              <span className="gc-best">
                🏅 {g.best} {g.bestLabel ?? "pts"}
              </span>
            )}
          </button>
        ))}
        <button className="game-card g-inventer" onClick={() => go("/inventer")}>
          <span className="gc-emoji">✍️</span>
          <strong>Invente un problème</strong>
          <small>Transforme un calcul en histoire… et l'inverse !</small>
        </button>
      </div>
    </div>
  );
}
