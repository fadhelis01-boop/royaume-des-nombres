import { useEffect } from "react";
import { go } from "../lib/router";
import { useChild } from "../lib/store";
import { majQuetes, quetesDuJour } from "../lib/engagement";

/** Les 3 quêtes du jour : une pour apprendre, une pour explorer une autre activité, une bonne habitude. */
export function Quetes() {
  const child = useChild();
  useEffect(() => {
    if (child) majQuetes(child);
  }, [child]);
  if (!child) return null;
  const qs = quetesDuJour(child);
  const toutes = qs.every((x) => x.ok);
  return (
    <section className="quetes" aria-label="Quêtes du jour">
      <h2 className="quetes-titre">🗺️ Quêtes du jour {toutes && <small>· toutes réussies, bravo !</small>}</h2>
      <ul>
        {qs.map(({ q, fait, ok }) => (
          <li key={q.id} className={ok ? "ok" : ""}>
            <button type="button" className="quete" disabled={!q.vers || ok} onClick={() => q.vers && go(q.vers)}>
              <span className="quete-emoji" aria-hidden>
                {ok ? "✅" : q.emoji}
              </span>
              <span className="quete-txt">
                {q.texte}
                <small>{ok ? "Réussie · +5 💎" : `${fait}/${q.n} · +5 💎`}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
