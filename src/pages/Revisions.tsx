import { useState } from "react";
import { go } from "../lib/router";
import { findLesson } from "../lib/content";
import { bump, dueCards, reviewCard, useChild, addXp } from "../lib/store";
import { instantiate, newSeed, type Instance } from "../lib/gen";
import { XP } from "../lib/rewards";
import { ExercisePlayer, type ExResult } from "../components/ExercisePlayer";
import { Bubble } from "../components/Mascot";

interface Q {
  key: string;
  inst: Instance;
  label: string;
}

function build(keys: string[], perLesson: number): Q[] {
  const qs: Q[] = [];
  for (const key of keys) {
    const [w, l] = key.split("/");
    const f = findLesson(w, l);
    if (!f) continue;
    const specs = [...f.lesson.exercices].sort(() => Math.random() - 0.5).slice(0, perLesson);
    for (const s of specs) {
      try {
        qs.push({ key, inst: instantiate(s, newSeed()), label: `${f.world.emoji} ${f.lesson.titre}` });
      } catch {
        /* ignoré */
      }
    }
  }
  // On MÉLANGE les leçons (pratique entrelacée : plus efficace pour retenir)
  return qs.sort(() => Math.random() - 0.5);
}

export function Revisions() {
  const child = useChild()!;
  const due = dueCards(child);
  const [session, setSession] = useState<{ qs: Q[]; mode: string } | null>(null);
  const [idx, setIdx] = useState(0);
  const [res, setRes] = useState<Record<string, boolean[]>>({});
  const [finished, setFinished] = useState(false);

  const doneKeys = Object.entries(child.progress)
    .filter(([, p]) => p.done)
    .map(([k]) => k);
  const mistakeKeys = [...new Set(child.mistakes.map((m) => m.key))].filter((k) => k.includes("/")).slice(0, 6);

  const start = (keys: string[], mode: string, per = 2) => {
    const qs = build(keys, per).slice(0, 12);
    setSession({ qs, mode });
    setIdx(0);
    setRes({});
    setFinished(false);
  };

  if (session && !finished) {
    const q = session.qs[idx];
    if (!q) return null;
    const onResult = (r: ExResult) => {
      const nr = { ...res, [q.key]: [...(res[q.key] ?? []), r.ok] };
      setRes(nr);
      if (idx + 1 < session.qs.length) setIdx(idx + 1);
      else {
        if (session.mode === "due") for (const [k, oks] of Object.entries(nr)) reviewCard(k, oks.every(Boolean));
        bump("revision");
        addXp(XP.revision);
        setFinished(true);
      }
    };
    return (
      <div className="page defi">
        <div className="lecon-top">
          <button className="back" onClick={() => setSession(null)}>
            ✕
          </button>
          <div className="dots">
            {session.qs.map((_, i) => (
              <span key={i} className={i < idx ? "ok" : i === idx ? "cur" : ""} />
            ))}
          </div>
        </div>
        <p className="small muted center">{q.label}</p>
        <ExercisePlayer key={q.inst.seed} inst={q.inst} statKey={q.key} onResult={onResult} />
      </div>
    );
  }

  if (finished && session) {
    const all = Object.values(res).flat();
    const ok = all.filter(Boolean).length;
    return (
      <div className="page center">
        <h1>Révision terminée ! 🔁</h1>
        <p className="lead">
          {ok} / {all.length} bonnes réponses
        </p>
        <Bubble who="mia" text="Réviser un peu chaque jour, c'est le secret des champions : ton cerveau garde les choses beaucoup plus longtemps !" />
        <button className="btn btn-primary" onClick={() => setSession(null)}>
          Super !
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>🔁 Révisions</h1>
      <Bubble
        who="neo"
        text={
          due.length
            ? `Il y a ${due.length} leçon${due.length > 1 ? "s" : ""} à revoir aujourd'hui. On mélange tout : c'est comme ça qu'on retient le mieux !`
            : "Rien à revoir aujourd'hui : bravo ! Tu peux quand même t'entraîner ci-dessous."
        }
      />
      <div className="stack">
        <button className="btn btn-primary btn-xl" disabled={!due.length} onClick={() => start(due.slice(0, 6).map((d) => d.key), "due")}>
          🧠 Réviser maintenant {due.length ? `(${due.length})` : ""}
        </button>
        <button className="btn btn-soft" disabled={!mistakeKeys.length} onClick={() => start(mistakeKeys, "erreurs")}>
          🎯 Retravailler mes erreurs {mistakeKeys.length ? `(${mistakeKeys.length} leçons)` : ""}
        </button>
        <button className="btn btn-soft" disabled={!doneKeys.length} onClick={() => start([...doneKeys].sort(() => Math.random() - 0.5).slice(0, 6), "libre")}>
          🎲 Révision surprise (leçons déjà faites)
        </button>
      </div>
      {!doneKeys.length && <p className="muted center">Termine ta première leçon : elle apparaîtra ici pour être révisée au bon moment (demain, dans 3 jours, dans une semaine…).</p>}
      <details className="card" style={{ marginTop: 20 }}>
        <summary>Comment marchent les révisions ?</summary>
        <p>
          Chaque leçon réussie revient te voir <strong>le lendemain</strong>, puis après <strong>3 jours</strong>, <strong>une semaine</strong>, <strong>deux semaines</strong>, <strong>un mois</strong>… Si tu te trompes, elle revient plus vite. Les scientifiques appellent ça la <em>répétition espacée</em> : c'est la méthode la plus efficace pour ne jamais oublier.
        </p>
      </details>
    </div>
  );
}

export const goRevisions = () => go("/revisions");
