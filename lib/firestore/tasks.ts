import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { TaskProgress } from '@/types';

const TASK_PROGRESS_COLLECTION = 'task_progress';

// Tareas diarias repetitivas
export const DAILY_TASKS = [
  {
    id: 'daily_income',
    title: 'Registra un Ingreso',
    description: 'Registra al menos 1 ingreso hoy.',
    icon: '💼',
    category: 'income' as const,
    frequency: 'daily' as const,
    xpReward: 25,
    target: 1,
    action: 'income',
  },
  {
    id: 'daily_expense',
    title: 'Controla tus Gastos',
    description: 'Registra al menos 2 gastos hoy.',
    icon: '📝',
    category: 'expense' as const,
    frequency: 'daily' as const,
    xpReward: 20,
    target: 2,
    action: 'expense',
  },
  {
    id: 'daily_saving',
    title: 'Ahorra Algo',
    description: 'Realiza al menos 1 transacción de ahorro hoy.',
    icon: '💰',
    category: 'savings' as const,
    frequency: 'daily' as const,
    xpReward: 30,
    target: 1,
    action: 'saving',
  },
  {
    id: 'daily_check',
    title: 'Revisa tus Finanzas',
    description: 'Revisa tus cuentas y balance hoy.',
    icon: '👀',
    category: 'accounts' as const,
    frequency: 'daily' as const,
    xpReward: 10,
    target: 1,
    action: 'view_accounts',
  },
  {
    id: 'daily_goal_progress',
    title: 'Avanza en una Meta',
    description: 'Agrega fondos a una meta hoy.',
    icon: '🎯',
    category: 'goals' as const,
    frequency: 'daily' as const,
    xpReward: 35,
    target: 1,
    action: 'goal_fund',
  },
];

// Tareas semanales repetitivas
export const WEEKLY_TASKS = [
  {
    id: 'weekly_income_5',
    title: 'Semana Productiva',
    description: 'Registra 5 ingresos esta semana.',
    icon: '📊',
    category: 'income' as const,
    frequency: 'weekly' as const,
    xpReward: 100,
    target: 5,
    action: 'income',
  },
  {
    id: 'weekly_expense_10',
    title: 'Contador Semanal',
    description: 'Registra 10 gastos esta semana.',
    icon: '📋',
    category: 'expense' as const,
    frequency: 'weekly' as const,
    xpReward: 75,
    target: 10,
    action: 'expense',
  },
  {
    id: 'weekly_saving_3',
    title: 'Ahorro Semanal',
    description: 'Realiza 3 transacciones de ahorro esta semana.',
    icon: '🏦',
    category: 'savings' as const,
    frequency: 'weekly' as const,
    xpReward: 125,
    target: 3,
    action: 'saving',
  },
  {
    id: 'weekly_goal_update',
    title: 'Actualiza tus Metas',
    description: 'Actualiza el progreso de 2 metas esta semana.',
    icon: '🎯',
    category: 'goals' as const,
    frequency: 'weekly' as const,
    xpReward: 100,
    target: 2,
    action: 'goal_update',
  },
  {
    id: 'weekly_balance_100',
    title: 'Balance Positivo',
    description: 'Aumenta tu balance total en $100 esta semana.',
    icon: '💎',
    category: 'accounts' as const,
    frequency: 'weekly' as const,
    xpReward: 150,
    target: 100,
    action: 'balance_increase',
  },
];

// Helpers para calcular inicio/fin de período
export function getDayPeriod(date: Date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

export function getWeekPeriod(date: Date = new Date()) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay()); // Domingo
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Sábado
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

// CRUD para TaskProgress
export async function getTaskProgress(ownerId: string): Promise<TaskProgress[]> {
  const q = query(collection(db, TASK_PROGRESS_COLLECTION), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TaskProgress));
}

export function subscribeToTaskProgress(ownerId: string, callback: (progress: TaskProgress[]) => void) {
  const q = query(collection(db, TASK_PROGRESS_COLLECTION), where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const progress: TaskProgress[] = [];
    snapshot.forEach(d => progress.push({ id: d.id, ...d.data() } as TaskProgress));
    callback(progress);
  }, (error) => {
    console.error('subscribeToTaskProgress error:', error);
    callback([]);
  });
}

export async function createOrUpdateTaskProgress(data: Omit<TaskProgress, 'id'>) {
  const q = query(
    collection(db, TASK_PROGRESS_COLLECTION),
    where('ownerId', '==', data.ownerId),
    where('taskId', '==', data.taskId),
    where('periodStart', '==', data.periodStart)
  );
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    const docRef = snapshot.docs[0].ref;
    await updateDoc(docRef, { progress: data.progress, completed: data.completed, completedAt: data.completedAt });
  } else {
    await addDoc(collection(db, TASK_PROGRESS_COLLECTION), data);
  }
}

export async function deleteTaskProgress(taskProgressId: string) {
  await deleteDoc(doc(db, TASK_PROGRESS_COLLECTION, taskProgressId));
}

// Calcular progreso de tareas basado en datos reales
export function calculateTaskProgress(
  tasks: typeof DAILY_TASKS | typeof WEEKLY_TASKS,
  taskProgress: TaskProgress[],
  stats: Record<string, number>
) {
  return tasks.map(task => {
    const progress = taskProgress.find(p => p.taskId === task.id);
    const currentProgress = progress?.progress || 0;
    const isCompleted = progress?.completed || false;
    const statValue = stats[task.action] || 0;
    const effectiveProgress = Math.min(statValue, task.target);
    
    return {
      ...task,
      progress: isCompleted ? task.target : effectiveProgress,
      completed: isCompleted || effectiveProgress >= task.target,
      xpReward: task.xpReward,
    };
  });
}
