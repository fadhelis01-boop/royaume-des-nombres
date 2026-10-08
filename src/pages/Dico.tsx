import { useEffect, useMemo, useState } from "react";
import { go } from "../lib/router";
import { collectWord, toast, useChild } from "../lib/store";
import { say } from "../lib/tts";
import { sfx } from "../lib/sound";
import { estConjugable, infos, tableau, TEMPS_NOMS, type Temps } from "../lib/fr/conjugaison";
import { determinant, feminin, pluriel, plurielAdj } from "../lib/fr/morpho";
import { Bubble } from "../components/Mascot";

// Le dictionnaire de l'Archipel : définitions écrites pour les enfants, exemples,
// synonymes et contraires cliquables, familles de mots, étymologie, pluriel et féminin
// calculés, conjugueur complet (tous les verbes réguliers + une soixantaine de modèles irréguliers).

export interface Entree {
  mot: string;
  nature: string;
  genre?: "m" | "f" | "mf";
  def: string;
  exemple?: string;
  syn: string[];
  ant: string[];
  famille: string[];
  etym?: string;
  niveau: number;
  theme?: string;
}

let cache: Entree[] | null = null;
export async function chargerDico(): Promise<Entree[]> {
  if (cache) return cache;
  const r = await fetch("content/dictionnaire.json");
  cache = (await r.json()) as Entree[];
  return cache;
}

const sansAccents = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");
const TEMPS_DICO: Temps[] = ["present", "imparfait", "passe_simple", "futur", "passe_compose", "plus_que_parfait", "futur_anterieur", "conditionnel", "conditionnel_passe", "subjonctif", "subjonctif_passe", "subjonctif_imparfait", "imperatif"];

type Onglet = "chercher" | "conjuguer" | "carnet";

export function Dico({ mot: initial }: { mot?: string }) {
  const child = useChild()!;
  const [dico, setDico] = useState<Entree[] | null>(cache);
  const [q, setQ] = useState(initial ? decodeURIComponent(initial) : "");
  const [sel, setSel] = useState<Entree | null>(null);
  const [lettre, setLettre] = useState<string>("");
  const [onglet, setOnglet] = useState<Onglet>("chercher");
  useEffect(() => {
    if (!dico) chargerDico().then(setDico).catch(() => toast("Le dictionnaire n'a pas pu se charger. Vérifie la connexion.", "📖"));
  }, [dico]);
  useEffect(() => {
    if (dico && initial) {
      const e = dico.find((x) => sansAccents(x.mot) === sansAccents(decodeURIComponent(initial)));
      if (e) setSel(e);
    }
  }, [dico, initial]);

  const motDuJour = useMemo(() => {
    if (!dico?.length) return null;
    const jour = Math.floor(Date.now() / 86400000);
    const pool = dico.filter((e) => e.niveau <= (child.age < 9 ? 1 : child.age < 12 ? 2 : 3));
    return pool[(jour * 2654435761) % pool.length] ?? dico[0];
  }, [dico, child.age]);

  const resultats = useMemo(() => {
    if (!dico) return [];
    const k = sansAccents(q.trim());
    if (k) return dico.filter((e) => sansAccents(e.mot).startsWith(k)).concat(dico.filter((e) => !sansAccents(e.mot).startsWith(k) && sansAccents(e.mot).includes(k))).slice(0, 60);
    if (lettre) return dico.filter((e) => sansAccents(e.mot).startsWith(lettre)).slice(0, 200);
    return [];
  }, [dico, q, lettre]);

  const ouvrir = (mot: string) => {
    const e = dico?.find((x) => sansAccents(x.mot) === sansAccents(mot));
    if (e) {
      setSel(e);
      setOnglet("chercher");
      window.scrollTo(0, 0);
    } else if (estConjugable(mot)) {
      setQ(mot);
      setOnglet("conjuguer");
    } else toast(`« ${mot} » n'est pas encore dans le dictionnaire.`, "📖");
  };

  return (
    <div className="page dico">
      <h1>📖 Le dictionnaire de l'Archipel</h1>
      <div className="tabs" role="tablist">
        {(
          [
            ["chercher", "🔎 Chercher"],
            ["conjuguer", "🔁 Conjuguer"],
            ["carnet", `📒 Mon carnet (${child.carnet?.length ?? 0})`],
          ] as [Onglet, string][]
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={onglet === k} className={`tab ${onglet === k ? "active" : ""}`} onClick={() => setOnglet(k)}>
            {l}
          </button>
        ))}
      </div>

      {onglet === "chercher" && (
        <>
          {sel ? (
            <Fiche e={sel} onMot={ouvrir} onFermer={() => setSel(null)} />
          ) : (
            <>
              <input id="dico-q" className="big-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tape un mot…" autoComplete="off" autoCapitalize="off" spellCheck={false} aria-label="mot à chercher" />
              {!q && (
                <div className="dico-lettres" role="group" aria-label="parcourir par lettre">
                  {"abcdefghijklmnopqrstuvwxyz".split("").map((l) => (
                    <button key={l} className={`chip ${lettre === l ? "sel" : ""}`} onClick={() => setLettre(lettre === l ? "" : l)}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              {!q && !lettre && motDuJour && (
                <div className="card mot-du-jour" onClick={() => setSel(motDuJour)} role="button" tabIndex={0}>
                  <small>🌟 Le mot du jour</small>
                  <strong>{motDuJour.mot}</strong>
                  <p>{motDuJour.def}</p>
                </div>
              )}
              <div className="dico-liste">
                {resultats.map((e) => (
                  <button key={e.mot + e.nature} className="dico-item" onClick={() => setSel(e)}>
                    <strong>{e.mot}</strong> <small className="muted">{abr(e)}</small>
                    {child.carnet?.includes(e.mot) && <span aria-label="dans ton carnet"> 📒</span>}
                  </button>
                ))}
                {q && dico && !resultats.length && (
                  <div className="card">
                    <p>Ce mot n'est pas encore dans le dictionnaire.</p>
                    {estConjugable(q.trim()) && (
                      <button className="btn btn-soft" onClick={() => setOnglet("conjuguer")}>
                        🔁 Le conjuguer
                      </button>
                    )}
                  </div>
                )}
              </div>
              {!dico && <p className="muted center">Chargement du dictionnaire…</p>}
              {dico && <p className="small muted center">{dico.length} mots expliqués pour les enfants, et tous les verbes dans le conjugueur.</p>}
            </>
          )}
        </>
      )}

      {onglet === "conjuguer" && <Conjugueur initial={q} />}

      {onglet === "carnet" && (
        <>
          <Bubble who="zero" text="Ton carnet de mots ! Chaque mot que tu ranges ici te rapporte une gemme. Les grands écrivains ont tous commencé comme ça. 😳" size={60} />
          <div className="dico-liste">
            {(child.carnet ?? []).length === 0 && <p className="muted">Ouvre un mot du dictionnaire et touche « Ranger dans mon carnet ».</p>}
            {[...(child.carnet ?? [])].sort((a, b) => a.localeCompare(b, "fr")).map((m) => (
              <button key={m} className="dico-item" onClick={() => ouvrir(m)}>
                📒 <strong>{m}</strong>
              </button>
            ))}
          </div>
        </>
      )}
      <p className="center">
        <button className="link" onClick={() => go("/")}>
          ← Retour à la carte
        </button>
      </p>
    </div>
  );
}

function abr(e: Entree) {
  const g = e.genre === "m" ? "n. m." : e.genre === "f" ? "n. f." : e.genre === "mf" ? "n. m. et f." : "";
  return e.nature === "nom" ? g : e.nature === "verbe" ? "v." : e.nature === "adjectif" ? "adj." : e.nature === "adverbe" ? "adv." : e.nature;
}

function Fiche({ e, onMot, onFermer }: { e: Entree; onMot: (m: string) => void; onFermer: () => void }) {
  const child = useChild()!;
  const dans = child.carnet?.includes(e.mot);
  const formes: string[] = [];
  if (e.nature === "nom") {
    const pl = pluriel(e.mot);
    if (pl !== e.mot) formes.push(`Pluriel : ${pl}`);
    else formes.push("Le pluriel ne change pas.");
    if (e.genre === "m" || e.genre === "f") formes.push(`On dit : ${determinant("defini", e.mot, e.genre, 1)}, ${determinant("indefini", e.mot, e.genre, 1)}`);
  }
  if (e.nature === "adjectif") {
    const f = feminin(e.mot);
    formes.push(`Féminin : ${f}`, `Pluriel : ${plurielAdj(e.mot)} / ${plurielAdj(f)}`);
  }
  const verbe = e.nature === "verbe" && estConjugable(e.mot);
  return (
    <article className="card fiche">
      <button className="back" onClick={onFermer}>
        ← Liste
      </button>
      <h2 className="fiche-mot">
        {e.mot}{" "}
        <button className="speak-btn small" onClick={() => say("narrateur", `${e.mot}. ${e.def}`)} aria-label="écouter">
          🔊
        </button>
      </h2>
      <p className="muted">
        {abr(e)}
        {verbe && ` · ${infos(e.mot).groupe}ᵉ groupe · auxiliaire ${infos(e.mot).aux}`}
      </p>
      <p className="fiche-def">{e.def}</p>
      {e.exemple && <p className="fiche-ex">« {e.exemple} »</p>}
      {formes.length > 0 && <p className="small">{formes.join(" · ")}</p>}
      {e.syn.length > 0 && <Liens titre="Synonymes (même sens)" mots={e.syn} onMot={onMot} />}
      {e.ant.length > 0 && <Liens titre="Contraires" mots={e.ant} onMot={onMot} />}
      {e.famille.length > 0 && <Liens titre="Famille du mot" mots={e.famille} onMot={onMot} />}
      {e.etym && <p className="small">🏺 D'où vient ce mot ? {e.etym}</p>}
      {verbe && <Conjugueur initial={e.mot} compact />}
      <button
        className={`btn ${dans ? "btn-soft" : "btn-primary"}`}
        disabled={dans}
        onClick={() => {
          if (collectWord(e.mot)) {
            sfx.star();
            toast(`« ${e.mot} » rangé dans ton carnet ! +1 💎`, "📒");
          }
        }}
      >
        {dans ? "📒 Déjà dans ton carnet" : "📒 Ranger dans mon carnet"}
      </button>
    </article>
  );
}

function Liens({ titre, mots, onMot }: { titre: string; mots: string[]; onMot: (m: string) => void }) {
  return (
    <p className="fiche-liens">
      <strong>{titre} : </strong>
      {mots.map((m, i) => (
        <span key={m}>
          <button className="link" onClick={() => onMot(m)}>
            {m}
          </button>
          {i < mots.length - 1 ? ", " : ""}
        </span>
      ))}
    </p>
  );
}

function Conjugueur({ initial = "", compact = false }: { initial?: string; compact?: boolean }) {
  const [v, setV] = useState(initial);
  const [t, setT] = useState<Temps>("present");
  const ok = estConjugable(v.trim());
  let lignes: string[] = [];
  let erreur = "";
  if (ok)
    try {
      lignes = tableau(v.trim().toLowerCase(), t);
    } catch (e) {
      erreur = (e as Error).message;
    }
  return (
    <div className={`conjugueur ${compact ? "compact" : ""}`}>
      {!compact && <input id="conj-v" className="big-input" value={v} onChange={(e) => setV(e.target.value)} placeholder="Un verbe à l'infinitif (finir, prendre, se lever…)" autoCapitalize="off" spellCheck={false} aria-label="verbe à conjuguer" />}
      <div className="chips-row">
        {TEMPS_DICO.map((x) => (
          <button key={x} className={`chip ${t === x ? "sel" : ""}`} onClick={() => setT(x)}>
            {TEMPS_NOMS[x]}
          </button>
        ))}
      </div>
      {v.trim() && !ok && <p className="muted">Écris un verbe à l'infinitif (il finit par -er, -ir, -re ou -oir).</p>}
      {erreur && <p className="muted">{erreur}</p>}
      {lignes.length > 0 && (
        <div className="conj-table">
          <strong>
            {v.trim()} — {TEMPS_NOMS[t]}
          </strong>
          <ul>
            {lignes.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          <button className="speak-btn small" onClick={() => say("narrateur", lignes.join(". "))} aria-label="écouter la conjugaison">
            🔊
          </button>
        </div>
      )}
    </div>
  );
}
