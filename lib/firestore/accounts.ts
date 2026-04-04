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
