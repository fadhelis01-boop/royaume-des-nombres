import { useEffect, useState } from "react";
import { etatSurprise, initSurprise, ouvrirSurprise } from "../lib/engagement";
import { useContent } from "../lib/content";
import { go } from "../lib/router";
import { sfx } from "../lib/sound";
import { useChild } from "../lib/store";

const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").replace(",", ".");

/** La surprise du jour : un petit événement imprévu, toujours un bonus, jamais une obligation. */
export function SurpriseDuJour() {
  const child = useChild();
  const { manifest } = useContent();
  const [rep, setRep] = useState("");
  const [msg, setMsg] = useState("");
  const [ouverture, setOuverture] = useState(false);
  useEffect(() => {
    if (child) initSurprise(child);
  }, [child]);
  if (!child) return null;
  const { s, st, fait, pret } = etatSurprise(child);
  const enigmes = manifest?.enigmes ?? [];
  const e = s.enigme && enigmes.length ? enigmes[(child.id.charCodeAt(0) + new Date().getDate()) % enigmes.length] : null;
  const ouvrir = async () => {
    setOuverture(true);
    sfx.fanfare();
    await new Promise((r) => setTimeout(r, 700));
    setMsg(await ouvrirSurprise(child));
    setOuverture(false);
  };
  return (
    <section className={`surprise ${pret ? "pret" : ""} ${st?.ouvert ? "ouvert" : ""}`} aria-label="Surprise du jour">
      <span className={`surprise-emoji ${ouverture ? "secoue" : ""}`} aria-hidden>
        {st?.ouvert ? "✨" : s.emoji}
      </span>
      <div className="surprise-txt">
        <strong>{s.titre}</strong>
        {st?.ouvert ? (
          <p className="small">{msg || st.recompense}</p>
        ) : (
          <>
            <p className="small">{s.texte}</p>
            {s.n && s.n > 1 && (
              <p className="small muted">
                {fait} / {s.n}
              </p>
            )}
            {e && (
              <div className="stack">
                <p className="small">
                  <em>{e.texte}</em>
                </p>
                <div className="row">
                  <input className="answer-input small" value={rep} onChange={(ev) => setRep(ev.target.value)} aria-label="réponse à l'énigme" />
                  <button
                    className="btn btn-soft btn-small"
                    disabled={!rep.trim()}
                    onClick={() => {
                      if (norm(rep) === norm(String(e.reponse))) void ouvrir();
                      else setMsg("La chouette hoche la tête : ce n'est pas ça. Réfléchis encore, tu as toute la journée !");
                    }}
                  >
                    Répondre
                  </button>
                </div>
                {msg && <p className="small">{msg}</p>}
              </div>
            )}
          </>
        )}
      </div>
      {pret && (
        <button className="btn btn-primary" onClick={ouvrir} disabled={ouverture}>
          Ouvrir !
        </button>
      )}
      {!pret && !st?.ouvert && s.vers && (
        <button className="btn btn-soft btn-small" onClick={() => go(s.vers!)}>
          Y aller
        </button>
      )}
    </section>
  );
}
