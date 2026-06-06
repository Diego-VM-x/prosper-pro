// Prosper Pro - Service Worker para PWA
const CACHE_NAME = 'prosper-pro-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/register',
  '/inicio',
  '/manifest.json',
  '/logo-icon.png',
];

// Instalación: precachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(() => {})
  );
  self.skipWaiting();
});

// Activación: limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: estrategia stale-while-revalidate para navegación
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo cachear GET requests
  if (request.method !== 'GET') return;

  // Ignorar requests de Firebase y analytics
  if (request.url.includes('googleapis.com') ||
      request.url.includes('firebase') ||
      request.url.includes('analytics')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return networkResponse;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
