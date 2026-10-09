// Visuel « parole » (2.4) : des mots ou des phrases prononcés dans une autre langue (anglais par défaut),
// avec la voix de l'appareil. `cache: true` n'affiche que le bouton : pour les exercices d'écoute.
//   { type: parole, langue: en-GB, mots: [{ texte: "Hello", sens: "Bonjour", emoji: "👋" }], cache: false }
import { useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = Record<string, any>;

function voixPour(langue: string): SpeechSynthesisVoice | undefined {
  const l = langue.toLowerCase();
  const vs = speechSynthesis.getVoices();
  return vs.find((v) => v.lang.toLowerCase().replace("_", "-") === l) ?? vs.find((v) => v.lang.toLowerCase().startsWith(l.slice(0, 2)));
}
export function prononcer(texte: string, langue = "en-GB", lent = false) {
  if (typeof speechSynthesis === "undefined") return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texte);
  u.lang = langue;
  const v = voixPour(langue);
  if (v) u.voice = v;
  u.rate = lent ? 0.6 : 0.85;
  speechSynthesis.speak(u);
  return !!v;
}

export function ParoleVis({ v }: { v: Any }) {
  const langue = String(v.langue ?? "en-GB");
  const mots: Any[] = Array.isArray(v.mots) ? v.mots : [];
  const [sansVoix, setSansVoix] = useState(false);
  return (
    <div className="parole" lang={langue}>
      {mots.map((m, i) => (
        <div key={i} className="parole-mot">
          <button
            type="button"
            className="btn btn-soft parole-btn"
            onClick={() => setSansVoix(!prononcer(String(m.texte), langue))}
            onDoubleClick={() => prononcer(String(m.texte), langue, true)}
            aria-label={v.cache ? `écouter le mot ${i + 1}` : `écouter ${m.texte}`}
          >
            🔊 {v.cache ? (mots.length > 1 ? `Son ${i + 1}` : "Écoute") : <span>{m.emoji ? m.emoji + " " : ""}<strong>{String(m.texte)}</strong></span>}
          </button>
          {!v.cache && m.sens && (
            <span className="small muted" lang="fr">
              {String(m.sens)}
            </span>
          )}
        </div>
      ))}
      {sansVoix && <p className="small muted" lang="fr">Cet appareil n'a pas de voix anglaise installée : la prononciation peut être approximative. (Réglages de l'appareil › Langue › Synthèse vocale)</p>}
    </div>
  );
}
