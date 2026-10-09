import { createRoot } from "react-dom/client";
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/andika/400.css";
import "@fontsource/andika/700.css";
import "@fontsource/opendyslexic/400.css";
import "katex/dist/katex.min.css";
import "./styles/app.css";
import "./styles/ambiance.css";
import App from "./App";
import { loadState, onPersist } from "./lib/store";
import { apresEnregistrement, reprendreSynchro } from "./lib/sauvegarde";
import { loadContent } from "./lib/content";
import { requestPersistence } from "./lib/db";
import { registerServiceWorker } from "./lib/pwa";

createRoot(document.getElementById("root")!).render(<App />);

// sauvegardes automatiques (instantané du jour, fichier synchronisé), puis reprise de la synchro
onPersist(apresEnregistrement);
void loadState().then(reprendreSynchro);

void loadContent();
void requestPersistence();
registerServiceWorker();
