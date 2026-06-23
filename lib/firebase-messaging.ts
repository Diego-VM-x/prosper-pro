/**
 * Cliente Firebase Cloud Messaging para la versión web/PWA de Prosper-Pro.
 *
 * IMPORTANTE:
 * - En navegadores web, FCM requiere un Service Worker registrado en `/firebase-messaging-sw.js`
 *   y un par de claves VAPID configurado en Firebase Console.
 * - En Android nativo (APK de Capacitor), este módulo no se activa porque el WebView no expone
 *   Service Workers de forma que puedan recibir push en segundo plano. Para APK se requiere
 *   el plugin nativo `@capacitor/push-notifications` o un FirebaseMessagingService propio.
 */

import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { app, db } from './firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isBrowser() || !('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (e) {
    console.error('[FirebaseMessaging] Failed to register service worker:', e);
    return null;
  }
}

/**
 * Solicita permiso de notificaciones del navegador y, si se concede, obtiene
 * el token FCM web y lo persiste en Firestore para envíos posteriores.
 */
export async function initWebPushNotifications(userId: string): Promise<string | null> {
  if (!isBrowser()) return null;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('[FirebaseMessaging] FCM is not supported in this browser');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FirebaseMessaging] Notification permission denied');
      return null;
    }

    const swRegistration = await registerMessagingServiceWorker();
    if (!swRegistration) return null;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.warn('[FirebaseMessaging] No FCM token returned');
      return null;
    }

    console.log('[FirebaseMessaging] Web FCM token obtained');

    const now = Date.now();
    await setDoc(
      doc(db, 'push_tokens', token),
      {
        ownerId: userId,
        token,
        platform: 'web',
        updatedAt: now,
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'users', userId, 'devices', token),
      {
        token,
        platform: 'web',
        updatedAt: now,
      },
      { merge: true }
    );

    // Listener para mensajes recibidos mientras la PWA está visible.
    onMessage(messaging, (payload) => {
      console.log('[FirebaseMessaging] Foreground message received:', payload);
      const data = payload.data;
      if (!data) return;
      if (Notification.permission === 'granted') {
        new Notification(data.title || 'Prosper Pro', {
          body: data.body || '',
          icon: data.icon || '/icon-192x192.png',
        });
      }
    });

    return token;
  } catch (e) {
    console.error('[FirebaseMessaging] Initialization error:', e);
    return null;
  }
}

/**
 * Elimina el token web de Firestore al cerrar sesión.
 */
export async function unregisterWebPushToken(token?: string): Promise<void> {
  if (!token) return;
  try {
    await deleteDoc(doc(db, 'push_tokens', token));
  } catch (e) {
    console.error('[FirebaseMessaging] Failed to unregister web token:', e);
  }
}
