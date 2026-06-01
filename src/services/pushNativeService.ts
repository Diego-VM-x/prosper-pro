'use client';

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

/**
 * Determines whether native push notifications are available.
 * Returns false on web browsers where Capacitor plugins aren't loaded.
 */
function isNativePush(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Initialize global push notifications for the logged-in user.
 * Call once after the user is authenticated (inside AuthContext → onUserReady).
 *
 * On web browsers this is a no-op and returns false immediately.
 */
export async function initGlobalPushNotifications(): Promise<boolean> {
  // Only run on native Android/iOS — never on the browser.
  if (!isNativePush()) {
    console.info('[PushNative] Not a native platform — skipping.');
    return false;
  }

  try {
    // 1. Request permission (shows the Android 13+ runtime dialog).
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      console.warn('[PushNative] Permission denied by user.');
      return false;
    }

    // 2. Listen for the registration event BEFORE calling register().
    //    The token is delivered asynchronously via this listener.
    PushNotifications.addListener('registration', async (token) => {
      console.info('[PushNative] FCM token received:', token.value);
      await storeFcmToken(token.value);
    });

    // 3. Listen for registration errors.
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[PushNative] Registration error:', error);
    });

    // 4. Handle foreground notifications — surface them as in-app feedback.
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[PushNative] Foreground notification:', notification);

      // Route based on payload section: metas | balances | cursos | transferencias
      const section = notification.data?.section as string | undefined;
      if (section) {
        handleNotificationRoute(section);
      }
    });

    // 5. Handle notification tap (app was in background or closed).
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[PushNative] Notification tapped:', action);

      const section = action.notification?.data?.section as string | undefined;
      const url = action.notification?.data?.url as string | undefined;

      if (url) {
        // Deep-link URL supplied by the backend — navigate directly.
        window.location.href = url;
      } else if (section) {
        handleNotificationRoute(section);
      }
    });

    // 6. Register with APNs / FCM — triggers the 'registration' listener above.
    await PushNotifications.register();

    return true;
  } catch (err) {
    console.error('[PushNative] Initialization failed:', err);
    return false;
  }
}

/**
 * Persist the FCM token in Firestore under the authenticated user's document.
 * Respects the multi-tenant ownerId model — each user only writes to their own doc.
 */
async function storeFcmToken(token: string): Promise<void> {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    console.warn('[PushNative] No authenticated user — cannot store token.');
    return;
  }

  const uid = currentUser.uid;
  const userDoc = doc(db, 'users', uid);

  await setDoc(
    userDoc,
    {
      fcmToken: token,
      fcmTokenUpdatedAt: Date.now(),
      ownerId: uid, // multi-tenant safety: always tag with the user's own id
    },
    { merge: true },
  );

  console.info('[PushNative] Token stored for user', uid);
}

/**
 * Route the user to the correct section of the app based on the notification payload.
 */
function handleNotificationRoute(section: string): void {
  const routeMap: Record<string, string> = {
    metas: '/metas',
    balances: '/finanzas',
    cursos: '/cursos',
    transferencias: '/finanzas',
    calendario: '/calendario',
    configuracion: '/configuracion',
  };

  const path = routeMap[section];
  if (path && typeof window !== 'undefined') {
    window.location.href = path;
  }
}
