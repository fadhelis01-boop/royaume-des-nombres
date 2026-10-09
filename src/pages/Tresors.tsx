import { useContent, worldProgress } from "../lib/content";
import { useChild } from "../lib/store";
import { BADGES, levelOf, TITLES, xpForLevel } from "../lib/rewards";
import { Bubble, Mascot } from "../components/Mascot";
import { Icone } from "../components/Icone";
import { HABITANTS_ALBUM } from "../lib/engagement";
import { visuel } from "../lib/img";

export function Tresors() {
  const child = useChild()!;
  const { worlds } = useContent();
  const lvl = levelOf(child.xp);
  const next = TITLES.find((t) => t.from > lvl.level);
  return (
    <div className="page">
      <h1>🏆 Mes trésors</h1>
      <div className="card level-card">
        <Mascot who={child.avatar} size={90} />
        <div>
          <div className="level-title">
            {lvl.emoji} Niveau {lvl.level} — {lvl.title}
          </div>
          <div className="wc-bar big">
            <span style={{ width: `${(lvl.cur / lvl.next) * 100}%` }} />
          </div>
          <small>
            {lvl.cur} / {lvl.next} points avant le niveau {lvl.level + 1}
            {next && ` · prochain titre au niveau ${next.from} : ${next.emoji} ${next.title}`}
          </small>
          <div className="row small">
            <span>⭐ {child.stars} étoiles</span>
            <span>🔥 {child.streak} j (record {child.bestStreak})</span>
            <span>✅ {child.counters.ok ?? 0} bonnes réponses</span>
          </div>
        </div>
      </div>

      <h2>🎖️ Badges ({child.badges.length}/{BADGES.length})</h2>
      <div className="badges">
        {BADGES.map((b) => {
          const got = child.badges.includes(b.id);
          return (
            <div key={b.id} className={`badge ${got ? "got" : ""}`} title={b.desc}>
              <span className="badge-emoji">{got ? <Icone cat="badges" id={b.id} emoji={b.emoji} size={56} /> : "❔"}</span>
              <strong>{b.titre}</strong>
              <small>{b.desc}</small>
            </div>
          );
        })}
      </div>

      <h2>🐾 Les habitants libérés ({(child.album ?? []).length}/{HABITANTS_ALBUM.length})</h2>
      <p className="small muted">À la moitié de chaque monde, un habitant est libéré du gris et rejoint ton album.</p>
      <div className="album habitants-album">
        {HABITANTS_ALBUM.map((h) => {
          const got = (child.album ?? []).includes(h.id);
          const src = visuel("habitants", h.id);
          return (
            <div key={h.id} className={`sticker ${got ? "got" : ""}`}>
              {src ? <img src={src} alt={got ? h.nom : "habitant encore gris"} width={64} height={64} className={got ? "" : "gris"} loading="lazy" /> : <span className="sticker-emoji">❔</span>}
              <small>{got ? h.nom : "???"}</small>
            </div>
          );
        })}
      </div>

      <h2>🗺️ L'album du Royaume</h2>
      <p className="small muted">Termine un monde pour coller son autocollant doré dans ton album !</p>
      <div className="album">
        {worlds.map((w) => {
          const p = worldProgress(child, w);
          const done = p.done === p.total;
          return (
            <div key={w.id} className={`sticker ${done ? "got" : p.done ? "half" : ""}`} style={{ "--wc": w.couleur } as React.CSSProperties}>
              <span className="sticker-emoji">{w.emoji}</span>
              <small>{w.titre}</small>
              <small className="muted">
                {p.done}/{p.total}
              </small>
            </div>
          );
        })}
      </div>
      <Bubble who="zero" text={`Tu as ${child.xp} points. ${child.xp >= 1000 ? "MILLE ! 😳" : `Encore ${xpForLevel(lvl.level) - child.xp} pour le prochain niveau !`}`} />
    </div>
  );
}
