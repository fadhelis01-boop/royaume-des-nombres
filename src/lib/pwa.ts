import { useSyncExternalStore } from "react";

// Service worker : fonctionnement hors connexion + détection des
// nouvelles versions de l'application.

let waiting: ServiceWorker | null = null;
let installEvent: (Event & { prompt: () => Promise<void> }) | null = null;
const listeners = new Set<() => void>();
let version = 0;
const bump = () => {
  version++;
  listeners.forEach((l) => l());
};

export function usePwa() {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
  );
  return { updateReady: !!waiting, canInstall: !!installEvent };
}

export function registerServiceWorker() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e as typeof installEvent;
    bump();
  });
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
  navigator.serviceWorker
    .register("./sw.js")
    .then((reg) => {
      const track = (w: ServiceWorker | null) => {
        if (!w) return;
        w.addEventListener("statechange", () => {
          if (w.state === "installed" && navigator.serviceWorker.controller) {
            waiting = w;
            bump();
          }
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) {
        waiting = reg.waiting;
        bump();
      }
      reg.addEventListener("updatefound", () => track(reg.installing));
      // Vérifie une nouvelle version à chaque retour sur l'app
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void reg.update();
      });
    })
    .catch(() => undefined);
  // Rechargement seulement lors d'une mise à jour (pas à la toute première installation)
  let reloaded = !navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}

export function applyUpdate() {
  waiting?.postMessage("skip-waiting");
}

export async function promptInstall() {
  if (!installEvent) return;
  await installEvent.prompt();
  installEvent = null;
  bump();
}

export async function checkForAppUpdate(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  await reg.update();
  return !!reg.waiting || !!reg.installing;
}

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
