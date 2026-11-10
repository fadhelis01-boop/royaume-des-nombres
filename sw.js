/* Royaume des Nombres — service worker : hors connexion + mises à jour.
   La constante VERSION est remplacée à chaque compilation : toute nouvelle version
   publiée est ainsi détectée par les appareils. */
const VERSION = "2026-11-10T16:15:48.387Z";
const APP_CACHE = "royaume-app-" + VERSION;
const CONTENT_CACHE = "royaume-content";
const IMG_CACHE = "royaume-images";
// liste injectée à la compilation (vite.config.ts) : tout le code, pages à la demande comprises
const ASSETS = ["./assets/ai-6XqNXn-d.js","./assets/ai-config-Da1QJtfs.js","./assets/Aide-DLkAKhvq.js","./assets/andika-latin-400-normal-BTFTIZb-.woff2","./assets/andika-latin-700-normal-Dk95f5lc.woff2","./assets/Autrement-Bu0CYLn9.js","./assets/Aventure-B42QjWNP.js","./assets/Boutique-uCq1Jq0d.js","./assets/CalculEclair-C3LePrLv.js","./assets/CarteTalents-NzsCI8Vn.js","./assets/CompteEstBon-D4IoTp-q.js","./assets/content-CyQur3rx.js","./assets/CourseGrenouille-B30WGbUk.js","./assets/DefenseTables-A924zlUl.js","./assets/DefiAmi-Cfeug7fv.js","./assets/DefiDuJour-DqMYjrJc.js","./assets/Demander-UthL25nK.js","./assets/Diagnostic-BSBwgbHA.js","./assets/Dico-B2QyGaVW.js","./assets/Diplome-BGV4CJ5P.js","./assets/Duel-oASIHoJ4.js","./assets/Enigmes-D8R7kFQq.js","./assets/error-BTdmRKoB.js","./assets/Fluence-DHZ4Q_D0.js","./assets/fredoka-latin-500-normal-B0JifZgm.woff2","./assets/fredoka-latin-600-normal-C4zohCW5.woff2","./assets/Galaxie-BB2VAknC.js","./assets/GrandLivre-DlqgLIgD.js","./assets/Icone-B8kwcpol.js","./assets/index-DpGIVFNF.js","./assets/index-Gmey9CV5.css","./assets/Inventer-03z5mhcU.js","./assets/Jeux-O7DXJdKh.js","./assets/JeuxMecaniques-3-_PeKwC.js","./assets/JeuxMots-CD7wML_f.js","./assets/JeuxPlanetes-B28dxDhl.js","./assets/juice-BVBbFT7L.js","./assets/Keypad-Bp_MzBLD.js","./assets/Mascot-Wsm7pob3.js","./assets/musique-CKMNDqOv.js","./assets/node.browser-hdeLe7Il.js","./assets/node.browser-HQ5SKBOf.js","./assets/opendyslexic-latin-400-normal-nUhe5EwG.woff2","./assets/parcours-BLXuGd9T.js","./assets/Parcours-BqO3Fv6U.js","./assets/Parents-BOUDPfVU.js","./assets/PontFractions-vxf0pQgB.js","./assets/Revisions-7zn6f00w.js","./assets/store-DTTvVXr-.js","./assets/Studios-CA83PpNF.js","./assets/Tables-CVp7LRwW.js","./assets/Tresors-FXL_aX7K.js","./assets/ViseJuste-Kt9XQkt4.js","./assets/Visuel-CHTytxQV.js","./assets/visuels-CCtZHTMY.js"];
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/apple-touch-icon.png", "./img/mascottes/mia.webp", "./img/mascottes/mia-reflexion.webp", "./img/mascottes/neo.webp", "./img/mascottes/zero.webp", "./content/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      await cache.addAll(CORE);
      // Pré-cache des fichiers JS/CSS référencés par index.html
      try {
        const html = await (await fetch("./index.html", { cache: "reload" })).text();
        const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
        await cache.addAll([...new Set([...assets, ...ASSETS])]);
        // Toutes les leçons, pour fonctionner hors connexion dès l'installation
        const m = await (await fetch("./content/manifest.json", { cache: "reload" })).json();
        const content = await caches.open(CONTENT_CACHE);
        await content.addAll([...m.worlds.map((w) => "./content/" + w.file), "./content/dictionnaire.json"]);
      } catch (e) {
        /* hors ligne pendant l'installation */
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith("royaume-app-") && k !== APP_CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skip-waiting") self.skipWaiting();
});

async function networkFirst(req, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(fallbackUrl ?? req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(fallbackUrl ?? req)) || (await caches.match(req)) || Response.error();
  }
}

async function cacheFirst(req, cacheName) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(cacheName)).put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req, { ignoreSearch: false });
  const net = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit || Response.error());
  return hit || net;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API Claude, sources : jamais mis en cache
  if (url.pathname.includes("/img/")) {
    event.respondWith(cacheFirst(req, IMG_CACHE));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, APP_CACHE, "./index.html"));
    return;
  }
  if (url.pathname.includes("/assets/")) {
    event.respondWith(cacheFirst(req, APP_CACHE));
    return;
  }
  if (url.pathname.includes("/content/")) {
    // « Vérifier les mises à jour » demande explicitement la version réseau
    if (req.cache === "no-cache" || req.cache === "reload") event.respondWith(networkFirst(req, CONTENT_CACHE));
    else event.respondWith(staleWhileRevalidate(req, CONTENT_CACHE));
    return;
  }
  event.respondWith(staleWhileRevalidate(req, APP_CACHE));
});
