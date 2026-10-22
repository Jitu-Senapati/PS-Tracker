// Service worker: lets the app install and open offline. Live data (/api) is never cached.
const V = "pst-v2", IMG = "pst-img-v1";
const SHELL = ["./", "index.html", "style.css", "book.css", "trend.css", "data.js", "app.js", "book.js", "trend.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/favicon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== V && k !== IMG).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin === location.origin) {
    if (url.pathname.startsWith("/api/")) return;            // shared book data: always live
    // network first so a new deploy shows up straight away; cache is used when offline
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
    return;
  }
  if (url.hostname === "www.google.com" && url.pathname.startsWith("/s2/favicons")) {   // platform logos
    e.respondWith(caches.open(IMG).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});