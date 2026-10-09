import { lazy, Suspense, useEffect, useState } from "react";
import { useRoute, go } from "./lib/router";
import { useStore, useChild, setState, tickMinute, minutesToday } from "./lib/store";
import { useContent } from "./lib/content";
import { usePwa, applyUpdate } from "./lib/pwa";
import { levelOf } from "./lib/rewards";
import { stopSpeaking } from "./lib/tts";
import { setMusicKey, startMusic, stopMusic } from "./lib/music";
import { Mascot } from "./components/Mascot";
import { Confetti } from "./components/Confetti";
import { Accueil, NouvelEnfant } from "./pages/Accueil";
import { Carte } from "./pages/Carte";
import { Monde } from "./pages/Monde";
import { LeconPage } from "./pages/Lecon";
import { DefiPage } from "./pages/Defi";
import { Echauffement } from "./pages/Echauffement";
import { Avatar } from "./components/Avatar";
import { FinDeSeance } from "./components/Seance";
import { ComboBadge } from "./components/ComboBadge";

const CalculEclair = lazy(() => import("./pages/jeux/CalculEclair").then((m) => ({ default: m.CalculEclair })));
const CompteEstBon = lazy(() => import("./pages/jeux/CompteEstBon").then((m) => ({ default: m.CompteEstBon })));
const ViseJuste = lazy(() => import("./pages/jeux/ViseJuste").then((m) => ({ default: m.ViseJuste })));
const Tables = lazy(() => import("./pages/jeux/Tables").then((m) => ({ default: m.Tables })));
const Enigmes = lazy(() => import("./pages/jeux/Enigmes").then((m) => ({ default: m.Enigmes })));
const Demander = lazy(() => import("./pages/Demander").then((m) => ({ default: m.Demander })));
const Fluence = lazy(() => import("./pages/Fluence").then((m) => ({ default: m.Fluence })));
const GrandLivre = lazy(() => import("./pages/GrandLivre").then((m) => ({ default: m.GrandLivre })));
const Tresors = lazy(() => import("./pages/Tresors").then((m) => ({ default: m.Tresors })));
const Diagnostic = lazy(() => import("./pages/Diagnostic").then((m) => ({ default: m.Diagnostic })));
const Inventer = lazy(() => import("./pages/Inventer").then((m) => ({ default: m.Inventer })));
const Parents = lazy(() => import("./pages/Parents").then((m) => ({ default: m.Parents })));
const Aide = lazy(() => import("./pages/Aide").then((m) => ({ default: m.Aide })));
const Aventure = lazy(() => import("./pages/Aventure").then((m) => ({ default: m.Aventure })));
const Gardien = lazy(() => import("./pages/Gardien").then((m) => ({ default: m.Gardien })));
const Diplome = lazy(() => import("./pages/Diplome").then((m) => ({ default: m.Diplome })));
const DefiDuJour = lazy(() => import("./pages/DefiDuJour").then((m) => ({ default: m.DefiDuJour })));
const Revisions = lazy(() => import("./pages/Revisions").then((m) => ({ default: m.Revisions })));
const Jeux = lazy(() => import("./pages/Jeux").then((m) => ({ default: m.Jeux })));
const Dico = lazy(() => import("./pages/Dico").then((m) => ({ default: m.Dico })));
const Boutique = lazy(() => import("./pages/Boutique").then((m) => ({ default: m.Boutique })));
const DefenseTables = lazy(() => import("./pages/jeux/DefenseTables").then((m) => ({ default: m.DefenseTables })));
const PontFractions = lazy(() => import("./pages/jeux/PontFractions").then((m) => ({ default: m.PontFractions })));
const CourseGrenouille = lazy(() => import("./pages/jeux/CourseGrenouille").then((m) => ({ default: m.CourseGrenouille })));
const ConjugaisonEclair = lazy(() => import("./pages/jeux/JeuxMots").then((m) => ({ default: m.ConjugaisonEclair })));
const MotMystere = lazy(() => import("./pages/jeux/JeuxMots").then((m) => ({ default: m.MotMystere })));
const DicteeFlash = lazy(() => import("./pages/jeux/JeuxMots").then((m) => ({ default: m.DicteeFlash })));
const QuizEclair = lazy(() => import("./pages/jeux/JeuxSavoirs").then((m) => ({ default: m.QuizEclair })));
const OreilleDor = lazy(() => import("./pages/jeux/JeuxSavoirs").then((m) => ({ default: m.OreilleDor })));
const StudioMusique = lazy(() => import("./pages/Studios").then((m) => ({ default: m.StudioMusique })));
const StudioDessin = lazy(() => import("./pages/Studios").then((m) => ({ default: m.StudioDessin })));
const GalerieDessins = lazy(() => import("./pages/Studios").then((m) => ({ default: m.Galerie })));
const Galaxie = lazy(() => import("./pages/Galaxie").then((m) => ({ default: m.Galaxie })));
const Duel = lazy(() => import("./pages/jeux/Duel").then((m) => ({ default: m.Duel })));
const JP = (n: "JeuPotions" | "JeuChaine" | "JeuCircuit" | "JeuPlanetes" | "JeuSilhouettes" | "JeuRythme") => lazy(() => import("./pages/jeux/JeuxPlanetes").then((m) => ({ default: m[n] })));
const JeuPotions = JP("JeuPotions");
const JeuChaine = JP("JeuChaine");
const JeuCircuit = JP("JeuCircuit");
const JeuPlanetes = JP("JeuPlanetes");
const JeuSilhouettes = JP("JeuSilhouettes");
const JeuRythme = JP("JeuRythme");
const JM = (n: "JeuBalance" | "JeuBus" | "JeuFabrique") => lazy(() => import("./pages/jeux/JeuxMecaniques").then((m) => ({ default: m[n] })));
const JeuBalance = JM("JeuBalance");
const JeuBus = JM("JeuBus");
const JeuFabrique = JM("JeuFabrique");
const DefiAmi = lazy(() => import("./pages/jeux/DefiAmi").then((m) => ({ default: m.DefiAmi })));

const NAV = [
  { path: "/galaxie", icon: "🌌", label: "Galaxie" },
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

  // Musique d'ambiance (option) : une tonalité par monde, coupée quand l'app est cachée.
  useEffect(() => {
    if (!settings.music || !child) {
      stopMusic();
      return;
    }
    setMusicKey(route.parts[1] ?? "carte");
    startMusic();
    const vis = () => (document.visibilityState === "visible" ? startMusic() : stopMusic());
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [settings.music, child?.id, route.parts[1]]);

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
      case "galaxie":
        page = <Galaxie />;
        break;
      case "studio":
        page = p[1] === "musique" ? <StudioMusique /> : p[2] === "galerie" ? <GalerieDessins /> : <StudioDessin />;
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
          p[1] === "eclair" ? <CalculEclair /> : p[1] === "compte" ? <CompteEstBon /> : p[1] === "vise" ? <ViseJuste /> : p[1] === "tables" ? <Tables /> : p[1] === "additions" ? <Tables initialOp="+" /> : p[1] === "enigmes" ? <Enigmes /> : p[1] === "defense" ? <DefenseTables /> : p[1] === "pont" ? <PontFractions /> : p[1] === "course" ? <CourseGrenouille /> : p[1] === "duel" ? <Duel /> : p[1] === "conjugaison" ? <ConjugaisonEclair /> : p[1] === "mystere" ? <MotMystere /> : p[1] === "flash" ? <DicteeFlash /> : p[1] === "eclair-sciences" ? <QuizEclair /> : p[1] === "oreille" ? <OreilleDor /> : p[1] === "studio-musique" ? <StudioMusique /> : p[1] === "studio-dessin" ? <StudioDessin /> : p[1] === "potions" ? <JeuPotions /> : p[1] === "chaine" ? <JeuChaine /> : p[1] === "circuit" ? <JeuCircuit /> : p[1] === "planetes" ? <JeuPlanetes /> : p[1] === "silhouettes" ? <JeuSilhouettes /> : p[1] === "rythme" ? <JeuRythme /> : p[1] === "balance" ? <JeuBalance /> : p[1] === "bus" ? <JeuBus /> : p[1] === "fabrique" ? <JeuFabrique /> : p[1] === "ami" ? <DefiAmi /> :

 <Jeux />;
        break;
      case "aventure":
        page = <Aventure part={p[1]} />;
        break;
      case "gardien":
        page = <Gardien worldId={p[1]} />;
        break;
      case "diplome":
        page = <Diplome worldId={p[1]} />;
        break;
      case "echauffement":
        page = <Echauffement />;
        break;
      case "defi-du-jour":
        page = <DefiDuJour />;
        break;
      case "demander":
        page = <Demander />;
        break;
      case "fluence":
        page = <Fluence />;
        break;
      case "livre":
        page = <GrandLivre />;
        break;
      case "tresors":
        page = <Tresors />;
        break;
      case "dico":
        page = <Dico mot={p[1]} />;
        break;
      case "boutique":
        page = <Boutique tab={p[1]} />;
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
  const immersive = p[0] === "lecon" || p[0] === "defi" || (p[0] === "jeux" && !!p[1]) || p[0] === "diagnostic" || p[0] === "defi-du-jour" || p[0] === "gardien" || p[0] === "echauffement" || p[0] === "fluence" ||
 p[1] === "prologue";

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
              <Avatar child={child} size={40} showCompanion={false} />
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
            <button className="tb-stat tb-gems" title="gemmes : ouvrir la boutique" onClick={() => go("/boutique")}>
              💎 {child.gems ?? 0}
            </button>
            <span className="tb-stat" title="étoiles">
              ⭐ {child.stars}
            </span>
            <span className="tb-stat" title="jours d'affilée">
              📅 {child.streak}
            </span>
            <ComboBadge />
          </>
        ) : (
          <button className="tb-brand" onClick={() => go("/")}>
            <img src="icons/icon-192.png" alt="" width={34} height={34} /> Galaxie des Savoirs
          </button>
        )}
        <button className="tb-parent" onClick={() => go(isParents ? "/" : "/parents")} aria-label={isParents ? "Retour aux enfants" : "Espace parents"} title={isParents ? "Retour" : "Espace parents"}>
          {isParents ? "🏠" : "🔒"}
        </button>
      </header>

      <main className="main">
        <Suspense
          fallback={
            <div className="splash small">
              <Mascot who="zero" size={80} talking />
            </div>
          }
        >
          {overLimit ? <PauseOverlay limit={settings.dailyLimit} /> : page}
        </Suspense>
      </main>
      {child && !isParents && !celebration && <FinDeSeance />}

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
      <p className="muted">À demain dans la Galaxie des Savoirs ! (Un adulte peut prolonger dans l'Espace parents.)</p>
      <button className="btn btn-soft" onClick={() => go("/parents")}>
        🔒 Espace parents
      </button>
    </div>
  );
}
