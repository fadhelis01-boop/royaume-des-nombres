import { useMemo } from "react";
import { go } from "../lib/router";
import { matiereDe, planeteDe, useContent } from "../lib/content";
import { useChild } from "../lib/store";
import { domainesDe, pointConseille, prochaineEtape } from "../lib/parcours";
import { Bubble } from "../components/Mascot";
import { CarteTalents } from "../components/CarteTalents";

const RAISON = { renforcer: "🛠️ à renforcer", nouveau: "🌟 nouveau", consolider: "🧱 pour consolider" } as const;

/** Lundi de la semaine en cours (0 h). */
function lundi() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** « Mon parcours » : les étapes préparées après la carte des talents, comme un chemin au trésor. */
export function ParcoursPage() {
  const child = useChild()!;
  const { manifest, worlds } = useContent();
  const mat = matiereDe(child);
  const planete = planeteDe(manifest, mat);
  const p = child.parcours?.[mat];
  const doms = useMemo(() => domainesDe(mat, worlds, manifest?.domaines?.[mat]), [mat, worlds, manifest]);
  const fait = (k: string) => !!child.progress[k]?.done;

  if (!p)
    return (
      <div className="page narrow">
        <h1>🗺️ Mon parcours</h1>
        <Bubble who="neo" text={`Ton parcours sur ${planete?.titre ?? "cette planète"} n'est pas encore prêt : fais d'abord la carte des talents, quelques questions pour savoir où commencer.`} />
        <div className="center">
          <button className="btn btn-primary btn-xl" onClick={() => go("/diagnostic")}>
            🧭 Faire la carte des talents
          </button>
        </div>
      </div>
    );

  const prochaine = prochaineEtape(p, fait);
  const faites = p.etapes.filter((e) => fait(e.key)).length;
  const objectif = child.age <= 10 ? 3 : 4;
  const cetteSemaine = p.etapes.filter((e) => fait(e.key) && (child.progress[e.key]?.lastAt ?? 0) >= lundi()).length;
  const conseille = pointConseille(p, fait);
  const titre = (key: string) => {
    const [wid, lid] = key.split("/");
    const w = worlds.find((x) => x.id === wid);
    return { w, l: w?.lecons.find((x) => x.id === lid) };
  };

  return (
    <div className="page parcours">
      <h1>🗺️ Mon parcours</h1>
      <p className="muted">
        {planete?.emoji} {planete?.titre} · préparé le {new Date(p.at).toLocaleDateString("fr-FR")}
      </p>

      <div className="card parcours-semaine">
        <strong>🎯 Cette semaine : {Math.min(cetteSemaine, objectif)} / {objectif} étapes</strong>
        <span className="pc-bar" role="meter" aria-valuemin={0} aria-valuemax={objectif} aria-valuenow={cetteSemaine} aria-label="étapes réussies cette semaine">
          <i style={{ width: `${Math.min(100, (100 * cetteSemaine) / objectif)}%` }} />
        </span>
        <small className="muted">
          {faites} étape{faites > 1 ? "s" : ""} réussie{faites > 1 ? "s" : ""} sur {p.etapes.length} au total. Un peu chaque jour, c'est ce qui marche le mieux !
        </small>
      </div>

      {prochaine ? (
        (() => {
          const { w, l } = titre(prochaine.key);
          return w && l ? (
            <button className="quick-card primary parcours-go" onClick={() => go(`/lecon/${w.id}/${l.id}`)}>
              <span className="qc-emoji">▶️</span>
              <span>
                <strong>Prochaine étape</strong>
                <small>
                  {w.emoji} {l.titre}
                </small>
              </span>
            </button>
          ) : null;
        })()
      ) : (
        <Bubble who="mia" humeur="joie" text="Tu as terminé toutes les étapes de ton parcours ! Faisons le point pour préparer la suite." />
      )}

      <ol className="chemin" aria-label="Les étapes du parcours">
        {p.etapes.map((e, i) => {
          const { w, l } = titre(e.key);
          if (!w || !l) return null;
          const ok = fait(e.key);
          const cur = prochaine?.key === e.key;
          const d = doms.find((x) => x.id === e.dom);
          return (
            <li key={e.key} className={`etape ${ok ? "faite" : cur ? "courante" : ""}`}>
              <button type="button" className="etape-btn" onClick={() => go(`/lecon/${w.id}/${l.id}`)} aria-label={`Étape ${i + 1} : ${l.titre}${ok ? ", réussie" : cur ? ", prochaine étape" : ""}`}>
                <span className="etape-pastille" aria-hidden>
                  {ok ? "✓" : cur ? "▶" : i + 1}
                </span>
                <span className="etape-txt">
                  <strong>{l.titre}</strong>
                  <small>
                    {d?.emoji} {d?.titre} · {RAISON[e.raison]}
                  </small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <h2>Ma carte des talents</h2>
      <CarteTalents doms={doms} niveaux={p.niveaux} age={child.age} compact />
      {!!p.nonTestes?.length && (
        <p className="small muted">
          Pas encore visités (ils viendront plus tard) : {p.nonTestes.map((id) => doms.find((d) => d.id === id)?.titre).filter(Boolean).join(", ")}.
        </p>
      )}

      <div className="center stack">
        <button className={`btn ${conseille ? "btn-primary" : "btn-soft"}`} onClick={() => go("/diagnostic?mode=point")}>
          🔄 Faire le point {conseille ? "(conseillé)" : ""}
        </button>
        <button className="btn btn-ghost" onClick={() => go("/diagnostic")}>
          Refaire toute la carte des talents
        </button>
      </div>
    </div>
  );
}
