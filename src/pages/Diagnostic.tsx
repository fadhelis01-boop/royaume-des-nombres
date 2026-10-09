import { useMemo, useState } from "react";
import { go, useRoute } from "../lib/router";
import { matiereDe, planeteDe, useContent } from "../lib/content";
import { instantiate, newSeed, type Instance } from "../lib/gen";
import { updateChild, useChild } from "../lib/store";
import { sfx } from "../lib/sound";
import { ExercisePlayer } from "../components/ExercisePlayer";
import { Bubble } from "../components/Mascot";
import { CarteTalents } from "../components/CarteTalents";
import {
  construireParcours, departEscalier, domainesATester, domainesDe, estimation, exercicesTest, leconPour, mondesAOuvrir, pas,
  QUESTIONS_PAR_DOMAINE, type Domaine, type Escalier,
} from "../lib/parcours";

// « La carte des talents » : test de niveau domaine par domaine (2.7).
// Chaque domaine est une île : 3 questions en escalier (on monte après une réussite, on descend
// après une erreur), en partant du niveau attendu pour l'âge. Puis l'appli construit le parcours.
// Mode « point » (?mode=point) : on repart des niveaux déjà estimés, 2 questions par domaine.

function tirer(d: Domaine, cible: number): { inst: Instance; niveau: number } | null {
  const l = leconPour(d, cible);
  if (!l) return null;
  const specs = exercicesTest(l.lesson);
  for (let t = 0; t < 8; t++) {
    try {
      return { inst: instantiate(specs[Math.floor(Math.random() * specs.length)], newSeed()), niveau: l.niveau };
    } catch {
      /* tirage impossible : on réessaie */
    }
  }
  return null;
}

export function Diagnostic() {
  const route = useRoute();
  const point = route.query.get("mode") === "point";
  const { manifest, worlds } = useContent();
  const child = useChild()!;
  const mat = matiereDe(child);
  const planete = planeteDe(manifest, mat);
  const ancien = child.parcours?.[mat];
  const doms = useMemo(() => domainesDe(mat, worlds, manifest?.domaines?.[mat]), [mat, worlds, manifest]);
  const aTester = useMemo(() => (point && ancien ? doms.filter((d) => ancien.niveaux[d.id] !== undefined) : domainesATester(doms, child.age)), [doms, point, ancien, child.age]);
  const nbQ = point ? 2 : doms.length === 1 ? 5 : QUESTIONS_PAR_DOMAINE;

  const [started, setStarted] = useState(false);
  const [di, setDi] = useState(0);
  const [esc, setEsc] = useState<Escalier | null>(null);
  const [q, setQ] = useState<{ inst: Instance; niveau: number } | null>(null);
  const [niveaux, setNiveaux] = useState<Record<string, number>>({});
  const [fini, setFini] = useState(false);

  const commencerDomaine = (i: number, acquis: Record<string, number>) => {
    const d = aTester[i];
    if (!d) return terminer(acquis);
    const e = departEscalier(d, child.age, point ? ancien?.niveaux[d.id] : undefined);
    const t = tirer(d, e.cible);
    if (!t) return commencerDomaine(i + 1, acquis); // domaine sans question possible
    setDi(i);
    setEsc(e);
    setQ(t);
  };

  const terminer = (acquis: Record<string, number>) => {
    // arrêté avant toute réponse : rien à enregistrer, on retrouve la carte
    if (!Object.keys(acquis).length && !point) {
      updateChild((c) => void (c.counters[`diag-plus-tard:${mat}`] = 1));
      go("/");
      return;
    }
    const fait = (k: string) => !!child.progress[k]?.done;
    const niveauxFinaux = { ...(point ? ancien?.niveaux : {}), ...acquis };
    const etapes = construireParcours(doms, niveauxFinaux, child.age, fait);
    const ouvrir = mondesAOuvrir(doms, niveauxFinaux, etapes);
    const nonTestes = doms.filter((d) => niveauxFinaux[d.id] === undefined).map((d) => d.id);
    updateChild((c) => {
      c.parcours = { ...(c.parcours ?? {}), [mat]: { at: Date.now(), niveaux: niveauxFinaux, etapes, nonTestes } };
      c.validatedWorlds = [...new Set([...c.validatedWorlds, ...ouvrir])];
      c.diag = { at: Date.now(), validated: ouvrir };
      c.counters[`diag:${mat}`] = (c.counters[`diag:${mat}`] ?? 0) + 1;
    });
    sfx.fanfare();
    setNiveaux(niveauxFinaux);
    setFini(true);
  };

  if (!started)
    return (
      <div className="page narrow">
        <h1>{point ? "🔄 On fait le point" : "🧭 Première quête : la carte des talents"}</h1>
        <Bubble
          who="neo"
          text={
            point
              ? "Tu as bien avancé ! Quelques questions pour voir tes progrès, puis je mets ton parcours à jour."
              : `Pour préparer TON parcours, je vais visiter avec toi ${aTester.length > 1 ? `${aTester.length} îles` : "cette planète"}. Les questions montent quand tu réussis et descendent si c'est trop dur. Ce n'est PAS une interro : on cherche juste où commencer !`
          }
        />
        <Bubble who="mia" text="Si tu ne sais pas, ce n'est pas grave du tout : ça veut dire qu'on va l'apprendre ensemble. Tu peux t'arrêter quand tu veux." side="right" />
        <div className="talents-iles" aria-label="Les domaines à visiter">
          {aTester.map((d) => (
            <span key={d.id} className="ile">
              {d.emoji} {d.titre}
            </span>
          ))}
        </div>
        <p className="small muted center">
          Environ {aTester.length * nbQ} questions · {planete?.titre}
        </p>
        <div className="center">
          <button
            className="btn btn-primary btn-xl"
            onClick={() => {
              setStarted(true);
              commencerDomaine(0, {});
            }}
          >
            C'est parti !
          </button>
          <button className="btn btn-ghost" onClick={() => go("/")}>
            Plus tard
          </button>
        </div>
      </div>
    );

  if (fini)
    return (
      <div className="page narrow">
        <h1 className="center">🗺️ Ta carte des talents</h1>
        <CarteTalents doms={doms} niveaux={niveaux} age={child.age} />
        <Bubble who="mia" humeur="joie" text="Bravo ! Avec ce que tu sais déjà, j'ai préparé ton parcours : des étapes pour avancer dans chaque domaine, en commençant par celles qui te feront le plus progresser." />
        <div className="center stack">
          <button className="btn btn-primary btn-xl" onClick={() => go("/parcours")}>
            🗺️ Voir mon parcours
          </button>
        </div>
      </div>
    );

  const d = aTester[di];
  if (!d || !q || !esc) return null;
  return (
    <div className="page defi">
      <div className="lecon-top">
        <button
          className="back"
          // le domaine en cours compte déjà, d'après les réponses données
          onClick={() => terminer(esc.reponses.length ? { ...niveaux, [d.id]: estimation(esc, d) } : niveaux)}
          aria-label="Arrêter le test"
        >

          ✕
        </button>
        <div className="talents-iles mini" aria-label={`domaine ${di + 1} sur ${aTester.length}`}>
          {aTester.map((x, k) => (
            <span key={x.id} className={`ile ${k < di ? "faite" : k === di ? "en-cours" : ""}`} title={x.titre}>
              {x.emoji}
            </span>
          ))}
        </div>
      </div>
      <p className="center small">
        <strong>
          {d.emoji} {d.titre}
        </strong>{" "}
        · question {esc.reponses.length + 1} sur {nbQ}
      </p>
      <ExercisePlayer
        key={q.inst.seed}
        inst={q.inst}
        statKey="diagnostic"
        autrement={false}
        maxTries={1}
        onResult={(r) => {
          const e2 = pas(esc, d, q.niveau, r.ok);
          if (e2.reponses.length < nbQ) {
            const t = tirer(d, e2.cible);
            if (t) {
              setEsc(e2);
              setQ(t);
              return;
            }
          }
          const acquis = { ...niveaux, [d.id]: estimation(e2, d) };
          setNiveaux(acquis);
          commencerDomaine(di + 1, acquis);
        }}
      />
    </div>
  );
}
