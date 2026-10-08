import { useEffect, useMemo, useState } from "react";
import { go } from "../lib/router";
import { useContent, worldProgress } from "../lib/content";
import { addCrystal, getState, markStory, setState, useChild } from "../lib/store";
import { instantiate, newSeed, type Instance } from "../lib/gen";
import { MASTERY } from "../lib/rewards";
import { sfx } from "../lib/sound";
import { ExercisePlayer, type ExResult } from "../components/ExercisePlayer";
import { Bubble, Mascot } from "../components/Mascot";
import { StoryScene } from "../components/Story";
import { rankSpecs } from "./Defi";
import type { Line, World } from "../lib/types";

// Le Défi du Gardien : le « boss » de chaque monde. 10 questions qui mélangent
// toutes les leçons, de la première à la dernière. 80 % → le cristal se rallume.

const N = 10;

export function gardienOuvert(w: World) {
  const c = getState().children.find((x) => x.id === getState().activeId) ?? null;
  return getState().settings.unlockAll || worldProgress(c, w).done === w.lecons.length;
}

function plan(w: World): Instance[] {
  const picks = w.lecons.map((l) => {
    const r = rankSpecs(l.exercices);
    return r.slice(Math.floor(r.length / 2)); // la moitié la plus exigeante de chaque leçon
  });
  const out: Instance[] = [];
  for (let i = 0; out.length < N && i < N * 4; i++) {
    const pool = picks[i % picks.length];
    if (!pool.length) continue;
    try {
      out.push(instantiate(pool[Math.floor(Math.random() * pool.length)], newSeed()));
    } catch {
      /* suivant */
    }
  }
  return out;
}

function villain(w: World): Line[] {
  if (w.cycle === "graines") return [{ who: "nuage", text: "Hi hi ! Le cristal est caché derrière dix nuages. Pour chaque bonne réponse, un nuage s'envole… Tu n'y arriveras jamais ! (enfin… peut-être que si)" }];
  if (w.cycle === "explorateurs") return [{ who: "ixe", text: "Dix énigmes gardent le fragment de carte. Montre-moi que tu sais trouver les inconnues !" }];
  return [{ who: "narrateur", text: "Le Grand Oubli a effacé dix pages. Pour chaque bonne réponse, une page se réécrit…" }];
}

export function Gardien({ worldId }: { worldId: string }) {
  const { worlds, manifest } = useContent();
  const child = useChild()!;
  const w = worlds.find((x) => x.id === worldId);
  const ch = w ? manifest?.histoire?.chapitres[w.id] : undefined;
  const [phase, setPhase] = useState<"intro" | "jeu" | "fin" | "arc">("intro");
  const [round, setRound] = useState(0);
  const qs = useMemo(() => (w ? plan(w) : []), [w, round]);
  const [i, setI] = useState(0);
  const [res, setRes] = useState<ExResult[]>([]);
  const [score, setScore] = useState(0);
  useEffect(() => {
    setI(0);
    setRes([]);
  }, [round]);
  if (!w) return <div className="page center">Monde introuvable.</div>;
  const arc = manifest?.histoire?.arcs.find((a) => a.final === w.id);

  if (!gardienOuvert(w))
    return (
      <div className="page narrow center">
        <Mascot who="nuage" size={110} />
        <h1>🔒 Défi du Gardien</h1>
        <Bubble who="mia" text={`Le Défi du Gardien s'ouvre quand toutes les leçons de ${w.titre} sont validées (2 étoiles). Encore un peu d'entraînement !`} />
        <button className="btn btn-primary" onClick={() => go(`/monde/${w.id}`)}>
          Retour au monde
        </button>
      </div>
    );

  if (phase === "intro")
    return (
      <div className="page narrow">
        <button className="back" onClick={() => go(`/monde/${w.id}`)}>
          ← {w.titre}
        </button>
        <StoryScene
          lines={[{ who: "narrateur", text: `${w.titre} : voici le Défi du Gardien. ${ch ? "Il protège " + ch.objet + "." : ""}` }, ...villain(w), { who: "neo", text: "Dix questions de toutes les leçons du monde. Il en faut 8 justes. Défi accepté ?" }]}
          titre={`🏆 Défi du Gardien — ${w.titre}`}
          decor={w.decor}
          couleur={w.couleur}
          k={`gardien-${w.id}`}
          onDone={() => setPhase("jeu")}
          doneLabel="Défi accepté ! ⚔️"
        />
      </div>
    );

  if (phase === "arc" && arc)
    return (
      <div className="page narrow">
        <StoryScene lines={arc.fin} titre={`${arc.titre} — Fin`} k={`fin-${arc.id}`} onDone={() => go("/aventure")} doneLabel="Ouvrir le Livre de l'aventure ➜" />
      </div>
    );

  if (phase === "fin") {
    const won = score >= MASTERY - 1e-9;
    if (won && ch)
      return (
        <div className="page narrow">
          <div className="crystal-win">💎</div>
          <StoryScene
            lines={ch.apres}
            titre={`${ch.objet} rallumé !`}
            decor={w.decor}
            couleur={w.couleur}
            k={`apres-${w.id}`}
            onDone={() => {
              if (arc && !child.story?.[`fin-${arc.id}`]) {
                markStory(`fin-${arc.id}`);
                setPhase("arc");
              } else go(`/diplome/${w.id}`);
            }}
            doneLabel={arc && !child.story?.[`fin-${arc.id}`] ? "La fin du livre… ➜" : "Voir mon diplôme 🎓"}
          />
        </div>
      );
    return (
      <div className="page narrow center">
        <Mascot who={w.cycle === "graines" ? "nuage" : "ixe"} size={110} humeur="joie" />
        <h1>{Math.round(score * 10)} / 10</h1>
        <Bubble who="mia" text="Presque ! Le cristal a clignoté… Il faut 8 bonnes réponses sur 10 pour le rallumer. Révise les leçons où tu as hésité, puis retente ta chance : les questions changent à chaque fois !" />
        <div className="stack">
          <button
            className="btn btn-primary"
            onClick={() => {
              setRound(round + 1);
              setPhase("jeu");
            }}
          >
            🔁 Retenter le Défi
          </button>
          <button className="btn btn-soft" onClick={() => go(`/monde/${w.id}`)}>
            📖 Réviser les leçons
          </button>
        </div>
      </div>
    );
  }

  const q = qs[i];
  if (!q) return null;
  const lights = res.filter((r) => r.ok).length;
  return (
    <div className="page defi" style={{ "--wc": w.couleur } as React.CSSProperties}>
      <div className="lecon-top">
        <button className="back" onClick={() => go(`/monde/${w.id}`)}>
          ✕
        </button>
        <div className="crystal-meter" aria-label={`${lights} nuages chassés sur 10`}>
          {qs.map((_, k) => (
            <span key={k} className={k < res.length ? (res[k].ok ? "lit" : "miss") : k === i ? "cur" : ""}>
              {k < res.length && res[k].ok ? "✨" : "☁️"}
            </span>
          ))}
        </div>
      </div>
      <h1 className="lecon-title small">🏆 Défi du Gardien — {w.titre}</h1>
      <ExercisePlayer
        key={q.seed}
        inst={q}
        statKey={`${w.id}/gardien`}
        onResult={(r) => {
          const all = [...res, r];
          setRes(all);
          if (i + 1 < qs.length) setI(i + 1);
          else {
            const sc = all.reduce((t, x) => t + (x.ok ? (x.firstTry ? 1 : 0.5) : 0), 0) / all.length;
            setScore(sc);
            if (sc >= MASTERY - 1e-9 && addCrystal(w.id)) {
              sfx.fanfare();
              setState({ celebration: { kind: "world", emoji: "💎", title: "Cristal rallumé !", text: `${ch?.objet ?? "Le cristal"} brille à nouveau sur ${w.titre}. Le Royaume te dit merci !` } }, false);
            }
            setPhase("fin");
          }
        }}
        continueLabel={i + 1 < qs.length ? "Question suivante" : "Le cristal va-t-il se rallumer ?"}
      />
    </div>
  );
}
