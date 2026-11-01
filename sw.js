// Le Plein — service worker
// Pour publier une nouvelle version : modifie l'appli, puis change VERSION ci-dessous
// (même numéro que APP_VERSION dans index.html). Les téléphones la récupèrent
// automatiquement à la prochaine ouverture avec du réseau.
const VERSION = "1.3.1";
const CACHE = "leplein-" + VERSION;
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("leplein-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });

// Page : réseau d'abord (dernière version si connecté), cache sinon (hors ligne).
// Icônes et manifeste : cache d'abord, rafraîchis en arrière-plan.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-store" })
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

// Toucher une notification rouvre l'appli
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(list => list.length ? list[0].focus() : self.clients.openWindow("./")));
});
