import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { doc, setDoc } from '@/lib/firebase';
import type { NotificationType } from '@/types';

const isNative = Capacitor.isNativePlatform();

/**
 * Request notification permissions for both web and native.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (isNative) {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') return true;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Check current notification permission status.
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  if (isNative) {
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  return Notification.permission === 'granted';
}

/**
 * Register for push notifications on native platforms and save the token
 * to Firestore under the user's devices collection.
 */
export async function registerPushNotifications(userId: string): Promise<void> {
  if (!isNative) return;

  try {
    await PushNotifications.requestPermissions();
    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token: Token) => {
      try {
        await setDoc(
          doc((await import('@/lib/firebase')).db, 'users', userId, 'devices', token.value),
          {
            token: token.value,
            platform: Capacitor.getPlatform(),
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch (e) {
        console.error('[PushNotifications] Failed to save token:', e);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[PushNotifications] Registration error:', err);
    });
  } catch (e) {
    console.error('[PushNotifications] Init error:', e);
  }
}

/**
 * Show a native/local notification immediately.
 * Works on web (Notification API) and native (Capacitor Local Notifications).
 */
export async function showLocalNotification(options: {
  title: string;
  body: string;
  id?: number;
}): Promise<void> {
  const { title, body, id = Date.now() } = options;

  if (isNative) {
    const permission = await checkNotificationPermissions();
    if (!permission) {
      console.warn('[Notifications] Permission not granted for local notification');
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule: { at: new Date(Date.now() + 500) },
          sound: 'default',
          smallIcon: 'ic_launcher',
          iconColor: '#24D398',
        },
      ],
    });
    return;
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon-192x192.png' });
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, { body, icon: '/icon-192x192.png' });
    }
  }
}

const TEST_MESSAGES: Record<NotificationType, { title: string; body: string }> = {
  plan_invite: {
    title: 'Te invitaron a un plan',
    body: 'Juan te invitó a colaborar en "Viaje a Europa"',
  },
  plan_contribution: {
    title: 'Nuevo aporte a tu plan',
    body: 'María aportó $50 a "Fondo de emergencia"',
  },
  plan_reminder: {
    title: 'Recordatorio de plan',
    body: '"Pago del auto" vence en 3 días',
  },
  plan_rejected: {
    title: 'Solicitud rechazada',
    body: 'Pedro rechazó tu solicitud en "Plan familiar"',
  },
  dollar_change: {
    title: 'Subió el dólar BCV: 42.50 Bs',
    body: 'Actualización: 42.50 Bs (+0.50 / +1.19%)',
  },
  daily_balance: {
    title: 'Resumen diario de tus cuentas',
    body: 'Balance global: $1,250.00 USD',
  },
  app_update: {
    title: 'Nueva versión: v1.0.4',
    body: 'Mejoras de rendimiento y correcciones.',
  },
  calendar_reminder: {
    title: 'Recordatorio de calendario',
    body: 'Pago de alquiler — 2026-06-15',
  },
  welcome: {
    title: '¡Bienvenido!',
    body: 'Gracias por usar Prosper Pro.',
  },
  transfer: {
    title: 'Transferencia recibida',
    body: 'Recibiste $100.00 en tu cuenta principal',
  },
  info: {
    title: 'Notificación informativa',
    body: 'Esto es una notificación de prueba.',
  },
  new_login: {
    title: 'Nuevo inicio de sesión',
    body: 'Se detectó un nuevo inicio de sesión en tu cuenta',
  },
};

/**
 * Trigger a test notification of a specific type.
 * Also persists it to Firestore so it appears in the in-app list.
 */
export async function triggerTestNotification(
  type: NotificationType,
  userId: string
): Promise<void> {
  const message = TEST_MESSAGES[type] || TEST_MESSAGES.info;

  // Ensure permissions before showing the notification (critical on Android native)
  await requestNotificationPermissions();

  // Show native/local notification
  await showLocalNotification({ title: message.title, body: message.body });

  // Also save to Firestore in-app notifications
  try {
    const { addNotification } = await import('@/lib/firestore/notifications');
    await addNotification({
      ownerId: userId,
      title: message.title,
      message: message.body,
      type,
      read: false,
      meta: { test: true },
    });
  } catch (e) {
    console.error('[Notifications] Failed to save test notification:', e);
  }
}
