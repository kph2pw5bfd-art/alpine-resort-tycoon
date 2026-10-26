// Alpine Resort Tycoon – Service Worker
// Spiel (index.html): erst aus dem Netz holen (immer die neueste Version), ohne Netz die zuletzt gespeicherte.
// Symbole, Manifest, Schrift: aus dem Speicher, sonst aus dem Netz (und merken).
const V='art-v299';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const isPage = r.mode === 'navigate' || (u.origin === location.origin && (u.pathname.endsWith('/') || u.pathname.endsWith('/index.html')));
  if (isPage) {
    e.respondWith(
      fetch(r, { cache: 'no-store' })
        .then(res => {
          if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put('index.html', cp)); }
          return res;
        })
        .catch(() => caches.match('index.html').then(m => m || caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(r).then(m => m || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
      return res;
    }))
  );
});
