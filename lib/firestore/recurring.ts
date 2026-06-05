import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { RecurringPayment, FinancialPlan, RecurringFrequency } from '@/types';

const COLLECTION = 'recurring_payments';

// Registrar pago de gasto recurrente
export async function recordRecurringPayment(payment: Omit<RecurringPayment, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...payment,
    createdAt: Date.now(),
  });

  // Actualizar el plan con el pago
  const planRef = doc(db, 'plans', payment.planId);
  await updateDoc(planRef, {
    current: (await getDocs(query(collection(db, 'plans'), where('__name__', '==', payment.planId)))).docs[0]?.data().current || 0 + payment.amount,
    lastPaidDate: payment.paidDate,
    nextDueDate: calculateNextDueDate((await getDocs(query(collection(db, 'plans'), where('__name__', '==', payment.planId)))).docs[0]?.data().nextDueDate || payment.paidDate, (await getDocs(query(collection(db, 'plans'), where('__name__', '==', payment.planId)))).docs[0]?.data().frequency || 'monthly'),
    totalPaid: ((await getDocs(query(collection(db, 'plans'), where('__name__', '==', payment.planId)))).docs[0]?.data().totalPaid || 0) + payment.amount,
    updatedAt: Date.now(),
  });

  return docRef.id;
}

// Calcular próxima fecha de pago según frecuencia
function calculateNextDueDate(currentDate: string, frequency: RecurringFrequency): string {
  const date = new Date(currentDate + 'T12:00:00');

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString().split('T')[0];
}

// Obtener pagos de un plan
export async function getPaymentsByPlan(planId: string): Promise<RecurringPayment[]> {
  const q = query(collection(db, COLLECTION), where('planId', '==', planId));
  const snapshot = await getDocs(q);
  const payments: RecurringPayment[] = [];
  snapshot.forEach((docSnap) => {
    payments.push({ id: docSnap.id, ...docSnap.data() } as RecurringPayment);
  });
  payments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return payments;
}

// Suscribirse a pagos de un plan
export function subscribeToPlanPayments(planId: string, callback: (payments: RecurringPayment[]) => void) {
  const q = query(collection(db, COLLECTION), where('planId', '==', planId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const payments: RecurringPayment[] = [];
    snapshot.forEach((docSnap) => {
      payments.push({ id: docSnap.id, ...docSnap.data() } as RecurringPayment);
    });
    payments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(payments);
  }, (error) => {
    console.error('subscribeToPlanPayments error:', error);
    callback([]);
  });
}

// Obtener pagos del usuario
export async function getPaymentsByOwner(ownerId: string): Promise<RecurringPayment[]> {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  const payments: RecurringPayment[] = [];
  snapshot.forEach((docSnap) => {
    payments.push({ id: docSnap.id, ...docSnap.data() } as RecurringPayment);
  });
  return payments;
}

// Eliminar pago
export async function deletePayment(paymentId: string) {
  await deleteDoc(doc(db, COLLECTION, paymentId));
}

// Obtener planes recurrentes vencidos (próximos a pagar)
export async function getDueRecurringPlans(ownerId: string): Promise<FinancialPlan[]> {
  const plansRef = collection(db, 'plans');
  const q = query(plansRef, where('ownerId', '==', ownerId), where('type', '==', 'recurring'));
  const snapshot = await getDocs(q);

  const today = new Date().toISOString().split('T')[0];
  const duePlans: FinancialPlan[] = [];

  snapshot.forEach((docSnap) => {
    const plan = { id: docSnap.id, ...docSnap.data() } as FinancialPlan;
    if (plan.nextDueDate && plan.nextDueDate <= today && plan.status === 'progress') {
      duePlans.push(plan);
    }
  });

  return duePlans;
}

// Resumen de gastos recurrentes mensuales
export async function getMonthlyRecurringSummary(ownerId: string) {
  const plansRef = collection(db, 'plans');
  const q = query(plansRef, where('ownerId', '==', ownerId), where('type', '==', 'recurring'), where('status', '==', 'progress'));
  const snapshot = await getDocs(q);

  let totalMonthly = 0;
  const plans: { title: string; amount: number; frequency: string; nextDue: string }[] = [];

  snapshot.forEach((docSnap) => {
    const plan = docSnap.data();
    let monthlyAmount = plan.target;

    // Convertir a mensual según frecuencia
    switch (plan.frequency) {
      case 'weekly':
        monthlyAmount = plan.target * 4.33;
        break;
      case 'biweekly':
        monthlyAmount = plan.target * 2.17;
        break;
      case 'quarterly':
        monthlyAmount = plan.target / 3;
        break;
      case 'yearly':
        monthlyAmount = plan.target / 12;
        break;
    }

    totalMonthly += monthlyAmount;
    plans.push({
      title: plan.title,
      amount: monthlyAmount,
      frequency: plan.frequency,
      nextDue: plan.nextDueDate || 'N/A',
    });
  });

  return { totalMonthly, plans };
}
