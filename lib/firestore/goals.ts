import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Goal, GoalCategory, GoalStatus } from '@/types';

const COLLECTION = 'goals';

export function subscribeToGoals(userId: string, callback: (goals: Goal[]) => void) {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const goals: Goal[] = [];
    snapshot.forEach((docSnap) => {
      goals.push({ id: docSnap.id, ...docSnap.data() } as Goal);
    });
    goals.sort((a, b) => b.createdAt - a.createdAt);
    callback(goals);
  }, (error) => {
    console.error('subscribeToGoals error:', error);
    callback([]);
  });
}

export async function createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Date.now();
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...goal,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateGoal(goalId: string, updates: Partial<Goal>) {
  const docRef = doc(db, COLLECTION, goalId);
  await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
}

export async function deleteGoal(goalId: string) {
  await deleteDoc(doc(db, COLLECTION, goalId));
}

export async function getGoal(goalId: string): Promise<Goal | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, goalId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Goal;
}

export async function addFundsToGoal(goalId: string, amount: number) {
  const goal = await getGoal(goalId);
  if (!goal) return;
  const newCurrent = Math.min(goal.current + amount, goal.target);
  const newStatus: GoalStatus = newCurrent >= goal.target ? 'completed' : goal.status === 'pending' ? 'progress' : goal.status;
  await updateGoal(goalId, { current: newCurrent, status: newStatus });
}
