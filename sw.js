// Groundwork service worker: lets the app open with no connection.
// - The app's own files are fetched network-first (so updates show up right away) and fall back to the
//   saved copy when offline.
// - The code libraries from the CDNs are saved the first time and reused after that.
// - Sign-in/database traffic (Supabase) and the large music files are never touched here.
const CACHE = "groundwork-v3";
const SHELL = ["./", "index.html", "privacy.html", "manifest.webmanifest", "fonts/Lexend-latin.woff2", "groundwork-icon-180.png", "groundwork-icon-192.png", "groundwork-icon-512.png"];
const CDNS = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const save = (req, res) => { if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return;      // never cache sign-in or data
  if (url.pathname.includes("/music/")) return;           // big audio: always network
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then((res) => save(req, res)).catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
    );
  } else if (CDNS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))));
  }
});
