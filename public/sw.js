// Prosper Pro - Service Worker para PWA v3 (optimizado para conexiones lentas)
const CACHE_VERSION = 'prosper-pro-v5-2025-06-08';
const STATIC_PAGES = [
  '/',
  '/login',
  '/register',
  '/inicio',
  '/dashboard',
  '/finanzas',
  '/metas',
  '/calendario',
  '/configuracion',
  '/cursos',
  '/ayuda',
];
const STATIC_ASSETS = [
  '/manifest.json',
  '/logo-icon.png',
  '/logo-full.png',
];

// Instalación: precachear pages y assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll([...STATIC_PAGES, ...STATIC_ASSETS]);
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

// Fetch: estrategia optimizada para redes lentas
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

  // Estrategia para chunks JS/CSS estáticos de Next.js: Cache First con background refresh
  // Esto es CRÍTICO para conexiones lentas — evita re-descargar 2MB de JS en cada visita
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Estrategia para HTML pages: Network First (siempre fresca), fallback a cache
  if (STATIC_PAGES.includes(url.pathname)) {
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

  // Cache First para assets estáticos (imágenes, fuentes, etc.)
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
