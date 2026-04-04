import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { XPState, Achievement, Transaction, FinancialAccount, Goal } from '@/types';
import { addNotification } from './notifications';

const XP_COLLECTION = 'xp_states';
const ACHIEVEMENTS_COLLECTION = 'achievements';

export function subscribeToXP(ownerId: string, callback: (xp: XPState | null) => void) {
  const q = query(collection(db, XP_COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const docSnap = snapshot.docs[0];
    callback({ ...docSnap.data() } as XPState);
  }, (error) => {
    console.error('subscribeToXP error:', error);
    callback(null);
  });
}

export async function getXPByOwnerId(ownerId: string): Promise<XPState | null> {
  const q = query(collection(db, XP_COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { ...snapshot.docs[0].data() } as XPState;
}

export async function getAchievementsByOwnerId(ownerId: string): Promise<Achievement[]> {
  const q = query(collection(db, ACHIEVEMENTS_COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  const achievements: Achievement[] = [];
  snapshot.forEach((docSnap) => {
    achievements.push({ id: docSnap.id, ...docSnap.data() } as Achievement);
  });
  achievements.sort((a, b) => b.unlockedAt - a.unlockedAt);
  return achievements;
}

export const MAX_LEVEL = 30;

export async function updateXP(ownerId: string, xpGain: number) {
  const q = query(collection(db, XP_COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;
  const docSnap = snapshot.docs[0];
  const data = docSnap.data() as XPState;
  
  // Si ya está en nivel máximo, solo acumula XP sin subir más
  if (data.level >= MAX_LEVEL) {
    const newXP = data.currentXP + xpGain;
    await updateDoc(docSnap.ref, { currentXP: newXP, level: MAX_LEVEL, maxXP: data.maxXP });
    return;
  }
  
  let newXP = data.currentXP + xpGain;
  let newLevel = data.level;
  let newMax = data.maxXP;
  if (newXP >= data.maxXP) {
    newXP = newXP - data.maxXP;
    newLevel += 1;
    newMax = Math.round(data.maxXP * 1.2);
    // Cap en nivel 30
    if (newLevel > MAX_LEVEL) {
      newLevel = MAX_LEVEL;
      newMax = data.maxXP;
    }
  }
  await updateDoc(docSnap.ref, { currentXP: newXP, level: newLevel, maxXP: newMax });
}

export function subscribeToAchievements(ownerId: string, callback: (achievements: Achievement[]) => void) {
  const q = query(collection(db, ACHIEVEMENTS_COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const achievements: Achievement[] = [];
    snapshot.forEach((docSnap) => {
      achievements.push({ id: docSnap.id, ...docSnap.data() } as Achievement);
    });
    achievements.sort((a, b) => b.unlockedAt - a.unlockedAt);
    callback(achievements);
  }, (error) => {
    console.error('subscribeToAchievements error:', error);
    callback([]);
  });
}

export async function unlockAchievement(achievement: Omit<Achievement, 'id' | 'unlockedAt'>) {
  const q = query(collection(db, ACHIEVEMENTS_COLLECTION), where('ownerId', '==', achievement.ownerId), where('title', '==', achievement.title));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) return false; // Ya desbloqueado
  await addDoc(collection(db, ACHIEVEMENTS_COLLECTION), {
    ...achievement,
    unlockedAt: Date.now(),
  });
  // Dar XP del logro
  await updateXP(achievement.ownerId, achievement.xpReward ?? 0);
  // Crear notificación
  await addNotification({
    ownerId: achievement.ownerId,
    title: '🏆 ¡Logro Desbloqueado!',
    message: `${achievement.title}: ${achievement.description}`,
    type: 'achievement',
    read: false,
  });
  return true;
}

// Interfaz para datos de verificación de logros
interface AchievementCheckData {
  transactions: Transaction[];
  accounts: FinancialAccount[];
  goals: Goal[];
}

// Definiciones de logros con sus condiciones (sincronizado con logros/page.tsx)
const ACHIEVEMENT_DEFS: {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  check: (data: AchievementCheckData) => boolean;
}[] = [
  // AHORRO
  {
    id: 'first_saving',
    title: 'Primer Ahorro',
    description: 'Realiza tu primera transacción de ahorro.',
    icon: '🐣',
    xpReward: 100,
    check: (data) => data.transactions.some(t => t.type === 'saving'),
  },
  {
    id: 'saving_streak_5',
    title: 'Ahorro Consistente',
    description: 'Realiza 5 transacciones de ahorro.',
    icon: '🏦',
    xpReward: 250,
    check: (data) => data.transactions.filter(t => t.type === 'saving').length >= 5,
  },
  {
    id: 'saving_1000',
    title: 'Mil Dólares Ahorrados',
    description: 'Acumula $1,000 en transacciones de ahorro.',
    icon: '💵',
    xpReward: 500,
    check: (data) => data.transactions.filter(t => t.type === 'saving').reduce((s, t) => s + t.amount, 0) >= 1000,
  },
  // INGRESOS
  {
    id: 'first_income',
    title: 'Primer Ingreso',
    description: 'Registra tu primer ingreso.',
    icon: '💼',
    xpReward: 100,
    check: (data) => data.transactions.some(t => t.type === 'income'),
  },
  {
    id: 'income_5000',
    title: 'Ingresos Significativos',
    description: 'Acumula $5,000 en ingresos registrados.',
    icon: '📊',
    xpReward: 500,
    check: (data) => data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) >= 5000,
  },
  // GASTOS
  {
    id: 'first_expense',
    title: 'Control de Gastos',
    description: 'Registra tu primer gasto conscientemente.',
    icon: '📝',
    xpReward: 50,
    check: (data) => data.transactions.some(t => t.type === 'expense'),
  },
  {
    id: 'expense_tracker_50',
    title: 'Contador de Gastos',
    description: 'Registra 50 gastos para tener un mejor control.',
    icon: '📋',
    xpReward: 300,
    check: (data) => data.transactions.filter(t => t.type === 'expense').length >= 50,
  },
  // CUENTAS
  {
    id: 'first_account',
    title: 'Mi Primera Cuenta',
    description: 'Crea tu primera cuenta financiera.',
    icon: '🏛️',
    xpReward: 100,
    check: (data) => data.accounts.length >= 1,
  },
  {
    id: 'three_accounts',
    title: 'Diversificación',
    description: 'Crea 3 cuentas financieras diferentes.',
    icon: '🔀',
    xpReward: 250,
    check: (data) => data.accounts.length >= 3,
  },
  // METAS
  {
    id: 'first_goal',
    title: 'Primera Meta',
    description: 'Crea tu primera meta de ahorro.',
    icon: '🎯',
    xpReward: 100,
    check: (data) => data.goals.length >= 1,
  },
  {
    id: 'goal_completed',
    title: 'Meta Cumplida',
    description: 'Completa tu primera meta de ahorro.',
    icon: '🏁',
    xpReward: 500,
    check: (data) => data.goals.some(g => g.status === 'completed'),
  },
  {
    id: 'five_goals',
    title: 'Planificador Serial',
    description: 'Crea 5 metas de ahorro.',
    icon: '📈',
    xpReward: 300,
    check: (data) => data.goals.length >= 5,
  },
  // BALANCE
  {
    id: 'balance_1000',
    title: 'Primer Mil',
    description: 'Alcanza un balance total de $1,000 entre todas tus cuentas.',
    icon: '💎',
    xpReward: 500,
    check: (data) => data.accounts.reduce((s, a) => s + a.balance, 0) >= 1000,
  },
  {
    id: 'balance_5000',
    title: 'Arquitecto Financiero',
    description: 'Alcanza un balance total de $5,000.',
    icon: '🏗️',
    xpReward: 1000,
    check: (data) => data.accounts.reduce((s, a) => s + a.balance, 0) >= 5000,
  },
  {
    id: 'balance_10000',
    title: 'Millonario Virtual',
    description: 'Alcanza un balance total de $10,000.',
    icon: '👑',
    xpReward: 2000,
    check: (data) => data.accounts.reduce((s, a) => s + a.balance, 0) >= 10000,
  },
  // TRANSACCIONES TOTALES
  {
    id: 'transactions_10',
    title: 'Usuario Activo',
    description: 'Realiza 10 transacciones en total.',
    icon: '⚡',
    xpReward: 200,
    check: (data) => data.transactions.length >= 10,
  },
  {
    id: 'transactions_50',
    title: 'Contador Experto',
    description: 'Realiza 50 transacciones en total.',
    icon: '🔥',
    xpReward: 500,
    check: (data) => data.transactions.length >= 50,
  },
];

/**
 * Verifica y desbloquea todos los logros que cumplan sus condiciones.
 * Retorna los logros recién desbloqueados.
 */
export async function checkAndUnlockAchievements(
  ownerId: string,
  data: AchievementCheckData
): Promise<string[]> {
  const unlocked: string[] = [];
  
  for (const def of ACHIEVEMENT_DEFS) {
    try {
      if (def.check(data)) {
        const wasNew = await unlockAchievement({
          ownerId,
          title: def.title,
          description: def.description,
          icon: def.icon,
          xpReward: def.xpReward,
        });
        if (wasNew) {
          unlocked.push(def.title);
        }
      }
    } catch (error) {
      console.error(`Error checking achievement ${def.title}:`, error);
    }
  }
  
  return unlocked;
}
