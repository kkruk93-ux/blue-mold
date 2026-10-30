/* Blue Mold: Containment – offline service worker (scope: the game folder).
   Cache-first for the game's own files; nothing else is touched. Bump CACHE on every release. */
var CACHE = "bmc-v1";
var FILES = ["./", "index.html", "privacy.html", "manifest.webmanifest", "css/game.css",
  "js/engine.js", "js/levels.js", "js/render.js", "js/main.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png", "icons/apple-touch-icon.png",
  "fonts/EBGaramond-Regular.woff2", "fonts/EBGaramond-Italic.woff2", "fonts/EBGaramond-SemiBold.woff2",
  "fonts/IBMPlexMono-Regular-Latin1.woff2", "fonts/IBMPlexMono-Medium-Latin1.woff2"];
var BASE = new URL("./", self.location).pathname;
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (n) { return n.indexOf("bmc-") === 0 && n !== CACHE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var u = new URL(e.request.url);
  if (u.origin !== self.location.origin || u.pathname.indexOf(BASE) !== 0) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (r) {
    return r || fetch(e.request).then(function (res) {
      if (res && res.ok && res.type === "basic") { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); }
      return res;
    }).catch(function () { return e.request.mode === "navigate" ? caches.match("index.html") : undefined; });
  }));
});
