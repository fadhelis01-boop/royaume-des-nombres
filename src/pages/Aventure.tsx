import { useState } from "react";
import { go } from "../lib/router";
import { histoireDe, matiereDe, nextLesson, objetLabel, planeteDe, prologueId, useContent } from "../lib/content";
import { getState, markStory, useChild } from "../lib/store";
import { StoryScene } from "../components/Story";
import { Mascot } from "../components/Mascot";
import type { Line } from "../lib/types";

/** Le Livre de l'aventure : prologue, chapitres débloqués (à réécouter) et fins des livres. */
export function Aventure({ part }: { part?: string }) {
  const { manifest, worlds } = useContent();
  const child = useChild()!;
  const mat = matiereDe(child);
  const h = histoireDe(manifest, mat);
  const pid = prologueId(mat);
  const pl = planeteDe(manifest, mat);
  const decorPro = mat === "maths" ? "img/decors/foret-des-nombres.webp" : worlds.find((w) => w.matiere === mat && w.decor)?.decor;
  const tProl = pl?.prologue.titre ?? "Prologue";
  const [open, setOpen] = useState<{ titre: string; lines: Line[]; k: string; decor?: string; couleur?: string } | null>(null);
  if (!h) return <div className="page center">L'aventure n'est pas disponible.</div>;

  if (part === "prologue")
    return (
      <div className="page narrow">
        <StoryScene
          lines={h.prologue}
          choix={h.prologueChoix}
          titre={tProl}
          k={pid}
          decor={decorPro}
          onDone={() => {
            const fresh = !child.story?.[pid] && !Object.keys(child.progress).some((k) => worlds.find((w) => w.id === k.split("/")[0])?.matiere === mat);
            markStory(pid);
            if (fresh && child.age >= 8 && !child.counters[`diag:${mat}`] && !(mat === "maths" && child.diag)) go("/diagnostic?quete=1");
            else if (fresh) {
              const n = nextLesson(child, getState().settings);
              go(n ? `/lecon/${n.world.id}/${n.lesson.id}` : "/");
            } else go("/");
          }}
          doneLabel="Je relève le défi ! ➜"
        />
      </div>
    );

  if (open)
    return (
      <div className="page narrow">
        <button className="back" onClick={() => setOpen(null)}>
          ← Le Livre
        </button>
        <StoryScene lines={open.lines} titre={open.titre} k={open.k} decor={open.decor} couleur={open.couleur} onDone={() => setOpen(null)} doneLabel="Refermer le chapitre" />
      </div>
    );

  const crystals = child.crystals ?? [];
  return (
    <div className="page narrow">
      <button className="back" onClick={() => go("/")}>
        ← Carte
      </button>
      <h1>📖 Le Livre de l'aventure</h1>
      <div className="card row">
        <Mascot who="nuage" size={70} humeur={child.story?.["fin-arc-1"] ? "joie" : undefined} />
        <div>
          <strong>
            {objetLabel(pl, crystals.length)}
          </strong>
          <p className="small muted">Apprends les leçons d'un monde, puis réussis son Défi du Gardien pour le sauver et lire la suite de l'histoire.</p>
        </div>
      </div>
      <button className="chapter-row" onClick={() => setOpen({ titre: tProl, lines: h.prologue, k: `${pid}-replay`, decor: decorPro })}>
        <span>📜</span>
        <strong>{tProl}</strong>
      </button>
      {h.arcs.map((arc) => {
        const num = arc.id.slice(-1);
        const ws = worlds.filter((w) => w.matiere === mat && h.chapitres[w.id] && (num === "1" ? w.cycle === "graines" : num === "2" ? w.cycle === "explorateurs" : w.cycle === "maitres"));
        const finished = !!child.story?.[`fin-${arc.id}`];
        return (
          <section key={arc.id} className="arc">
            <h2>
              {arc.titre} <small className="muted">{arc.sousTitre}</small>
            </h2>
            {ws.map((w) => {
              const ch = h.chapitres[w.id];
              const lit = crystals.includes(w.id);
              const begun = !!child.story?.[`avant:${w.id}`];
              return (
                <div key={w.id} className={`chapter-row ${lit ? "lit" : begun ? "" : "locked"}`} style={{ "--wc": w.couleur } as React.CSSProperties}>
                  <span>{lit ? "💎" : begun ? w.emoji : "🔒"}</span>
                  <div className="chapter-body">
                    <strong>{ch.titre}</strong>
                    <small className="muted">{lit ? `${ch.objet} — rallumé !` : begun ? `${ch.objet} — à rallumer (Défi du Gardien)` : "Chapitre pas encore commencé"}</small>
                    <div className="row">
                      {begun && (
                        <button className="link small" onClick={() => setOpen({ titre: ch.titre, lines: ch.avant, k: `avant-${w.id}`, decor: w.decor, couleur: w.couleur })}>
                          ▶ Début du chapitre
                        </button>
                      )}
                      {lit && (
                        <button className="link small" onClick={() => setOpen({ titre: `${ch.titre} — la victoire`, lines: ch.apres, k: `apres-${w.id}`, decor: w.decor, couleur: w.couleur })}>
                          ⭐ La victoire
                        </button>
                      )}
                      {!begun && (
                        <button className="link small" onClick={() => go(`/monde/${w.id}`)}>
                          Aller au monde
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {finished && (
              <button className="chapter-row lit" onClick={() => setOpen({ titre: `${arc.titre} — Fin`, lines: arc.fin, k: `fin-${arc.id}` })}>
                <span>🏁</span>
                <strong>Fin du livre : réécouter</strong>
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
