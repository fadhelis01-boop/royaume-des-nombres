import { useEffect, useMemo, useState } from "react";
import { go } from "../lib/router";
import { findLesson, lessonUnlocked } from "../lib/content";
import { bump, finishDefi, getState, recordAbandon, useChild } from "../lib/store";
import { instantiate, newSeed, type Instance } from "../lib/gen";
import { sfx } from "../lib/sound";
import { ExercisePlayer, type ExResult } from "../components/ExercisePlayer";
import { Bubble, Mascot } from "../components/Mascot";
import { Confetti } from "../components/Confetti";
import type { ExSpec } from "../lib/types";
import { leadFor } from "../lib/habillage";

/** Classe les exercices du plus simple au plus difficile (niveau, puis ordre d'écriture). */
export function rankSpecs(specs: ExSpec[]): ExSpec[] {
  return specs
    .map((e, i) => ({ e, r: (e.niveau ?? 2) * 100 + i }))
    .sort((x, y) => x.r - y.r)
    .map((x) => x.e);
}

/** Plan du défi : chaque type d'exercice au moins une fois, du plus simple au plus difficile. */
export function planDefi(specs: ExSpec[], n: number): ExSpec[] {
  const ranked = rankSpecs(specs);
  const plan: { e: ExSpec; r: number }[] = ranked.slice(0, n).map((e, r) => ({ e, r }));
  while (plan.length < n && ranked.length) {
    const r = Math.floor(Math.random() * ranked.length);
    plan.push({ e: ranked[r], r });
  }
  return plan.sort((x, y) => x.r - y.r).map((x) => x.e);
}

function draw(spec: ExSpec): Instance | null {
  try {
    return instantiate(spec, newSeed());
  } catch {
    return null;
  }
}

/** Ancienne API (révisions, défi du jour) : n questions tirées au hasard. */
export function drawQuestions(specs: ExSpec[], n: number): Instance[] {
  return planDefi(specs, n)
    .map(draw)
    .filter((x): x is Instance => !!x);
}

export function DefiPage({ worldId, lessonId }: { worldId: string; lessonId: string }) {
  const found = findLesson(worldId, lessonId);
  const child = useChild()!;
  const [round, setRound] = useState(0);
  const plan = useMemo(() => (found ? planDefi(found.lesson.exercices, found.lesson.nb_defi) : []), [found?.lesson, round]);
  // Question « souvenir » : une question d'une leçon précédente du monde, en bonus (entrelacement :
  // mélanger l'ancien et le nouveau aide à retenir). Elle ne compte pas dans les étoiles.
  const souvenir = useMemo(() => {
    if (!found || found.idx === 0) return null;
    const before = found.world.lecons.slice(0, found.idx).filter((l) => l.exercices.length);
    const l = before[Math.floor(Math.random() * before.length)];
    return l ? { spec: l.exercices[Math.floor(Math.random() * l.exercices.length)], titre: l.titre } : null;
  }, [found?.lesson, round]);
  const total = plan.length + (souvenir ? 1 : 0);
  const [idx, setIdx] = useState(0);
  // Les questions sont tirées au fur et à mesure : après deux erreurs de suite,
  // on propose une question plus simple pour reprendre confiance (difficulté adaptative).
  const [questions, setQuestions] = useState<Instance[]>([]);
  const [eased, setEased] = useState(false);
  useEffect(() => {
    const first = plan.length ? draw(plan[0]) : null;
    setQuestions(first ? [first] : []);
  }, [plan]);
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
    if (idx + 1 === plan.length && souvenir) {
      const q = draw(souvenir.spec);
      if (q) {
        setQuestions((qs) => [...qs, q]);
        setEased(false);
        setIdx(idx + 1);
        return;
      }
    }
    if (idx + 1 < plan.length) {
      const twoWrong = all.length >= 2 && !all[all.length - 1].ok && !all[all.length - 2].ok;
      const spec = twoWrong ? rankSpecs(lesson.exercices)[0] : plan[idx + 1];
      const q = draw(spec) ?? draw(plan[idx + 1]);
      setEased(twoWrong);
      if (q) setQuestions((qs) => [...qs, q]);
      setIdx(idx + 1);
    } else {
      const scored = all.slice(0, plan.length);
      if (all.length > plan.length) bump(all[plan.length].ok ? "souvenir-ok" : "souvenir-ko");
      const score = scored.reduce((t, x) => t + (x.ok ? (x.firstTry ? 1 : 0.5) : 0), 0) / scored.length;
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
            ? "Une étoile : tu y es presque ! Pour ouvrir la leçon suivante, il faut 2 étoiles (8 bonnes réponses sur 10). Refais le défi : les questions changent à chaque fois !"
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
          {end.stars >= 2 && next && nextOpen && (
            <button className="btn btn-primary btn-xl" onClick={() => go(`/lecon/${world.id}/${next.id}`)}>
              Leçon suivante : {next.titre} →
            </button>
          )}
          {end.stars <= 1 && (
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
        <button
          className="back"
          onClick={() => {
            if (idx > 0) recordAbandon(`${world.id}/${lesson.id}:defi`);
            go(`/monde/${world.id}`);
          }}
          aria-label="Quitter le défi"
        >
          ✕
        </button>
        <div className="dots">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={i < results.length ? (results[i].ok ? "ok" : "ko") : i === idx ? "cur" : ""} />
          ))}
        </div>
        <span className="small muted">
          {idx + 1}/{total}
        </span>
      </div>
      <h1 className="lecon-title small">⭐ Défi : {lesson.titre}</h1>
      {idx >= plan.length && souvenir && <Bubble who="zero" text={`🧠 Question souvenir (bonus, elle ne compte pas) : tu te rappelles « ${souvenir.titre} » ?`} size={50} />}
      {eased && <Bubble who="neo" text="Tiens, une question un peu plus simple pour reprendre des forces. On remonte ensuite, d'accord ?" size={50} />}
      <ExercisePlayer key={q.seed} inst={q} statKey={key} onResult={onResult} lead={leadFor(world.id, world.cycle, q.seed)} continueLabel={idx + 1 < total ? "Question suivante" : "Voir mes étoiles"} metacog />
    </div>
  );
}
