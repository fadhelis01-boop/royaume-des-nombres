import { go } from "../lib/router";
import { useContent, worldProgress } from "../lib/content";
import { histoireDe } from "../lib/content";
import { useChild } from "../lib/store";
import { Mascot } from "../components/Mascot";

/** Diplôme à montrer (ou imprimer) : le moment « montre à un adulte ! ». */
export function Diplome({ worldId }: { worldId: string }) {
  const { worlds, manifest } = useContent();
  const child = useChild()!;
  const w = worlds.find((x) => x.id === worldId);
  if (!w) return <div className="page center">Monde introuvable.</div>;
  const ch = histoireDe(manifest, w.matiere)?.chapitres[w.id];
  const lit = child.crystals?.includes(w.id);
  const pr = worldProgress(child, w);
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="page narrow">
      <div className="no-print row">
        <button className="back" onClick={() => go(`/monde/${w.id}`)}>
          ← {w.titre}
        </button>
        <button className="btn btn-soft small" onClick={() => window.print()}>
          🖨️ Imprimer
        </button>
      </div>
      <div className="diplome" style={{ "--wc": w.couleur } as React.CSSProperties}>
        <div className="diplome-top">Royaume des Nombres</div>
        <h1>Diplôme du Gardien</h1>
        <p>Ce diplôme est décerné à</p>
        <div className="diplome-name">{child.name}</div>
        <p>
          pour avoir {lit ? "rallumé" : "travaillé à rallumer"} <strong>{ch?.objet ?? "le cristal"}</strong>
          <br />
          dans <strong>
            {w.emoji} {w.titre}
          </strong>
        </p>
        <p className="small">
          {pr.done} leçon{pr.done > 1 ? "s" : ""} validée{pr.done > 1 ? "s" : ""} · ⭐ {pr.stars} étoile{pr.stars > 1 ? "s" : ""}
        </p>
        <div className="diplome-trio">
          <Mascot who="mia" size={70} humeur="joie" />
          <Mascot who="zero" size={64} humeur="fier" />
          <Mascot who="neo" size={70} humeur="joie" />
        </div>
        <div className="diplome-foot">
          <span>Le {date}</span>
          <span>Mia π · Néo Fibo · Zéro</span>
        </div>
      </div>
      <p className="center small muted no-print">Montre ton diplôme à un adulte : explique-lui ce que tu as appris dans ce monde !</p>
    </div>
  );
}
