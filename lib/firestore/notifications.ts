import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Notification } from '@/types';

const COLLECTION = 'notifications';

export function subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const notifications: Notification[] = [];
    snapshot.forEach((docSnap) => {
      notifications.push({ id: docSnap.id, ...docSnap.data() } as Notification);
    });
    notifications.sort((a, b) => b.createdAt - a.createdAt);
    callback(notifications);
  }, (error) => {
    console.error('subscribeToNotifications error:', error);
    callback([]);
  });
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(db, COLLECTION, notificationId), { read: true });
}

export async function addNotification(notification: Omit<Notification, 'id' | 'createdAt'>) {
  await addDoc(collection(db, COLLECTION), {
    ...notification,
    createdAt: Date.now(),
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId), where('read', '==', false));
  try {
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return 0;
  }
}
