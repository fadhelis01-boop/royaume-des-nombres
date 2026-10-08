import { go } from "../lib/router";
import { lessonKey, lessonUnlocked, useContent, worldProgress } from "../lib/content";
import { histoireDe } from "../lib/content";
import { markStory, useChild, useStore } from "../lib/store";
import { Dialogue, Mascot } from "../components/Mascot";
import { StoryScene } from "../components/Story";
import { gardienOuvert } from "./Gardien";

export function Monde({ id }: { id: string }) {
  const { worlds, manifest } = useContent();
  const child = useChild()!;
  const settings = useStore((s) => s.settings);
  const w = worlds.find((x) => x.id === id);
  if (!w)
    return (
      <div className="page center">
        <p>Ce monde n'existe pas (ou plus).</p>
        <button className="btn" onClick={() => go("/")}>
          Retour à la carte
        </button>
      </div>
    );
  const pr = worldProgress(child, w);
  const firstVisit = !w.lecons.some((l) => child.progress[lessonKey(w, l.id)]);
  const ch = histoireDe(manifest, w.matiere)?.chapitres[w.id];
  const lit = child.crystals?.includes(w.id);
  // Première visite : on ouvre le chapitre de l'aventure avant tout
  if (ch && !child.story?.[`avant:${w.id}`])
    return (
      <div className="page narrow">
        <button className="back" onClick={() => go("/")}>
          ← Carte
        </button>
        <StoryScene lines={ch.avant} choix={ch.choix} titre={ch.titre} decor={w.decor} couleur={w.couleur} k={`avant-${w.id}`} onDone={() => markStory(`avant:${w.id}`)} doneLabel="À l'aventure ! ➜" />
      </div>
    );
  const bossOpen = w.cycle !== "astuces" && gardienOuvert(w);
  return (
    <div className="page monde" style={{ "--wc": w.couleur } as React.CSSProperties}>
      <button className="back" onClick={() => go("/")}>
        ← Carte
      </button>
      <div className={`monde-banner ${lit || w.id === "ecole-des-astuces" ? "" : "eteint"}`} style={w.decor ? { backgroundImage: `url(${w.decor})` } : undefined}>
        <div className="monde-banner-in">
          <span className="monde-emoji">{w.emoji}</span>
          <h1>{w.titre}</h1>
          {w.sousTitre && <p>{w.sousTitre}</p>}
          {ch && w.cycle !== "astuces" && <p className="small crystal-tag">{lit ? `💎 ${ch.objet} — rallumé !` : `🌑 ${ch.objet} — éteint`}</p>}
          <p className="small">
            {w.niveau} · {w.age} · {pr.done}/{pr.total} leçons · ⭐ {pr.stars}/{pr.maxStars}
          </p>
        </div>
      </div>
      {w.intro && (firstVisit ? <Dialogue lines={w.intro} k={`intro:${w.id}`} /> : (
        <details className="intro-again">
          <summary>Revoir l'accueil de Mia, Néo et Zéro</summary>
          <Dialogue lines={w.intro} k={`intro:${w.id}`} />
        </details>
      ))}
      <ol className="lessons">
        {w.lecons.map((l, i) => {
          const p = child.progress[lessonKey(w, l.id)];
          const open = lessonUnlocked(child, w, i, settings);
          const total = l.etapes.length;
          const inProgress = p && !p.done && p.step > 0;
          return (
            <li key={l.id} className={`lesson-item ${open ? "" : "locked"} ${p?.done ? "done" : ""}`}>
              <div className="li-num">{p?.done ? "✓" : open ? i + 1 : "🔒"}</div>
              <div className="li-body">
                <strong>{l.titre}</strong>
                <span className="muted small">🎯 {l.objectif}</span>
                <span className="small">
                  <span className="stars">
                    {[1, 2, 3].map((s) => (
                      <span key={s} className={(p?.stars ?? 0) >= s ? "on" : ""}>
                        ★
                      </span>
                    ))}
                  </span>{" "}
                  · ⏱ {l.duree} min · 🔊 audio
                </span>
                {open && (
                  <div className="li-actions">
                    {inProgress ? (
                      <>
                        <button className="btn btn-primary" onClick={() => go(`/lecon/${w.id}/${l.id}`)}>
                          ▶ Reprendre (étape {Math.min(p.step + 1, total)}/{total})
                        </button>
                        <button className="btn btn-soft" onClick={() => go(`/lecon/${w.id}/${l.id}?debut=1`)}>
                          ⟲ Depuis le début
                        </button>
                      </>
                    ) : (
                      <button className={`btn ${p?.done ? "btn-soft" : "btn-primary"}`} onClick={() => go(`/lecon/${w.id}/${l.id}${p?.done ? "?debut=1" : ""}`)}>
                        {p?.done ? "📖 Revoir la leçon" : "▶ Commencer"}
                      </button>
                    )}
                    <button className="btn btn-orange" onClick={() => go(`/defi/${w.id}/${l.id}`)}>
                      ⭐ {p?.done ? "Refaire le défi" : "Défi"}
                    </button>
                  </div>
                )}
                {!open && <span className="small muted">Termine la leçon précédente pour l'ouvrir.</span>}
              </div>
            </li>
          );
        })}
      </ol>
      {w.cycle !== "astuces" && (
        <div className={`boss-card ${bossOpen ? "" : "locked"} ${lit ? "lit" : ""}`}>
          <div className="boss-icon">{lit ? "💎" : bossOpen ? "🏆" : "🔒"}</div>
          <div className="boss-body">
            <strong>Défi du Gardien</strong>
            <small>
              {lit
                ? "Cristal rallumé ! Tu peux rejouer pour t'entraîner."
                : bossOpen
                  ? `10 questions de tout le monde, 8 justes pour sauver ${ch?.objet ?? "ce monde"}.`
                  : `S'ouvre quand toutes les leçons ont 2 étoiles (${pr.done}/${pr.total}).`}
            </small>
            <div className="row">
              {bossOpen && (
                <button className="btn btn-orange" onClick={() => go(`/gardien/${w.id}`)}>
                  {lit ? "🔁 Rejouer" : "⚔️ Relever le défi"}
                </button>
              )}
              {lit && (
                <button className="btn btn-soft small" onClick={() => go(`/diplome/${w.id}`)}>
                  🎓 Mon diplôme
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {pr.done === pr.total && (
        <div className="card center">
          <Mascot who="zero" size={90} talking />
          <p>
            <strong>Monde conquis ! 👑</strong> Tu peux refaire les défis pour gagner toutes les étoiles.
          </p>
        </div>
      )}
    </div>
  );
}
