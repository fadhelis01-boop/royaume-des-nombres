import { couleursRendues } from "../lib/ambiance";
import { useContent } from "../lib/content";
import { visuel } from "../lib/img";
import { useChild } from "../lib/store";

/**
 * « Couleurs rendues » : l'histoire de la Galaxie en une image. Le Grand Neutre a tout rendu gris ;
 * chaque leçon réussie rend un peu de couleur à la planète, et le Grand Neutre rapetisse et s'efface.
 */
export function JaugeCouleurs({ planete }: { planete: string }) {
  const child = useChild();
  const { worlds } = useContent();
  const c = couleursRendues(child, worlds, planete);
  const pct = Math.round(c * 100);
  const humeur = c >= 0.66 ? "triste" : c >= 0.33 ? "surprise" : "neutre";
  const img = visuel("persos", `neutre-${humeur}`) ?? visuel("persos", "neutre-neutre");
  const texte =
    pct === 0
      ? "Le Grand Neutre a tout rendu gris. Chaque leçon réussie rend des couleurs à la planète !"
      : pct < 33
        ? "Les premières couleurs reviennent ! Le Grand Neutre commence à s'inquiéter."
        : pct < 66
          ? "La planète retrouve ses couleurs. Le Grand Neutre recule…"
          : pct < 100
            ? "Presque toutes les couleurs sont revenues : le Grand Neutre n'est plus qu'un petit nuage !"
            : "Toutes les couleurs sont revenues. Bravo, la planète brille !";
  return (
    <div className="jauge-couleurs" role="group" aria-label={`Couleurs rendues à la planète : ${pct} %`}>
      {img && pct < 100 && <img className="neutre-img" src={img} alt="Le Grand Neutre" width={56} height={56} />}
      <div className="jc-txt">
        <strong>🎨 Couleurs rendues : {pct} %</strong>
        <div className="jc-barre" aria-hidden>
          <i style={{ width: `${Math.max(pct, 2)}%` }} />
        </div>
        <small className="muted">{texte}</small>
      </div>
    </div>
  );
}
