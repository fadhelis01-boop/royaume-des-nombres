import { useMemo, useState } from "react";
import { go } from "../lib/router";
import { useContent } from "../lib/content";
import { instantiate, newSeed, type Instance } from "../lib/gen";
import { updateChild } from "../lib/store";
import { ExercisePlayer } from "../components/ExercisePlayer";
import { Bubble } from "../components/Mascot";

// Test de positionnement adaptatif : on avance monde par monde (2 questions
// chacun) et on s'arrête dès que l'enfant rencontre deux mondes difficiles.
// Les mondes réussis sont « validés » : ils s'ouvrent, sans être comptés comme faits.

export function Diagnostic() {
  const { manifest, worlds } = useContent();
  const plan = useMemo(() => {
    const byWorld = new Map<string, Instance[]>();
    for (const d of manifest?.diagnostic ?? []) {
      try {
        const inst = instantiate(d.ex, newSeed());
        byWorld.set(d.monde, [...(byWorld.get(d.monde) ?? []), inst]);
      } catch {
        /* ignoré */
      }
    }
    return worlds.filter((w) => w.cycle !== "astuces" && byWorld.has(w.id)).map((w) => ({ world: w, qs: byWorld.get(w.id)!.slice(0, 2) }));
  }, [manifest, worlds]);
  const [started, setStarted] = useState(false);
  const [wi, setWi] = useState(0);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [validated, setValidated] = useState<string[]>([]);
  const [fails, setFails] = useState(0);
  const [done, setDone] = useState(false);

  const finish = (val: string[]) => {
    updateChild((c) => {
      c.validatedWorlds = [...new Set([...c.validatedWorlds, ...val])];
      c.diag = { at: Date.now(), validated: val };
    });
    setDone(true);
  };

  if (!started)
    return (
      <div className="page narrow">
        <h1>🧭 Le petit test</h1>
        <Bubble who="neo" text="Je vais te poser quelques questions, de plus en plus difficiles. Ce n'est PAS une interro : ça sert juste à trouver où commencer ton aventure !" />
        <Bubble who="mia" text="Si tu ne sais pas, ce n'est pas grave du tout : ça veut dire qu'on va l'apprendre ensemble." side="right" />
        <div className="center">
          <button className="btn btn-primary btn-xl" onClick={() => setStarted(true)}>
            C'est parti !
          </button>
          <button className="btn btn-ghost" onClick={() => go("/")}>
            Plus tard
          </button>
        </div>
      </div>
    );

  if (done || !plan.length) {
    const first = worlds.find((w) => w.cycle !== "astuces" && !validated.includes(w.id));
    return (
      <div className="page narrow center">
        <h1>Résultat 🎉</h1>
        {validated.length ? (
          <Bubble who="mia" text={`Bravo ! Tu connais déjà bien : ${validated.map((id) => worlds.find((w) => w.id === id)?.titre).join(", ")}. Ces mondes sont ouverts : tu peux y gagner des étoiles quand tu veux.`} />
        ) : (
          <Bubble who="mia" text="On commence par le début : c'est comme ça qu'on construit une maison solide, brique par brique !" />
        )}
        {first && <Bubble who="neo" text={`Je te conseille de commencer par ${first.emoji} ${first.titre}. Défi accepté ?`} side="right" />}
        <button className="btn btn-primary btn-xl" onClick={() => go(first ? `/monde/${first.id}` : "/")}>
          Aller à l'aventure ➜
        </button>
      </div>
    );
  }

  const cur = plan[wi];
  const q = cur.qs[qi];
  return (
    <div className="page defi">
      <div className="lecon-top">
        <button className="back" onClick={() => finish(validated)}>
          ✕
        </button>
        <span className="small muted">
          {cur.world.emoji} {cur.world.titre}
        </span>
      </div>
      <ExercisePlayer
        key={q.seed}
        inst={q}
        statKey="diagnostic"
        maxTries={1}
        onResult={(r) => {
          const s = score + (r.ok ? 1 : 0);
          if (qi + 1 < cur.qs.length) {
            setScore(s);
            setQi(qi + 1);
            return;
          }
          const ok = s === cur.qs.length;
          const val = ok ? [...validated, cur.world.id] : validated;
          const f = ok ? 0 : fails + 1;
          setValidated(val);
          setFails(f);
          setScore(0);
          setQi(0);
          if (f >= 2 || wi + 1 >= plan.length) finish(val);
          else setWi(wi + 1);
        }}
      />
    </div>
  );
}
