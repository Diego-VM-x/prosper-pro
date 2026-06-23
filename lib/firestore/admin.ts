import {
  db,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  increment,
  serverTimestamp,
  type Timestamp,
} from '@/lib/firebase';
import type { AdminTask, GlobalNotification, AdminStats, FeedbackReport } from '@/types';

const TASKS_COLLECTION = 'admin_tasks';
const NOTIFICATIONS_COLLECTION = 'global_notifications';
const FEEDBACK_COLLECTION = 'feedback';
const STATS_COLLECTION = 'stats';
const STATS_DOC = 'global';

function toMillis(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as Timestamp).toMillis === 'function') {
    return (value as Timestamp).toMillis();
  }
  return Date.now();
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
    createdAt: serverTimestamp(),
  });
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

export function getDeadlinePlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
}
