import { useSyncExternalStore } from "react";

// Routage par fragment (#/…) : fonctionne hors connexion et sur
// n'importe quel hébergement statique, sans configuration serveur.

function current() {
  const h = location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = h.split("?");
  return { path, parts: path.split("/").filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(query) };
}

let snap = current();
let snapKey = location.hash;
window.addEventListener("hashchange", () => {
  snap = current();
  snapKey = location.hash;
  listeners.forEach((l) => l());
});
const listeners = new Set<() => void>();

export function useRoute() {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapKey,
  );
  return snap;
}

export function go(path: string) {
  location.hash = path.startsWith("#") ? path : "#" + path;
}

export const href = (path: string) => "#" + path;
