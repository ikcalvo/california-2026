const CACHE = 'california-v1';

const STATIC = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
];

// Instalación: guarda en caché todos los recursos estáticos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
  self.skipWaiting();
});

// Activación: elimina cachés antiguas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: estrategia mixta
// - Tiles del mapa (openstreetmap): cache-first con fallback a red
// - Todo lo demás: network-first con fallback a caché
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Tiles del mapa: guardamos en caché para uso offline
  if (url.includes('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const fresh = await fetch(e.request);
          if (fresh.ok) cache.put(e.request, fresh.clone());
          return fresh;
        } catch {
          return new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // Recursos estáticos y todo lo demás: network-first
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
