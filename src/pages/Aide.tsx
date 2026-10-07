import { go } from "../lib/router";
import { Bubble } from "../components/Mascot";

export function Aide() {
  return (
    <div className="page narrow">
      <h1>❔ Aide</h1>
      <Bubble who="neo" text="Voici comment marche le Royaume. Si tu bloques, demande à un adulte de lire cette page avec toi !" />
      <div className="card">
        <h3>Pour les enfants</h3>
        <ul>
          <li>🗺️ <strong>La carte</strong> : chaque île est un monde des maths. Les mondes s'ouvrent au fur et à mesure.</li>
          <li>📖 <strong>Une leçon</strong> : écoute Mia, Néo et Zéro, regarde les dessins, réponds aux questions. Tu peux arrêter quand tu veux : l'application se souvient où tu en es (« Reprendre »), ou tu peux recommencer depuis le début.</li>
          <li>🎧 <strong>Le casque</strong> en haut de la leçon : la leçon se lit toute seule et avance toute seule.</li>
          <li>🔊 <strong>Le haut-parleur</strong> : fait lire une question ou une bulle. Touche un personnage pour l'entendre.</li>
          <li>⭐ <strong>Le défi</strong> : à la fin de chaque leçon. 1 étoile = leçon validée, 3 étoiles = maîtrisée !</li>
          <li>🔁 <strong>Les révisions</strong> : les leçons reviennent au bon moment pour ne jamais les oublier.</li>
          <li>🎮 <strong>Les jeux</strong> et ❓ <strong>Demande à Mia</strong> : pour s'entraîner et poser tes questions (tu peux aussi parler avec le micro 🎤).</li>
        </ul>
      </div>
      <div className="card">
        <h3>Pour les adultes</h3>
        <ul>
          <li>L'Espace parents (🔒 en haut à droite) est protégé par un code : suivi des progrès, réglages des voix, limite de temps, assistant IA, ajout de domaines, sauvegarde.</li>
          <li>Tout fonctionne sur ordinateur, tablette et téléphone (iPhone compris), et hors connexion une fois l'application installée.</li>
          <li>Aucune publicité, aucun compte, aucune donnée envoyée : la progression reste sur l'appareil (pensez à la sauvegarder).</li>
          <li>Les voix sont celles de l'appareil : sur iPhone, les voix « améliorées » se téléchargent dans Réglages → Accessibilité → Contenu énoncé → Voix.</li>
        </ul>
      </div>
      <button className="btn btn-primary" onClick={() => go("/")}>
        Retour
      </button>
    </div>
  );
}
