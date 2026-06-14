import { db, collection, doc, setDoc, getDoc, updateDoc, arrayUnion } from '../firebase';
import { cachedDocSnapshot } from './cachedOnSnapshot';
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
  const profileWithDefaults: UserProfile = {
    ...profile,
    notifications: {
      pushEnabled: true,
      priceAlerts: true,
      budgetAlerts: true,
      planInvite: true,
      planContribution: true,
      planReminder: true,
      planRejected: true,
      dollarChange: true,
      dailyBalance: true,
      appUpdate: true,
      calendarReminder: true,
      welcome: true,
      ...profile.notifications,
    },
  };
  await setDoc(doc(db, COLLECTION, profile.uid), profileWithDefaults);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, userId));
  if (!docSnap.exists()) return null;
  return docSnap.data() as UserProfile;
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  await updateDoc(doc(db, COLLECTION, userId), updates);
}

export async function updateDashboardLayouts(userId: string, layouts: import('@/types').DashboardLayouts) {
  await updateDoc(doc(db, COLLECTION, userId), { dashboardLayouts: layouts, updatedAt: Date.now() });
}

export async function getDashboardLayouts(userId: string): Promise<import('@/types').DashboardLayouts | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, userId));
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return data.dashboardLayouts || null;
}

/** @deprecated Use updateDashboardLayouts instead */
export async function updateDashboardLayout(userId: string, layout: import('@/types').DashboardLayout) {
  await updateDoc(doc(db, COLLECTION, userId), { dashboardLayout: layout, updatedAt: Date.now() });
}

/** @deprecated Use getDashboardLayouts instead */
export async function getDashboardLayout(userId: string): Promise<import('@/types').DashboardLayout | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, userId));
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return data.dashboardLayout || null;
}

export function subscribeToUserProfile(userId: string, callback: (profile: UserProfile | null) => void) {
  return cachedDocSnapshot(
    doc(db, COLLECTION, userId),
    `user_profile_${userId}`,
    (docSnap) => {
      if (!docSnap.exists()) return null;
      return docSnap.data() as UserProfile;
    },
    callback
  );
}
