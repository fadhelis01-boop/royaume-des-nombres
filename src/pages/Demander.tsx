import { useRef, useState } from "react";
import { go } from "../lib/router";
import { searchLocal, type Hit } from "../lib/search";
import { aiConfigured } from "../lib/ai-config";
import { bump, dayKey, getState, useChild } from "../lib/store";
import { dicteeSupported, startDictee } from "../lib/dictee";
import { Bubble, Mascot, SpeakBtn } from "../components/Mascot";
import { Md } from "../components/Md";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";

interface Turn {
  q: string;
  local: Hit[];
  answer?: string;
  sources?: { url: string; title: string }[];
  error?: string;
  status?: string;
}

const SUGGESTIONS = [
  "Pourquoi 0 fois un nombre fait 0 ?",
  "C'est quoi une fraction ?",
  "À quoi servent les nombres négatifs ?",
  "Pourquoi on ne peut pas diviser par zéro ?",
  "C'est quoi le nombre π ?",
  "Qui a inventé le zéro ?",
  "Comment savoir si un nombre est premier ?",
  "À quoi sert le théorème de Pythagore ?",
];

export function Demander() {
  const child = useChild()!;
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const ai = aiConfigured();
  const [listening, setListening] = useState(false);
  const stopRec = useRef<() => void>(() => undefined);
  const micro = () => {
    if (listening) return stopRec.current();
    setListening(true);
    stopRec.current = startDictee(
      (t) => setQ(t),
      () => setListening(false),
    );
  };

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setQ("");
    bump("ask");
    const local = searchLocal(text);
    const idx = turns.length;
    setTurns((t) => [...t, { q: text, local }]);
    if (!ai) return;
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    const history: BetaMessageParam[] = [];
    for (const t of turns.slice(-3)) {
      if (!t.answer) continue;
      history.push({ role: "user", content: t.q }, { role: "assistant", content: t.answer });
    }
    history.push({ role: "user", content: text });
    const upd = (p: Partial<Turn>) => setTurns((all) => all.map((x, i) => (i === idx ? { ...x, ...p } : x)));
    // limite quotidienne fixée par les parents (Espace parents › Assistant)
    const lim = getState().settings.aiDailyLimit ?? 15;
    const cle = `ia:${dayKey()}`;
    if (lim > 0 && (child.counters[cle] ?? 0) >= lim) {
      upd({ error: `Lya a déjà répondu à ${lim} questions aujourd'hui : c'est la limite choisie par tes parents. Reviens demain, ou cherche dans le Grand Livre 📖 !`, status: "" });
      setBusy(false);
      return;
    }
    try {
      const { askClaude, teacherSystem } = await import("../lib/ai");
      bump(cle);
      const r = await askClaude({
        system: teacherSystem(child.age),
        messages: history,
        signal: ctrl.signal,
        onText: (t) => upd({ answer: t }),
        onStatus: (s) => upd({ status: s }),
      });
      upd({ answer: r.text, sources: r.sources, status: "" });
    } catch (e) {
      upd({ error: (e as Error).message, status: "" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page demander">
      <h1>❓ Demande à Lya</h1>
      {!turns.length && (
        <>
          <Bubble who="mia" humeur="reflexion" text={`Pose-moi n'importe quelle question, ${child.name} : maths, français, sciences, musique ou dessin ! Je te réponds avec des explications simples… et je te dis où j'ai trouvé l'information.`} />
          {!ai && (
            <p className="small muted card">
              ℹ️ Pour l'instant, Lya répond avec les leçons et le Grand Livre de la Galaxie. Pour des réponses complètes et sourcées sur internet, un adulte peut activer l'assistant dans l'Espace parents 🔒.
            </p>
          )}
          <div className="suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="turns">
        {turns.map((t, i) => (
          <div key={i} className="turn">
            <div className="turn-q">
              <Mascot who={child.avatar} size={38} /> {t.q}
            </div>
            {t.answer !== undefined || t.status ? (
              <div className="turn-a">
                <div className="row">
                  <Mascot who="mia" size={52} talking={busy && i === turns.length - 1} />
                  {t.status && <span className="muted small">{t.status}</span>}
                  {t.answer && !busy && <SpeakBtn segs={[{ who: "mia", text: t.answer.replace(/\[\d+\]/g, "") }]} k={`ans:${i}`} small />}
                </div>
                {t.answer && <Md text={t.answer} />}
                {!!t.sources?.length && (
                  <div className="sources">
                    <strong>📚 Mes sources :</strong>
                    <ol>
                      {t.sources.map((s) => (
                        <li key={s.url}>
                          <a href={s.url} target="_blank" rel="noopener noreferrer">
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : null}
            {t.error && <Bubble who="neo" text={t.error} size={46} />}
            {t.local.length > 0 && (
              <div className="local">
                <div className="small muted">{ai ? "Pour aller plus loin dans le Royaume :" : "Voici ce que j'ai trouvé dans le Royaume :"}</div>
                {t.local.map((h, k) =>
                  h.kind === "mot" ? (
                    <div key={k} className="gloss-card">
                      <strong>📖 {h.entry!.mot}</strong>
                      <Md text={h.entry!.def} />
                      {h.entry!.exemple && <Md text={"*Exemple :* " + h.entry!.exemple} className="small" />}
                      {h.entry!.source && <div className="small muted">Source : {h.entry!.source}</div>}
                    </div>
                  ) : (
                    <button key={k} className="lesson-link" onClick={() => go(`/lecon/${h.world!.id}/${h.lesson!.id}`)}>
                      {h.world!.emoji} <strong>{h.lesson!.titre}</strong> <span className="muted small">— {h.world!.titre}</span>
                    </button>
                  ),
                )}
              </div>
            )}
            {!ai && !t.local.length && <Bubble who="zero" text="Hmm… je n'ai rien trouvé dans mes livres. Essaie avec un autre mot (par exemple « fraction », « périmètre », « nombre premier ») !" size={46} />}
          </div>
        ))}
      </div>
      <form
        className="ask-bar"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
      >
        {dicteeSupported() && (
          <button type="button" className={`btn btn-soft mic ${listening ? "on" : ""}`} onClick={micro} aria-label="Poser la question à voix haute" title="Parler">
            {listening ? "👂" : "🎤"}
          </button>
        )}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={listening ? "Je t'écoute…" : "Écris ta question…"} aria-label="ta question" maxLength={500} />
        {busy ? (
          <button type="button" className="btn btn-soft" onClick={() => abort.current?.abort()}>
            ⏹
          </button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={!q.trim()}>
            Envoyer
          </button>
        )}
      </form>
    </div>
  );
}
