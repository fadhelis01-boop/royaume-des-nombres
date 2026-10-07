import { useEffect, useState } from "react";
import { useRoute, go } from "./lib/router";
import { useStore, useChild, setState, tickMinute, minutesToday } from "./lib/store";
import { useContent } from "./lib/content";
import { usePwa, applyUpdate } from "./lib/pwa";
import { levelOf } from "./lib/rewards";
import { stopSpeaking } from "./lib/tts";
import { Mascot } from "./components/Mascot";
import { Confetti } from "./components/Confetti";
import { Accueil, NouvelEnfant } from "./pages/Accueil";
import { Carte } from "./pages/Carte";
import { Monde } from "./pages/Monde";
import { LeconPage } from "./pages/Lecon";
import { DefiPage } from "./pages/Defi";
import { Revisions } from "./pages/Revisions";
import { Jeux } from "./pages/Jeux";
import { CalculEclair } from "./pages/jeux/CalculEclair";
import { CompteEstBon } from "./pages/jeux/CompteEstBon";
import { ViseJuste } from "./pages/jeux/ViseJuste";
import { Tables } from "./pages/jeux/Tables";
import { Enigmes } from "./pages/jeux/Enigmes";
import { DefiDuJour } from "./pages/DefiDuJour";
import { Demander } from "./pages/Demander";
import { GrandLivre } from "./pages/GrandLivre";
import { Tresors } from "./pages/Tresors";
import { Diagnostic } from "./pages/Diagnostic";
import { Inventer } from "./pages/Inventer";
import { Parents } from "./pages/Parents";
import { Aide } from "./pages/Aide";

const NAV = [
  { path: "/", icon: "🗺️", label: "Carte" },
  { path: "/jeux", icon: "🎮", label: "Jeux" },
  { path: "/revisions", icon: "🔁", label: "Révisions" },
  { path: "/demander", icon: "❓", label: "Demander" },
  { path: "/tresors", icon: "🏆", label: "Trésors" },
];

export default function App() {
  const ready = useStore((s) => s.ready);
  const route = useRoute();
  const child = useChild();
  const content = useContent();
  const toast = useStore((s) => s.toast);
  const celebration = useStore((s) => s.celebration);
  const settings = useStore((s) => s.settings);
  const parentUnlocked = useStore((s) => s.parentUnlocked);
  const pwa = usePwa();
  const [lastInput, setLastInput] = useState(Date.now());

  // Changement de page : on arrête la voix et on remonte en haut.
  useEffect(() => {
    stopSpeaking();
    window.scrollTo(0, 0);
  }, [route.path]);

  // Temps d'apprentissage réel (onglet visible + activité dans les 2 dernières minutes)
  useEffect(() => {
    const on = () => setLastInput(Date.now());
    window.addEventListener("pointerdown", on);
    window.addEventListener("keydown", on);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastInputRef.v < 120000) tickMinute();
    }, 60000);
    return () => {
      window.removeEventListener("pointerdown", on);
      window.removeEventListener("keydown", on);
      clearInterval(id);
    };
  }, []);
  lastInputRef.v = lastInput;

  if (!ready || !content.ready)
    return (
      <div className="splash">
        <Mascot who="zero" size={140} talking />
        <p>Zéro prépare le Royaume…</p>
      </div>
    );
  if (content.error && !content.worlds.length)
    return (
      <div className="splash">
        <Mascot who="neo" size={120} />
        <p>Impossible de charger les leçons ({content.error}). Vérifie la connexion internet puis recharge la page.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          Recharger
        </button>
      </div>
    );

  const p = route.parts;
  const isParents = p[0] === "parents" || p[0] === "aide";
  const needsChild = !isParents && p[0] !== "nouveau" && p[0] !== "profils";
  let page: React.ReactNode;
  if (needsChild && !child) page = <Accueil />;
  else
    switch (p[0]) {
      case undefined:
        page = <Carte />;
        break;
      case "profils":
        page = <Accueil />;
        break;
      case "nouveau":
        page = <NouvelEnfant />;
        break;
      case "monde":
        page = <Monde id={p[1]} />;
        break;
      case "lecon":
        page = <LeconPage worldId={p[1]} lessonId={p[2]} restart={route.query.get("debut") === "1"} />;
        break;
      case "defi":
        page = <DefiPage worldId={p[1]} lessonId={p[2]} />;
        break;
      case "revisions":
        page = <Revisions />;
        break;
      case "jeux":
        page =
          p[1] === "eclair" ? <CalculEclair /> : p[1] === "compte" ? <CompteEstBon /> : p[1] === "vise" ? <ViseJuste /> : p[1] === "tables" ? <Tables /> : p[1] === "enigmes" ? <Enigmes /> : <Jeux />;
        break;
      case "defi-du-jour":
        page = <DefiDuJour />;
        break;
      case "demander":
        page = <Demander />;
        break;
      case "livre":
        page = <GrandLivre />;
        break;
      case "tresors":
        page = <Tresors />;
        break;
      case "diagnostic":
        page = <Diagnostic />;
        break;
      case "inventer":
        page = <Inventer />;
        break;
      case "parents":
        page = <Parents tab={p[1]} />;
        break;
      case "aide":
        page = <Aide />;
        break;
      default:
        page = <Carte />;
    }

  const lvl = child ? levelOf(child.xp) : null;
  const overLimit = !!child && settings.dailyLimit > 0 && minutesToday(child) >= settings.dailyLimit && !isParents && !parentUnlocked;
  const immersive = p[0] === "lecon" || p[0] === "defi" || (p[0] === "jeux" && !!p[1]) || p[0] === "diagnostic" || p[0] === "defi-du-jour";

  return (
    <div className={`app ${immersive ? "immersive" : ""}`}>
      {pwa.updateReady && (
        <div className="update-banner">
          ✨ Une nouvelle version du Royaume est prête !
          <button className="btn btn-small" onClick={applyUpdate}>
            Mettre à jour
          </button>
        </div>
      )}
      <header className="topbar">
        {child && !isParents ? (
          <>
            <button className="tb-child" onClick={() => go("/profils")} aria-label="Changer d'enfant">
              <Mascot who={child.avatar} size={40} />
              <span className="tb-name">{child.name}</span>
            </button>
            <div className="tb-level" title={`${lvl!.title} — ${lvl!.cur} / ${lvl!.next} points`}>
              <span className="tb-lvl-badge">
                {lvl!.emoji} {lvl!.level}
              </span>
              <span className="tb-bar">
                <span style={{ width: `${Math.min(100, (lvl!.cur / lvl!.next) * 100)}%` }} />
              </span>
            </div>
            <span className="tb-stat" title="étoiles">
              ⭐ {child.stars}
            </span>
            <span className="tb-stat" title="jours d'affilée">
              🔥 {child.streak}
            </span>
          </>
        ) : (
          <button className="tb-brand" onClick={() => go("/")}>
            <img src="icons/icon-192.png" alt="" width={34} height={34} /> Royaume des Nombres
          </button>
        )}
        <button className="tb-parent" onClick={() => go(isParents ? "/" : "/parents")} aria-label={isParents ? "Retour aux enfants" : "Espace parents"} title={isParents ? "Retour" : "Espace parents"}>
          {isParents ? "🏠" : "🔒"}
        </button>
      </header>

      <main className="main">{overLimit ? <PauseOverlay limit={settings.dailyLimit} /> : page}</main>

      {child && !isParents && !immersive && (
        <nav className="bottomnav">
          {NAV.map((n) => {
            const active = n.path === "/" ? !p[0] || p[0] === "monde" : route.path.startsWith(n.path);
            return (
              <button key={n.path} className={active ? "active" : ""} onClick={() => go(n.path)}>
                <span className="bn-icon">{n.icon}</span>
                <span className="bn-label">{n.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast.emoji && <span className="toast-emoji">{toast.emoji}</span>}
          {toast.text}
        </div>
      )}
      {celebration && (
        <div className="celebration" role="dialog" aria-modal onClick={() => setState({ celebration: null }, false)}>
          {!settings.reduceMotion && <Confetti />}
          <div className="celebration-card" onClick={(e) => e.stopPropagation()}>
            <div className="celebration-emoji">{celebration.emoji}</div>
            <h2>{celebration.title}</h2>
            <p>{celebration.text}</p>
            <div className="celebration-trio">
              <Mascot who="mia" size={70} talking />
              <Mascot who="zero" size={64} talking />
              <Mascot who="neo" size={70} talking />
            </div>
            <button className="btn btn-primary" onClick={() => setState({ celebration: null }, false)} autoFocus>
              Youpi ! ➜
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const lastInputRef = { v: Date.now() };

function PauseOverlay({ limit }: { limit: number }) {
  return (
    <div className="pause card center">
      <Mascot who="zero" size={130} />
      <h2>C'est l'heure de la pause !</h2>
      <p>
        Tu as bien travaillé aujourd'hui ({limit} minutes). Ton cerveau range tout ce que tu as appris pendant que tu joues dehors, que tu lis ou que tu dors. 😴
      </p>
      <p className="muted">À demain dans le Royaume des Nombres ! (Un adulte peut prolonger dans l'Espace parents.)</p>
      <button className="btn btn-soft" onClick={() => go("/parents")}>
        🔒 Espace parents
      </button>
    </div>
  );
}
