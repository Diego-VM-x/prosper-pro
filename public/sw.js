// Prosper Pro - Service Worker para PWA v2
const CACHE_VERSION = 'prosper-pro-v3';
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
    caches.open(CACHE_VERSION).then((cache) => {
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
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: estrategia optimizada
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo cachear GET requests
  if (request.method !== 'GET') return;

  // Ignorar requests de Firebase, analytics y APIs externas
  if (request.url.includes('googleapis.com') ||
      request.url.includes('firebase') ||
      request.url.includes('analytics') ||
      request.url.includes('dolarapi')) {
    return;
  }

  // No cachear chunks dinámicos de Next.js (_next/static/chunks/* se cachean por el navegador)
  if (url.pathname.startsWith('/_next/static/chunks/pages/')) {
    return;
  }

  // Estrategia: Cache First para assets estáticos, Network First para HTML
  if (url.pathname === '/' || url.pathname === '/index.html') {
    // Network First para la página principal (siempre fresca)
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // Cache First para assets estáticos
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Refrescar en background
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cached;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, clone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
