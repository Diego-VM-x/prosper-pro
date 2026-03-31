import { collection, addDoc, setDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Goal, Transaction, XPState, Achievement, Reminder, CommunityMember, StudySession } from '@/types';

const GOALS_SEED: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    userId: '__USER_ID__',
    title: 'Fondo de Emergencia',
    category: 'Ahorro',
    current: 4500,
    target: 10000,
    deadline: 'Dic 2026',
    status: 'progress',
    color: '#3DCC8E',
    icon: '🛡️',
    monthlyGrowth: 12,
    streakDays: 5,
  },
  {
    userId: '__USER_ID__',
    title: 'Inversión en ETFs (S&P 500)',
    category: 'Inversión',
    current: 12000,
    target: 50000,
    deadline: 'Jun 2028',
    status: 'progress',
    color: '#1E3A6E',
    icon: '📈',
    monthlyGrowth: 8,
    streakDays: 3,
  },
  {
    userId: '__USER_ID__',
    title: 'Viaje a Japón 2027',
    category: 'Ahorro',
    current: 2500,
    target: 8000,
    deadline: 'Mar 2027',
    status: 'progress',
    color: '#F59E0B',
    icon: '✈️',
    monthlyGrowth: 15,
    streakDays: 7,
  },
  {
    userId: '__USER_ID__',
    title: 'Curso de Blockchain Pro',
    category: 'Educación',
    current: 500,
    target: 500,
    deadline: 'Completado',
    status: 'completed',
    color: '#3DCC8E',
    icon: '🎓',
    monthlyGrowth: 0,
    streakDays: 10,
  },
  {
    userId: '__USER_ID__',
    title: 'Compra de MacBook Pro',
    category: 'Ahorro',
    current: 1200,
    target: 2500,
    deadline: 'Oct 2026',
    status: 'progress',
    color: '#EF4444',
    icon: '💻',
    monthlyGrowth: 10,
    streakDays: 2,
  },
];

const TRANSACTIONS_SEED: Omit<Transaction, 'id'>[] = [
  { userId: '__USER_ID__', amount: 500, type: 'income', category: 'Salario', description: 'Pago quincenal', date: Date.now() - 86400000 * 6 },
  { userId: '__USER_ID__', amount: 200, type: 'saving', category: 'Ahorro', description: 'Ahorro automático', date: Date.now() - 86400000 * 5 },
  { userId: '__USER_ID__', amount: 800, type: 'income', category: 'Freelance', description: 'Proyecto web', date: Date.now() - 86400000 * 4 },
  { userId: '__USER_ID__', amount: 150, type: 'saving', category: 'Ahorro', description: 'Ahorro viaje', date: Date.now() - 86400000 * 3 },
  { userId: '__USER_ID__', amount: 600, type: 'income', category: 'Salario', description: 'Pago quincenal', date: Date.now() - 86400000 * 2 },
  { userId: '__USER_ID__', amount: 300, type: 'saving', category: 'Inversión', description: 'Compra ETFs', date: Date.now() - 86400000 * 1 },
  { userId: '__USER_ID__', amount: 100, type: 'expense', category: 'Comida', description: 'Supermercado', date: Date.now() },
];

const XP_SEED: Omit<XPState, 'userId'> = {
  level: 7,
  title: 'Inversionista',
  currentXP: 2450,
  maxXP: 3000,
  achievements: ['primer-ahorro', 'racha-7-dias', 'nivel-inversionista'],
};

const ACHIEVEMENTS_SEED: Omit<Achievement, 'id' | 'unlockedAt'>[] = [
  { userId: '__USER_ID__', title: 'Primer Ahorro', description: 'Completaste tu primera meta de ahorro', icon: '🏅' },
  { userId: '__USER_ID__', title: 'Racha de 7 Días', description: '7 días consecutivos de lecciones', icon: '🔥' },
  { userId: '__USER_ID__', title: 'Nivel Inversionista', description: 'Alcanzaste el Nivel 7', icon: '💎' },
];

const REMINDERS_SEED: Omit<Reminder, 'id'>[] = [
  {
    userId: '__USER_ID__',
    title: 'Sesión con Mentor Financiero',
    description: 'Revisión de portafolio y estrategia de inversión',
    startTime: '02:00 pm',
    endTime: '04:00 pm',
    date: new Date().toISOString().split('T')[0],
    type: 'mentor',
    isActive: true,
  },
];

const COMMUNITY_MEMBERS_SEED: Omit<CommunityMember, 'id'>[] = [
  { name: 'Alexandra Deff', avatarInitials: 'AD', task: 'Completó', highlight: 'Módulo de Presupuesto Básico', status: 'completed' },
  { name: 'Edwin Adenike', avatarInitials: 'EA', task: 'En progreso', highlight: 'Reto de Ahorro 30 Días', status: 'progress' },
  { name: 'Isaac Oluwatem.', avatarInitials: 'IO', task: 'Buscando', highlight: 'Mentor de Inversiones', status: 'pending' },
  { name: 'David Oshodi', avatarInitials: 'DO', task: 'En progreso', highlight: 'Simulador de Portafolio', status: 'progress' },
];

export async function seedUserData(userId: string) {
  const existing = await getDocs(query(collection(db, 'goals'), where('userId', '==', userId)));
  if (!existing.empty) return;

  const replaceUserId = (obj: Record<string, unknown>) => {
    const str = JSON.stringify(obj);
    return JSON.parse(str.replace(/__USER_ID__/g, userId));
  };

  for (const goal of GOALS_SEED) {
    await addDoc(collection(db, 'goals'), { ...replaceUserId(goal), createdAt: Date.now(), updatedAt: Date.now() });
  }

  for (const tx of TRANSACTIONS_SEED) {
    await addDoc(collection(db, 'transactions'), replaceUserId(tx));
  }

  await setDoc(doc(db, 'xp_states', userId), { userId, ...XP_SEED });

  for (const ach of ACHIEVEMENTS_SEED) {
    await addDoc(collection(db, 'achievements'), { ...replaceUserId(ach), unlockedAt: Date.now() });
  }

  for (const rem of REMINDERS_SEED) {
    await addDoc(collection(db, 'reminders'), replaceUserId(rem));
  }

  for (const member of COMMUNITY_MEMBERS_SEED) {
    await addDoc(collection(db, 'community_members'), member);
  }

  await setDoc(doc(db, 'study_sessions', userId), {
    userId,
    totalSeconds: 5048,
    lastUpdated: Date.now(),
    isRunning: true,
  } as StudySession);
}
