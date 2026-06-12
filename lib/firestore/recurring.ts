import { db, collection, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs, onSnapshot, type QuerySnapshot, type DocumentData } from '../firebase';
import type { RecurringPayment, FinancialPlan, RecurringFrequency, CurrencyCode, ExchangeRates } from '@/types';
import { convertCurrency } from '@/lib/currency';

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
export function calculateNextDueDate(currentDate: string, frequency: RecurringFrequency): string {
  const date = new Date(currentDate + 'T12:00:00');

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
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

/**
 * Verifica planes recurrentes cuyo nextDueDate ya pasó y los reinicia:
 * - current = 0
 * - nextDueDate avanza al próximo ciclo válido
 * Útil para reiniciar planes a medianoche o al abrir la app.
 */
export async function checkAndResetRecurringPlans(ownerId: string): Promise<number> {
  const plansRef = collection(db, 'plans');
  const q = query(plansRef, where('ownerId', '==', ownerId), where('type', '==', 'recurring'));
  const snapshot = await getDocs(q);

  const today = new Date().toISOString().split('T')[0];
  let resetCount = 0;

  const promises: Promise<void>[] = [];

  snapshot.forEach((docSnap) => {
    const plan = { id: docSnap.id, ...docSnap.data() } as FinancialPlan;
    if (!plan.nextDueDate || plan.nextDueDate >= today) return;
    if (plan.status !== 'progress' && plan.status !== 'pending') return;

    // Avanzar nextDueDate hasta que sea >= hoy (por si la app no se abrió en varios ciclos)
    let nextDue = plan.nextDueDate;
    while (nextDue < today) {
      nextDue = calculateNextDueDate(nextDue, plan.frequency || 'monthly');
    }

    promises.push(
      updateDoc(doc(db, 'plans', plan.id), {
        current: 0,
        nextDueDate: nextDue,
        updatedAt: Date.now(),
      }).then(() => { resetCount++; }).catch(() => {})
    );
  });

  await Promise.all(promises);
  return resetCount;
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
// Normaliza cada plan a la moneda base del usuario antes de sumar.
export async function getMonthlyRecurringSummary(
  ownerId: string,
  baseCurrency: CurrencyCode,
  rates: ExchangeRates['rates']
) {
  const plansRef = collection(db, 'plans');
  const q = query(plansRef, where('ownerId', '==', ownerId), where('type', '==', 'recurring'), where('status', '==', 'progress'));
  const snapshot = await getDocs(q);

  let totalMonthly = 0;
  const plans: { title: string; amount: number; currency: CurrencyCode; frequency: string; nextDue: string }[] = [];

  snapshot.forEach((docSnap) => {
    const plan = docSnap.data();
    const planCurrency = (plan.currency as CurrencyCode) || baseCurrency;

    // Normalizar el target a la moneda base antes de aplicar la frecuencia
    let monthlyAmount = convertCurrency(Number(plan.target), planCurrency, baseCurrency, rates);

    // Convertir a mensual según frecuencia
    switch (plan.frequency) {
      case 'weekly':
        monthlyAmount = monthlyAmount * 4.33;
        break;
      case 'biweekly':
        monthlyAmount = monthlyAmount * 2.17;
        break;
      case 'quarterly':
        monthlyAmount = monthlyAmount / 3;
        break;
      case 'yearly':
        monthlyAmount = monthlyAmount / 12;
        break;
    }

    totalMonthly += monthlyAmount;
    plans.push({
      title: plan.title,
      amount: monthlyAmount,
      currency: baseCurrency,
      frequency: plan.frequency,
      nextDue: plan.nextDueDate || 'N/A',
    });
  });

  return { totalMonthly, plans };
}
