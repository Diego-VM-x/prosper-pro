import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile } from '@/types';

const COLLECTION = 'users';

export async function createUserProfile(profile: UserProfile) {
  await setDoc(doc(db, COLLECTION, profile.uid), profile);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, userId));
  if (!docSnap.exists()) return null;
  return docSnap.data() as UserProfile;
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  await updateDoc(doc(db, COLLECTION, userId), updates);
}

export function subscribeToUserProfile(userId: string, callback: (profile: UserProfile | null) => void) {
  return onSnapshot(doc(db, COLLECTION, userId), (docSnap) => {
    if (!docSnap.exists()) {
      callback(null);
      return;
    }
    callback(docSnap.data() as UserProfile);
  }, (error) => {
    console.error('subscribeToUserProfile error:', error);
    callback(null);
  });
}
