import { useEffect, useRef, useState } from "react";
import { go } from "../lib/router";
import { useContent } from "../lib/content";
import { addXp, bump, toast } from "../lib/store";
import { freqMidi, jouerFreq, nomMidi, percussion, type Timbre } from "../lib/musique";
import { Bubble } from "../components/Mascot";
import { ajouterOeuvre, galerie, retirerOeuvre, Toile, type Oeuvre, type ToileApi } from "../components/Dessin";

// Les studios : jouer librement (bible §11, §32, §33). Pas de note, pas de chrono :
// on explore, on crée, on garde ce qu'on a fait.

// ---------------------------------------------------------------- Studio de musique
const PENTA = new Set([0, 2, 4, 7, 9]); // Do Ré Mi Sol La : rien ne sonne faux
const PISTES = [
  { id: "grosse", nom: "Grosse caisse", emoji: "🥁" },
  { id: "claire", nom: "Caisse claire", emoji: "🥁" },
  { id: "charleston", nom: "Charleston", emoji: "🔔" },
] as const;

export function StudioMusique() {
  const [timbre, setTimbre] = useState<Timbre>("piano");
  const [penta, setPenta] = useState(true);
  const [octave, setOctave] = useState(4);
  const [grille, setGrille] = useState<boolean[][]>(() => PISTES.map((_, i) => Array.from({ length: 8 }, (_, k) => (i === 0 ? k % 4 === 0 : i === 1 ? k % 4 === 2 : true))));
  const [tempo, setTempo] = useState(90);
  const [lecture, setLecture] = useState(false);
  const [pas, setPas] = useState(-1);
  const [derniere, setDerniere] = useState<string>("");
  const timer = useRef<number>();
  useEffect(() => {
    if (!lecture) {
      setPas(-1);
      return;
    }
    let k = 0;
    const tick = () => {
      grille.forEach((ligne, i) => ligne[k] && percussion(PISTES[i].id, 0, 0.6));
      setPas(k);
      k = (k + 1) % 8;
    };
    tick();
    timer.current = window.setInterval(tick, (60 / tempo / 2) * 1000);
    return () => window.clearInterval(timer.current);
  }, [lecture, tempo, grille]);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const blanches: number[] = [];
  const debut = 12 * (octave + 1);
  for (let m = debut; m <= debut + 14; m++) if (![1, 3, 6, 8, 10].includes(m % 12)) blanches.push(m);
  const jouer = (m: number) => {
    jouerFreq(freqMidi(m), 0.7, timbre, 0.3);
    setDerniere(`${nomMidi(m)} · ${Math.round(freqMidi(m) * 100) / 100} Hz`);
    bump("studio-notes");
  };
  return (
    <div className="page studio">
      <button className="back" onClick={() => go("/jeux")}>
        ← Jeux
      </button>
      <h1>🎹 Le studio de musique</h1>
      <Bubble who="neo" text="Joue, écoute, compose ! En mode « pentatonique », seules les touches Do, Ré, Mi, Sol et La sonnent : impossible de jouer faux. Regarde aussi la fréquence de chaque note : plus elle est grande, plus le son est aigu." />
      <div className="studio-reglages">
        <label>
          Instrument{" "}
          <select value={timbre} onChange={(e) => setTimbre(e.target.value as Timbre)}>
            <option value="piano">Piano</option>
            <option value="flute">Flûte</option>
            <option value="violon">Violon</option>
            <option value="orgue">Orgue</option>
            <option value="cloche">Cloche</option>
            <option value="pur">Son pur</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={penta} onChange={(e) => setPenta(e.target.checked)} /> Pentatonique (rien ne sonne faux)
        </label>
        <span className="studio-octave">
          <button className="btn btn-small btn-soft" onClick={() => setOctave(Math.max(2, octave - 1))}>
            ◀ plus grave
          </button>
          <button className="btn btn-small btn-soft" onClick={() => setOctave(Math.min(6, octave + 1))}>
            plus aigu ▶
          </button>
        </span>
      </div>
      <div className="piano" role="group" aria-label="Clavier de piano">
        {blanches.map((m) => {
          const noire = m + 1;
          const aNoire = [1, 3, 6, 8, 10].includes(noire % 12) && noire <= debut + 14;
          const actif = !penta || PENTA.has(m % 12);
          return (
            <div key={m} className="touche-wrap">
              <button className={`touche blanche ${actif ? "" : "eteinte"}`} disabled={!actif} onPointerDown={() => jouer(m)} aria-label={nomMidi(m)}>
                <span>{nomMidi(m).replace(/\d+$/, "")}</span>
              </button>
              {aNoire && <button className={`touche noire ${!penta ? "" : "eteinte"}`} disabled={penta} onPointerDown={() => jouer(noire)} aria-label={nomMidi(noire)} />}
            </div>
          );
        })}
      </div>
      <p className="center muted small" aria-live="polite">
        {derniere || "Touche une note…"}
      </p>

      <h2>🥁 La boîte à rythmes de Zéro</h2>
      <div className="sequenceur">
        {PISTES.map((p, i) => (
          <div key={p.id} className="seq-ligne">
            <span className="seq-nom">
              {p.emoji} {p.nom}
            </span>
            {grille[i].map((on, k) => (
              <button
                key={k}
                className={`seq-pas ${on ? "on" : ""} ${pas === k ? "joue" : ""} ${k % 2 === 0 ? "temps" : ""}`}
                aria-pressed={on}
                aria-label={`${p.nom}, pas ${k + 1}`}
                onClick={() => setGrille((g) => g.map((l, j) => (j === i ? l.map((x, n) => (n === k ? !x : x)) : l)))}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="studio-reglages">
        <button
          className="btn btn-primary"
          onClick={() => {
            setLecture(!lecture);
            if (!lecture) {
              bump("studio-rythme");
              addXp(5);
            }
          }}
        >
          {lecture ? "⏹ Stop" : "▶️ Jouer le rythme"}
        </button>
        <label>
          Tempo : {tempo} battements par minute
          <input type="range" min={50} max={160} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
        </label>
      </div>
      <Bubble who="zero" text="Astuce : les cases foncées tombent sur le temps (la pulsation, comme ton cœur). Une case sur deux, c'est un demi-temps : une croche !" side="right" />
    </div>
  );
}

// ---------------------------------------------------------------- Studio de dessin
export function StudioDessin() {
  const { worlds } = useContent();
  const toile = useRef<ToileApi>(null);
  const [titre, setTitre] = useState("Mon dessin");
  const pasApas = worlds
    .filter((w) => w.matiere === "dessin")
    .flatMap((w) => w.lecons.filter((l) => l.etapes.some((e) => e.kind === "dessin")).map((l) => ({ w, l })));
  return (
    <div className="page studio">
      <button className="back" onClick={() => go("/jeux")}>
        ← Jeux
      </button>
      <h1>🖌️ Le studio de dessin</h1>
      <Bubble who="mia" text="Ici, tu dessines librement. Essaie le miroir ↔️ : ce que tu dessines d'un côté apparaît de l'autre, comme les ailes d'un papillon !" />
      <Toile ref={toile} />
      <div className="studio-reglages">
        <label>
          Titre <input value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={40} />
        </label>
        <button
          className="btn btn-primary"
          onClick={async () => {
            if (toile.current?.vide()) return toast("Dessine d'abord quelque chose !", "✏️");
            await ajouterOeuvre(titre || "Mon dessin", toile.current!.png());
            bump("dessin-libre");
            addXp(10);
            toast("Rangé dans ta galerie !", "🖼️");
          }}
        >
          🖼️ Ranger dans ma galerie
        </button>
        <button className="btn btn-soft" onClick={() => go("/studio/dessin/galerie")}>
          Voir ma galerie
        </button>
      </div>
      {pasApas.length > 0 && (
        <>
          <h2>✏️ Dessiner pas à pas avec Lya</h2>
          <div className="fam-grid">
            {pasApas.map(({ w, l }) => (
              <button key={w.id + l.id} className="fam-card" onClick={() => go(`/lecon/${w.id}/${l.id}`)}>
                <strong>{l.titre}</strong>
                <small>
                  {w.emoji} {w.titre}
                </small>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Galerie() {
  const [oeuvres, setOeuvres] = useState<Oeuvre[] | null>(null);
  useEffect(() => {
    galerie().then(setOeuvres);
  }, []);
  return (
    <div className="page studio">
      <button className="back" onClick={() => go("/studio/dessin")}>
        ← Studio de dessin
      </button>
      <h1>🖼️ Ma galerie</h1>
      <Bubble who="mia" text="Garde tous tes dessins : dans quelques semaines, compare ton premier et ton dernier. Tu verras tes progrès !" />
      {oeuvres === null ? (
        <p className="muted center">Chargement…</p>
      ) : oeuvres.length === 0 ? (
        <p className="muted center">Ta galerie est vide pour l'instant. Va dessiner !</p>
      ) : (
        <div className="galerie">
          {oeuvres.map((o) => (
            <figure key={o.id} className="oeuvre">
              <img src={o.png} alt={o.titre} />
              <figcaption>
                <strong>{o.titre}</strong>
                <small>{new Date(o.date).toLocaleDateString("fr-FR")}</small>
                <span>
                  <a className="btn btn-small btn-soft" href={o.png} download={`${o.titre}.webp`}>
                    ⬇️
                  </a>
                  <button
                    className="btn btn-small btn-ghost"
                    onClick={async () => {
                      if (!confirm("Retirer ce dessin de la galerie ?")) return;
                      await retirerOeuvre(o.id);
                      setOeuvres(await galerie());
                    }}
                    aria-label="Retirer"
                  >
                    🗑️
                  </button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
