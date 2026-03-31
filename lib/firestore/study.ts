import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { StudySession } from '@/types';

const COLLECTION = 'study_sessions';

export function subscribeToStudySession(userId: string, callback: (session: StudySession | null) => void) {
  return onSnapshot(doc(db, COLLECTION, userId), (docSnap) => {
    if (!docSnap.exists()) {
      callback(null);
      return;
    }
    callback(docSnap.data() as StudySession);
  }, (error) => {
    console.error('subscribeToStudySession error:', error);
    callback(null);
  });
}

export async function initStudySession(userId: string) {
  const session: StudySession = {
    userId,
    totalSeconds: 0,
    lastUpdated: Date.now(),
    isRunning: false,
  };
  await setDoc(doc(db, COLLECTION, userId), session);
}

export async function updateStudySession(userId: string, updates: Partial<StudySession>) {
  await updateDoc(doc(db, COLLECTION, userId), updates);
}

export async function saveStudyTimer(userId: string, totalSeconds: number, isRunning: boolean) {
  await updateDoc(doc(db, COLLECTION, userId), {
    totalSeconds,
    isRunning,
    lastUpdated: Date.now(),
  });
}
