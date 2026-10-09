/* Royaume des Nombres — service worker : hors connexion + mises à jour.
   La constante VERSION est remplacée à chaque compilation : toute nouvelle version
   publiée est ainsi détectée par les appareils. */
const VERSION = "2026-10-09T21:16:28.533Z";
const APP_CACHE = "royaume-app-" + VERSION;
const CONTENT_CACHE = "royaume-content";
const IMG_CACHE = "royaume-images";
// liste injectée à la compilation (vite.config.ts) : tout le code, pages à la demande comprises
const ASSETS = ["./assets/ai-config-CNxrTQL3.js","./assets/ai-CzEHqbZY.js","./assets/Aide-BEevnWBM.js","./assets/andika-latin-400-normal-BTFTIZb-.woff2","./assets/andika-latin-700-normal-Dk95f5lc.woff2","./assets/Autrement-CBstb73W.js","./assets/Aventure-DLw8Gq2F.js","./assets/Boutique-BpC91jUF.js","./assets/CalculEclair-DwgPVZC0.js","./assets/CarteTalents-BbRjrWxf.js","./assets/CompteEstBon-BF1B9Jlg.js","./assets/conjugaison-BCSGCqgD.js","./assets/content-rDgdiyT0.js","./assets/CourseGrenouille-BCkl8hF6.js","./assets/DefenseTables-BJIYL-nj.js","./assets/DefiAmi-BMkTE-Dc.js","./assets/DefiDuJour-DyE0-jvi.js","./assets/Demander-BrpoxpMj.js","./assets/Diagnostic-sRdybab_.js","./assets/Dico-DA2m1KBa.js","./assets/Diplome-D9wK91GI.js","./assets/Duel-SQkz20Oi.js","./assets/Enigmes-DsUyFgZC.js","./assets/error-BTdmRKoB.js","./assets/expr-BWpGbrBC.js","./assets/Fluence-Jav6ZlDv.js","./assets/fredoka-latin-500-normal-B0JifZgm.woff2","./assets/fredoka-latin-600-normal-C4zohCW5.woff2","./assets/Galaxie-BY597vpR.js","./assets/GrandLivre-CVAo1huC.js","./assets/Icone-Db00PM41.js","./assets/index-DTd3jd_f.css","./assets/index-HkQpkUEa.js","./assets/Inventer-BPgU4w2E.js","./assets/Jeux-Ml45NEWr.js","./assets/JeuxMecaniques-BdGcoL6w.js","./assets/JeuxMots-DkzbH9Op.js","./assets/JeuxPlanetes-DwDE6PUp.js","./assets/juice-D8INBIyo.js","./assets/Keypad-D4IkKfDE.js","./assets/Mascot-CBBoqBTv.js","./assets/morpho-BSc1rrRh.js","./assets/musique-CKMNDqOv.js","./assets/node.browser-DhXyw_xU.js","./assets/node.browser-HQ5SKBOf.js","./assets/opendyslexic-latin-400-normal-nUhe5EwG.woff2","./assets/Parcours-BNFk2Ai7.js","./assets/Parents-Pz4gfVOy.js","./assets/PontFractions-P9vtDSXa.js","./assets/Revisions-Dpo-nelb.js","./assets/store-C_Ch8sd5.js","./assets/Studios-BIIUhxQ1.js","./assets/Tables-AJ7uzkjI.js","./assets/Tresors-Dax40fPo.js","./assets/ViseJuste-Dbaeo7R3.js","./assets/Visuel-BnD82aZb.js","./assets/visuels-BtkhQdre.js"];
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
