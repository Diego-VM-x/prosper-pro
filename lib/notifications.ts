import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { doc, setDoc, deleteDoc } from '@/lib/firebase';
import type { NotificationType } from '@/types';

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

let channelsCreated = false;
let notificationIdCounter = 1;

function getNextNotificationId(): number {
  // Android notification IDs must be 32-bit signed integers.
  notificationIdCounter = (notificationIdCounter % 2147483647) + 1;
  return notificationIdCounter;
}

/**
 * Request push notification permissions (FCM) on native platforms.
 */
export async function requestPushPermissions(): Promise<boolean> {
  if (!isNative()) return false;
  const result = await PushNotifications.requestPermissions();
  console.log('[Notifications] push requestPermissions result:', result);
  return result.receive === 'granted';
}

/**
 * Request local notification permissions on native platforms.
 */
export async function requestLocalNotificationPermissions(): Promise<boolean> {
  if (!isNative()) return false;
  const result = await LocalNotifications.requestPermissions();
  console.log('[Notifications] local requestPermissions result:', result);
  return result.display === 'granted';
}

/**
 * Request notification permissions for both web and native.
 * On native it asks for both push (FCM) and local notifications.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (isNative()) {
    const [push, local] = await Promise.all([
      requestPushPermissions(),
      requestLocalNotificationPermissions(),
    ]);
    console.log('[Notifications] requestPermissions result:', { push, local });
    return push && local;
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
  if (isNative()) {
    const [push, local] = await Promise.all([
      PushNotifications.checkPermissions(),
      LocalNotifications.checkPermissions(),
    ]);
    console.log('[Notifications] checkPermissions result:', { push, local });
    return push.receive === 'granted' && local.display === 'granted';
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  return Notification.permission === 'granted';
}

/**
 * Create notification channels on Android. Safe to call multiple times.
 */
export async function createNotificationChannels(): Promise<void> {
  if (!isNative() || Capacitor.getPlatform() !== 'android') return;
  if (channelsCreated) return;

  try {
    console.log('[Notifications] Creating notification channels...');
    await LocalNotifications.createChannel({
      id: 'prosper_general_v2',
      name: 'Notificaciones generales',
      description: 'Alertas, recordatorios y noticias de Prosper Pro',
      importance: 5, // IMPORTANCE_MAX
      visibility: 1, // VISIBILITY_PUBLIC
      vibration: true,
      lights: true,
      lightColor: '#24D398',
    });

    await LocalNotifications.createChannel({
      id: 'prosper_reminders_v2',
      name: 'Recordatorios',
      description: 'Recordatorios de planes, pagos y calendario',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#24D398',
    });

    channelsCreated = true;
    console.log('[Notifications] Channels created successfully');
  } catch (e) {
    console.error('[Notifications] Failed to create channels:', e);
  }
}

/**
 * Check whether exact alarms are allowed (Android 12+).
 */
export async function checkExactAlarmPermission(): Promise<boolean> {
  if (!isNative() || Capacitor.getPlatform() !== 'android') return true;
  try {
    const result = await (LocalNotifications as any).checkExactNotificationSetting?.();
    console.log('[Notifications] exact alarm setting:', result);
    return result?.exact_alarm === 'granted';
  } catch (e) {
    console.warn('[Notifications] checkExactNotificationSetting not available:', e);
    return true;
  }
}

export async function openExactAlarmSettings(): Promise<void> {
  if (!isNative() || Capacitor.getPlatform() !== 'android') return;
  try {
    await (LocalNotifications as any).changeExactNotificationSetting?.();
  } catch (e) {
    console.warn('[Notifications] changeExactNotificationSetting not available:', e);
  }
}

/**
 * Register for push notifications on native platforms and save the token
 * to Firestore under the user's devices collection and the global push_tokens collection.
 *
 * IMPORTANT: listeners are registered BEFORE calling PushNotifications.register()
 * to avoid missing the registration event on Android.
 */
export async function registerPushNotifications(userId: string): Promise<void> {
  if (!isNative()) return;

  try {
    // 1. Register listeners first to avoid race conditions on Android.
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[PushNotifications] FCM token received:', token.value);
      try {
        const { db } = await import('@/lib/firebase');
        const platform = Capacitor.getPlatform();
        const now = Date.now();

        // Remember the token locally so we can unregister on logout
        try { localStorage.setItem('prosper_push_token', token.value); } catch {}

        // Per-user reference
        await setDoc(
          doc(db, 'users', userId, 'devices', token.value),
          {
            token: token.value,
            platform,
            updatedAt: now,
          },
          { merge: true }
        );

        // Global token index for mass delivery
        await setDoc(
          doc(db, 'push_tokens', token.value),
          {
            ownerId: userId,
            token: token.value,
            platform,
            updatedAt: now,
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

    PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
      console.log('[PushNotifications] Received in foreground:', notification);
      try {
        const data = notification.data as Record<string, string> | undefined;
        await showLocalNotification({
          title: notification.title || data?.title || 'Prosper Pro',
          body: notification.body || data?.body || '',
          channelId: 'prosper_general_v2',
        });
      } catch (e) {
        console.error('[PushNotifications] Failed to show foreground notification:', e);
      }
    });

    PushNotifications.addListener('pushNotificationActionPerformed', async (action: ActionPerformed) => {
      const data = action.notification.data as { type?: string; url?: string } | undefined;
      if (data?.type === 'app_update' && data?.url) {
        try {
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({ url: data.url });
        } catch (e) {
          console.error('[PushNotifications] Failed to open update URL:', e);
        }
      }
    });

    // 2. Now request permissions and register with FCM.
    await PushNotifications.requestPermissions();
    await PushNotifications.register();

    // 3. On Android, ask the user to disable battery optimization so push
    //    can be delivered even when the app is closed by the system.
    if (Capacitor.getPlatform() === 'android') {
      try {
        const { BatteryOptimization } = await import('@capawesome-team/capacitor-android-battery-optimization');
        const { enabled } = await BatteryOptimization.isBatteryOptimizationEnabled();
        if (enabled) {
          console.log('[PushNotifications] Requesting ignore battery optimization');
          await BatteryOptimization.requestIgnoreBatteryOptimization();
        }
      } catch (e) {
        console.warn('[PushNotifications] Battery optimization request failed:', e);
      }
    }
  } catch (e) {
    console.error('[PushNotifications] Init error:', e);
  }
}

/**
 * Remove the current push token from the global index on logout.
 * The per-user device sub-document is left as-is for audit; only the
 * deliverable token is deleted.
 */
export async function unregisterPushToken(token?: string): Promise<void> {
  if (!isNative()) return;
  let target = token;
  if (!target) {
    try { target = localStorage.getItem('prosper_push_token') || undefined; } catch {}
  }
  if (!target) return;
  try {
    const { db } = await import('@/lib/firebase');
    await deleteDoc(doc(db, 'push_tokens', target));
    try { localStorage.removeItem('prosper_push_token'); } catch {}
  } catch (e) {
    console.error('[PushNotifications] Failed to unregister token:', e);
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
  channelId?: string;
}): Promise<void> {
  const { title, body, id = getNextNotificationId(), channelId = 'prosper_general_v2' } = options;

  if (isNative()) {
    console.log('[Notifications] Showing local notification:', { title, body, id, channelId });
    const permission = await checkNotificationPermissions();
    if (!permission) {
      throw new Error('Notifications permission not granted');
    }

    await createNotificationChannels();

    // On Android 12+, exact alarms may be blocked by the system.
    const exactAllowed = await checkExactAlarmPermission();
    if (!exactAllowed) {
      console.warn('[Notifications] Exact alarm permission not granted; opening settings...');
      await openExactAlarmSettings();
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            channelId,
            schedule: { at: new Date(Date.now() + 500) },
            smallIcon: 'ic_stat_notification',
            iconColor: '#24D398',
          },
        ],
      });
      console.log('[Notifications] Notification scheduled successfully');
    } catch (e) {
      console.error('[Notifications] schedule failed:', e);
      throw e;
    }
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
  const granted = await requestNotificationPermissions();
  if (!granted) {
    throw new Error('Notification permission denied');
  }

  console.log('[Notifications] Triggering test notification:', type);

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
