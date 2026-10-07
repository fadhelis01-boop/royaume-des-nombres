import { useState } from "react";
import { go } from "../lib/router";
import { useContent } from "../lib/content";
import { normText } from "../lib/gen";
import { Bubble, SpeakBtn } from "../components/Mascot";
import { Md } from "../components/Md";

export function GrandLivre() {
  const { manifest, worlds } = useContent();
  const [q, setQ] = useState("");
  const all = [...(manifest?.glossaire ?? [])].sort((a, b) => a.mot.localeCompare(b.mot, "fr"));
  const list = q ? all.filter((g) => normText(g.mot + " " + g.def).includes(normText(q))) : all;
  const letters = [...new Set(list.map((g) => normText(g.mot)[0]?.toUpperCase()))];
  return (
    <div className="page">
      <button className="back" onClick={() => go("/")}>
        ← Carte
      </button>
      <h1>📖 Le Grand Livre des maths</h1>
      <Bubble who="neo" text="Tous les mots importants des maths, expliqués simplement, avec un exemple et la source. Touche 🔊 pour écouter." />
      <input className="big-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un mot (ex. fraction, périmètre)…" aria-label="chercher" />
      <div className="letters">
        {letters.map((l) => (
          <a key={l} href={`#/livre`} onClick={(e) => { e.preventDefault(); document.getElementById("l-" + l)?.scrollIntoView({ behavior: "smooth" }); }}>
            {l}
          </a>
        ))}
      </div>
      {list.map((g, i) => {
        const L = normText(g.mot)[0]?.toUpperCase();
        const first = i === 0 || normText(list[i - 1].mot)[0]?.toUpperCase() !== L;
        const w = worlds.find((x) => x.id === g.monde);
        return (
          <div key={g.mot} id={first ? "l-" + L : undefined} className="gloss-card">
            <div className="row">
              <strong className="gloss-mot">{g.mot}</strong>
              <SpeakBtn segs={[{ who: "narrateur", text: `${g.mot}. ${g.def} ${g.exemple ? "Exemple : " + g.exemple : ""}` }]} k={`gl:${g.mot}`} small />
            </div>
            <Md text={g.def} />
            {g.exemple && <Md text={"*Exemple :* " + g.exemple} className="small" />}
            <div className="small muted">
              {g.source && <>Source : {g.source}</>}
              {w && (
                <>
                  {" "}
                  ·{" "}
                  <button className="link" onClick={() => go(`/monde/${w.id}`)}>
                    {w.emoji} {w.titre}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
      {!list.length && <p className="muted">Aucun mot trouvé.</p>}
    </div>
  );
}
