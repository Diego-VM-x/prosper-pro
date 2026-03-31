import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Transaction, WeeklyData } from '@/types';

const COLLECTION = 'transactions';

export function subscribeToTransactions(userId: string, callback: (transactions: Transaction[]) => void) {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const transactions: Transaction[] = [];
    snapshot.forEach((docSnap) => {
      transactions.push({ id: docSnap.id, ...docSnap.data() } as Transaction);
    });
    transactions.sort((a, b) => b.date - a.date);
    callback(transactions);
  }, (error) => {
    console.error('subscribeToTransactions error:', error);
    callback([]);
  });
}

export function subscribeToWeeklyData(userId: string, callback: (data: WeeklyData[]) => void) {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
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
    console.error('subscribeToWeeklyData error:', error);
    callback(getDefaultWeeklyData());
  });
}

export async function getMonthlySavings(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const q = query(collection(db, COLLECTION), where('userId', '==', userId), where('type', '==', 'saving'));
  try {
    const snapshot = await getDocs(q);
    let total = 0;
    snapshot.forEach((docSnap) => {
      const t = docSnap.data() as Transaction;
      if (t.date >= startOfMonth) total += t.amount;
    });
    return total;
  } catch (err) {
    console.error('getMonthlySavings error:', err);
    return 0;
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
