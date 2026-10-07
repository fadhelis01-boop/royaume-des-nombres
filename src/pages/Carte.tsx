import { go } from "../lib/router";
import { CYCLES, lessonKey, nextLesson, useContent, worldProgress, worldUnlocked } from "../lib/content";
import { dayKey, dueCards, useChild, useStore } from "../lib/store";
import { Bubble, Mascot } from "../components/Mascot";
import type { World } from "../lib/types";

export function Carte() {
  const { worlds } = useContent();
  const child = useChild()!;
  const settings = useStore((s) => s.settings);
  const next = nextLesson(child, settings);
  // leçon commencée mais pas finie (reprise)
  const inProgress = Object.entries(child.progress)
    .filter(([, p]) => !p.done && p.step > 0)
    .sort((a, b) => b[1].lastAt - a[1].lastAt)[0];
  const resume = inProgress
    ? (() => {
        const [wid, lid] = inProgress[0].split("/");
        const w = worlds.find((x) => x.id === wid);
        const l = w?.lecons.find((x) => x.id === lid);
        return w && l ? { w, l } : null;
      })()
    : null;
  const due = dueCards(child).length;
  const dailyDone = child.daily?.day === dayKey() && child.daily.done;
  const greet = greeting(child.name, child.streak);

  return (
    <div className="page carte">
      <Bubble who={child.avatar} text={greet} />

      <div className="quick">
        {resume ? (
          <button className="quick-card primary" onClick={() => go(`/lecon/${resume.w.id}/${resume.l.id}`)}>
            <span className="qc-emoji">▶️</span>
            <span>
              <strong>Reprendre</strong>
              <small>
                {resume.w.emoji} {resume.l.titre}
              </small>
            </span>
          </button>
        ) : next ? (
          <button className="quick-card primary" onClick={() => go(`/lecon/${next.world.id}/${next.lesson.id}`)}>
            <span className="qc-emoji">🚀</span>
            <span>
              <strong>Continuer l'aventure</strong>
              <small>
                {next.world.emoji} {next.lesson.titre}
              </small>
            </span>
          </button>
        ) : null}
        <button className={`quick-card ${dailyDone ? "done" : ""}`} onClick={() => go("/defi-du-jour")}>
          <span className="qc-emoji">{dailyDone ? "✅" : "🎁"}</span>
          <span>
            <strong>Défi du jour</strong>
            <small>{dailyDone ? "Réussi ! Reviens demain" : "5 questions + 1 énigme"}</small>
          </span>
        </button>
        {worlds.some((w) => w.id === "ecole-des-astuces") && (
          <button className="quick-card" onClick={() => go("/monde/ecole-des-astuces")}>
            <span className="qc-emoji">💡</span>
            <span>
              <strong>École des Astuces</strong>
              <small>Méthodes et calcul rapide</small>
            </span>
          </button>
        )}
        <button className="quick-card" onClick={() => go("/revisions")}>
          <span className="qc-emoji">🔁</span>
          <span>
            <strong>Révisions</strong>
            <small>{due ? `${due} leçon${due > 1 ? "s" : ""} à revoir` : "Rien à revoir aujourd'hui"}</small>
          </span>
        </button>
      </div>

      {(Object.keys(CYCLES) as World["cycle"][]).map((cy) => {
        const ws = worlds.filter((w) => w.cycle === cy);
        if (!ws.length) return null;
        return (
          <section key={cy} className={`cycle cycle-${cy}`}>
            <h2 className="cycle-title">
              <span>{CYCLES[cy].emoji}</span> {CYCLES[cy].titre}
              <small>{CYCLES[cy].sous}</small>
            </h2>
            <div className="path">
              {ws.map((w, i) => (
                <WorldCard key={w.id} w={w} side={i % 2 ? "right" : "left"} />
              ))}
            </div>
          </section>
        );
      })}
      <div className="center muted small" style={{ marginTop: 24 }}>
        <button className="link" onClick={() => go("/livre")}>
          📖 Le Grand Livre des maths
        </button>{" "}
        ·{" "}
        <button className="link" onClick={() => go("/inventer")}>
          ✍️ Inventer un problème
        </button>{" "}
        ·{" "}
        <button className="link" onClick={() => go("/diagnostic")}>
          🧭 Test de niveau
        </button>
      </div>
    </div>
  );
}

function WorldCard({ w, side }: { w: World; side: "left" | "right" }) {
  const child = useChild()!;
  const { worlds } = useContent();
  const settings = useStore((s) => s.settings);
  const unlocked = worldUnlocked(child, w, worlds, settings);
  const pr = worldProgress(child, w);
  const missing = w.prerequis.map((id) => worlds.find((x) => x.id === id)).filter((p): p is World => !!p && worldProgress(child, p).ratio < 0.5 && !child.validatedWorlds.includes(p.id));
  const complete = pr.done === pr.total;
  const started = w.lecons.some((l) => child.progress[lessonKey(w, l.id)]);
  return (
    <button
      className={`world-card ${side} ${unlocked ? "" : "locked"} ${complete ? "complete" : ""}`}
      style={{ "--wc": w.couleur } as React.CSSProperties}
      onClick={() => unlocked && go(`/monde/${w.id}`)}
      aria-disabled={!unlocked}
    >
      <div className="wc-art" style={w.decor ? { backgroundImage: `url(${w.decor})` } : undefined}>
        <span className="wc-emoji">{unlocked ? w.emoji : "🔒"}</span>
        {complete && <span className="wc-crown">👑</span>}
      </div>
      <div className="wc-body">
        <strong>{w.titre}</strong>
        <small>
          {w.niveau} · {w.age}
        </small>
        {unlocked ? (
          <>
            <div className="wc-bar">
              <span style={{ width: `${pr.ratio * 100}%` }} />
            </div>
            <small>
              {pr.done}/{pr.total} leçons · ⭐ {pr.stars}/{pr.maxStars}
              {!started && " · Nouveau !"}
            </small>
          </>
        ) : (
          <small className="lock-why">Pour ouvrir : termine la moitié de {missing.map((m) => `${m.emoji} ${m.titre}`).join(" et ") || "la zone précédente"}.</small>
        )}
      </div>
      {!unlocked && <Mascot who="zero" size={34} className="wc-zero" />}
    </button>
  );
}

function greeting(name: string, streak: number) {
  const h = new Date().getHours();
  const hello = h < 12 ? "Bonjour" : h < 18 ? "Coucou" : "Bonsoir";
  if (streak >= 2) return `${hello} ${name} ! Tu es venu·e ${streak} jours de suite, ton cerveau est en pleine forme ! 🔥 On continue ?`;
  return `${hello} ${name} ! Où veux-tu aller aujourd'hui dans le Royaume des Nombres ?`;
}
