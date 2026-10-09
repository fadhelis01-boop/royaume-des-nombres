// Jeux « la notion EST la mécanique » (recommandation du game designer, 2.4) :
// on n'y répond pas à des questions entre deux actions, c'est l'action elle-même qui est le savoir.
//   - la Balance des Mystères : résoudre une équation en gardant l'équilibre (ce qu'on fait d'un côté…) ;
//   - le Bus de la Dizaine : passer la dizaine en remplissant d'abord le bus de 10 places ;
//   - la Fabrique de Phrases : la machine n'imprime la phrase que si le verbe est accordé à son sujet.
import { useMemo, useRef, useState } from "react";
import { addGems, useChild } from "../../lib/store";
import { sfx } from "../../lib/sound";
import { conjuguer, type Temps } from "../../lib/fr/conjugaison";
import { Bubble } from "../../components/Mascot";
import { Coque, enregistrer, Fin } from "./JeuxPlanetes";

const alea = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

// ====================== La Balance des Mystères ======================
interface Plateau {
  x: number; // boîtes mystère
  u: number; // cubes de 1
}
interface Niveau {
  g: Plateau;
  d: Plateau;
  sol: number;
}
/** Niveaux progressifs : x + b = d, puis a·x + b = d, puis a·x + b = c·x + d. */
function niveau(n: number): Niveau {
  const sol = alea(1, n < 4 ? 6 : 5);
  if (n < 3) {
    const b = alea(1, 5);
    return { g: { x: 1, u: b }, d: { x: 0, u: sol + b }, sol };
  }
  if (n < 6) {
    const a = alea(2, 3);
    const b = alea(0, 4);
    return { g: { x: a, u: b }, d: { x: 0, u: a * sol + b }, sol };
  }
  const c = alea(1, 2);
  const a = c + alea(1, 2);
  const b = alea(0, 3);
  const d = (a - c) * sol + b;
  // on place parfois les inconnues à droite pour varier
  return Math.random() < 0.3 ? { g: { x: c, u: d }, d: { x: a, u: b }, sol } : { g: { x: a, u: b }, d: { x: c, u: d }, sol };
}
const NB_NIVEAUX = 8;

export function JeuBalance() {
  const [n, setN] = useState(0);
  const [lv, setLv] = useState(() => niveau(0));
  const [g, setG] = useState<Plateau>(lv.g);
  const [d, setD] = useState<Plateau>(lv.d);
  const [attente, setAttente] = useState<{ cote: "g" | "d"; sorte: "x" | "u" } | null>(null);
  const [coups, setCoups] = useState(0);
  const [msg, setMsg] = useState("");
  const [rep, setRep] = useState("");
  const [score, setScore] = useState(0);
  const [fini, setFini] = useState(false);
  // isolée = une boîte seule d'un côté ET la balance à l'équilibre (rien en attente de l'autre côté)
  const isole = !attente && ((g.x === 1 && g.u === 0 && d.x === 0) || (d.x === 1 && d.u === 0 && g.x === 0));
  const penche = attente ? (attente.cote === "g" ? "droite" : "gauche") : "";

  // état courant lu par les gestionnaires : deux touchers très rapprochés (avant le nouvel affichage)
  // ne doivent jamais lire un état périmé, sinon la balance accepterait un déséquilibre
  const cur = useRef({ g, d, attente });
  cur.current = { g, d, attente };
  const poser = (p: Partial<typeof cur.current>) => {
    cur.current = { ...cur.current, ...p };
    if (p.g) setG(p.g);
    if (p.d) setD(p.d);
    if (p.attente !== undefined) setAttente(p.attente);
  };
  const enlever = (cote: "g" | "d", sorte: "x" | "u") => {
    const { g, d, attente } = cur.current;
    if (!attente && ((g.x === 1 && g.u === 0 && d.x === 0) || (d.x === 1 && d.u === 0 && g.x === 0))) return;
    const P = cote === "g" ? g : d;
    if (P[sorte] <= 0) return;
    const maj = (p: Plateau) => ({ ...p, [sorte]: p[sorte] - 1 });
    if (!attente) {
      sfx.tap();
      poser({ [cote]: maj(P), attente: { cote, sorte } });
      setMsg("La balance penche ! Pour la remettre droite, enlève la même chose de l'AUTRE côté.");
      return;
    }
    if (attente.cote !== cote && attente.sorte === sorte) {
      sfx.ok();
      poser({ [cote]: maj(P), attente: null });
      setCoups((c) => c + 1);
      setMsg("Équilibre retrouvé ✔ Ce qu'on fait d'un côté, on le fait de l'autre.");
    } else setMsg(attente.cote === cote ? "Tu enlèves encore du même côté : la balance penche de plus en plus ! Va de l'autre côté." : "Enlève la MÊME chose de l'autre côté : " + (attente.sorte === "x" ? "une boîte." : "un cube."));
  };
  const annuler = () => {
    const { attente } = cur.current;
    if (!attente) return;
    const P = cur.current[attente.cote];
    poser({ [attente.cote]: { ...P, [attente.sorte]: P[attente.sorte] + 1 }, attente: null });
    setMsg("");
  };
  // partager les deux plateaux en k parts égales (diviser les deux membres)
  const diviseurs = useMemo(() => {
    if (attente) return [];
    const tous = [g.x, g.u, d.x, d.u].filter((v) => v > 0);
    const out: number[] = [];
    for (let k = 2; k <= 6; k++) if (tous.length && tous.every((v) => v % k === 0)) out.push(k);
    return out;
  }, [g, d, attente]);
  const partager = (k: number) => {
    const { g, d } = cur.current;
    sfx.ok();
    poser({ g: { x: g.x / k, u: g.u / k }, d: { x: d.x / k, u: d.u / k } });

    setCoups((c) => c + 1);
    setMsg(`Tu as partagé chaque plateau en ${k} parts égales et gardé une part de chaque côté : l'équilibre est conservé.`);
  };
  const valider = () => {
    const v = Number(rep.replace(",", "."));
    const cubes = g.x === 1 ? d.u : g.u;
    if (v === lv.sol && v === cubes) {
      sfx.fanfare();
      const pts = Math.max(1, 5 - Math.max(0, coups - optimal(lv)));
      setScore((s) => s + pts);
      if (n + 1 >= NB_NIVEAUX) {
        setFini(true);
        enregistrer("balance", score + pts);
        addGems(5);
        return;
      }
      const nl = niveau(n + 1);
      setN(n + 1);
      setLv(nl);
      setG(nl.g);
      setD(nl.d);
      setCoups(0);
      setRep("");
      setMsg(`Bravo : la boîte pèse ${v} ! (+${pts} points)`);
    } else {
      sfx.oops();
      setMsg("Regarde le plateau où il ne reste que des cubes : combien y en a-t-il ?");
    }
  };
  const recommencer = () => {
    const nl = niveau(0);
    setN(0);
    setLv(nl);
    setG(nl.g);
    setD(nl.d);
    setScore(0);
    setCoups(0);
    setFini(false);
    setRep("");
    setMsg("");
  };
  const child = useChild();
  if (fini)
    return (
      <Coque titre="La Balance des Mystères" emoji="⚖️" qui="neo" consigne="Tu as résolu toutes les balances !">
        <Fin score={score} total={NB_NIVEAUX * 5} record={child?.games["balance"]} onRejouer={recommencer} lecon="Ce que tu viens de faire, c'est résoudre des équations ! Au collège, on écrit 2x + 3 = 11, puis on enlève 3 des deux côtés, puis on partage en 2 : exactement tes gestes." />
      </Coque>
    );
  const plateau = (P: Plateau, cote: "g" | "d") => (
    <div className="bal-plateau">
      {Array.from({ length: P.x }, (_, i) => (
        <button key={"x" + i} className="bal-boite" onClick={() => enlever(cote, "x")} aria-label="une boîte mystère">
          ?
        </button>
      ))}
      {Array.from({ length: P.u }, (_, i) => (
        <button key={"u" + i} className="bal-cube" onClick={() => enlever(cote, "u")} aria-label="un cube de 1">
          1
        </button>
      ))}
      {!P.x && !P.u && <span className="muted small">vide</span>}
    </div>
  );
  return (
    <Coque titre="La Balance des Mystères" emoji="⚖️" qui="neo" consigne="Chaque boîte « ? » pèse le même poids mystère. Isole UNE boîte toute seule sur un plateau, sans jamais déséquilibrer la balance. Touche un objet pour l'enlever.">
      <p className="center small">
        Balance {n + 1} / {NB_NIVEAUX} · {score} points · {coups} coup{coups > 1 ? "s" : ""}
      </p>
      <div className={`bal ${penche ? "penche-" + penche : ""}`}>
        <div className="bal-fleau">
          {plateau(g, "g")}
          {plateau(d, "d")}
        </div>
        <div className="bal-pied" aria-hidden>
          ▲
        </div>
      </div>
      <p className="center bal-equation" aria-live="polite">
        {ecrire(g)} {attente ? "≠" : "="} {ecrire(d)}
      </p>
      {msg && <Bubble who="neo" text={msg} size={52} />}
      <div className="row center">
        {attente && (
          <button className="btn btn-ghost" onClick={annuler}>
            ↩ Annuler
          </button>
        )}
        {diviseurs.map((k) => (
          <button key={k} className="btn btn-soft" onClick={() => partager(k)}>
            ✂️ Partager les deux plateaux en {k}
          </button>
        ))}
      </div>
      {isole && (
        <div className="row center">
          <label>
            Une boîte pèse : <input className="answer-input small" inputMode="numeric" value={rep} onChange={(e) => setRep(e.target.value)} onKeyDown={(e) => e.key === "Enter" && valider()} aria-label="poids de la boîte" autoFocus />
          </label>
          <button className="btn btn-primary" onClick={valider}>
            ✔
          </button>
        </div>
      )}
    </Coque>
  );
}
const ecrire = (p: Plateau) => [p.x ? (p.x === 1 ? "x" : `${p.x}x`) : "", p.u ? String(p.u) : ""].filter(Boolean).join(" + ") || "0";
/** Nombre de coups minimal : enlever les boîtes en trop, les cubes du côté des boîtes, puis partager. */
function optimal(l: Niveau) {
  const [bx, ox] = l.g.x >= l.d.x ? [l.g, l.d] : [l.d, l.g];
  return ox.x + bx.u + (bx.x - ox.x > 1 ? 1 : 0);
}

// ====================== Le Bus de la Dizaine ======================
const NB_BUS = 8;
export function JeuBus() {
  const nouveau = () => {
    const a = alea(5, 9);
    return { a, b: alea(11 - a, 9) };
  };
  const [r, setR] = useState(nouveau);
  const [manche, setManche] = useState(0);
  const [monte, setMonte] = useState(0); // passagers montés dans le 1er bus
  const [parti, setParti] = useState(false);
  const [rep, setRep] = useState("");
  const [msg, setMsg] = useState("");
  const [score, setScore] = useState(0);
  const [fini, setFini] = useState(false);
  const child = useChild();
  const libres = 10 - r.a;
  const faireMonter = () => {
    if (parti || monte >= Math.min(libres, r.b)) {
      if (!parti) setMsg("Le bus est plein ! Il ne peut prendre que 10 passagers.");
      return;
    }
    sfx.tap();
    setMonte((m) => Math.min(m + 1, libres, r.b)); // jamais plus de 10, même avec des touchers très rapides
  };
  const partir = () => {
    if (monte < libres) {
      sfx.oops();
      setMsg(`Il reste ${libres - monte} place${libres - monte > 1 ? "s" : ""} vide${libres - monte > 1 ? "s" : ""} ! Un bus doit partir PLEIN : complète d'abord jusqu'à 10.`);
      return;
    }
    sfx.ok();
    setParti(true);
    setMsg(`Bus plein : ${r.a} + ${libres} = 10. Les ${r.b - libres} autres attendent le bus suivant. Combien de passagers en tout ?`);
  };
  const valider = () => {
    const ok = Number(rep) === r.a + r.b;
    if (ok) {
      sfx.fanfare();
      setScore((s) => s + 1);
    } else sfx.oops();
    const suite = `${r.a} + ${r.b} = ${r.a} + ${libres} + ${r.b - libres} = 10 + ${r.b - libres} = ${r.a + r.b}.`;
    if (manche + 1 >= NB_BUS) {
      setFini(true);
      enregistrer("bus", score + (ok ? 1 : 0));
      addGems(3);
      return;
    }
    setMsg((ok ? "Exact ! " : "Pas tout à fait : ") + suite);
    setManche(manche + 1);
    setR(nouveau());
    setMonte(0);
    setParti(false);
    setRep("");
  };
  if (fini)
    return (
      <Coque titre="Le Bus de la Dizaine" emoji="🚌" qui="mia" consigne="Tous les passagers sont arrivés !">
        <Fin score={score} total={NB_BUS} record={child?.games["bus"]} onRejouer={() => { setFini(false); setManche(0); setScore(0); setR(nouveau()); setMonte(0); setParti(false); setMsg(""); }} lecon="Pour calculer 8 + 5 de tête, on fait comme le bus : on remplit d'abord jusqu'à 10 (8 + 2), puis on ajoute le reste (+ 3). C'est la technique du « passage de la dizaine »." />
      </Coque>
    );
  return (
    <Coque titre="Le Bus de la Dizaine" emoji="🚌" qui="mia" consigne="Le bus a 10 places. Fais monter les passagers jusqu'à ce qu'il soit PLEIN, fais-le partir, puis trouve combien ils sont en tout.">
      <p className="center small">
        Bus {manche + 1} / {NB_BUS} · {score} point{score > 1 ? "s" : ""}
      </p>
      <div className={`bus ${parti ? "parti" : ""}`} aria-label={`bus : ${r.a + monte} passagers sur 10`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`bus-place ${i < r.a ? "deja" : i < r.a + monte ? "monte" : ""}`}>
            {i < r.a + monte ? "🧒" : ""}
          </span>
        ))}
      </div>
      {parti && (
        <div className="bus bus2" aria-label="bus suivant">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`bus-place ${i < r.b - libres ? "monte" : ""}`}>
              {i < r.b - libres ? "🧒" : ""}
            </span>
          ))}
        </div>
      )}
      {!parti && (
        <div className="bus-attente">
          <span className="small">À l'arrêt : </span>
          {Array.from({ length: r.b - monte }, (_, i) => (
            <button key={i} className="bus-pieton" onClick={faireMonter} aria-label="faire monter un passager">
              🧍
            </button>
          ))}
        </div>
      )}
      <p className="center bal-equation">
        {r.a} + {r.b} = ?
      </p>
      {msg && <Bubble who="mia" text={msg} size={52} />}
      <div className="row center">
        {!parti ? (
          <button className="btn btn-primary" onClick={partir}>
            🚌 Le bus part !
          </button>
        ) : (
          <>
            <input className="answer-input small" inputMode="numeric" value={rep} onChange={(e) => setRep(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rep && valider()} aria-label="nombre total de passagers" autoFocus />
            <button className="btn btn-primary" disabled={!rep} onClick={valider}>
              ✔
            </button>
          </>
        )}
      </div>
    </Coque>
  );
}

// ====================== La Fabrique de Phrases ======================
const SUJETS: [string, number][] = [["Je", 1], ["Tu", 2], ["Lya", 3], ["Le chat", 3], ["On", 3], ["Nous", 4], ["Vous", 5], ["Les enfants", 6], ["Zéro et Néo", 6], ["Mes amies", 6]];
const VERBES: [string, string][] = [["dormir", "sur le canapé"], ["chanter", "une chanson"], ["finir", "le puzzle"], ["prendre", "le bus"], ["aller", "à l'école"], ["manger", "une pomme"], ["jouer", "dans la cour"], ["lire", "un livre"], ["faire", "un gâteau"], ["voir", "la mer"], ["partir", "en vacances"], ["choisir", "un dessert"]];
const PRONOMS = ["", "je", "tu", "il / elle / on", "nous", "vous", "ils / elles"];
const TEMPS: [Temps, string, string][] = [["present", "au présent", "aujourd'hui"], ["imparfait", "à l'imparfait", "autrefois"], ["futur", "au futur", "demain"]];
const NB_PHRASES = 9;
const elider = (sujet: string, forme: string) => (sujet === "Je" && /^[aeiouyéèêh]/i.test(forme) ? "J'" + forme : `${sujet} ${forme}`);

export function JeuFabrique() {
  const tirer = (k: number) => {
    const [sujet, p] = SUJETS[alea(0, SUJETS.length - 1)];
    const [verbe, comp] = VERBES[alea(0, VERBES.length - 1)];
    const t = TEMPS[Math.min(2, Math.floor(k / 3))];
    const bonne = conjuguer(verbe, t[0], p);
    const autres = [1, 2, 3, 4, 5, 6].filter((q) => q !== p).map((q) => conjuguer(verbe, t[0], q)).filter((f, i, a) => f !== bonne && a.indexOf(f) === i);
    const choix = [bonne, ...autres.sort(() => Math.random() - 0.5).slice(0, 2)].sort(() => Math.random() - 0.5);
    return { sujet, p, verbe, comp, t, bonne, choix };
  };
  const [k, setK] = useState(0);
  const [q, setQ] = useState(() => tirer(0));
  const [etat, setEtat] = useState<"choix" | "ok" | "bloque">("choix");
  const [score, setScore] = useState(0);
  const [phrases, setPhrases] = useState<string[]>([]);
  const [fini, setFini] = useState(false);
  const child = useChild();
  const choisir = (f: string) => {
    if (etat !== "choix") return;
    if (f === q.bonne) {
      sfx.ok();
      setScore((s) => s + 1);
      setPhrases((x) => [elider(q.sujet, q.bonne) + " " + q.comp + ".", ...x].slice(0, 5));
      setEtat("ok");
    } else {
      sfx.oops();
      setEtat("bloque");
    }
  };
  const suivant = () => {
    if (k + 1 >= NB_PHRASES) {
      setFini(true);
      enregistrer("fabrique", score);
      addGems(3);
      return;
    }
    setK(k + 1);
    setQ(tirer(k + 1));
    setEtat("choix");
  };
  if (fini)
    return (
      <Coque titre="La Fabrique de Phrases" emoji="🏭" qui="gribouille" consigne="La production du jour est terminée !">
        <Fin score={score} total={NB_PHRASES} record={child?.games["fabrique"]} onRejouer={() => { setFini(false); setK(0); setScore(0); setPhrases([]); setQ(tirer(0)); setEtat("choix"); }} lecon="Le verbe s'accorde toujours avec son sujet : remplace le sujet par un pronom (il, nous, ils…) pour trouver la bonne terminaison." />
      </Coque>
    );
  return (
    <Coque titre="La Fabrique de Phrases" emoji="🏭" qui="gribouille" consigne="Ma machine ne fabrique que des phrases justes ! Choisis le verbe qui s'accorde avec le sujet, au bon temps. Sinon… splotch, elle se bloque.">
      <p className="center small">
        Commande {k + 1} / {NB_PHRASES} · {score} phrase{score > 1 ? "s" : ""} fabriquée{score > 1 ? "s" : ""} · verbe <strong>{q.verbe}</strong> {q.t[1]}
      </p>
      <div className={`fabrique ${etat}`}>
        <span className="fab-piece sujet">{q.sujet}</span>
        <span className="fab-piece verbe">{etat === "choix" ? "?" : etat === "ok" ? q.bonne : "💥"}</span>
        <span className="fab-piece comp">{q.comp}</span>
        <span className="fab-piece">.</span>
      </div>
      <p className="center small muted">({q.t[2]})</p>
      {etat === "choix" && (
        <div className="choices grid">
          {q.choix.map((f) => (
            <button key={f} className="choice" onClick={() => choisir(f)}>
              {f}
            </button>
          ))}
        </div>
      )}
      {etat === "bloque" && <Bubble who="gribouille" text={`Splotch ! La machine se bloque. « ${q.sujet} », c'est comme « ${PRONOMS[q.p]} » : on écrit « ${elider(q.sujet, q.bonne)} ». Regarde bien la fin du verbe !`} size={56} />}
      {etat === "ok" && <Bubble who="gribouille" humeur="joie" text={`Ding ! « ${elider(q.sujet, q.bonne)} ${q.comp}. » sort de la machine.`} size={56} />}
      {etat !== "choix" && (
        <div className="center">
          <button className="btn btn-primary" onClick={suivant} autoFocus>
            Commande suivante ➜
          </button>
        </div>
      )}
      {phrases.length > 0 && (
        <div className="card small">
          <strong>Phrases fabriquées :</strong>
          <ul>
            {phrases.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </Coque>
  );
}
