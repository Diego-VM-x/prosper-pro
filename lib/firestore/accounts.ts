import { db, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, query, where, getDocs, increment, type QuerySnapshot, type DocumentData } from '../firebase';
import { cachedQuerySnapshot, cachedGetDocs } from './cachedOnSnapshot';
import type { FinancialAccount, AccountGroup } from '@/types';

const COLLECTION = 'accounts';
const GROUPS_COLLECTION = 'account_groups';

// Suscribirse a cuentas del usuario
export function subscribeToAccounts(ownerId: string, callback: (accounts: FinancialAccount[]) => void) {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  return cachedQuerySnapshot(
    q,
    `accounts_${ownerId}`,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const accounts: FinancialAccount[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        accounts.push({
          id: docSnap.id,
          ...data,
          currency: data.currency || 'USD',
        } as FinancialAccount);
      });
      accounts.sort((a, b) => b.createdAt - a.createdAt);
      return accounts;
    },
    callback
  );
}

// Obtener cuentas del usuario (una sola lectura)
export async function getAccountsByOwnerId(ownerId: string): Promise<FinancialAccount[]> {
  const q = query(collection(db, COLLECTION), where('ownerId', '==', ownerId));
  return cachedGetDocs(
    q,
    `accounts_${ownerId}`,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const accounts: FinancialAccount[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        accounts.push({
          id: docSnap.id,
          ...data,
          currency: data.currency || 'USD',
        } as FinancialAccount);
      });
      accounts.sort((a, b) => b.createdAt - a.createdAt);
      return accounts;
    }
  );
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

// ============================================================
// GESTIÓN CONTABLE AVANZADA
// ============================================================

// Recalcular el balance de una cuenta basado en sus transacciones activas
// Lógica contable: income (+) expense (-) saving (-)
// IMPORTANTE: El balance se mantiene en la moneda NATIVA de la cuenta
export async function recalculateAccountBalance(accountId: string): Promise<number> {
  // Primero obtener la cuenta para saber su moneda
  const accountDoc = await getDocs(query(collection(db, COLLECTION), where('__name__', '==', accountId)));
  let accountCurrency = 'BS'; // default
  if (!accountDoc.empty) {
    const accountData = accountDoc.docs[0].data();
    accountCurrency = accountData.currency || 'BS';
  }

  const txsQuery = query(
    collection(db, 'transactions'),
    where('accountId', '==', accountId)
  );
  const txsSnapshot = await getDocs(txsQuery);

  let calculatedBalance = 0;
  txsSnapshot.forEach((docSnap) => {
    const tx = docSnap.data();
    if (tx.archived) return; // Ignorar transacciones archivadas

    // Las transacciones ya están en la moneda de la cuenta (se guardan así al crearlas)
    // Simplemente sumamos/restamos los montos directamente
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

// ============================================================
// ELIMINACIÓN TOTAL DE DATOS DEL USUARIO
// ============================================================

// Borra TODOS los datos del usuario en Firestore (todas las colecciones)
// Maneja tanto ownerId como userId (legacy) para evitar datos huérfanos
export async function wipeAllUserData(ownerId: string): Promise<{ wiped: string[]; errors: string[] }> {
  const wiped: string[] = [];
  const errors: string[] = [];

  const collectionsToWipe = [
    'transactions',
    'accounts',
    'goals',
    'plans',
    'reminders',
    'notifications',
    'expense_requests',
    'recurring_payments',
    'feedback',
    'user_course_progress',
  ];

  for (const colName of collectionsToWipe) {
    try {
      // Borrar por ownerId
      const qOwner = query(collection(db, colName), where('ownerId', '==', ownerId));
      const snapOwner = await getDocs(qOwner);
      if (snapOwner.size > 0) {
        const deletePromises = snapOwner.docs.map((docSnap) => deleteDoc(docSnap.ref));
        await Promise.all(deletePromises);
        wiped.push(`${colName} (${snapOwner.size} docs por ownerId)`);
      }

      // Borrar por userId (legacy)
      const qUser = query(collection(db, colName), where('userId', '==', ownerId));
      const snapUser = await getDocs(qUser);
      if (snapUser.size > 0) {
        const deletePromises = snapUser.docs.map((docSnap) => deleteDoc(docSnap.ref));
        await Promise.all(deletePromises);
        wiped.push(`${colName} (${snapUser.size} docs por userId legacy)`);
      }
    } catch (err) {
      errors.push(`${colName}: ${err}`);
    }
  }

  // También borrar solicitudes donde el usuario es receptor (toOwnerId)
  try {
    const receivedQ = query(collection(db, 'expense_requests'), where('toOwnerId', '==', ownerId));
    const receivedSnap = await getDocs(receivedQ);
    if (receivedSnap.size > 0) {
      const deletePromises = receivedSnap.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
      wiped.push(`expense_requests received (${receivedSnap.size} docs)`);
    }
  } catch (err) {
    errors.push(`expense_requests (received): ${err}`);
  }

  // Borrar perfil de usuario
  try {
    await deleteDoc(doc(db, 'users', ownerId));
    wiped.push('users (profile)');
  } catch (err) {
    errors.push(`users: ${err}`);
  }

  return { wiped, errors };
}

// ============================================================
// ACCOUNT GROUPS
// ============================================================

export function subscribeToAccountGroups(ownerId: string, callback: (groups: AccountGroup[]) => void) {
  const q = query(collection(db, GROUPS_COLLECTION), where('ownerId', '==', ownerId));
  return cachedQuerySnapshot(
    q,
    `account_groups_${ownerId}`,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const groups: AccountGroup[] = [];
      snapshot.forEach((docSnap) => {
        groups.push({ id: docSnap.id, ...docSnap.data() } as AccountGroup);
      });
      groups.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return groups;
    },
    callback
  );
}

export async function getAccountGroupsByOwnerId(ownerId: string): Promise<AccountGroup[]> {
  const q = query(collection(db, GROUPS_COLLECTION), where('ownerId', '==', ownerId));
  return cachedGetDocs(
    q,
    `account_groups_${ownerId}`,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const groups: AccountGroup[] = [];
      snapshot.forEach((docSnap) => {
        groups.push({ id: docSnap.id, ...docSnap.data() } as AccountGroup);
      });
      groups.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return groups;
    }
  );
}

export async function createAccountGroup(group: Omit<AccountGroup, 'id'>): Promise<string> {
  const now = Date.now();
  const docRef = await addDoc(collection(db, GROUPS_COLLECTION), {
    ...group,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateAccountGroup(groupId: string, updates: Partial<AccountGroup>) {
  await updateDoc(doc(db, GROUPS_COLLECTION, groupId), {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteAccountGroup(groupId: string) {
  await deleteDoc(doc(db, GROUPS_COLLECTION, groupId));
}

export async function moveAccountToGroup(accountId: string, groupId: string | null) {
  await updateDoc(doc(db, COLLECTION, accountId), {
    groupId: groupId ?? null,
    updatedAt: Date.now(),
  });
}

// Toggle favorite status for an account (max 3 favorites per user)
export async function toggleAccountFavorite(
  accountId: string,
  ownerId: string,
  currentAccounts: FinancialAccount[]
): Promise<{ success: boolean; message?: string }> {
  const account = currentAccounts.find((a) => a.id === accountId);
  if (!account) return { success: false, message: 'Cuenta no encontrada' };

  const isFavorite = account.favorite;
  const favoriteCount = currentAccounts.filter((a) => a.favorite).length;

  if (!isFavorite && favoriteCount >= 3) {
    return { success: false, message: 'Solo puedes tener 3 cuentas favoritas' };
  }

  await updateDoc(doc(db, COLLECTION, accountId), {
    favorite: !isFavorite,
    updatedAt: Date.now(),
  });

  return { success: true };
}
