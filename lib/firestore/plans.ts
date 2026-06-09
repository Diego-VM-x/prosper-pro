import { db, collection, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs, onSnapshot, increment, type QuerySnapshot, type DocumentData } from '../firebase';
import type { FinancialPlan, PlanType, PlanStatus } from '@/types';

const COLLECTION = 'plans';

// Suscribirse a planes del usuario
export function subscribeToPlans(ownerId: string, callback: (plans: FinancialPlan[]) => void) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const plans: FinancialPlan[] = [];
    snapshot.forEach((docSnap) => {
      plans.push({ id: docSnap.id, ...docSnap.data() } as FinancialPlan);
    });
    plans.sort((a, b) => b.createdAt - a.createdAt);
    callback(plans);
  }, (error) => {
    console.error('subscribeToPlans error:', error);
    callback([]);
  });
}

// Obtener planes del usuario (una sola lectura)
export async function getPlansByOwnerId(ownerId: string): Promise<FinancialPlan[]> {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  const plans: FinancialPlan[] = [];
  snapshot.forEach((docSnap) => {
    plans.push({ id: docSnap.id, ...docSnap.data() } as FinancialPlan);
  });
  plans.sort((a, b) => b.createdAt - a.createdAt);
  return plans;
}

// Obtener planes compartidos con el usuario (sharedWith lo contiene)
export async function getSharedPlans(ownerId: string): Promise<FinancialPlan[]> {
  const q = query(collection(db, COLLECTION), where('sharedWith', 'array-contains', ownerId));
  const snapshot = await getDocs(q);
  const plans: FinancialPlan[] = [];
  snapshot.forEach((docSnap) => {
    plans.push({ id: docSnap.id, ...docSnap.data() } as FinancialPlan);
  });
  plans.sort((a, b) => b.createdAt - a.createdAt);
  return plans;
}

// Suscribirse a planes compartidos en tiempo real
export function subscribeToSharedPlans(ownerId: string, callback: (plans: FinancialPlan[]) => void) {
  const q = query(collection(db, COLLECTION), where('sharedWith', 'array-contains', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const plans: FinancialPlan[] = [];
    snapshot.forEach((docSnap) => {
      plans.push({ id: docSnap.id, ...docSnap.data() } as FinancialPlan);
    });
    plans.sort((a, b) => b.createdAt - a.createdAt);
    callback(plans);
  }, (error) => {
    console.error('subscribeToSharedPlans error:', error);
    callback([]);
  });
}

// Crear plan financiero
export async function createPlan(plan: Omit<FinancialPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = Date.now();
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...plan,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// Actualizar plan
export async function updatePlan(planId: string, updates: Partial<FinancialPlan>) {
  await updateDoc(doc(db, COLLECTION, planId), {
    ...updates,
    updatedAt: Date.now(),
  });
}

// Eliminar plan
export async function deletePlan(planId: string) {
  await deleteDoc(doc(db, COLLECTION, planId));
}

// Añadir fondos a plan de ahorro
export async function addFundsToPlan(planId: string, amount: number) {
  const plansRef = doc(db, COLLECTION, planId);
  await updateDoc(plansRef, {
    current: increment(amount),
    updatedAt: Date.now(),
  });
}

// Registrar pago en plan de gasto
export async function recordPayment(planId: string, amount: number) {
  const plansRef = doc(db, COLLECTION, planId);
  await updateDoc(plansRef, {
    current: increment(amount),
    updatedAt: Date.now(),
  });
}

// Completar plan
export async function completePlan(planId: string) {
  await updatePlan(planId, { status: 'completed', updatedAt: Date.now() });
}

// Cancelar plan
export async function cancelPlan(planId: string) {
  await updatePlan(planId, { status: 'cancelled', updatedAt: Date.now() });
}

// Reiniciar plan (volver a pending con current = 0)
export async function resetPlan(planId: string) {
  await updatePlan(planId, {
    current: 0,
    status: 'pending',
    updatedAt: Date.now(),
  });
}

// Obtener plan por ID
export async function getPlan(planId: string): Promise<FinancialPlan | null> {
  const docSnap = await getDocs(query(collection(db, COLLECTION), where('__name__', '==', planId)));
  if (docSnap.empty) return null;
  return { id: docSnap.docs[0].id, ...docSnap.docs[0].data() } as FinancialPlan;
}

// Obtener planes por tipo
export async function getPlansByType(ownerId: string, type: PlanType): Promise<FinancialPlan[]> {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId), where('type', '==', type));
  const snapshot = await getDocs(q);
  const plans: FinancialPlan[] = [];
  snapshot.forEach((docSnap) => {
    plans.push({ id: docSnap.id, ...docSnap.data() } as FinancialPlan);
  });
  return plans;
}

// Obtener planes por estado
export async function getPlansByStatus(ownerId: string, status: PlanStatus): Promise<FinancialPlan[]> {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId), where('status', '==', status));
  const snapshot = await getDocs(q);
  const plans: FinancialPlan[] = [];
  snapshot.forEach((docSnap) => {
    plans.push({ id: docSnap.id, ...docSnap.data() } as FinancialPlan);
  });
  return plans;
}

// Resumen financiero del usuario
export async function getPlanSummary(ownerId: string) {
  const plans = await getPlansByOwnerId(ownerId);

  let totalSavingsTarget = 0;
  let totalSavingsCurrent = 0;
  let totalExpenseTarget = 0;
  let totalExpenseCurrent = 0;
  let totalRecurringMonthly = 0;
  let activePlans = 0;
  let completedPlans = 0;

  plans.forEach((plan) => {
    if (plan.status === 'cancelled') return;

    if (plan.type === 'savings') {
      totalSavingsTarget += plan.target;
      totalSavingsCurrent += plan.current;
    } else if (plan.type === 'expense') {
      totalExpenseTarget += plan.target;
      totalExpenseCurrent += plan.current;
    } else if (plan.type === 'recurring') {
      totalRecurringMonthly += plan.target;
    }

    if (plan.status === 'progress') activePlans++;
    if (plan.status === 'completed') completedPlans++;
  });

  return {
    totalSavingsTarget,
    totalSavingsCurrent,
    totalSavingsProgress: totalSavingsTarget > 0 ? Math.round((totalSavingsCurrent / totalSavingsTarget) * 100) : 0,
    totalExpenseTarget,
    totalExpenseCurrent,
    totalExpenseProgress: totalExpenseTarget > 0 ? Math.round((totalExpenseCurrent / totalSavingsTarget) * 100) : 0,
    totalRecurringMonthly,
    activePlans,
    completedPlans,
    totalPlans: plans.filter(p => p.status !== 'cancelled').length,
  };
}
