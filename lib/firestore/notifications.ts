import { db, collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where, type QuerySnapshot, type DocumentData, getDoc } from '../firebase';
import { cachedQuerySnapshot } from './cachedOnSnapshot';
import type { CurrencyCode, Notification, NotificationType, NotificationPreferences } from '@/types';
import { CURRENCY_MAP } from '@/lib/currency';

const COLLECTION = 'notifications';

// ─── Subscriptions ──────────────────────────────────────────────────────────

export function subscribeToNotifications(
  ownerId: string,
  callback: (notifications: Notification[]) => void
) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  return cachedQuerySnapshot(
    q,
    `notifications_${ownerId}`,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const notifications: Notification[] = [];
      snapshot.forEach((docSnap) => {
        notifications.push({ id: docSnap.id, ...docSnap.data() } as Notification);
      });
      notifications.sort((a, b) => b.createdAt - a.createdAt);
      return notifications;
    },
    callback
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
  const title = 'Te invitaron a un plan';
  const body = `${fromName} te invitó a colaborar en "${planTitle}"`;
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'plan_invite',
    read: false,
    meta: { planId, fromName },
  });
}

// ── Plan Contribution ────────────────────────────────────────────────────────
export async function notifyPlanContribution(
  ownerId: string,
  fromName: string,
  planTitle: string,
  amount: number,
  planId: string
) {
  const title = 'Nuevo aporte a tu plan';
  const body = `${fromName} aportó ${amount} a "${planTitle}"`;
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'plan_contribution',
    read: false,
    meta: { planId, fromName, amount },
  });
}

// ── Plan Reminder ────────────────────────────────────────────────────────────
export async function notifyPlanReminder(
  ownerId: string,
  planTitle: string,
  daysLeft: number,
  planId: string
) {
  const title = 'Recordatorio de plan';
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
}

// ── Plan Rejected / Eliminado ────────────────────────────────────────────────
export async function notifyPlanRejected(
  ownerId: string,
  fromName: string,
  planTitle: string,
  reason: 'rejected' | 'removed' = 'rejected'
) {
  const title = reason === 'rejected' ? 'Solicitud rechazada' : 'Te eliminaron de un plan';
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
}

// ── Dollar Change ────────────────────────────────────────────────────────────
export async function notifyDollarChange(
  ownerId: string,
  oldRate: number,
  newRate: number
) {
  const diff = newRate - oldRate;
  const pct = Math.abs(((diff / oldRate) * 100)).toFixed(2);
  const direction = diff > 0 ? 'Subió' : 'Bajó';
  const sign = diff > 0 ? '+' : '';
  const title = `${direction} el dólar BCV: ${newRate.toFixed(2)} Bs`;
  const body = `Actualización: ${newRate.toFixed(2)} Bs (${sign}${diff.toFixed(2)} / ${sign}${pct}%)`;
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'dollar_change',
    read: false,
    meta: { oldRate, newRate },
  });
}

// ── Daily Balance (12pm UTC) ─────────────────────────────────────────────────
export async function notifyDailyBalance(
  ownerId: string,
  totalAmount: number,
  currency: CurrencyCode
) {
  const cfg = CURRENCY_MAP[currency] || CURRENCY_MAP.USD;
  const title = 'Resumen diario de tus cuentas';
  const body = `Balance global: ${cfg.symbol}${totalAmount.toLocaleString(cfg.locale, { minimumFractionDigits: cfg.decimals > 2 ? cfg.decimals : 2, maximumFractionDigits: cfg.decimals })} ${currency}`;
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'daily_balance',
    read: false,
    meta: { totalAmount, currency },
  });
}

// ── App Update ───────────────────────────────────────────────────────────────
export async function notifyAppUpdate(
  ownerId: string,
  version: string,
  summary: string
) {
  const title = `Nueva versión: v${version}`;
  await addNotification({
    ownerId,
    title,
    message: summary,
    type: 'app_update',
    read: false,
    meta: { version },
  });
}

// ── Calendar Reminder ────────────────────────────────────────────────────────
export async function notifyCalendarReminder(
  ownerId: string,
  reminderTitle: string,
  reminderId: string,
  date: string
) {
  const title = 'Recordatorio de calendario';
  const body = `${reminderTitle} — ${date}`;
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'calendar_reminder',
    read: false,
    meta: { reminderId, date },
  });
}

// ── Welcome Notification ────────────────────────────────────────────────────────
export async function notifyWelcome(
  ownerId: string,
  displayName: string
) {
  const title = `¡Bienvenido, ${displayName}!`;
  const body = 'Gracias por usar Prosper-Pro. ¡Comienza a organizar tus finanzas hoy!';
  await addNotification({
    ownerId,
    title,
    message: body,
    type: 'welcome',
    read: false,
  });
}

// ── App Notification Subscribers ────────────────────────────────────────────────
const SUBSCRIBERS_COLLECTION = 'notificationSubscribers';

export async function subscribeToAppNotifications(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const q = query(
    collection(db, SUBSCRIBERS_COLLECTION),
    where('email', '==', normalizedEmail)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return; // Already subscribed
  }
  await addDoc(collection(db, SUBSCRIBERS_COLLECTION), {
    email: normalizedEmail,
    createdAt: Date.now(),
    source: 'landing',
  });
}
