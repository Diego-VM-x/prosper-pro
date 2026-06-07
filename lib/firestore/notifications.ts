import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Notification, NotificationType, NotificationPreferences } from '@/types';

const COLLECTION = 'notifications';

// ─── Subscriptions ──────────────────────────────────────────────────────────

export function subscribeToNotifications(
  ownerId: string,
  callback: (notifications: Notification[]) => void
) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const notifications: Notification[] = [];
      snapshot.forEach((docSnap) => {
        notifications.push({ id: docSnap.id, ...docSnap.data() } as Notification);
      });
      notifications.sort((a, b) => b.createdAt - a.createdAt);
      callback(notifications);
    },
    (error) => {
      console.error('subscribeToNotifications error:', error);
      callback([]);
    }
  );
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(db, COLLECTION, notificationId), { read: true });
}

export async function addNotification(
  notification: Omit<Notification, 'id' | 'createdAt'>
) {
  await addDoc(collection(db, COLLECTION), {
    ...notification,
    createdAt: Date.now(),
  });
}

export async function getUnreadCount(ownerId: string): Promise<number> {
  const q = query(
    collection(db, COLLECTION),
    where('ownerId', '==', ownerId),
    where('read', '==', false)
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return 0;
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    await deleteDoc(doc(db, COLLECTION, notificationId));
  } catch (err) {
    console.error('deleteNotification error:', err);
    throw err;
  }
}

export async function deleteAllNotifications(ownerId: string) {
  try {
    const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
  } catch (err) {
    console.error('deleteAllNotifications error:', err);
    throw err;
  }
}

export async function markAllNotificationsRead(ownerId: string) {
  const q = query(
    collection(db, COLLECTION),
    where('ownerId', '==', ownerId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((d) => updateDoc(d.ref, { read: true })));
}

export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones push');
    return Promise.resolve(false);
  }
  return Notification.requestPermission().then((p) => p === 'granted');
}

/**
 * Envía notificación al navegador (web).
 * @param title - Título de la notificación
 * @param body  - Cuerpo del mensaje
 * @param channel - Canal Android (general | plans | finance | calendar | updates)
 */
/** Detecta Safari en iOS que no soporta new Notification() */
function isSafariIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && /WebKit/.test(ua) && !/(CriOS|FxiOS|OPiOS|mercury)/.test(ua);
}

export function sendBrowserNotification(
  title: string,
  body: string,
  channel: string = 'general'
) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    // Safari iOS no soporta new Notification() en absoluto
    if (isSafariIOS()) return;
    new Notification(title, {
      body,
      icon: '/logo-icon.png',
      badge: '/logo-icon.png',
      tag: `prosper-${channel}-${Date.now()}`,
      silent: false,
    });
  } catch {
    // Ignorar silenciosamente cualquier error de notificaciones
  }
}

// ─── Helpers por tipo de notificación ───────────────────────────────────────

/** Obtiene preferencias de notificaciones desde Firestore */
export async function getUserNotifPrefs(ownerId: string): Promise<Partial<NotificationPreferences>> {
  try {
    const docSnap = await getDoc(doc(db, 'users', ownerId));
    if (!docSnap.exists()) return {};
    const data = docSnap.data();
    return (data.notifications || {}) as Partial<NotificationPreferences>;
  } catch {
    return {};
  }
}

/** Obtiene las preferencias de notificaciones del localStorage (cache rápido) */
function getLocalNotifPrefs(): Partial<NotificationPreferences> {
  try {
    const raw = localStorage.getItem('prosper_notif_prefs');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Guarda preferencias de notificaciones en localStorage */
export function saveLocalNotifPrefs(prefs: Partial<NotificationPreferences>) {
  try {
    localStorage.setItem('prosper_notif_prefs', JSON.stringify(prefs));
  } catch {}
}

/** Verifica si un tipo de notificación está habilitado */
async function isPrefEnabled(
  ownerId: string,
  prefKey: keyof NotificationPreferences
): Promise<boolean> {
  const prefs = await getUserNotifPrefs(ownerId);
  // pushEnabled false bloquea todo
  if (prefs.pushEnabled === false) return false;
  const val = prefs[prefKey];
  return val !== false; // default: habilitado
}

// ── Plan Invite ──────────────────────────────────────────────────────────────
export async function notifyPlanInvite(
  ownerId: string,
  fromName: string,
  planTitle: string,
  planId: string
) {
  const title = '📋 Te invitaron a un plan';
  const body = `${fromName} te invitó a colaborar en "${planTitle}"`;
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'plan_invite',
    read: false,
    meta: { planId, fromName },
  });
  if (await isPrefEnabled(ownerId, 'planInvite')) {
    sendBrowserNotification(title, body, 'plans');
  }
}

// ── Plan Contribution ────────────────────────────────────────────────────────
export async function notifyPlanContribution(
  ownerId: string,
  fromName: string,
  planTitle: string,
  amount: number,
  planId: string
) {
  const title = '💰 Nuevo aporte a tu plan';
  const body = `${fromName} aportó ${amount} a "${planTitle}"`;
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'plan_contribution',
    read: false,
    meta: { planId, fromName, amount },
  });
  if (await isPrefEnabled(ownerId, 'planContribution')) {
    sendBrowserNotification(title, body, 'plans');
  }
}

// ── Plan Reminder ────────────────────────────────────────────────────────────
export async function notifyPlanReminder(
  ownerId: string,
  planTitle: string,
  daysLeft: number,
  planId: string
) {
  const title = '⏰ Recordatorio de plan';
  const body =
    daysLeft === 0
      ? `"${planTitle}" vence HOY`
      : `"${planTitle}" vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`;
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'plan_reminder',
    read: false,
    meta: { planId, daysLeft },
  });
  if (await isPrefEnabled(ownerId, 'planReminder')) {
    sendBrowserNotification(title, body, 'plans');
  }
}

// ── Plan Rejected / Eliminado ────────────────────────────────────────────────
export async function notifyPlanRejected(
  ownerId: string,
  fromName: string,
  planTitle: string,
  reason: 'rejected' | 'removed' = 'rejected'
) {
  const title = reason === 'rejected' ? '❌ Solicitud rechazada' : '🗑 Te eliminaron de un plan';
  const body =
    reason === 'rejected'
      ? `${fromName} rechazó tu solicitud en "${planTitle}"`
      : `${fromName} te eliminó del plan "${planTitle}"`;
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'plan_rejected',
    read: false,
    meta: { fromName, planTitle, reason },
  });
  if (await isPrefEnabled(ownerId, 'planRejected')) {
    sendBrowserNotification(title, body, 'plans');
  }
}

// ── Dollar Change ────────────────────────────────────────────────────────────
export async function notifyDollarChange(
  ownerId: string,
  oldRate: number,
  newRate: number
) {
  const diff = newRate - oldRate;
  const pct = Math.abs(((diff / oldRate) * 100)).toFixed(1);
  const direction = diff > 0 ? '⬆' : '⬇';
  const title = `${direction} Cambio en el Dólar BCV`;
  const body = `El dólar pasó de ${oldRate.toFixed(2)} a ${newRate.toFixed(2)} Bs (${diff > 0 ? '+' : ''}${pct}%)`;
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'dollar_change',
    read: false,
    meta: { oldRate, newRate },
  });
  if (await isPrefEnabled(ownerId, 'dollarChange')) {
    sendBrowserNotification(title, body, 'finance');
  }
}

// ── Daily Balance (12pm UTC) ─────────────────────────────────────────────────
export async function notifyDailyBalance(
  ownerId: string,
  totalUSD: number,
  totalBS: number
) {
  const title = '📊 Resumen diario de tus cuentas';
  const body = `Balance: $${totalUSD.toFixed(2)} USD / ${totalBS.toFixed(2)} Bs`;
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'daily_balance',
    read: false,
    meta: { totalUSD, totalBS },
  });
  if (await isPrefEnabled(ownerId, 'dailyBalance')) {
    sendBrowserNotification(title, body, 'finance');
  }
}

// ── App Update ───────────────────────────────────────────────────────────────
export async function notifyAppUpdate(
  ownerId: string,
  version: string,
  summary: string
) {
  const title = `🚀 Nueva versión: v${version}`;
  await addNotification({
    ownerId,
    title,
    message: summary,
    type: 'app_update',
    read: false,
    meta: { version },
  });
  if (await isPrefEnabled(ownerId, 'appUpdate')) {
    sendBrowserNotification(title, summary, 'updates');
  }
}

// ── Calendar Reminder ────────────────────────────────────────────────────────
export async function notifyCalendarReminder(
  ownerId: string,
  reminderTitle: string,
  reminderId: string,
  date: string
) {
  const title = '📅 Recordatorio de calendario';
  const body = `${reminderTitle} — ${date}`;
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'calendar_reminder',
    read: false,
    meta: { reminderId, date },
  });
  if (await isPrefEnabled(ownerId, 'calendarReminder')) {
    sendBrowserNotification(title, body, 'calendar');
  }
}

// ── Welcome Notification ────────────────────────────────────────────────────────
export async function notifyWelcome(
  ownerId: string,
  displayName: string
) {
  const title = `👋 ¡Bienvenido, ${displayName}!`;
  const body = 'Gracias por usar Prosper-Pro. ¡Comienza a organizar tus finanzas hoy!';
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'welcome',
    read: false,
  });
  if (await isPrefEnabled(ownerId, 'welcome')) {
    sendBrowserNotification(title, body, 'general');
  }
}
