/* Service worker Blue Mold – działa w podkatalogu (np. https://<login>.github.io/blue-mold/), bo wszystkie ścieżki są względne
   wobec położenia sw.js (scope = katalog aplikacji).
   - Backend poleceń (Google Apps Script, inne domeny) i każde żądanie inne niż GET: NIGDY nie przechodzą przez cache.
   - data/* (stan.json, stan.js): najpierw sieć, cache tylko awaryjnie offline.
   - Reszta plików aplikacji: najpierw cache (offline).
   Przy każdej zmianie plików aplikacji podbij CACHE – stara wersja zostanie usunięta przy aktywacji. */
var CACHE = "bluemold-v6-centrum";
var PLIKI = ["./", "index.html", "style.css", "app.js", "centrum.js", "manifest.webmanifest", "data/zaloga.js", "data/stan.js", "data/stan.json",
  "ikony/ikona-192.png", "ikony/ikona-512.png", "ikony/apple-touch-icon.png",
  "fonts/BigShouldersDisplay-var.woff2", "fonts/IBMPlexMono-Regular-Latin1.woff2", "fonts/IBMPlexMono-Regular-Latin2.woff2",
  "fonts/IBMPlexMono-Medium-Latin1.woff2", "fonts/IBMPlexMono-Medium-Latin2.woff2", "fonts/IBMPlexMono-Regular-Pi.woff2",
  "fonts/EBGaramond-Regular.woff2", "fonts/EBGaramond-SemiBold.woff2", "fonts/EBGaramond-Italic.woff2",
  "grafika/enceladus.webp", "grafika/kallichore.webp", "grafika/gejzer.webp", "grafika/schemat.webp", "grafika/okladka-pl.webp",
  "grafika/rovi-skan.webp", "grafika/szum.png", "grafika/plesn-l.svg", "grafika/plesn-r.svg"];
var BAZA = new URL("./", self.location).pathname;   // np. "/blue-mold/"
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PLIKI); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (n) { return n.indexOf("bluemold-") === 0 && n !== CACHE; }).map(function (n) { return caches.delete(n); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;                                   // POST do backendu – bez SW
  var u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;                            // script.google.com, googleusercontent, linki zewnętrzne – bez SW
  if (u.pathname.indexOf(BAZA) !== 0) return;                               // poza katalogiem aplikacji
  if (u.searchParams.has("token") || u.pathname.indexOf("/macros/") !== -1) return;   // na wszelki wypadek: nic z tokenem do cache
  if (u.pathname.indexOf(BAZA + "data/") === 0) {
    e.respondWith(fetch(e.request, { cache: "no-store" }).then(function (r) {
      if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(u.pathname, cp); }); }
      return r;
    }).catch(function () { return caches.match(u.pathname, { ignoreSearch: true }); }));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (r) {
    return r || fetch(e.request).then(function (res) { if (res && res.ok && res.type === "basic") { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); } return res; });
  }));
});
