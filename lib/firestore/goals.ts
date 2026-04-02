import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
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
  console.log('[DEBUG subscribeToGoals] userId:', userId);
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  console.log('[DEBUG subscribeToGoals] Query creado');
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    console.log('[DEBUG subscribeToGoals] Snapshot recibido, docs:', snapshot.size);
    const goals: Goal[] = [];
    snapshot.forEach((docSnap) => {
      console.log('[DEBUG subscribeToGoals] Doc ID:', docSnap.id, 'Data:', JSON.stringify(docSnap.data(), null, 2));
      goals.push({ id: docSnap.id, ...docSnap.data() } as Goal);
    });
    goals.sort((a, b) => b.createdAt - a.createdAt);
    console.log('[DEBUG subscribeToGoals] Total goals procesados:', goals.length);
    callback(goals);
  }, (error) => {
    console.error('[DEBUG subscribeToGoals] ERROR:', error);
    console.error('[DEBUG subscribeToGoals] Error code:', error?.code);
    console.error('[DEBUG subscribeToGoals] Error message:', error?.message);
    callback([]);
  });
}

export async function createGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) {
  console.log('[DEBUG createGoal] Iniciando creación de meta:', JSON.stringify(goal, null, 2));
  console.log('[DEBUG createGoal] db instance:', db ? 'OK' : 'UNDEFINED');
  console.log('[DEBUG createGoal] COLLECTION:', COLLECTION);
  try {
    const now = Date.now();
    const data = { ...goal, createdAt: now, updatedAt: now };
    console.log('[DEBUG createGoal] Datos a guardar:', JSON.stringify(data, null, 2));
    const colRef = collection(db, COLLECTION);
    console.log('[DEBUG createGoal] Collection ref creada');
    const docRef = await addDoc(colRef, data);
    console.log('[DEBUG createGoal] Meta creada exitosamente con ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('[DEBUG createGoal] ERROR:', error);
    console.error('[DEBUG createGoal] Error code:', error?.code);
    console.error('[DEBUG createGoal] Error message:', error?.message);
    throw error;
  }
}

export async function createGoalWithId(goal: Goal) {
  const docRef = doc(db, COLLECTION, goal.id);
  await setDoc(docRef, {
    ...goal,
    createdAt: goal.createdAt || Date.now(),
    updatedAt: Date.now(),
  });
  return goal.id;
}

export async function updateGoal(goalId: string, updates: Partial<Goal>) {
  console.log('[DEBUG updateGoal] Actualizando meta:', goalId, 'con:', JSON.stringify(updates, null, 2));
  try {
    const docRef = doc(db, COLLECTION, goalId);
    console.log('[DEBUG updateGoal] Doc ref creado');
    const data = { ...updates, updatedAt: Date.now() };
    await updateDoc(docRef, data);
    console.log('[DEBUG updateGoal] Meta actualizada exitosamente');
  } catch (error: any) {
    console.error('[DEBUG updateGoal] ERROR:', error);
    console.error('[DEBUG updateGoal] Error code:', error?.code);
    console.error('[DEBUG updateGoal] Error message:', error?.message);
    throw error;
  }
}

export async function deleteGoal(goalId: string) {
  console.log('[DEBUG deleteGoal] Eliminando meta:', goalId);
  try {
    await deleteDoc(doc(db, COLLECTION, goalId));
    console.log('[DEBUG deleteGoal] Meta eliminada exitosamente');
  } catch (error: any) {
    console.error('[DEBUG deleteGoal] ERROR:', error);
    console.error('[DEBUG deleteGoal] Error code:', error?.code);
    console.error('[DEBUG deleteGoal] Error message:', error?.message);
    throw error;
  }
}

export async function getGoalsByUserId(userId: string): Promise<Goal[]> {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const goals: Goal[] = [];
  snapshot.forEach((docSnap) => {
    goals.push({ id: docSnap.id, ...docSnap.data() } as Goal);
  });
  goals.sort((a, b) => b.createdAt - a.createdAt);
  return goals;
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
