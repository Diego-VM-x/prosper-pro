import { db, collection, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs, onSnapshot, increment, type QuerySnapshot, type DocumentData } from '../firebase';
import type { FinancialPlan, PlanType, PlanStatus, CurrencyCode, ExchangeRates, RecurringFrequency, SubPlan, SubPlanStatus } from '@/types';
import { convertCurrency } from '@/lib/currency';
import { convertRecurringToMonthly } from './recurring';

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

// Helper: genera un id corto para sub-planes
function generateSubPlanId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Helper: recalcula current/target de un plan expense a partir de sus sub-planes,
// normalizando a la moneda del plan padre.
export function recalculatePlanFromSubPlans(
  plan: FinancialPlan,
  rates: ExchangeRates['rates']
): { target: number; current: number } {
  const planCurrency = plan.currency || 'USD';
  if (!plan.subPlans || plan.subPlans.length === 0) {
    return { target: plan.target, current: plan.current };
  }
  return plan.subPlans.reduce(
    (acc, sub) => ({
      target: acc.target + convertCurrency(sub.target, sub.currency, planCurrency, rates),
      current: acc.current + convertCurrency(sub.current, sub.currency, planCurrency, rates),
    }),
    { target: 0, current: 0 }
  );
}

// CRUD de sub-planes para planes expense
export async function addSubPlan(
  planId: string,
  subPlan: Omit<SubPlan, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'current'>,
  rates: ExchangeRates['rates']
) {
  const plan = await getPlan(planId);
  if (!plan) throw new Error('Plan no encontrado');
  if (plan.type !== 'expense') throw new Error('Solo los planes de gasto soportan sub-planes');

  const now = Date.now();
  const newSub: SubPlan = {
    ...subPlan,
    id: generateSubPlanId(),
    status: 'pending',
    current: 0,
    createdAt: now,
    updatedAt: now,
  };
  const subPlans = [...(plan.subPlans || []), newSub];
  const { target, current } = recalculatePlanFromSubPlans({ ...plan, subPlans }, rates);

  await updatePlan(planId, { subPlans, target, current });
}

export async function updateSubPlan(
  planId: string,
  subPlanId: string,
  updates: Partial<Omit<SubPlan, 'id' | 'createdAt'>>,
  rates: ExchangeRates['rates']
) {
  const plan = await getPlan(planId);
  if (!plan || !plan.subPlans) throw new Error('Plan o sub-plan no encontrado');

  const subPlans = plan.subPlans.map((sub) =>
    sub.id === subPlanId ? { ...sub, ...updates, updatedAt: Date.now() } : sub
  );
  const { target, current } = recalculatePlanFromSubPlans({ ...plan, subPlans }, rates);

  await updatePlan(planId, { subPlans, target, current });
}

export async function deleteSubPlan(planId: string, subPlanId: string, rates: ExchangeRates['rates']) {
  const plan = await getPlan(planId);
  if (!plan || !plan.subPlans) throw new Error('Plan o sub-plan no encontrado');

  const subPlans = plan.subPlans.filter((sub) => sub.id !== subPlanId);
  const { target, current } = recalculatePlanFromSubPlans({ ...plan, subPlans }, rates);

  await updatePlan(planId, { subPlans, target, current });
}

export async function recordSubPlanPayment(
  planId: string,
  subPlanId: string,
  amount: number,
  rates: ExchangeRates['rates']
) {
  const plan = await getPlan(planId);
  if (!plan || !plan.subPlans) throw new Error('Plan o sub-plan no encontrado');

  const subPlans = plan.subPlans.map((sub) => {
    if (sub.id !== subPlanId) return sub;
    const newCurrent = sub.current + amount;
    const completed = newCurrent >= sub.target && sub.target > 0;
    const newStatus: SubPlanStatus = completed ? 'completed' : 'progress';
    return {
      ...sub,
      current: newCurrent,
      status: newStatus,
      completedAt: completed ? Date.now() : sub.completedAt,
      updatedAt: Date.now(),
    };
  });
  const { target, current } = recalculatePlanFromSubPlans({ ...plan, subPlans }, rates);
  const allCompleted = subPlans.every((sub) => sub.status === 'completed');

  await updatePlan(planId, {
    subPlans,
    target,
    current,
    status: allCompleted ? 'completed' : 'progress',
    totalPaid: (plan.totalPaid || 0) + amount,
    updatedAt: Date.now(),
  });
}

// Resumen financiero del usuario
// Normaliza todos los montos a la moneda base antes de sumar.
export async function getPlanSummary(
  ownerId: string,
  baseCurrency: CurrencyCode,
  rates: ExchangeRates['rates']
) {
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

    const planCurrency = plan.currency || baseCurrency;

    if (plan.type === 'savings') {
      totalSavingsTarget += convertCurrency(plan.target, planCurrency, baseCurrency, rates);
      totalSavingsCurrent += convertCurrency(plan.current, planCurrency, baseCurrency, rates);
    } else if (plan.type === 'expense') {
      if (plan.subPlans && plan.subPlans.length > 0) {
        plan.subPlans.forEach((sub) => {
          totalExpenseTarget += convertCurrency(sub.target, sub.currency, baseCurrency, rates);
          totalExpenseCurrent += convertCurrency(sub.current, sub.currency, baseCurrency, rates);
        });
      } else {
        totalExpenseTarget += convertCurrency(plan.target, planCurrency, baseCurrency, rates);
        totalExpenseCurrent += convertCurrency(plan.current, planCurrency, baseCurrency, rates);
      }
    } else if (plan.type === 'recurring') {
      const monthlyAmount = convertRecurringToMonthly(
        convertCurrency(plan.target, planCurrency, baseCurrency, rates),
        (plan.frequency as RecurringFrequency) || 'monthly'
      );
      totalRecurringMonthly += monthlyAmount;
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
    totalExpenseProgress: totalExpenseTarget > 0 ? Math.round((totalExpenseCurrent / totalExpenseTarget) * 100) : 0,
    totalRecurringMonthly,
    activePlans,
    completedPlans,
    totalPlans: plans.filter(p => p.status !== 'cancelled').length,
  };
}
