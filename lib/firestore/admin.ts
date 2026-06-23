import {
  db,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  increment,
  serverTimestamp,
  writeBatch,
  type Timestamp,
  type QuerySnapshot,
  type DocumentData,
} from '@/lib/firebase';
import type { AdminTask, GlobalNotification, AdminStats, FeedbackReport, Notification } from '@/types';
import { addNotification } from './notifications';

const TASKS_COLLECTION = 'admin_tasks';
const NOTIFICATIONS_COLLECTION = 'global_notifications';
const FEEDBACK_COLLECTION = 'feedback';
const STATS_COLLECTION = 'stats';
const STATS_DOC = 'global';
const USERS_COLLECTION = 'users';

export interface AdminUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  devices?: Array<{
    isOnline?: boolean;
    lastActive?: number;
    deviceName?: string;
  }>;
}

export interface ActiveUsersStats {
  activeNow: number;
  activeToday: number;
  totalUsers: number;
}

function toMillis(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as Timestamp).toMillis === 'function') {
    return (value as Timestamp).toMillis();
  }
  return Date.now();
}

function deviceLastActive(device: unknown): number {
  if (!device || typeof device !== 'object') return 0;
  const d = device as Record<string, unknown>;
  if (typeof d.lastActive === 'number') return d.lastActive;
  return 0;
}

function deviceIsOnline(device: unknown): boolean {
  if (!device || typeof device !== 'object') return false;
  const d = device as Record<string, unknown>;
  return d.isOnline === true;
}

export function subscribeToAdminTasks(callback: (tasks: AdminTask[]) => void) {
  const q = query(collection(db, TASKS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        task: String(data.task || ''),
        deadline: String(data.deadline || ''),
        completed: Boolean(data.completed),
        createdAt: toMillis(data.createdAt),
        completedAt: data.completedAt ? toMillis(data.completedAt) : undefined,
      } as AdminTask;
    });
    callback(tasks);
  });
}

export function subscribeToFeedback(callback: (items: FeedbackReport[]) => void) {
  const q = query(collection(db, FEEDBACK_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ownerId: String(data.ownerId || ''),
        type: data.type === 'suggestion' ? 'suggestion' : 'bug',
        message: String(data.message || ''),
        page: data.page ? String(data.page) : undefined,
        createdAt: toMillis(data.createdAt),
      } as FeedbackReport;
    });
    callback(items);
  });
}

export function subscribeToAdminStats(callback: (stats: AdminStats) => void) {
  return onSnapshot(doc(db, STATS_COLLECTION, STATS_DOC), (snap) => {
    const data = snap.data() || {};
    callback({
      totalUsers: typeof data.totalUsers === 'number' ? data.totalUsers : undefined,
      totalTransactions: typeof data.totalTransactions === 'number' ? data.totalTransactions : undefined,
      totalPlans: typeof data.totalPlans === 'number' ? data.totalPlans : undefined,
      totalFeedback: typeof data.totalFeedback === 'number' ? data.totalFeedback : undefined,
      openTasks: typeof data.openTasks === 'number' ? data.openTasks : undefined,
      updatedAt: data.updatedAt ? toMillis(data.updatedAt) : undefined,
    } as AdminStats);
  });
}

export function subscribeToActiveUsers(callback: (stats: ActiveUsersStats) => void) {
  return onSnapshot(
    collection(db, USERS_COLLECTION),
    (snapshot) => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      let activeNow = 0;
      let activeToday = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const devices = Array.isArray(data.devices) ? data.devices : [];
        let userActiveNow = false;
        let userActiveToday = false;

        for (const device of devices) {
          const lastActive = deviceLastActive(device);
          const isOnline = deviceIsOnline(device);
          if (isOnline && lastActive > fiveMinutesAgo) {
            userActiveNow = true;
          }
          if (lastActive > oneDayAgo) {
            userActiveToday = true;
          }
        }

        if (userActiveNow) activeNow++;
        if (userActiveToday) activeToday++;
      });

      callback({
        activeNow,
        activeToday,
        totalUsers: snapshot.size,
      });
    },
    () => callback({ activeNow: 0, activeToday: 0, totalUsers: 0 })
  );
}

export async function searchUsersByNameOrEmail(queryText: string): Promise<AdminUser[]> {
  const normalized = queryText.trim().toLowerCase();
  if (!normalized) return [];

  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  const results: AdminUser[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const displayName = String(data.displayName || '');
    const email = String(data.email || '');

    if (
      displayName.toLowerCase().includes(normalized) ||
      email.toLowerCase().includes(normalized)
    ) {
      results.push({
        uid: docSnap.id,
        displayName: data.displayName || null,
        email: data.email || null,
        photoURL: data.photoURL || null,
        devices: Array.isArray(data.devices) ? data.devices : [],
      });
    }
  });

  return results.slice(0, 20);
}

export async function addAdminTask(task: Omit<AdminTask, 'id'>) {
  await addDoc(collection(db, TASKS_COLLECTION), {
    ...task,
    createdAt: serverTimestamp(),
  });
}

export async function updateAdminTask(taskId: string, updates: Partial<AdminTask>) {
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), updates);
}

export async function toggleAdminTask(taskId: string, current: boolean) {
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
    completed: !current,
    completedAt: !current ? Date.now() : null,
  });
}

export async function deleteAdminTask(taskId: string) {
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
}

export async function archiveFeedback(feedbackId: string) {
  await deleteDoc(doc(db, FEEDBACK_COLLECTION, feedbackId));
}

export async function addGlobalNotification(
  notification: Omit<GlobalNotification, 'id' | 'createdAt'>
) {
  await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
    ...notification,
    createdAt: Date.now(),
  });
}

export async function dispatchGlobalNotification(
  notification: Omit<GlobalNotification, 'id' | 'createdAt'>
): Promise<{ recipients: number; globalId: string }> {
  // 1. Guardar registro global
  const globalRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
    ...notification,
    createdAt: Date.now(),
  });

  // 2. Resolver lista de destinatarios
  let targetUids: string[] = [];
  if (notification.target === 'all') {
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    usersSnap.forEach((d) => targetUids.push(d.id));
  } else if (Array.isArray(notification.target)) {
    targetUids = notification.target.filter((uid) => typeof uid === 'string' && uid.trim() !== '');
  }

  // 3. Distribuir a /notifications en batches de 500
  const BATCH_LIMIT = 500;
  const baseNotification: Omit<Notification, 'id' | 'createdAt' | 'ownerId'> = {
    title: notification.title,
    message: notification.message,
    type: 'info',
    read: false,
    meta: {
      globalNotificationId: globalRef.id,
      sentBy: notification.sentBy,
      isGlobal: true,
    },
  };

  for (let i = 0; i < targetUids.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = targetUids.slice(i, i + BATCH_LIMIT);

    for (const uid of chunk) {
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        ...baseNotification,
        ownerId: uid,
        createdAt: Date.now(),
      });
    }

    await batch.commit();
  }

  return { recipients: targetUids.length, globalId: globalRef.id };
}

export async function incrementAdminStats(field: keyof AdminStats) {
  await setDoc(
    doc(db, STATS_COLLECTION, STATS_DOC),
    {
      [field]: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function recalculateAdminStats() {
  const [usersSnap, feedbackSnap, tasksSnap] = await Promise.all([
    getDocs(collection(db, USERS_COLLECTION)),
    getDocs(collection(db, FEEDBACK_COLLECTION)),
    getDocs(collection(db, TASKS_COLLECTION)),
  ]);

  const openTasks = tasksSnap.docs.filter((d) => !d.data().completed).length;

  await setDoc(
    doc(db, STATS_COLLECTION, STATS_DOC),
    {
      totalUsers: usersSnap.size,
      totalFeedback: feedbackSnap.size,
      openTasks,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function getDeadlinePlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
}
