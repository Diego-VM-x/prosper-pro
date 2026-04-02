import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { XPState, Achievement } from '@/types';

const XP_COLLECTION = 'xp_states';
const ACHIEVEMENTS_COLLECTION = 'achievements';

export function subscribeToXP(ownerId: string, callback: (xp: XPState | null) => void) {
  const q = query(collection(db, XP_COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const docSnap = snapshot.docs[0];
    callback({ ...docSnap.data() } as XPState);
  }, (error) => {
    console.error('subscribeToXP error:', error);
    callback(null);
  });
}

export async function getXPByOwnerId(ownerId: string): Promise<XPState | null> {
  const q = query(collection(db, XP_COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { ...snapshot.docs[0].data() } as XPState;
}

export async function getAchievementsByOwnerId(ownerId: string): Promise<Achievement[]> {
  const q = query(collection(db, ACHIEVEMENTS_COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  const achievements: Achievement[] = [];
  snapshot.forEach((docSnap) => {
    achievements.push({ id: docSnap.id, ...docSnap.data() } as Achievement);
  });
  achievements.sort((a, b) => b.unlockedAt - a.unlockedAt);
  return achievements;
}

export async function updateXP(ownerId: string, xpGain: number) {
  const q = query(collection(db, XP_COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;
  const docSnap = snapshot.docs[0];
  const data = docSnap.data() as XPState;
  let newXP = data.currentXP + xpGain;
  let newLevel = data.level;
  let newMax = data.maxXP;
  if (newXP >= data.maxXP) {
    newXP = newXP - data.maxXP;
    newLevel += 1;
    newMax = Math.round(data.maxXP * 1.2);
  }
  await updateDoc(docSnap.ref, { currentXP: newXP, level: newLevel, maxXP: newMax });
}

export function subscribeToAchievements(ownerId: string, callback: (achievements: Achievement[]) => void) {
  const q = query(collection(db, ACHIEVEMENTS_COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const achievements: Achievement[] = [];
    snapshot.forEach((docSnap) => {
      achievements.push({ id: docSnap.id, ...docSnap.data() } as Achievement);
    });
    achievements.sort((a, b) => b.unlockedAt - a.unlockedAt);
    callback(achievements);
  }, (error) => {
    console.error('subscribeToAchievements error:', error);
    callback([]);
  });
}

export async function unlockAchievement(achievement: Omit<Achievement, 'id' | 'unlockedAt'>) {
  const q = query(collection(db, ACHIEVEMENTS_COLLECTION), where('ownerId', '==', achievement.ownerId), where('title', '==', achievement.title));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) return;
  await addDoc(collection(db, ACHIEVEMENTS_COLLECTION), {
    ...achievement,
    unlockedAt: Date.now(),
  });
}
