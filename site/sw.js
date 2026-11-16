// Offline app shell. VERSION is stamped with the commit ID at deploy, so phones pick up updates.
const VERSION = 'bmb-dev'; // Netlify replaces this on every deploy
const SHELL = [
  '/', '/index.html', '/css/app.css', '/manifest.webmanifest',
  '/js/app.js', '/js/store.js', '/js/program.js', '/js/bodymap.js', '/js/firebase-config.js',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google sign-in and Firestore handle their own traffic.
  if (url.pathname.startsWith('/__/')) return;
  if (/firestore\.googleapis|identitytoolkit|securetoken|googleapis\.com\/identity/.test(url.host + url.pathname)) return;

  // Fonts and the Firebase SDK files are versioned: cache first.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.host) || (url.host === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))) {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // Pages: network first so updates show up, cached copy when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      caches.open(VERSION).then((c) => c.put('/index.html', res.clone()));
      return res;
    }).catch(() => caches.match('/index.html')));
    return;
  }

  // App files: serve from cache, refresh in the background.
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(req);
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
