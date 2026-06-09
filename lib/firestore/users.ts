import { db, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, arrayUnion } from '../firebase';
import type { UserProfile } from '@/types';

const COLLECTION = 'users';

// Categorías personalizadas del usuario
export async function addCustomCategory(userId: string, category: string) {
  await updateDoc(doc(db, COLLECTION, userId), {
    customCategories: arrayUnion(category),
  });
}

export async function addCustomReminderType(userId: string, type: string) {
  await updateDoc(doc(db, COLLECTION, userId), {
    customReminderTypes: arrayUnion(type),
  });
}

export async function addCustomTransactionCategory(userId: string, category: string) {
  await updateDoc(doc(db, COLLECTION, userId), {
    customTransactionCategories: arrayUnion(category),
  });
}

export interface UserPreferences {
  customCategories?: string[];
  customReminderTypes?: string[];
  customTransactionCategories?: string[];
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const docSnap = await getDoc(doc(db, COLLECTION, userId));
  if (!docSnap.exists()) return {};
  const data = docSnap.data();
  return {
    customCategories: data.customCategories || [],
    customReminderTypes: data.customReminderTypes || [],
    customTransactionCategories: data.customTransactionCategories || [],
  };
}

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
