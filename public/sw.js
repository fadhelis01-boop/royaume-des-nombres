/* Royaume des Nombres — service worker : hors connexion + mises à jour.
   La constante VERSION est remplacée à chaque compilation : toute nouvelle version
   publiée est ainsi détectée par les appareils. */
const VERSION = "__BUILD__";
const APP_CACHE = "royaume-app-" + VERSION;
const CONTENT_CACHE = "royaume-content";
const IMG_CACHE = "royaume-images";
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
        await cache.addAll(assets);
        // Toutes les leçons, pour fonctionner hors connexion dès l'installation
        const m = await (await fetch("./content/manifest.json", { cache: "reload" })).json();
        const content = await caches.open(CONTENT_CACHE);
        await content.addAll(m.worlds.map((w) => "./content/" + w.file));
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
