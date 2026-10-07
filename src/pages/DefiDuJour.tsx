import { useMemo, useState } from "react";
import { go } from "../lib/router";
import { getContent, nextLesson } from "../lib/content";
import { addXp, dayKey, dayNumber, getState, updateChild, useChild } from "../lib/store";
import { XP } from "../lib/rewards";
import { instantiate, newSeed, type Instance } from "../lib/gen";
import { ExercisePlayer } from "../components/ExercisePlayer";
import { Bubble } from "../components/Mascot";
import { EnigmeCard } from "./jeux/Enigmes";

export function DefiDuJour() {
  const child = useChild()!;
  const already = child.daily?.day === dayKey() && child.daily.done;
  const qs = useMemo(() => {
    const { worlds } = getContent();
    const done = Object.entries(child.progress)
      .filter(([, p]) => p.done)
      .map(([k]) => k);
    const keys = done.length ? done : (() => {
      const n = nextLesson(child, getState().settings);
      return n ? [`${n.world.id}/${n.lesson.id}`] : [];
    })();
    const out: { key: string; inst: Instance }[] = [];
    for (let i = 0; i < 5 && keys.length; i++) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      const [w, l] = key.split("/");
      const lesson = worlds.find((x) => x.id === w)?.lecons.find((x) => x.id === l);
      if (!lesson) continue;
      try {
        out.push({ key, inst: instantiate(lesson.exercices[Math.floor(Math.random() * lesson.exercices.length)], newSeed()) });
      } catch {
        /* ignoré */
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const enigme = useMemo(() => {
    const all = getContent().manifest?.enigmes ?? [];
    const lvl = child.age < 10 ? 1 : child.age < 14 ? 2 : 3;
    const pool = all.filter((e) => e.niveau === lvl);
    return pool.length ? pool[dayNumber() % pool.length] : all[dayNumber() % Math.max(1, all.length)];
  }, [child.age]);
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(0);

  const finish = () => {
    if (!already) {
      updateChild((c) => {
        c.daily = { day: dayKey(), done: true };
      });
      addXp(XP.daily);
    }
  };

  if (i < qs.length)
    return (
      <div className="page defi">
        <div className="lecon-top">
          <button className="back" onClick={() => go("/")}>
            ✕
          </button>
          <div className="dots">
            {qs.map((_, k) => (
              <span key={k} className={k < i ? "ok" : k === i ? "cur" : ""} />
            ))}
            <span className={i >= qs.length ? "cur" : ""}>🧩</span>
          </div>
        </div>
        <h1 className="lecon-title small">🎁 Défi du jour</h1>
        <ExercisePlayer
          key={qs[i].inst.seed}
          inst={qs[i].inst}
          statKey={qs[i].key}
          onResult={(r) => {
            if (r.ok) setOk(ok + 1);
            setI(i + 1);
          }}
        />
      </div>
    );
  return (
    <div className="page">
      <h1>🎁 Défi du jour</h1>
      <Bubble who="neo" text={`${ok} bonne${ok > 1 ? "s" : ""} réponse${ok > 1 ? "s" : ""} sur ${qs.length}. Et maintenant… l'énigme du jour !`} />
      {enigme && <EnigmeCard e={enigme} />}
      <div className="center" style={{ marginTop: 16 }}>
        <button
          className="btn btn-primary btn-xl"
          onClick={() => {
            finish();
            go("/");
          }}
        >
          {already ? "Retour à la carte" : `Terminer (+${XP.daily} points) ✔`}
        </button>
      </div>
    </div>
  );
}
