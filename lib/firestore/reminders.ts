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
import type { Reminder } from '@/types';

const COLLECTION = 'reminders';

export function subscribeToReminders(userId: string, callback: (reminders: Reminder[]) => void) {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId), where('isActive', '==', true));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const reminders: Reminder[] = [];
    snapshot.forEach((docSnap) => {
      reminders.push({ id: docSnap.id, ...docSnap.data() } as Reminder);
    });
    callback(reminders);
  }, (error) => {
    console.error('subscribeToReminders error:', error);
    callback([]);
  });
}

export async function createReminder(reminder: Omit<Reminder, 'id'>) {
  const docRef = await addDoc(collection(db, COLLECTION), reminder);
  return docRef.id;
}

export async function updateReminder(reminderId: string, updates: Partial<Reminder>) {
  await updateDoc(doc(db, COLLECTION, reminderId), updates);
}

export async function deleteReminder(reminderId: string) {
  await deleteDoc(doc(db, COLLECTION, reminderId));
}
