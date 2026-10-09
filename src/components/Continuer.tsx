import { useContent } from "../lib/content";
import { go } from "../lib/router";
import { setMatiere, useChild } from "../lib/store";

/** « Continuer là où je m'étais arrêté » : la leçon commencée le plus récemment, toutes planètes confondues. */
export function Continuer() {
  const child = useChild();
  const { worlds } = useContent();
  if (!child) return null;
  let best: { key: string; at: number; step: number } | null = null;
  for (const [key, p] of Object.entries(child.progress)) if (!p.done && p.step > 0 && p.lastAt > (best?.at ?? 0) && Date.now() - p.lastAt < 30 * 86400000) best = { key, at: p.lastAt, step: p.step };
  if (!best) return null;
  const [wid, lid] = best.key.split("/");
  const w = worlds.find((x) => x.id === wid);
  const l = w?.lecons.find((x) => x.id === lid);
  if (!w || !l) return null;
  return (
    <button
      className="card continuer"
      onClick={() => {
        setMatiere(w.matiere);
        go(`/lecon/${w.id}/${l.id}`);
      }}
    >
      <span className="continuer-play" aria-hidden>▶</span>
      <span>
        <strong>Continuer là où tu t'étais arrêté</strong>
        <br />
        <span className="small">
          {w.emoji} {l.titre} · étape {Math.min(best.step + 1, l.etapes.length)} sur {l.etapes.length}
        </span>
      </span>
    </button>
  );
}
