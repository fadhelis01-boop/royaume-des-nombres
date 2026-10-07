import { createRoot } from "react-dom/client";
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/andika/400.css";
import "@fontsource/andika/700.css";
import "katex/dist/katex.min.css";
import "./styles/app.css";
import App from "./App";
import { loadState } from "./lib/store";
import { loadContent } from "./lib/content";
import { requestPersistence } from "./lib/db";
import { registerServiceWorker } from "./lib/pwa";

createRoot(document.getElementById("root")!).render(<App />);

void loadState();
void loadContent();
void requestPersistence();
registerServiceWorker();
