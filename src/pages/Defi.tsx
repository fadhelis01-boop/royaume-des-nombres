import { useMemo, useState } from "react";
import { go } from "../lib/router";
import { findLesson, lessonUnlocked } from "../lib/content";
import { finishDefi, getState, useChild } from "../lib/store";
import { instantiate, newSeed, type Instance } from "../lib/gen";
import { sfx } from "../lib/sound";
import { ExercisePlayer, type ExResult } from "../components/ExercisePlayer";
import { Bubble, Mascot } from "../components/Mascot";
import { Confetti } from "../components/Confetti";
import type { ExSpec } from "../lib/types";

/** Tire n questions en couvrant tous les types d'exercices de la leçon (puis au hasard). */
export function drawQuestions(specs: ExSpec[], n: number): Instance[] {
  const order: ExSpec[] = [];
  const pool = [...specs].sort(() => Math.random() - 0.5);
  while (order.length < n && pool.length) order.push(pool[order.length % pool.length]);
  const out: Instance[] = [];
  for (const s of order) {
    try {
      out.push(instantiate(s, newSeed()));
    } catch {
      /* un exercice défaillant ne bloque pas le défi */
    }
  }
  return out;
}

export function DefiPage({ worldId, lessonId }: { worldId: string; lessonId: string }) {
  const found = findLesson(worldId, lessonId);
  const child = useChild()!;
  const [round, setRound] = useState(0);
  const questions = useMemo(() => (found ? drawQuestions(found.lesson.exercices, found.lesson.nb_defi) : []), [found?.lesson, round]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<ExResult[]>([]);
  const [end, setEnd] = useState<{ stars: number; score: number; newBest: boolean } | null>(null);

  if (!found)
    return (
      <div className="page center">
        <p>Défi introuvable.</p>
      </div>
    );
  const { world, lesson } = found;
  const key = `${world.id}/${lesson.id}`;

  const onResult = (r: ExResult) => {
    const all = [...results, r];
    setResults(all);
    if (idx + 1 < questions.length) setIdx(idx + 1);
    else {
      const score = all.reduce((t, x) => t + (x.ok ? (x.firstTry ? 1 : 0.5) : 0), 0) / all.length;
      const res = finishDefi(key, score);
      if (res.stars > 0) sfx.fanfare();
      setEnd({ stars: res.stars, score, newBest: res.newBest });
    }
  };

  if (end) {
    const nextIdx = found.idx + 1;
    const next = world.lecons[nextIdx];
    const nextOpen = next && lessonUnlocked(getState().children.find((c) => c.id === child.id) ?? child, world, nextIdx, getState().settings);
    const pct = Math.round(end.score * 100);
    const msg =
      end.stars === 3
        ? "TROIS ÉTOILES ! Tu maîtrises cette leçon comme un grand savant !"
        : end.stars === 2
          ? "Deux étoiles, c'est super ! Tu peux viser la troisième quand tu veux."
          : end.stars === 1
            ? "Une étoile : leçon validée ! En t'entraînant, les autres étoiles vont arriver."
            : "Pas encore d'étoile… Ce n'est pas grave : relis la leçon tranquillement et réessaie. Chaque essai fait grandir ton cerveau !";
    return (
      <div className="page defi-end center">
        {end.stars > 0 && !getState().settings.reduceMotion && <Confetti />}
        <div className="big-stars">
          {[1, 2, 3].map((s) => (
            <span key={s} className={end.stars >= s ? "on pop" : ""} style={{ animationDelay: `${s * 0.25}s` }}>
              ★
            </span>
          ))}
        </div>
        <h1>{pct} % de réussite</h1>
        <Bubble who={end.stars >= 2 ? "mia" : end.stars === 1 ? "neo" : "zero"} text={msg} />
        <div className="stack">
          {end.stars > 0 && next && nextOpen && (
            <button className="btn btn-primary btn-xl" onClick={() => go(`/lecon/${world.id}/${next.id}`)}>
              Leçon suivante : {next.titre} →
            </button>
          )}
          {end.stars === 0 && (
            <button className="btn btn-primary btn-xl" onClick={() => go(`/lecon/${world.id}/${lesson.id}?debut=1`)}>
              📖 Relire la leçon
            </button>
          )}
          <button
            className="btn btn-soft"
            onClick={() => {
              setEnd(null);
              setResults([]);
              setIdx(0);
              setRound(round + 1);
            }}
          >
            🔁 Refaire le défi (nouvelles questions)
          </button>
          <button className="btn btn-ghost" onClick={() => go(`/monde/${world.id}`)}>
            ← Retour au monde {world.emoji}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  if (!q)
    return (
      <div className="page center">
        <Mascot who="zero" size={100} />
        <p>Oups, aucune question disponible pour ce défi.</p>
      </div>
    );
  return (
    <div className="page defi" style={{ "--wc": world.couleur } as React.CSSProperties}>
      <div className="lecon-top">
        <button className="back" onClick={() => go(`/monde/${world.id}`)} aria-label="Quitter le défi">
          ✕
        </button>
        <div className="dots">
          {questions.map((_, i) => (
            <span key={i} className={i < results.length ? (results[i].ok ? "ok" : "ko") : i === idx ? "cur" : ""} />
          ))}
        </div>
        <span className="small muted">
          {idx + 1}/{questions.length}
        </span>
      </div>
      <h1 className="lecon-title small">⭐ Défi : {lesson.titre}</h1>
      <ExercisePlayer key={q.seed} inst={q} statKey={key} onResult={onResult} continueLabel={idx + 1 < questions.length ? "Question suivante" : "Voir mes étoiles"} />
    </div>
  );
}
