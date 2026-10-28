import { useEffect, useMemo, useRef, useState } from "react";
import { go, useRoute } from "../lib/router";
import { matiereDe, planeteDe, useContent } from "../lib/content";
import { instantiate, newSeed, type Instance } from "../lib/gen";
import { addGems, bump, getState, updateChild, useChild } from "../lib/store";
import { sfx } from "../lib/sound";
import { speak, stopSpeaking } from "../lib/tts";
import { ExercisePlayer } from "../components/ExercisePlayer";
import { Bubble } from "../components/Mascot";
import { CarteTalents } from "../components/CarteTalents";
import {
  ageScolaire, construireParcours, departEscalier, domainesATester, domainesDe, estimation, exercicesTest, leconPour, mondesAOuvrir, pas,
  QUESTIONS_PAR_DOMAINE, type Domaine, type Escalier,
} from "../lib/parcours";

// « La carte des talents » : test de niveau domaine par domaine.
// Chaque domaine est une île : 3 questions en escalier (on monte après une réussite, on descend
// après une erreur), en partant de ce que l'on sait d'habitude à cet âge, à ce moment de l'année.
// Audit « enfant de 8 ans » (v2.8) : pas de correction pendant le test, bouton « Je ne sais pas encore »,
// une pause proposée après chaque île, reprise à l'île suivante, consignes lues et plus courtes.
// Mode « point » (?mode=point) : on repart des niveaux déjà estimés, 2 questions par domaine.

const GEMMES_PAR_ILE = 2; // l'effort est récompensé, pas la réussite
const REPRISE_MAX_JOURS = 30;

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

const iles = (n: number) => (n > 1 ? `${n} îles` : "une île");

export function Diagnostic() {
  const route = useRoute();
  const point = route.query.get("mode") === "point";
  const { manifest, worlds } = useContent();
  const child = useChild()!;
  const age = ageScolaire(child);
  const jeune = age <= 9;
  const mat = matiereDe(child);
  const planete = planeteDe(manifest, mat);
  const ancien = child.parcours?.[mat];
  const doms = useMemo(() => domainesDe(mat, worlds, manifest?.domaines?.[mat]), [mat, worlds, manifest]);
  const tous = useMemo(() => (point && ancien ? doms.filter((d) => ancien.niveaux[d.id] !== undefined) : domainesATester(doms, age)), [doms, point, ancien, age]);
  // carte commencée puis mise en pause : on reprend à la première île pas encore visitée
  const [enCours] = useState(() => {
    const e = child.diagEnCours;
    return !point && e && e.mat === mat && Date.now() - e.at < REPRISE_MAX_JOURS * 86400000 ? e.niveaux : undefined;
  });
  const aTester = useMemo(() => (enCours ? tous.filter((d) => enCours[d.id] === undefined) : tous), [tous, enCours]);
  const nbQ = point ? 2 : doms.length === 1 ? 5 : QUESTIONS_PAR_DOMAINE;
  const dejaVisitees = tous.length - aTester.length;

  const [started, setStarted] = useState(false);
  const [di, setDi] = useState(0);
  const [esc, setEsc] = useState<Escalier | null>(null);
  const [q, setQ] = useState<{ inst: Instance; niveau: number } | null>(null);
  const [niveaux, setNiveaux] = useState<Record<string, number>>(() => enCours ?? {});
  const [fini, setFini] = useState(false);
  /** pause proposée entre deux îles */
  const [entracte, setEntracte] = useState<{ ile: Domaine; suivante: number; acquis: Record<string, number> } | null>(null);

  const intro = point
    ? ["Tu as bien avancé ! Quelques questions pour voir tes progrès, puis je mets ton parcours à jour."]
    : enCours
      ? [`On reprend ta carte des talents ! Il reste ${iles(aTester.length)} à visiter.`, "Si tu ne sais pas, touche « Je ne sais pas encore ». Après chaque île, tu peux faire une pause."]
      : jeune
        ? [
            `On va visiter ${iles(aTester.length)}. Sur chaque île, ${nbQ} petites questions. Ce n'est pas une interro : ça sert à savoir par où commencer.`,
            "Si tu ne sais pas, touche « Je ne sais pas encore » : c'est très bien aussi ! Après chaque île, tu peux faire une pause.",
          ]
        : [
            `Pour préparer TON parcours, je vais visiter avec toi ${aTester.length > 1 ? `${aTester.length} îles` : "cette planète"}. Les questions montent quand tu réussis et descendent si c'est trop dur. Ce n'est PAS une interro : on cherche juste où commencer !`,
            "Si tu ne sais pas, touche « Je ne sais pas encore » : ça veut dire qu'on va l'apprendre ensemble. Après chaque île, tu peux faire une pause.",
          ];

  // l'écran d'accueil du test est lu à voix haute (lecture automatique activée par défaut)
  useEffect(() => {
    if (started || fini) return;
    if (getState().settings.autoRead || (child.lecteur ?? "oui") !== "oui") speak([{ who: "neo", text: intro[0] }, ...(intro[1] ? [{ who: "mia" as const, text: intro[1] }] : [])], { key: "diag-intro" });
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, fini]);

  const commencerDomaine = (i: number, acquis: Record<string, number>) => {
    const d = aTester[i];
    if (!d) return terminer(acquis);
    const e = departEscalier(d, age, point ? ancien?.niveaux[d.id] : undefined);
    const t = tirer(d, e.cible);
    if (!t) return commencerDomaine(i + 1, acquis); // domaine sans question possible
    setEntracte(null);
    setDi(i);
    setEsc(e);
    setQ(t);
  };

  /** Pause : la progression est gardée ; on note pour les parents où l'enfant s'est arrêté. */
  const mettreEnPause = (acquis: Record<string, number>, ileInterrompue?: string) => {
    sortieGeree.current = true;
    updateChild((c) => {
      c.diagEnCours = { mat, niveaux: acquis, at: Date.now() };
      c.counters[`diag-pause:${mat}`] = (c.counters[`diag-pause:${mat}`] ?? 0) + 1;
      if (ileInterrompue) c.counters[`diag-arret:${mat}:${ileInterrompue}`] = (c.counters[`diag-arret:${mat}:${ileInterrompue}`] ?? 0) + 1;
    });
    go("/");
  };

  // L'enfant quitte le test sans passer par la pause (onglet du bas, retour…) : on garde ce qui est fait
  // et on le note comme un abandon (visible dans l'Espace parents, « Où ça coince »).
  const sortieGeree = useRef(false);
  const etat = useRef({ started, fini, niveaux, ile: undefined as string | undefined });
  etat.current = { started, fini, niveaux, ile: entracte ? undefined : aTester[di]?.id };
  useEffect(
    () => () => {
      const e = etat.current;
      if (!e.started || e.fini || sortieGeree.current || point) return;
      updateChild((c) => {
        c.counters[`diag-abandon:${mat}`] = (c.counters[`diag-abandon:${mat}`] ?? 0) + 1;
        if (e.ile) c.counters[`diag-arret:${mat}:${e.ile}`] = (c.counters[`diag-arret:${mat}:${e.ile}`] ?? 0) + 1;
        if (Object.keys(e.niveaux).length) c.diagEnCours = { mat, niveaux: e.niveaux, at: Date.now() };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const terminer = (acquis: Record<string, number>) => {
    // arrêté avant toute réponse : rien à enregistrer, on retrouve la carte
    if (!Object.keys(acquis).length && !point) {
      updateChild((c) => void (c.counters[`diag-plus-tard:${mat}`] = 1));
      go("/");
      return;
    }
    const fait = (k: string) => !!child.progress[k]?.done;
    const niveauxFinaux = { ...(point ? ancien?.niveaux : {}), ...acquis };
    const etapes = construireParcours(doms, niveauxFinaux, age, fait);
    const ouvrir = mondesAOuvrir(doms, niveauxFinaux, etapes);
    const nonTestes = doms.filter((d) => niveauxFinaux[d.id] === undefined).map((d) => d.id);
    updateChild((c) => {
      c.parcours = { ...(c.parcours ?? {}), [mat]: { at: Date.now(), niveaux: niveauxFinaux, etapes, nonTestes } };
      c.validatedWorlds = [...new Set([...c.validatedWorlds, ...ouvrir])];
      c.diag = { at: Date.now(), validated: ouvrir };
      c.counters[`diag:${mat}`] = (c.counters[`diag:${mat}`] ?? 0) + 1;
      delete c.diagEnCours;
    });
    sortieGeree.current = true;
    sfx.fanfare();
    setEntracte(null);
    setNiveaux(niveauxFinaux);
    setFini(true);
  };

  if (!started)
    return (
      <div className="page narrow">
        <h1>{point ? "🔄 On fait le point" : enCours ? "🧭 On reprend la carte des talents" : "🧭 Première quête : la carte des talents"}</h1>
        <Bubble who="neo" text={intro[0]} />
        {intro[1] && <Bubble who="mia" text={intro[1]} side="right" />}
        <div className="talents-iles" aria-label="Les domaines à visiter">
          {tous.map((d) => (
            <span key={d.id} className={`ile ${enCours?.[d.id] !== undefined ? "faite" : ""}`}>
              {enCours?.[d.id] !== undefined ? "✅" : d.emoji} {d.titre}
            </span>
          ))}
        </div>
        <p className="small muted center">
          {aTester.length * nbQ} petites questions{jeune && !point && aTester.length > 1 ? `, ${nbQ} par île, avec une pause possible entre deux îles` : ""} · {planete?.titre}
        </p>
        <div className="center">
          <button
            className="btn btn-primary btn-xl"
            onClick={() => {
              stopSpeaking();
              if (!point) bump(`diag-debut:${mat}`);
              setStarted(true);
              commencerDomaine(0, niveaux);
            }}
          >
            {enCours ? "On reprend !" : "C'est parti !"}
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
        <CarteTalents doms={doms} niveaux={niveaux} age={age} />
        <Bubble who="mia" humeur="joie" text="Bravo, tu as visité toutes les îles ! Avec ce que tu sais déjà, j'ai préparé ton parcours : on commence par des choses que tu vas réussir, puis on avance petit à petit." />
        <div className="center stack">
          <button className="btn btn-primary btn-xl" onClick={() => go("/parcours")}>
            🗺️ Voir mon parcours
          </button>
        </div>
      </div>
    );

  if (entracte) {
    const suivante = aTester[entracte.suivante];
    const restantes = aTester.length - entracte.suivante;
    const visitees = Object.keys(entracte.acquis).length;
    return (
      <div className="page narrow center entracte-ile">
        <div className="entracte-emoji pop" aria-hidden>
          {entracte.ile.emoji}
        </div>
        <h1>Île explorée !</h1>
        <p className="entracte-gain pop">+{GEMMES_PAR_ILE} 💎</p>
        <Bubble
          who={child.avatar}
          humeur="joie"
          text={`Bravo, tu as fini l'île « ${entracte.ile.titre} » ! Encore ${iles(restantes)}. Tu continues, ou tu fais une pause ? Je garde tout en mémoire.`}
        />
        <div className="talents-iles mini" aria-label={`${visitees} îles visitées sur ${tous.length}`}>
          {tous.map((x) => (
            <span key={x.id} className={`ile ${entracte.acquis[x.id] !== undefined ? "faite" : x.id === suivante?.id ? "en-cours" : ""}`} title={x.titre}>
              {entracte.acquis[x.id] !== undefined ? "✅" : x.emoji}
            </span>
          ))}
        </div>
        <div className="stack">
          <button className="btn btn-primary btn-xl" autoFocus onClick={() => commencerDomaine(entracte.suivante, entracte.acquis)}>
            Île suivante : {suivante.emoji} {suivante.titre} ➜
          </button>
          <button className="btn btn-soft" onClick={() => mettreEnPause(entracte.acquis)}>
            ⏸️ Pause, je reviendrai plus tard
          </button>
          {visitees >= 2 && (
            <button className="btn btn-ghost small" onClick={() => terminer(entracte.acquis)}>
              Voir ma carte avec les îles déjà visitées
            </button>
          )}
        </div>
      </div>
    );
  }

  const d = aTester[di];
  if (!d || !q || !esc) return null;
  const numIle = dejaVisitees + di + 1;
  return (
    <div className="page defi">
      <div className="lecon-top">
        <button
          className="back"
          onClick={() => {
            // le domaine en cours compte déjà, d'après les réponses données
            const acquis = esc.reponses.length ? { ...niveaux, [d.id]: estimation(esc, d) } : niveaux;
            if (point) terminer(acquis);
            else if (Object.keys(acquis).length) mettreEnPause(acquis, d.id);
            else terminer(acquis);
          }}
          aria-label="Faire une pause"
          title="Faire une pause"
        >
          ✕
        </button>
        <div className="talents-iles mini" aria-label={`île ${numIle} sur ${tous.length}`}>
          {tous.map((x) => (
            <span key={x.id} className={`ile ${niveaux[x.id] !== undefined ? "faite" : x.id === d.id ? "en-cours" : ""}`} title={x.titre}>
              {x.emoji}
            </span>
          ))}
        </div>
      </div>
      <p className="center small">
        <strong>
          {d.emoji} {d.titre}
        </strong>{" "}
        · île {numIle} sur {tous.length} · question {esc.reponses.length + 1} sur {nbQ}
      </p>
      <ExercisePlayer
        key={q.inst.seed}
        inst={q.inst}
        statKey="diagnostic"
        autrement={false}
        maxTries={1}
        test
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
          if (point || !aTester[di + 1]) return commencerDomaine(di + 1, acquis);
          // une île finie : petite fête, gemmes pour l'effort, pause possible (et sauvegarde au cas où l'enfant s'en va)
          addGems(GEMMES_PAR_ILE);
          sfx.ok();
          updateChild((c) => void (c.diagEnCours = { mat, niveaux: acquis, at: Date.now() }));
          setEntracte({ ile: d, suivante: di + 1, acquis });
        }}
      />
    </div>
  );
}
