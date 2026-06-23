/**
 * Service Worker de Firebase Cloud Messaging para Prosper-Pro.
 * Se encarga de recibir y mostrar notificaciones push cuando la PWA
 * está cerrada o en segundo plano en un navegador compatible.
 *
 * NOTA SOBRE APK NATIVA:
 * Este SW no se ejecuta dentro del WebView de una app Android nativa (Capacitor).
 * En una APK, las notificaciones en estado "killed" requieren un servicio nativo
 * FirebaseMessagingService. Si el objetivo final es la APK, este archivo solo
 * cubre la versión web/PWA.
 */

/* global importScripts, firebase, self, clients */

importScripts(
  'https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js'
);

// Configuración pública del proyecto Firebase (las API keys son seguras por diseño).
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDUGxu2cfgxVrgSS1xamE0NaVUOv7TnX2E',
  authDomain: 'prospeweb.firebaseapp.com',
  projectId: 'prospeweb',
  storageBucket: 'prospeweb.firebasestorage.app',
  messagingSenderId: '144762699678',
  appId: '1:144762699678:web:e7ce0d3bc2533b2175e08f',
  measurementId: 'G-R7D5M4J5L5',
};

firebase.initializeApp(FIREBASE_CONFIG);
const messaging = firebase.messaging();

/**
 * Handler de mensajes en segundo plano.
 * Fuerza la visualización de la notificación nativa del navegador usando
 * exclusivamente payload.data. Esto es compatible con el envío data-only
 * de alta prioridad que el backend envía para evitar el bloqueo de Doze Mode.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received', payload);

  const data = payload.data || {};
  const title = data.title || 'Prosper Pro';
  const body = data.body || '';
  const icon = data.icon || '/icon-192x192.png';
  const badge = data.badge || '/icon-192x192.png';
  const url = data.url || '/';
  const tag = data.tag || url;

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    // Mantiene la notificación visible hasta que el usuario interactúe.
    requireInteraction: true,
    // El navegador asigna la importancia según su propio canal de notificaciones push.
    data: { url },
    actions: url && url !== '/' ? [{ action: 'open', title: 'Abrir app' }] : [],
  };

  return self.registration.showNotification(title, notificationOptions);
});

/**
 * Abre la URL asociada al tocar la notificación.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
