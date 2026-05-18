import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  increment,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { FinancialAccount } from '@/types';

const COLLECTION = 'accounts';

// Suscribirse a cuentas del usuario
export function subscribeToAccounts(ownerId: string, callback: (accounts: FinancialAccount[]) => void) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const accounts: FinancialAccount[] = [];
    snapshot.forEach((docSnap) => {
      accounts.push({ id: docSnap.id, ...docSnap.data() } as FinancialAccount);
    });
    accounts.sort((a, b) => b.createdAt - a.createdAt);
    callback(accounts);
  }, (error) => {
    console.error('subscribeToAccounts error:', error);
    callback([]);
  });
}

// Obtener cuentas del usuario (una sola lectura)
export async function getAccountsByOwnerId(ownerId: string): Promise<FinancialAccount[]> {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  const accounts: FinancialAccount[] = [];
  snapshot.forEach((docSnap) => {
    accounts.push({ id: docSnap.id, ...docSnap.data() } as FinancialAccount);
  });
  accounts.sort((a, b) => b.createdAt - a.createdAt);
  return accounts;
}

// Crear cuenta
export async function createAccount(account: Omit<FinancialAccount, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), account);
  return docRef.id;
}

// Actualizar cuenta
export async function updateAccount(accountId: string, updates: Partial<FinancialAccount>) {
  await updateDoc(doc(db, COLLECTION, accountId), updates);
}

// Eliminar cuenta y todas sus transacciones
export async function deleteAccount(accountId: string) {
  // Eliminar todas las transacciones de esta cuenta
  const txsQuery = query(collection(db, 'transactions'), where('accountId', '==', accountId));
  const txsSnapshot = await getDocs(txsQuery);
  const deletePromises = txsSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);
  // Eliminar la cuenta
  await deleteDoc(doc(db, COLLECTION, accountId));
}

// Borrar historial de transacciones de una cuenta pero mantener el balance
// Las transacciones se marcan como 'archived' en lugar de eliminarse
export async function clearAccountHistory(accountId: string) {
  const txsQuery = query(collection(db, 'transactions'), where('accountId', '==', accountId));
  const txsSnapshot = await getDocs(txsQuery);
  const updatePromises = txsSnapshot.docs.map((docSnap) =>
    updateDoc(docSnap.ref, { archived: true, archivedAt: Date.now() })
  );
  await Promise.all(updatePromises);
}

// Eliminar transacciones de un tipo específico (income, expense, saving) de una cuenta
export async function deleteTransactionsByType(accountId: string, type: 'income' | 'expense' | 'saving') {
  const txsQuery = query(collection(db, 'transactions'), where('accountId', '==', accountId), where('type', '==', type));
  const txsSnapshot = await getDocs(txsQuery);
  const deletePromises = txsSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);
}

// Resetear el balance de una cuenta a 0
export async function resetAccountBalance(accountId: string) {
  await updateDoc(doc(db, COLLECTION, accountId), {
    balance: 0,
    updatedAt: Date.now(),
  });
}

// Eliminar TODO el historial de transacciones del usuario (todas las cuentas)
export async function clearAllTransactionHistory(ownerId: string) {
  const txsQuery = query(collection(db, 'transactions'), where('ownerId', '==', ownerId));
  const txsSnapshot = await getDocs(txsQuery);
  const updatePromises = txsSnapshot.docs.map((docSnap) =>
    updateDoc(docSnap.ref, { archived: true, archivedAt: Date.now() })
  );
  await Promise.all(updatePromises);
}

// Actualizar balance de una cuenta
export async function updateAccountBalance(accountId: string, amount: number) {
  await updateDoc(doc(db, COLLECTION, accountId), {
    balance: increment(amount),
    updatedAt: Date.now(),
  });
}

// Obtener balance total del usuario
export async function getTotalBalance(ownerId: string): Promise<number> {
  const accounts = await getAccountsByOwnerId(ownerId);
  return accounts.reduce((sum, acc) => sum + acc.balance, 0);
}

// Crear cuentas por defecto para un usuario
export async function createDefaultAccounts(ownerId: string) {
  const defaultAccounts: Omit<FinancialAccount, 'id'>[] = [
    {
      ownerId,
      name: 'Cuenta Corriente',
      type: 'checking',
      balance: 0,
      icon: '🏦',
      color: '#3B82F6',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      ownerId,
      name: 'Cuenta de Ahorro',
      type: 'savings',
      balance: 0,
      icon: '💰',
      color: '#3DCC8E',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      ownerId,
      name: 'Efectivo',
      type: 'cash',
      balance: 0,
      icon: '💵',
      color: '#F59E0B',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  for (const acc of defaultAccounts) {
    await addDoc(collection(db, COLLECTION), acc);
  }
}

// ============================================================
// GESTIÓN CONTABLE AVANZADA
// ============================================================

// Recalcular el balance de una cuenta basado en sus transacciones activas
// Lógica contable: income (+) expense (-) saving (-)
export async function recalculateAccountBalance(accountId: string): Promise<number> {
  const txsQuery = query(
    collection(db, 'transactions'),
    where('accountId', '==', accountId)
  );
  const txsSnapshot = await getDocs(txsQuery);

  let calculatedBalance = 0;
  txsSnapshot.forEach((docSnap) => {
    const tx = docSnap.data();
    if (tx.archived) return; // Ignorar transacciones archivadas

    if (tx.type === 'income') calculatedBalance += tx.amount;
    else if (tx.type === 'expense') calculatedBalance -= tx.amount;
    else if (tx.type === 'saving') calculatedBalance -= tx.amount;
  });

  await updateDoc(doc(db, COLLECTION, accountId), {
    balance: calculatedBalance,
    updatedAt: Date.now(),
  });

  return calculatedBalance;
}

// Recalcular TODOS los balances del usuario
export async function recalculateAllBalances(ownerId: string): Promise<{ accountId: string; balance: number }[]> {
  const accounts = await getAccountsByOwnerId(ownerId);
  const results: { accountId: string; balance: number }[] = [];

  for (const acc of accounts) {
    const newBalance = await recalculateAccountBalance(acc.id);
    results.push({ accountId: acc.id, balance: newBalance });
  }

  return results;
}

// Vaciar TODAS las transacciones de una cuenta y recalcular balance a 0
// Elimina físicamente las transacciones (no las archiva)
export async function wipeAllTransactions(accountId: string): Promise<void> {
  // Primero obtener todas las transacciones para eliminar
  const txsQuery = query(collection(db, 'transactions'), where('accountId', '==', accountId));
  const txsSnapshot = await getDocs(txsQuery);

  // Eliminar todas las transacciones
  const deletePromises = txsSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);

  // Resetear balance a 0
  await updateDoc(doc(db, COLLECTION, accountId), {
    balance: 0,
    updatedAt: Date.now(),
  });
}

// Vaciar transacciones de un tipo específico con ajuste contable
// income: resta del balance (porque se eliminan ingresos)
// expense: suma al balance (porque se eliminan gastos)
// saving: suma al balance (porque se eliminan ahorros)
export async function wipeTransactionsByTypeWithAdjustment(
  accountId: string,
  type: 'income' | 'expense' | 'saving'
): Promise<{ wipedCount: number; balanceAdjustment: number }> {
  const txsQuery = query(
    collection(db, 'transactions'),
    where('accountId', '==', accountId),
    where('type', '==', type)
  );
  const txsSnapshot = await getDocs(txsQuery);

  let totalAmount = 0;
  const deletePromises = txsSnapshot.docs.map((docSnap) => {
    const tx = docSnap.data();
    totalAmount += tx.amount || 0;
    return deleteDoc(docSnap.ref);
  });

  await Promise.all(deletePromises);

  // Ajuste contable:
  // - Si elimino ingresos: el balance baja (se restan)
  // - Si elimino gastos: el balance sube (se devuelven)
  // - Si elimino ahorros: el balance sube (se devuelven)
  const adjustment = type === 'income' ? -totalAmount : totalAmount;

  if (adjustment !== 0) {
    await updateDoc(doc(db, COLLECTION, accountId), {
      balance: increment(adjustment),
      updatedAt: Date.now(),
    });
  }

  return { wipedCount: txsSnapshot.docs.length, balanceAdjustment: adjustment };
}

// Vaciar transacciones de una cuenta por rango de fechas
export async function wipeTransactionsByDateRange(
  accountId: string,
  startDate: number,
  endDate: number
): Promise<{ wipedCount: number }> {
  const txsQuery = query(
    collection(db, 'transactions'),
    where('accountId', '==', accountId)
  );
  const txsSnapshot = await getDocs(txsQuery);

  let wipedCount = 0;
  const deletePromises: Promise<void>[] = [];

  txsSnapshot.forEach((docSnap) => {
    const tx = docSnap.data();
    if (tx.date >= startDate && tx.date <= endDate) {
      wipedCount++;
      deletePromises.push(deleteDoc(docSnap.ref));
    }
  });

  await Promise.all(deletePromises);

  // Recalcular balance después de eliminar
  await recalculateAccountBalance(accountId);

  return { wipedCount };
}

// Vaciar TODAS las transacciones del usuario (todas las cuentas)
// Recalcula todos los balances a 0
export async function wipeAllUserTransactions(ownerId: string): Promise<void> {
  const accounts = await getAccountsByOwnerId(ownerId);

  // Eliminar todas las transacciones del usuario
  const txsQuery = query(collection(db, 'transactions'), where('ownerId', '==', ownerId));
  const txsSnapshot = await getDocs(txsQuery);
  const deletePromises = txsSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);

  // Resetear todos los balances a 0
  const updatePromises = accounts.map((acc) =>
    updateDoc(doc(db, COLLECTION, acc.id), {
      balance: 0,
      updatedAt: Date.now(),
    })
  );
  await Promise.all(updatePromises);
}

// Vaciar transacciones por tipo para TODAS las cuentas del usuario
export async function wipeUserTransactionsByType(
  ownerId: string,
  type: 'income' | 'expense' | 'saving'
): Promise<{ totalWiped: number; adjustments: { accountId: string; adjustment: number }[] }> {
  const accounts = await getAccountsByOwnerId(ownerId);
  const adjustments: { accountId: string; adjustment: number }[] = [];
  let totalWiped = 0;

  for (const acc of accounts) {
    const result = await wipeTransactionsByTypeWithAdjustment(acc.id, type);
    totalWiped += result.wipedCount;
    if (result.balanceAdjustment !== 0) {
      adjustments.push({ accountId: acc.id, adjustment: result.balanceAdjustment });
    }
  }

  return { totalWiped, adjustments };
}
