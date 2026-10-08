import { useEffect, useMemo, useRef, useState } from "react";
import { go } from "../lib/router";
import { gardienDe, getContent, histoireDe, planeteDe, useContent, worldProgress } from "../lib/content";
import { addCrystal, addGems, getState, markStory, recordAbandon, setState, useChild } from "../lib/store";
import { burst, centerOf, floatText, shake } from "../lib/juice";
import { say } from "../lib/tts";
import { fmtNum } from "../lib/expr";
import { visuel } from "../lib/img";
import { instantiate, newSeed, type Instance } from "../lib/gen";
import { MASTERY } from "../lib/rewards";
import { sfx } from "../lib/sound";
import { ExercisePlayer, type ExResult } from "../components/ExercisePlayer";
import { Bubble, Mascot } from "../components/Mascot";
import { StoryScene } from "../components/Story";
import { rankSpecs } from "./Defi";
import type { FoeSprite, Line, Who, World } from "../lib/types";

// Le Défi du Gardien : le « boss » de chaque monde. 10 questions qui mélangent
// toutes les leçons, de la première à la dernière. 80 % → le cristal se rallume.

const N = 10;

export function gardienOuvert(w: World) {
  const c = getState().children.find((x) => x.id === getState().activeId) ?? null;
  return getState().settings.unlockAll || worldProgress(c, w).done === w.lecons.length;
}

function plan(w: World, n = N): Instance[] {
  const picks = w.lecons.map((l) => {
    const r = rankSpecs(l.exercices);
    return r.slice(Math.floor(r.length / 2)); // la moitié la plus exigeante de chaque leçon
  });
  const out: Instance[] = [];
  for (let i = n === N ? 0 : Math.floor(Math.random() * picks.length); out.length < n && i < n * 6; i++) {
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
  const g = gardienDe(getContent().manifest, w);
  return g.ouverture ? [{ who: g.qui, text: g.ouverture }] : [];
}

export function Gardien({ worldId }: { worldId: string }) {
  const { worlds, manifest } = useContent();
  const child = useChild()!;
  const w = worlds.find((x) => x.id === worldId);
  const ch = w ? histoireDe(manifest, w.matiere)?.chapitres[w.id] : undefined;
  const [phase, setPhase] = useState<"intro" | "jeu" | "fin" | "arc">("intro");
  const [round, setRound] = useState(0);
  const qs = useMemo(() => (w ? plan(w) : []), [w, round]);
  const [score, setScore] = useState(0);
  if (!w) return <div className="page center">Monde introuvable.</div>;
  const arc = histoireDe(manifest, w.matiere)?.arcs.find((a) => a.final === w.id);

  if (!gardienOuvert(w))
    return (
      <div className="page narrow center">
        <Mascot who={spriteWho(gardienDe(manifest, w).sprite)} size={110} />
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
        <Bubble who="mia" text="Presque ! Il faut 8 bonnes réponses sur 10 pour gagner. Révise les leçons où tu as hésité, puis retente ta chance : les questions changent à chaque fois !" />
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

  return (
    <Combat
      key={round}
      w={w}
      qs={qs}
      chObjet={ch?.objet}
      onEnd={(sc, pot) => {
        setScore(sc);
        if (sc >= MASTERY - 1e-9) {
          addGems(pot);
          sfx.victory(w.id);
          if (addCrystal(w.id))
            setState({ celebration: { kind: "world", emoji: planeteDe(manifest, w.matiere)?.objet.emoji ?? "💎", title: "Monde sauvé !", text: `${ch?.objet ?? "Ce monde"} retrouve ses couleurs sur ${w.titre}. Tu gagnes ${pot + 25} gemmes. Merci, ${child.name} !` } }, false);
        }
        setPhase("fin");
      }}
    />
  );
}

// ---------- Le combat ----------

// Le gardien vient du registre des planètes (content-src/_planetes.yaml) : sprite, nom, répliques.
type Foe = FoeSprite;
const spriteWho = (f: Foe): Who => (f === "tache" ? "gribouille" : f === "oubli" ? "narrateur" : f);

function FoeView({ foe, state }: { foe: Foe; state: string }) {
  return (
    <div className={`foe foe-${foe} foe-${state}`}>
      {foe === "oubli" && visuel("persos", "grand-oubli") ? (
        <img src={visuel("persos", "grand-oubli")} alt="Le Grand Oubli" width={130} height={130} className="mascot" />
      ) : foe === "oubli" ? (
        <svg viewBox="0 0 120 120" width={120} height={120} aria-hidden className="oubli-svg">
          {[0, 1, 2, 3, 4].map((k) => (
            <rect key={k} x={30 + k * 4} y={22 + k * 3} width={56} height={72} rx={4} fill="#fbfaff" stroke="#b9b3cc" strokeWidth={2} transform={`rotate(${-24 + k * 12} 60 60)`} />
          ))}
          <ellipse cx={50} cy={58} rx={5} ry={7} fill="#5b5675" />
          <ellipse cx={70} cy={58} rx={5} ry={7} fill="#5b5675" />
        </svg>
      ) : (
        <Mascot who={foe === "tache" ? "gribouille" : foe === "neutre" ? "neutre" : foe} size={120} humeur={state === "hit" ? (foe === "nuage" ? "touche" : "surprise") : state === "laugh" ? (foe === "nuage" ? "croque" : "joie") : undefined} />
      )}
    </div>
  );
}

function rangeHint(v: number) {
  const step = Math.abs(v) >= 100 ? 50 : Math.abs(v) >= 20 ? 10 : Math.abs(v) >= 5 ? 5 : 1;
  const lo = Math.floor(v / step) * step;
  const hi = lo + step;
  return lo === v ? `Je dessine la droite : la réponse est entre ${fmtNum(v - step)} et ${fmtNum(v + step)}, pile au milieu !` : `Je dessine la droite : la réponse est entre ${fmtNum(lo)} et ${fmtNum(hi)}.`;
}

function Combat({ w, qs: initial, chObjet, onEnd }: { w: World; qs: Instance[]; chObjet?: string; onEnd: (score: number, pot: number) => void }) {
  const g = gardienDe(getContent().manifest, w);
  const foe: Foe = g.sprite;
  const [qs, setQs] = useState(initial);
  const [i, setI] = useState(0);
  const [res, setRes] = useState<ExResult[]>([]);
  const [pot, setPot] = useState(30);
  const [state, setFoeState] = useState("idle");
  const [line, setLine] = useState<string>(g.cri);
  const [used, setUsed] = useState<Record<string, boolean>>({});
  const [removed, setRemoved] = useState<number[]>([]);
  const [hintTxt, setHintTxt] = useState<string>();
  const [shield, setShield] = useState(false);
  const [double, setDouble] = useState(false);
  const foeRef = useRef<HTMLDivElement>(null);
  const progress = useRef({ done: false, answered: 0 });
  useEffect(
    () => () => {
      if (!progress.current.done && progress.current.answered > 0) recordAbandon(`${w.id}/gardien`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const q = qs[i];
  if (!q) return null;
  const hp = qs.length - res.filter((r) => r.ok).length;
  const isChoice = ["qcm", "vf", "comparer"].includes(q.type);

  const eliminate = () => {
    const wrong = (q.choix ?? []).map((_, k) => k).filter((k) => k !== q.correct && !removed.includes(k));
    if (wrong.length > 1 || (wrong.length === 1 && q.type !== "vf")) setRemoved([...removed, wrong[Math.floor(Math.random() * wrong.length)]]);
  };

  const power = (who: Who) => {
    if (used[who]) return;
    setUsed({ ...used, [who]: true });
    sfx.star();
    if (who === "mia") {
      const t = q.indice ? q.indice : q.value !== undefined && q.type === "nombre" ? rangeHint(q.value) : isChoice ? "Relis bien chaque proposition : je t'en barre une qui est impossible !" : "Fais un petit dessin ou un schéma avant de répondre : ça aide toujours !";
      if (!q.indice && isChoice) eliminate();
      setHintTxt(t);
      say("mia", t);
    } else if (who === "neo") {
      if (isChoice && q.type !== "vf") {
        eliminate();
        say("neo", "Coup de queue ! Une mauvaise réponse en moins.");
      } else {
        setShield(true);
        say("neo", "Bouclier ! Si tu te trompes à cette question, elle ne compte pas.");
      }
    } else {
      setDouble(true);
      say("zero", "Je me gonfle ! Toutes les gemmes du combat seront doublées !");
    }
  };

  // réaction immédiate du méchant, dès la réponse
  const onVerdict = (r: ExResult) => {
    const [x, y] = centerOf(foeRef.current);
    progress.current.answered++;
    if (r.ok) {
      setFoeState("hit");
      sfx.hit();
      shake(foeRef.current);
      burst(x, y, 3);
      setLine(g.aie[Math.floor(Math.random() * g.aie.length)]);
    } else if (shield) {
      setLine("Le bouclier de Néo t'a protégé ! Nouvelle question.");
      setFoeState("idle");
    } else {
      setFoeState("laugh");
      sfx.whoosh();
      const lost = Math.min(3, pot - 10);
      if (lost > 0) {
        setPot(pot - lost);
        floatText(x, y, `−${lost} 💎 croquées !`, "steal");
      }
      setLine(g.nargue[Math.floor(Math.random() * g.nargue.length)]);
    }
    window.setTimeout(() => setFoeState("idle"), 700);
  };

  // passage à la question suivante
  const onResult = (r: ExResult) => {
    setRemoved([]);
    setHintTxt(undefined);
    if (!r.ok && shield) {
      setShield(false);
      const extra = plan(w, 1);
      if (extra.length) {
        setQs(qs.map((x, k) => (k === i ? extra[0] : x)));
        return;
      }
    }
    setShield(false);
    const all = [...res, r];
    setRes(all);
    if (i + 1 < qs.length) setI(i + 1);
    else {
      progress.current.done = true;
      const sc = all.reduce((t, x) => t + (x.ok ? (x.firstTry ? 1 : 0.5) : 0), 0) / all.length;
      onEnd(sc, double ? pot * 2 : pot);
    }
  };

  return (
    <div className="page defi combat" style={{ "--wc": w.couleur } as React.CSSProperties}>
      <div className="lecon-top">
        <button className="back" onClick={() => go(`/monde/${w.id}`)} aria-label="Quitter le combat">
          ✕
        </button>
        <div className="crystal-meter" aria-label={`${qs.length - hp} sur ${qs.length}`}>
          {qs.map((_, k) => (
            <span key={k} className={k < res.length ? (res[k].ok ? "lit" : "miss") : k === i ? "cur" : ""}>
              {k < res.length && res[k].ok ? "✨" : g.jeton}
            </span>
          ))}
        </div>
      </div>
      <div className="arena" style={w.decor ? { backgroundImage: `url(${w.decor})` } : undefined}>
        <div className="arena-foe" ref={foeRef}>
          <FoeView foe={foe} state={state} />
          <div className="foe-hp" role="meter" aria-valuemin={0} aria-valuemax={qs.length} aria-valuenow={hp} aria-label={`${g.nom} : ${hp} points de vie`}>
            <span style={{ width: `${(hp / qs.length) * 100}%` }} />
          </div>
          <div className="foe-line" aria-live="polite">
            <strong>{g.nom} :</strong> {line}
          </div>
        </div>
        <div className="arena-side">
          <div className="pot" title="gemmes à gagner">
            💎 {pot}
            {double && " ×2"}
          </div>
          <div className="powers" role="group" aria-label="pouvoirs des compagnons, un seul usage chacun">
            {(["mia", "neo", "zero"] as Who[]).map((who) => (
              <button key={who} className={`power ${used[who] ? "used" : ""}`} disabled={used[who]} onClick={() => power(who)} title={who === "mia" ? "Mia dessine un indice" : who === "neo" ? "Néo : coup de queue ou bouclier" : "Zéro double les gemmes"}>
                <Mascot who={who} size={40} />
                <span>{who === "mia" ? "Indice" : who === "neo" ? (isChoice && q.type !== "vf" ? "Élimine" : "Bouclier") : "×2 💎"}</span>
              </button>
            ))}
          </div>
          {shield && <div className="shield-on">🛡️ Bouclier actif</div>}
        </div>
      </div>
      {chObjet && <p className="small muted center">Il protège {chObjet}.</p>}
      <ExercisePlayer key={q.seed} inst={q} statKey={`${w.id}/gardien`} onResult={onResult} onVerdict={onVerdict} removed={removed} powerHint={hintTxt} continueLabel={i + 1 < qs.length ? "Attaque suivante ⚔️" : "Le coup final !"} />
    </div>
  );
}
