import { db, collection, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs, onSnapshot, type QuerySnapshot, type DocumentData } from '../firebase';
import type { Transaction, WeeklyData } from '@/types';

const COLLECTION = 'transactions';

export function subscribeToAllTransactions(ownerId: string, callback: (transactions: Transaction[]) => void) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const transactions: Transaction[] = [];
    snapshot.forEach((docSnap) => {
      transactions.push({ id: docSnap.id, ...docSnap.data() } as Transaction);
    });
    transactions.sort((a, b) => b.date - a.date);
    callback(transactions);
  }, (error) => {
    console.error('subscribeToAllTransactions error:', error);
    callback([]);
  });
}

export function subscribeToTransactions(ownerId: string, callback: (transactions: Transaction[]) => void) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const transactions: Transaction[] = [];
    snapshot.forEach((docSnap) => {
      const tx = { id: docSnap.id, ...docSnap.data() } as Transaction;
      if (!tx.archived) transactions.push(tx);
    });
    transactions.sort((a, b) => b.date - a.date);
    callback(transactions);
  }, (error) => {
    console.error('subscribeToTransactions error:', error);
    callback([]);
  });
}

export function subscribeToWeeklyDataAll(ownerId: string, callback: (data: WeeklyData[]) => void) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const days = ['D', 'L', 'M', 'Mi', 'J', 'V', 'S'];
    const data: WeeklyData[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      data.push({ day: days[d.getDay()], income: 0, saving: 0 });
    }
    snapshot.forEach((docSnap) => {
      const t = docSnap.data() as Transaction;
      const tDate = new Date(t.date);
      const diff = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < 7) {
        const idx = 6 - diff;
        if (t.type === 'income') data[idx].income += t.amount;
        if (t.type === 'saving') data[idx].saving += t.amount;
      }
    });
    const maxVal = Math.max(...data.flatMap((d) => [d.income, d.saving]), 1);
    const normalized = data.map((d) => ({
      day: d.day,
      income: Math.round((d.income / maxVal) * 100),
      saving: Math.round((d.saving / maxVal) * 100),
    }));
    callback(normalized);
  }, (error) => {
    console.error('subscribeToWeeklyDataAll error:', error);
    callback(getDefaultWeeklyData());
  });
}

export function subscribeToWeeklyData(ownerId: string, callback: (data: WeeklyData[]) => void) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const days = ['D', 'L', 'M', 'Mi', 'J', 'V', 'S'];
    const data: WeeklyData[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      data.push({ day: days[d.getDay()], income: 0, saving: 0 });
    }
    snapshot.forEach((docSnap) => {
      const t = docSnap.data() as Transaction;
      if (t.archived) return;
      const tDate = new Date(t.date);
      const diff = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < 7) {
        const idx = 6 - diff;
        if (t.type === 'income') data[idx].income += t.amount;
        if (t.type === 'saving') data[idx].saving += t.amount;
      }
    });
    const maxVal = Math.max(...data.flatMap((d) => [d.income, d.saving]), 1);
    const normalized = data.map((d) => ({
      day: d.day,
      income: Math.round((d.income / maxVal) * 100),
      saving: Math.round((d.saving / maxVal) * 100),
    }));
    callback(normalized);
  }, (error) => {
    console.error('subscribeToWeeklyData error:', error);
    callback(getDefaultWeeklyData());
  });
}

export async function getMonthlySavings(ownerId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId), where('type', '==', 'saving'));
  try {
    const snapshot = await getDocs(q);
    let total = 0;
    snapshot.forEach((docSnap) => {
      const t = docSnap.data() as Transaction;
      if (t.archived) return;
      if (t.date >= startOfMonth) total += t.amount;
    });
    return total;
  } catch (err) {
    console.error('getMonthlySavings error:', err);
    return 0;
  }
}

export async function createTransaction(transaction: Omit<Transaction, 'id'>) {
  const docRef = await addDoc(collection(db, COLLECTION), transaction);
  return docRef.id;
}

export async function updateTransaction(transactionId: string, updates: Partial<Transaction>) {
  await updateDoc(doc(db, COLLECTION, transactionId), updates);
}

export async function deleteTransaction(transactionId: string) {
  await deleteDoc(doc(db, COLLECTION, transactionId));
}

export async function getAllTransactionsByOwnerId(ownerId: string): Promise<Transaction[]> {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  const transactions: Transaction[] = [];
  snapshot.forEach((docSnap) => {
    transactions.push({ id: docSnap.id, ...docSnap.data() } as Transaction);
  });
  transactions.sort((a, b) => b.date - a.date);
  return transactions;
}

export async function getTransactionsByOwnerId(ownerId: string): Promise<Transaction[]> {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  const transactions: Transaction[] = [];
  snapshot.forEach((docSnap) => {
    const tx = { id: docSnap.id, ...docSnap.data() } as Transaction;
    if (!tx.archived) transactions.push(tx);
  });
  transactions.sort((a, b) => b.date - a.date);
  return transactions;
}

export async function getArchivedTransactionsByOwnerId(ownerId: string): Promise<Transaction[]> {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId), where('archived', '==', true));
  const snapshot = await getDocs(q);
  const transactions: Transaction[] = [];
  snapshot.forEach((docSnap) => {
    transactions.push({ id: docSnap.id, ...docSnap.data() } as Transaction);
  });
  transactions.sort((a, b) => b.date - a.date);
  return transactions;
}

export function subscribeToArchivedTransactions(ownerId: string, callback: (transactions: Transaction[]) => void) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId), where('archived', '==', true));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const transactions: Transaction[] = [];
    snapshot.forEach((docSnap) => {
      transactions.push({ id: docSnap.id, ...docSnap.data() } as Transaction);
    });
    transactions.sort((a, b) => b.date - a.date);
    callback(transactions);
  }, (error) => {
    console.error('subscribeToArchivedTransactions error:', error);
    callback([]);
  });
}

export async function archiveTransactions(txIds: string[]) {
  const now = Date.now();
  await Promise.all(txIds.map((id) => updateDoc(doc(db, COLLECTION, id), { archived: true, archivedAt: now })));
}

export async function unarchiveTransactions(txIds: string[]) {
  await Promise.all(txIds.map((id) => updateDoc(doc(db, COLLECTION, id), { archived: false, archivedAt: null })));
}

export async function deleteTransactionsPermanently(txIds: string[]) {
  await Promise.all(txIds.map((id) => deleteDoc(doc(db, COLLECTION, id))));
}

// Obtener transacciones de ahorro vinculadas a una meta (por descripción que contiene el título de la meta)
export async function getGoalSavingsHistory(ownerId: string, goalTitle: string): Promise<Transaction[]> {
  const allTx = await getTransactionsByOwnerId(ownerId);
  return allTx.filter(
    (t) => t.type === 'saving' && t.description.toLowerCase().includes(goalTitle.toLowerCase())
  );
}

// Calcular crecimiento mensual para una meta
export async function getMonthlyGrowthForGoal(ownerId: string, goalTitle: string): Promise<number> {
  const savings = await getGoalSavingsHistory(ownerId, goalTitle);
  const now = new Date();
  const thisMonth = now.getMonth();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const thisYear = now.getFullYear();
  const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  let thisMonthTotal = 0;
  let lastMonthTotal = 0;

  savings.forEach((t) => {
    const tDate = new Date(t.date);
    if (tDate.getMonth() === thisMonth && tDate.getFullYear() === thisYear) {
      thisMonthTotal += t.amount;
    }
    if (tDate.getMonth() === lastMonth && tDate.getFullYear() === lastYear) {
      lastMonthTotal += t.amount;
    }
  });

  if (lastMonthTotal === 0) return thisMonthTotal > 0 ? 100 : 0;
  return Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);
}

// Calcular racha de días consecutivos con aportes a una meta
export async function getStreakDaysForGoal(ownerId: string, goalTitle: string): Promise<number> {
  const savings = await getGoalSavingsHistory(ownerId, goalTitle);
  if (savings.length === 0) return 0;

  // Obtener días únicos con aportes
  const uniqueDays = new Set(
    savings.map((t) => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;

    if (uniqueDays.has(key)) {
      streak++;
    } else {
      // Si es hoy y no hay aporte, no rompe la racha aún
      if (i === 0) continue;
      break;
    }
  }

  return streak;
}

export async function getMonthlySummaryAll(ownerId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  try {
    const snapshot = await getDocs(q);
    let income = 0, expenses = 0, saving = 0;
    snapshot.forEach((docSnap) => {
      const t = docSnap.data() as Transaction;
      if (t.date >= startOfMonth) {
        if (t.type === 'income') income += t.amount;
        else if (t.type === 'expense') expenses += t.amount;
        else if (t.type === 'saving') saving += t.amount;
      }
    });
    return { income, expenses, saving, balance: income - expenses - saving };
  } catch (err) {
    console.error('getMonthlySummaryAll error:', err);
    return { income: 0, expenses: 0, saving: 0, balance: 0 };
  }
}

export async function getLifetimeSummaryAll(ownerId: string) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  try {
    const snapshot = await getDocs(q);
    let income = 0, expenses = 0, saving = 0;
    snapshot.forEach((docSnap) => {
      const t = docSnap.data() as Transaction;
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expenses += t.amount;
      else if (t.type === 'saving') saving += t.amount;
    });
    return { income, expenses, saving, balance: income - expenses - saving };
  } catch (err) {
    console.error('getLifetimeSummaryAll error:', err);
    return { income: 0, expenses: 0, saving: 0, balance: 0 };
  }
}

export async function getLifetimeSummary(ownerId: string) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  try {
    const snapshot = await getDocs(q);
    let income = 0, expenses = 0, saving = 0;
    snapshot.forEach((docSnap) => {
      const t = docSnap.data() as Transaction;
      if (t.archived) return;
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expenses += t.amount;
      else if (t.type === 'saving') saving += t.amount;
    });
    return { income, expenses, saving, balance: income - expenses - saving };
  } catch (err) {
    console.error('getLifetimeSummary error:', err);
    return { income: 0, expenses: 0, saving: 0, balance: 0 };
  }
}

export async function getMonthlySummary(ownerId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  try {
    const snapshot = await getDocs(q);
    let income = 0, expenses = 0, saving = 0;
    snapshot.forEach((docSnap) => {
      const t = docSnap.data() as Transaction;
      if (t.archived) return;
      if (t.date >= startOfMonth) {
        if (t.type === 'income') income += t.amount;
        else if (t.type === 'expense') expenses += t.amount;
        else if (t.type === 'saving') saving += t.amount;
      }
    });
    return { income, expenses, saving, balance: income - expenses - saving };
  } catch (err) {
    console.error('getMonthlySummary error:', err);
    return { income: 0, expenses: 0, saving: 0, balance: 0 };
  }
}

function getDefaultWeeklyData() {
  return [
    { day: 'L', income: 40, saving: 55 },
    { day: 'M', income: 65, saving: 80 },
    { day: 'Mi', income: 50, saving: 90 },
    { day: 'J', income: 70, saving: 60 },
    { day: 'V', income: 55, saving: 75 },
    { day: 'S', income: 30, saving: 45 },
    { day: 'D', income: 25, saving: 35 },
  ];
}
