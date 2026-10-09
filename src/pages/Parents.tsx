import { useState } from "react";
import { go } from "../lib/router";
import { exportBackup, importBackup, removeChild, setState, updateChild, updateSettings, useStore, dayKey, minutesToday, newChild, applyChildMode } from "../lib/store";
import { importWorldFile, refreshContent, removeImportedWorld, useContent, worldProgress } from "../lib/content";
import { checkForAppUpdate, isIos, isStandalone, promptInstall, usePwa } from "../lib/pwa";
import { frenchVoices, previewVoice, ttsSupported } from "../lib/tts";
import { MODELS } from "../lib/ai-config";
import { levelOf } from "../lib/rewards";
import { Mascot, NAMES } from "../components/Mascot";
import type { Child, Who } from "../lib/types";
import { AssistantPlus, Bilans, Confidentialite, HorsConnexion, marquerSauvegarde, RappelAgenda, RappelSauvegarde } from "./ParentsPlus";

const TABS = [
  { id: "suivi", label: "📊 Suivi" },
  { id: "profils", label: "👧 Enfants" },
  { id: "reglages", label: "⚙️ Réglages" },
  { id: "assistant", label: "🤖 Assistant" },
  { id: "contenu", label: "📦 Contenus" },
  { id: "sauvegarde", label: "💾 Sauvegarde" },
  { id: "bilans", label: "🖨️ Bilans" },
  { id: "confidentialite", label: "🔒 Confidentialité" },
  { id: "guide", label: "🎓 Guide" },
];

export function Parents({ tab }: { tab?: string }) {
  const unlocked = useStore((s) => s.parentUnlocked);
  const pin = useStore((s) => s.settings.pin);
  if (!unlocked) return <PinGate pin={pin} />;
  const t = tab ?? "suivi";
  return (
    <div className="page parents">
      <h1>🔒 Espace parents</h1>
      <RappelSauvegarde onGo={() => go("/parents/sauvegarde")} />
      <div className="tabs scroll">
        {TABS.map((x) => (
          <button key={x.id} className={`tab ${t === x.id ? "active" : ""}`} onClick={() => go(`/parents/${x.id}`)}>
            {x.label}
          </button>
        ))}
      </div>
      {t === "suivi" && <Suivi />}
      {t === "profils" && <Profils />}
      {t === "reglages" && <Reglages />}
      {t === "assistant" && <AssistantCfg />}
      {t === "contenu" && <Contenus />}
      {t === "sauvegarde" && <Sauvegarde />}
      {t === "guide" && <Guide />}
      {t === "bilans" && <BilansPage />}
      {t === "confidentialite" && <Confidentialite />}
      <div className="center" style={{ marginTop: 24 }}>
        <button
          className="btn btn-soft"
          onClick={() => {
            setState({ parentUnlocked: false }, false);
            go("/");
          }}
        >
          🔒 Verrouiller et revenir aux enfants
        </button>
      </div>
    </div>
  );
}

// ---------- Verrou parental ----------
function PinGate({ pin }: { pin: string }) {
  const [v, setV] = useState("");
  const [v2, setV2] = useState("");
  const [err, setErr] = useState("");
  const [forgot, setForgot] = useState(false);
  const [a] = useState(() => 13 + Math.floor(Math.random() * 7));
  const [b] = useState(() => 17 + Math.floor(Math.random() * 8));
  const [ans, setAns] = useState("");
  if (!pin)
    return (
      <div className="page narrow">
        <h1>🔒 Espace parents</h1>
        <p>Choisissez un code à 4 chiffres. Il empêche les enfants de modifier les réglages, la durée d'écran ou l'assistant.</p>
        <input className="big-input" inputMode="numeric" maxLength={4} value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))} placeholder="Code (4 chiffres)" type="password" />
        <input className="big-input" inputMode="numeric" maxLength={4} value={v2} onChange={(e) => setV2(e.target.value.replace(/\D/g, ""))} placeholder="Confirmer le code" type="password" />
        {err && <p className="error">{err}</p>}
        <button
          className="btn btn-primary"
          onClick={() => {
            if (v.length !== 4) return setErr("Le code doit avoir 4 chiffres.");
            if (v !== v2) return setErr("Les deux codes sont différents.");
            updateSettings({ pin: v });
            setState({ parentUnlocked: true }, false);
          }}
        >
          Créer le code
        </button>
      </div>
    );
  return (
    <div className="page narrow">
      <h1>🔒 Espace parents</h1>
      <input
        className="big-input"
        inputMode="numeric"
        maxLength={4}
        value={v}
        type="password"
        autoFocus
        placeholder="Code parent"
        onChange={(e) => {
          const x = e.target.value.replace(/\D/g, "");
          setV(x);
          if (x.length === 4) {
            if (x === pin) setState({ parentUnlocked: true }, false);
            else {
              setErr("Code incorrect.");
              setV("");
            }
          }
        }}
      />
      {err && <p className="error">{err}</p>}
      <button className="link small" onClick={() => setForgot(true)}>
        Code oublié ?
      </button>
      {forgot && (
        <div className="card">
          <p>
            Question pour adulte : combien font <strong>{a} × {b}</strong> ?
          </p>
          <input className="big-input" inputMode="numeric" value={ans} onChange={(e) => setAns(e.target.value)} />
          <button
            className="btn btn-soft"
            onClick={() => {
              if (Number(ans) === a * b) {
                updateSettings({ pin: "" });
                setForgot(false);
              } else setErr("Ce n'est pas la bonne réponse.");
            }}
          >
            Réinitialiser le code
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Suivi des progrès ----------
function lastDays(n: number) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

function Suivi() {
  const children = useStore((s) => s.children);
  const [id, setId] = useState(children[0]?.id ?? "");
  const c = children.find((x) => x.id === id) ?? children[0];
  const { worlds } = useContent();
  if (!c) return <p>Aucun enfant pour l'instant.</p>;
  const days = lastDays(14);
  const maxMin = Math.max(10, ...days.map((d) => c.days[d]?.min ?? 0));
  const ok = c.counters.ok ?? 0,
    ko = c.counters.ko ?? 0;
  const lvl = levelOf(c.xp);
  const lessonTitle = (key: string) => {
    const [w, l] = key.split("/");
    const W = worlds.find((x) => x.id === w);
    const L = W?.lecons.find((x) => x.id === l);
    if (!L && W && l?.startsWith("gardien")) return `${W.emoji} Défi du Gardien — ${W.titre}`;
    return L ? `${W!.emoji} ${L.titre} (${W!.niveau})` : key.startsWith("jeu:") ? "🎮 Jeux" : key;
  };
  const weak = Object.entries(c.skills)
    .filter(([k, s]) => k.includes("/") && s.ok + s.ko >= 4)
    .map(([k, s]) => ({ k, rate: s.ok / (s.ok + s.ko), n: s.ok + s.ko }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 6);
  const weekMin = days.slice(-7).reduce((t, d) => t + (c.days[d]?.min ?? 0), 0);
  return (
    <div>
      {children.length > 1 && (
        <div className="tabs">
          {children.map((x) => (
            <button key={x.id} className={`tab ${x.id === c.id ? "active" : ""}`} onClick={() => setId(x.id)}>
              {x.name}
            </button>
          ))}
        </div>
      )}
      <div className="stats-grid">
        <div className="stat">
          <span>{lvl.emoji}</span>
          <strong>Niveau {lvl.level}</strong>
          <small>{lvl.title}</small>
        </div>
        <div className="stat">
          <span>⏱</span>
          <strong>{weekMin} min</strong>
          <small>sur 7 jours (aujourd'hui : {minutesToday(c)} min)</small>
        </div>
        <div className="stat">
          <span>🎯</span>
          <strong>{ok + ko ? Math.round((ok / (ok + ko)) * 100) : 0} %</strong>
          <small>
            de réussite ({ok} / {ok + ko})
          </small>
        </div>
        <div className="stat">
          <span>📚</span>
          <strong>{Object.values(c.progress).filter((p) => p.done).length}</strong>
          <small>leçons validées</small>
        </div>
        <div className="stat">
          <span>🔥</span>
          <strong>{c.streak} j</strong>
          <small>série (record {c.bestStreak})</small>
        </div>
        <div className="stat">
          <span>🎖️</span>
          <strong>{c.badges.length}</strong>
          <small>badges</small>
        </div>
      </div>
      <h3>Temps d'apprentissage (14 jours)</h3>
      <div className="minibars">
        {days.map((d) => (
          <div key={d} className="mb" title={`${d} : ${c.days[d]?.min ?? 0} min`}>
            <span style={{ height: `${((c.days[d]?.min ?? 0) / maxMin) * 100}%` }} />
            <small>{d.slice(8)}</small>
          </div>
        ))}
      </div>
      <h3>Progression par monde</h3>
      <table className="tableau">
        <tbody>
          {worlds.map((w) => {
            const p = worldProgress(c, w);
            if (!p.done && !c.validatedWorlds.includes(w.id)) return null;
            return (
              <tr key={w.id}>
                <td>
                  {w.emoji} {w.titre}
                </td>
                <td>
                  {p.done}/{p.total} leçons
                </td>
                <td>⭐ {p.stars}/{p.maxStars}</td>
                <td>{c.validatedWorlds.includes(w.id) ? "validé au test" : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {weak.length > 0 && (
        <>
          <h3>Points à consolider</h3>
          <ul>
            {weak.map((w) => (
              <li key={w.k}>
                {lessonTitle(w.k)} — {Math.round(w.rate * 100)} % de réussite sur {w.n} questions
              </li>
            ))}
          </ul>
          <p className="small muted">Conseil : proposez à l'enfant de relire la leçon puis de refaire le défi ; la page Révisions → « Retravailler mes erreurs » cible ces notions.</p>
        </>
      )}
      <Coince c={c} lessonTitle={lessonTitle} />
      {c.mistakes.length > 0 && (
        <details>
          <summary>Dernières erreurs ({c.mistakes.length})</summary>
          <table className="tableau small">
            <tbody>
              <tr>
                <th>Notion</th>
                <th>Question</th>
                <th>Réponse donnée</th>
                <th>Attendu</th>
              </tr>
              {c.mistakes.slice(0, 25).map((m, i) => (
                <tr key={i}>
                  <td>{lessonTitle(m.key)}</td>
                  <td>{m.q.slice(0, 90)}</td>
                  <td>{m.given}</td>
                  <td>{m.expected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      {c.inventions.length > 0 && (
        <details>
          <summary>Problèmes inventés par l'enfant ({c.inventions.length})</summary>
          {c.inventions.map((x, i) => (
            <p key={i}>
              <strong>{x.calcul}</strong> — {x.histoire}
            </p>
          ))}
        </details>
      )}
    </div>
  );
}

/** Où l'enfant décroche, et comment se passent ses séances. */
function Coince({ c, lessonTitle }: { c: Child; lessonTitle: (k: string) => string }) {
  const ab = Object.entries(c.abandons ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const ss = (c.sessions ?? []).slice(-10).reverse();
  const avg = ss.length ? Math.round(ss.reduce((t, x) => t + x.min, 0) / ss.length) : 0;
  return (
    <>
      <h3>Où ça coince</h3>
      {ab.length ? (
        <>
          <ul>
            {ab.map(([k, n]) => (
              <li key={k}>
                {lessonTitle(k.replace(":defi", ""))}
                {k.endsWith(":defi") ? " — défi" : ""} : quitté {n} fois avant la fin
              </li>
            ))}
          </ul>
          <p className="small muted">Une leçon souvent quittée est peut-être trop difficile ou trop longue pour l'instant. Proposez de la faire ensemble, ou de passer par l'École des Astuces.</p>
        </>
      ) : (
        <p className="small muted">Aucune leçon abandonnée en cours de route : très bon signe.</p>
      )}
      <h3>Séances récentes</h3>
      {ss.length ? (
        <>
          <p className="small">
            Durée moyenne : <strong>{avg} min</strong>. L'application propose une pause vers 15 minutes (l'enfant peut continuer).
          </p>
          <table className="tableau small">
            <tbody>
              <tr>
                <th>Jour</th>
                <th>Durée</th>
                <th>Réponses</th>
              </tr>
              {ss.map((x) => (
                <tr key={x.start}>
                  <td>{new Date(x.start).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td>{x.min} min</td>
                  <td>{x.q}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="small muted">Pas encore de séance enregistrée.</p>
      )}
    </>
  );
}

// ---------- Profils ----------
function Profils() {
  const children = useStore((s) => s.children);
  return (
    <div className="stack">
      {children.map((c) => (
        <ProfileEdit key={c.id} c={c} />
      ))}
      <button className="btn btn-primary" onClick={() => go("/nouveau")}>
        ＋ Ajouter un enfant
      </button>
    </div>
  );
}
function ProfileEdit({ c }: { c: Child }) {
  const [confirm, setConfirm] = useState("");
  return (
    <div className="card">
      <div className="row">
        <Mascot who={c.avatar} size={56} />
        <input className="big-input" value={c.name} onChange={(e) => updateChild((x) => void (x.name = e.target.value.slice(0, 20)), c.id)} />
      </div>
      <label>
        Âge :{" "}
        <select value={c.age} onChange={(e) => updateChild((x) => void (x.age = Number(e.target.value)), c.id)}>
          {Array.from({ length: 15 }, (_, i) => i + 5).map((a) => (
            <option key={a} value={a}>
              {a} ans
            </option>
          ))}
        </select>
      </label>{" "}
      <label>
        Compagnon :{" "}
        <select value={c.avatar} onChange={(e) => updateChild((x) => void (x.avatar = e.target.value as Child["avatar"]), c.id)}>
          {(["mia", "neo", "zero"] as const).map((a) => (
            <option key={a} value={a}>
              {NAMES[a]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Lecture :{" "}
        <select
          value={c.lecteur ?? "oui"}
          onChange={(e) => {
            updateChild((x) => void (x.lecteur = e.target.value as Child["lecteur"]), c.id);
            applyChildMode();
          }}
        >
          <option value="oui">lit seul</option>
          <option value="non">ne lit pas encore (tout en voix et en pictogrammes)</option>
        </select>
      </label>
      <div className="row">
        <button className="btn btn-ghost small" onClick={() => setConfirm(confirm === "reset" ? "" : "reset")}>
          Remettre à zéro la progression
        </button>
        <button className="btn btn-ghost small danger" onClick={() => setConfirm(confirm === "del" ? "" : "del")}>
          Supprimer le profil
        </button>
      </div>
      {confirm && (
        <div className="confirm">
          <p>{confirm === "del" ? `Supprimer définitivement le profil de ${c.name} et toute sa progression ?` : `Effacer toute la progression de ${c.name} (étoiles, badges, leçons) ?`}</p>
          <button
            className="btn btn-primary danger"
            onClick={() => {
              if (confirm === "del") removeChild(c.id);
              else
                updateChild(
                  (x) => ({ ...newChild(x.name, x.avatar, x.age), id: x.id, createdAt: x.createdAt, lecteur: x.lecteur }),
                  c.id,
                );
              setConfirm("");
            }}
          >
            Oui, confirmer
          </button>{" "}
          <button className="btn btn-soft" onClick={() => setConfirm("")}>
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Réglages ----------
function Reglages() {
  const s = useStore((x) => x.settings);
  const voices = frenchVoices();
  const pwa = usePwa();
  return (
    <div className="stack settings">
      <section className="card">
        <h3>🔊 Voix des personnages</h3>
        {!ttsSupported() ? (
          <p>La synthèse vocale n'est pas disponible dans ce navigateur.</p>
        ) : (
          <>
            {!voices.length && <p className="small muted">Aucune voix française détectée pour l'instant (elles se chargent parfois après quelques secondes). Sur iPhone : Réglages → Accessibilité → Contenu énoncé → Voix → Français pour en télécharger de meilleures.</p>}
            {(["narrateur", "mia", "neo", "zero"] as Who[]).map((who) => (
              <div key={who} className="row">
                <span style={{ minWidth: 90 }}>{NAMES[who]}</span>
                <select value={s.voices[who] ?? ""} onChange={(e) => updateSettings({ voices: { ...s.voices, [who]: e.target.value } })}>
                  <option value="">Automatique</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <button className="btn btn-soft small" onClick={() => previewVoice(who, s.voices[who] ?? "")}>
                  ▶
                </button>
              </div>
            ))}
            <label>
              Vitesse de lecture : {s.rate.toFixed(1)}
              <input type="range" min={0.6} max={1.5} step={0.1} value={s.rate} onChange={(e) => updateSettings({ rate: Number(e.target.value) })} />
            </label>
            <Toggle label="Lire automatiquement les leçons et les questions (recommandé avant 9 ans)" v={s.autoRead} on={(v) => updateSettings({ autoRead: v })} />
          </>
        )}
        <Toggle label="Petits sons (bonne réponse, étoiles…)" v={s.sounds} on={(v) => updateSettings({ sounds: v })} />
        <Toggle label="Musique d'ambiance douce (une mélodie par monde)" v={s.music} on={(v) => updateSettings({ music: v })} />
      </section>
      <section className="card">
        <h3>👀 Confort de lecture</h3>
        <label>
          Taille du texte : {Math.round(s.fontScale * 100)} %
          <input type="range" min={0.85} max={1.5} step={0.05} value={s.fontScale} onChange={(e) => updateSettings({ fontScale: Number(e.target.value) })} />
        </label>
        <Toggle label="Mode lecture facilitée (dyslexie : police OpenDyslexic, espacement accru, lignes aérées)" v={s.dys} on={(v) => updateSettings({ dys: v })} />
        <Toggle label="Sons visibles (enfants sourds ou malentendants) : chaque son est aussi dessiné (hauteur, durée, rythme, volume)" v={!!s.sonsVisibles} on={(v) => updateSettings({ sonsVisibles: v })} />
        <Toggle label="Réduire les animations" v={s.reduceMotion} on={(v) => updateSettings({ reduceMotion: v })} />
        <label>
          Thème :{" "}
          <select value={s.theme} onChange={(e) => updateSettings({ theme: e.target.value as typeof s.theme })}>
            <option value="auto">Automatique</option>
            <option value="clair">Clair</option>
            <option value="sombre">Sombre</option>
          </select>
        </label>
      </section>
      <section className="card">
        <h3>⏱ Temps d'écran</h3>
        <label>
          Limite quotidienne :{" "}
          <select value={s.dailyLimit} onChange={(e) => updateSettings({ dailyLimit: Number(e.target.value) })}>
            <option value={0}>Pas de limite</option>
            {[10, 15, 20, 30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </label>
        <p className="small muted">Repères : 15 à 20 minutes par jour suffisent avant 9 ans ; mieux vaut un peu chaque jour que beaucoup une fois par semaine.</p>
      </section>
      <section className="card">
        <h3>🔓 Progression</h3>
        <Toggle label="Tout débloquer (pour un enfant avancé, un enseignant ou un parent qui veut explorer)" v={s.unlockAll} on={(v) => updateSettings({ unlockAll: v })} />
        <p className="small muted">Par défaut, une leçon s'ouvre quand la précédente est réussie, et un monde quand la moitié du monde précédent est faite : on construit des bases solides avant d'avancer. Le « petit test » (sur la carte) ouvre directement les mondes déjà maîtrisés.</p>
      </section>
      <section className="card">
        <h3>📱 Installer l'application</h3>
        {isStandalone() ? (
          <p>✅ L'application est installée sur cet appareil.</p>
        ) : pwa.canInstall ? (
          <button className="btn btn-primary" onClick={() => void promptInstall()}>
            Installer sur cet appareil
          </button>
        ) : isIos() ? (
          <p>Sur iPhone/iPad : dans Safari, touchez le bouton Partager ⬆️ puis « Sur l'écran d'accueil ».</p>
        ) : (
          <p>Dans le menu du navigateur, choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ».</p>
        )}
        <p className="small muted">Une fois installée, l'application fonctionne aussi sans connexion internet (sauf l'assistant).</p>
        <button className="btn btn-soft" onClick={() => void PinChange()}>
          Changer le code parent
        </button>
      </section>
    </div>
  );
}
function PinChange() {
  const v = prompt("Nouveau code parent (4 chiffres) :");
  if (v && /^\d{4}$/.test(v)) updateSettings({ pin: v });
  else if (v) alert("Le code doit contenir exactement 4 chiffres.");
}
function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

// ---------- Assistant ----------
function AssistantCfg() {
  const s = useStore((x) => x.settings);
  const [show, setShow] = useState(false);
  return (
    <div className="stack">
      <section className="card">
        <h3>🤖 « Demande à Lya » — réponses complètes et sourcées</h3>
        <p>
          Sans configuration, Lya répond avec les leçons et le Grand Livre de l'application (hors connexion). Pour répondre à <em>toutes</em> les questions avec des explications adaptées à l'âge et des <strong>sources vérifiables</strong> (Eduscol, Wikipédia, Khan Academy, Lumni, Bibmath…), l'application peut utiliser l'IA Claude d'Anthropic avec <strong>votre propre clé d'API</strong>.
        </p>
        <ol className="small">
          <li>
            Créez un compte sur <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a> et ajoutez un petit crédit (quelques euros suffisent pour des centaines de questions).
          </li>
          <li>Créez une clé d'API, puis collez-la ci-dessous.</li>
        </ol>
        <label>
          Clé d'API
          <div className="row">
            <input className="big-input" type={show ? "text" : "password"} value={s.apiKey} onChange={(e) => updateSettings({ apiKey: e.target.value.trim() })} placeholder="sk-ant-…" autoComplete="off" />
            <button className="btn btn-soft small" onClick={() => setShow(!show)}>
              {show ? "🙈" : "👁"}
            </button>
          </div>
        </label>
        <label>
          Modèle :{" "}
          <select value={s.model} onChange={(e) => updateSettings({ model: e.target.value })}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <p className="small muted">
          Confidentialité : la clé reste sur cet appareil (elle n'est pas incluse dans les sauvegardes). Les questions sont envoyées uniquement à Anthropic pour obtenir la réponse ; aucune donnée personnelle de l'enfant n'est transmise (seulement son âge, pour adapter les explications). Lya est réglée pour rester sur les mathématiques et les sciences, ne jamais demander d'informations personnelles, et guider vers la réponse plutôt que la donner directement.
        </p>
      </section>
      <AssistantPlus />
    </div>
  );
}

// ---------- Contenus (ajout de domaines sans recoder, mises à jour) ----------
function Contenus() {
  const { worlds, manifest } = useContent();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (f: File) => {
    setBusy(true);
    const r = await importWorldFile(await f.text(), f.name);
    setBusy(false);
    setMsg(r.world ? { ok: true, text: `✅ Monde « ${r.world.titre} » ajouté (${r.world.lecons.length} leçons). Il apparaît sur la carte.` } : { ok: false, text: "❌ Le fichier contient des erreurs :\n- " + r.errors.slice(0, 15).join("\n- ") });
  };
  return (
    <div className="stack">
      <section className="card">
        <h3>🔄 Mises à jour</h3>
        <p className="small">
          Version des contenus : <strong>{manifest?.version}</strong> (publiée le {manifest?.updatedAt}). L'application vérifie automatiquement les nouvelles versions à chaque ouverture ; vous pouvez aussi forcer la vérification.
        </p>
        <button
          className="btn btn-soft"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await refreshContent();
            const app = await checkForAppUpdate();
            setBusy(false);
            setMsg({ ok: true, text: `Contenus : ${r.after === r.before ? "déjà à jour" : `mis à jour (${r.before} → ${r.after})`}. Application : ${app ? "une nouvelle version s'installe, un bandeau va proposer de recharger." : "à jour."}` });
          }}
        >
          Vérifier maintenant
        </button>
        {manifest?.changelog?.length ? (
          <details>
            <summary>Journal des nouveautés</summary>
            {manifest.changelog.map((c) => (
              <div key={c.version}>
                <strong>
                  {c.version} — {c.date}
                </strong>
                <ul>
                  {c.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        ) : null}
      </section>
      <section className="card">
        <h3>➕ Ajouter un domaine (sans programmer)</h3>
        <p className="small">
          Un domaine (« monde ») est un simple fichier texte au format YAML : leçons, dialogues des personnages, visuels et exercices à paramètres aléatoires. Importez-le ici : il est vérifié (chaque exercice est tiré et corrigé automatiquement) puis ajouté à la carte de cet appareil. Le format est décrit dans le fichier <code>docs/FORMAT-CONTENU.md</code> du projet ; un modèle est téléchargeable ci-dessous.
        </p>
        <label className="btn btn-primary file-btn">
          📂 Importer un fichier .yaml ou .json
          <input type="file" accept=".yaml,.yml,.json,text/yaml,application/json" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} hidden />
        </label>{" "}
        <a className="btn btn-soft" href="modele-monde.yaml" download>
          ⬇ Télécharger le modèle
        </a>
        {msg && <pre className={`msg ${msg.ok ? "ok" : "ko"}`}>{msg.text}</pre>}
      </section>
      <section className="card">
        <h3>📚 Mondes installés ({worlds.length})</h3>
        <table className="tableau small">
          <tbody>
            {worlds.map((w) => (
              <tr key={w.id}>
                <td>
                  {w.emoji} {w.titre}
                </td>
                <td>{w.lecons.length} leçons</td>
                <td>v{w.version}</td>
                <td>
                  {w.source === "importe" ? (
                    <button className="btn btn-ghost small danger" onClick={() => void removeImportedWorld(w.id)}>
                      Retirer
                    </button>
                  ) : (
                    "intégré"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ---------- Sauvegarde ----------
function Sauvegarde() {
  const [msg, setMsg] = useState("");
  const download = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `galaxie-des-savoirs-sauvegarde-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    marquerSauvegarde();
  };
  // partage direct (tablette, téléphone) : e-mail, messagerie, cloud…
  const fichier = () => new File([exportBackup()], `galaxie-des-savoirs-sauvegarde-${dayKey()}.json`, { type: "application/json" });
  const peutPartager = typeof navigator !== "undefined" && !!navigator.canShare && (() => { try { return navigator.canShare({ files: [fichier()] }); } catch { return false; } })();
  const partager = async () => {
    try {
      await navigator.share({ files: [fichier()], title: "Sauvegarde de la Galaxie des Savoirs" });
      marquerSauvegarde();
    } catch {
      /* partage annulé */
    }
  };
  return (
    <div className="stack">
      <section className="card">
        <h3>💾 Sauvegarder la progression</h3>
        <p className="small">Toute la progression est stockée sur cet appareil. Téléchargez une sauvegarde pour la conserver, ou pour la transférer sur une tablette, un autre ordinateur ou un iPhone.</p>
        <button className="btn btn-primary" onClick={download}>
          ⬇ Télécharger la sauvegarde
        </button>
        {peutPartager && (
          <button className="btn btn-soft" onClick={partager}>
            📤 Envoyer la sauvegarde (e-mail, messagerie…)
          </button>
        )}
      </section>
      <section className="card">
        <h3>📥 Restaurer / transférer</h3>
        <p className="small">Choisissez un fichier de sauvegarde : les profils qu'il contient sont ajoutés (ou remplacent ceux qui portent le même identifiant).</p>
        <label className="btn btn-soft file-btn">
          📂 Choisir un fichier de sauvegarde
          <input
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const n = importBackup(await f.text());
                setMsg(`✅ ${n} profil(s) restauré(s).`);
              } catch (err) {
                setMsg("❌ " + (err as Error).message);
              }
            }}
          />
        </label>
        {msg && <p>{msg}</p>}
      </section>
      <HorsConnexion />
      <RappelAgenda />
    </div>

  );
}

// ---------- Guide pédagogique pour les parents ----------
function Guide() {
  return (
    <div className="card guide">
      <h3>🎓 Comment fonctionne la Galaxie des Savoirs ?</h3>
      <p>
        La Galaxie réunit 8 planètes, rangées en trois familles : <strong>les fondamentaux</strong> (maths, français), <strong>les sciences</strong> (chimie, physique, biologie, Terre &amp; Univers) et <strong>les arts</strong> (musique, dessin). Chaque planète a ses mondes (de 7 ans au niveau supérieur), son histoire, son monde « méthode », ses gardiens et ses jeux. L'enfant change de planète quand il veut ; sa progression est gardée partout.
      </p>
      <p>
        L'application suit les principes des pays les plus performants (Singapour, Japon, Corée, Estonie, Finlande…) et les résultats de la recherche en sciences de l'éducation :
      </p>
      <ul>
        <li>
          <strong>Concret → imagé → abstrait</strong> (méthode de Singapour) : chaque notion part d'objets (noisettes, gâteaux, pièces), passe par une image (blocs, barres, droite graduée), puis seulement par l'écriture mathématique.
        </li>
        <li>
          <strong>Le modèle en barres</strong> : un dessin simple pour traduire n'importe quel problème en calcul. C'est le cœur de l'« Atelier des problèmes ».
        </li>
        <li>
          <strong>La maîtrise avant d'avancer</strong> : une leçon s'ouvre quand la précédente est réussie (au moins 60 % au défi). Pas de trous dans les fondations.
        </li>
        <li>
          <strong>La pratique de récupération et la répétition espacée</strong> : retrouver une réponse de mémoire (plutôt que relire) et réviser au bon moment (1 j, 3 j, 7 j, 16 j, 35 j) ancrent durablement les connaissances.
        </li>
        <li>
          <strong>La pratique entrelacée</strong> : les révisions mélangent les notions, ce qui apprend à reconnaître QUELLE méthode utiliser.
        </li>
        <li>
          <strong>Des exercices infinis</strong> : chaque question est générée avec des nombres différents ; impossible d'apprendre les réponses par cœur, il faut comprendre.
        </li>
        <li>
          <strong>L'état d'esprit de croissance</strong> : on félicite l'effort et la persévérance (badges « Persévérance », « Jamais abandonner »), jamais de pénalité ni de classement. L'erreur est présentée comme une étape normale.
        </li>
        <li>
          <strong>Les deux sens</strong> : traduire un problème en calcul (Atelier des problèmes) ET inventer un problème à partir d'un calcul (« Invente un problème »).
        </li>
        <li>
          <strong>La démarche scientifique</strong> (OHERIC : observer, hypothèse, expérience, résultat, interprétation, conclusion) : en sciences, l'enfant parie avant de vérifier, et réalise de vraies expériences sûres, classées par niveau de sécurité (🟢 seul, 🟠 avec un adulte, 🔴 à regarder seulement, jamais à la maison).
        </li>
        <li>
          <strong>Le dessin décomposé</strong> : chaque dessin pas à pas avance par couches (construction, proportions, contour, détails, couleur), avec un guide à suivre au doigt ou au stylet. Le trait n'est jamais noté ; la galerie garde les dessins pour comparer les progrès.
        </li>
        <li>
          <strong>La musique par l'oreille et par le corps</strong> : écouter, frapper la pulsation, comparer des sons, puis lire et composer (studio avec clavier « sans fausse note » et boîte à rythmes).
        </li>
        <li>
          <strong>La méthode explicite</strong> : l'École des Astuces enseigne comment chercher (les 4 étapes de Pólya), vérifier, estimer, calculer de tête plus vite, et réussir un contrôle.
        </li>
      </ul>
      <h3>👨‍👩‍👧 Comment accompagner votre enfant ?</h3>
      <ul>
        <li>Mieux vaut 15 minutes chaque jour qu'une heure le dimanche. Utilisez la limite de temps si besoin.</li>
        <li>Pour les plus jeunes, asseyez-vous à côté les premières fois : lisez ensemble, manipulez de vrais objets (pâtes, Lego, pièces) en même temps que l'écran.</li>
        <li>Demandez-lui d'expliquer ce qu'il a appris : expliquer, c'est le meilleur moyen de comprendre.</li>
        <li>Valorisez les efforts (« tu as persévéré ! ») plus que la vitesse ou la note.</li>
        <li>Regardez l'onglet Suivi : les « points à consolider » indiquent où aider.</li>
        <li>Les savoirs sont partout : faites calculer la monnaie, doubler une recette, observer la Lune, écouter une musique ensemble, dessiner une plante du jardin.</li>
        <li>Pour les expériences 🟠, restez à côté de votre enfant ; aucune expérience 🔴 ne doit être reproduite à la maison.</li>
      </ul>
      <h3>📏 Correspondance avec l'école (France)</h3>
      <ul>
        <li>🌱 Les Graines : CP à CM1 (cycles 2 et 3) — les fondations de chaque matière.</li>
        <li>🧭 Les Explorateurs : CM2 à la seconde (cycles 3 et 4) — les notions du collège.</li>
        <li>🏰 Les Maîtres : première, terminale, avec des introductions rigoureuses au supérieur.</li>
      </ul>
      <p className="small muted">
        L'enfant peut avancer à son rythme, plus vite ou plus lentement que sa classe : c'est la maîtrise qui compte, pas l'âge.
      </p>
    </div>
  );
}

function BilansPage() {
  const children = useStore((s) => s.children);
  return <Bilans children={children} />;
}
