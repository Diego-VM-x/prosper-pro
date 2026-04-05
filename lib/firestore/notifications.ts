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
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Notification } from '@/types';

const COLLECTION = 'notifications';

export function subscribeToNotifications(ownerId: string, callback: (notifications: Notification[]) => void) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
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

export async function getUnreadCount(ownerId: string): Promise<number> {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId), where('read', '==', false));
  try {
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return 0;
  }
}

export async function deleteNotification(notificationId: string) {
  await deleteDoc(doc(db, COLLECTION, notificationId));
}

export async function deleteAllNotifications(ownerId: string) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  const promises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
  await Promise.all(promises);
}

export async function markAllNotificationsRead(ownerId: string) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId), where('read', '==', false));
  const snapshot = await getDocs(q);
  const promises = snapshot.docs.map(docSnap => updateDoc(docSnap.ref, { read: true }));
  await Promise.all(promises);
}

// Notificaciones push del navegador
export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones push');
    return Promise.resolve(false);
  }
  return Notification.requestPermission().then(permission => permission === 'granted');
}

export function sendBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: '/logo-icon.png',
    badge: '/logo-icon.png',
    tag: 'prosper-notification',
  });
}
