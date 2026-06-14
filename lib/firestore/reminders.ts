import { db, collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where, type QuerySnapshot, type DocumentData } from '../firebase';
import { cachedQuerySnapshot } from './cachedOnSnapshot';
import type { Reminder } from '@/types';

const COLLECTION = 'reminders';

export function subscribeToReminders(ownerId: string, callback: (reminders: Reminder[]) => void) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId), where('isActive', '==', true));
  return cachedQuerySnapshot(
    q,
    `reminders_${ownerId}`,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const reminders: Reminder[] = [];
      snapshot.forEach((docSnap) => {
        reminders.push({ id: docSnap.id, ...docSnap.data() } as Reminder);
      });
      return reminders;
    },
    callback
  );
}

export async function createReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>) {
  const docRef = await addDoc(collection(db, COLLECTION), reminder);
  return docRef.id;
}

export async function updateReminder(reminderId: string, updates: Partial<Reminder>) {
  await updateDoc(doc(db, COLLECTION, reminderId), updates);
}

export async function deleteReminder(reminderId: string) {
  await deleteDoc(doc(db, COLLECTION, reminderId));
}

export async function getRemindersByOwnerId(ownerId: string): Promise<Reminder[]> {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId), where('isActive', '==', true));
  const snapshot = await getDocs(q);
  const reminders: Reminder[] = [];
  snapshot.forEach((docSnap) => {
    reminders.push({ id: docSnap.id, ...docSnap.data() } as Reminder);
  });
  return reminders;
}
