'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getXPByOwnerId, getAchievementsByOwnerId, updateXP, MAX_LEVEL, subscribeToAchievements, subscribeToXP, checkAndUnlockAchievements } from '@/lib/firestore/gamification';
import { getTransactionsByOwnerId } from '@/lib/firestore/transactions';
import { getAccountsByOwnerId } from '@/lib/firestore/accounts';
import { getGoalsByOwnerId } from '@/lib/firestore/goals';
import { getTaskProgress, DAILY_TASKS, WEEKLY_TASKS, getDayPeriod, getWeekPeriod, calculateTaskProgress, createOrUpdateTaskProgress, subscribeToTaskProgress } from '@/lib/firestore/tasks';
import type { XPState, Achievement, Transaction, FinancialAccount, Goal, TaskProgress } from '@/types';

// Definición de todos los logros posibles con sus condiciones
interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  check: (data: UserData) => { unlocked: boolean; progress: number; total: number };
}

interface UserData {
  transactions: Transaction[];
  accounts: FinancialAccount[];
  goals: Goal[];
  achievements: Achievement[];
}

const ACHIEVEMENT_CATEGORIES = [
  { id: 'savings', title: 'Ahorro', icon: '💰', color: 'var(--color-prosper-green)' },
  { id: 'investments', title: 'Inversiones', icon: '📈', color: 'var(--color-prosper-navy)' },
  { id: 'discipline', title: 'Disciplina', icon: '🎯', color: '#F59E0B' },
  { id: 'education', title: 'Educación', icon: '📚', color: '#3B82F6' },
  { id: 'community', title: 'Comunidad', icon: '👥', color: '#8B5CF6' },
  { id: 'milestones', title: 'Hitos', icon: '🏆', color: '#EC4899' },
];

const ALL_ACHIEVEMENTS: AchievementDef[] = [
  // AHORRO
  {
    id: 'first_saving',
    title: 'Primer Ahorro',
    description: 'Realiza tu primera transacción de ahorro.',
    icon: '🐣',
    category: 'savings',
    xpReward: 100,
    check: (data) => {
      const savings = data.transactions.filter(t => t.type === 'saving');
      return { unlocked: savings.length >= 1, progress: savings.length, total: 1 };
    },
  },
  {
    id: 'saving_streak_5',
    title: 'Ahorro Consistente',
    description: 'Realiza 5 transacciones de ahorro.',
    icon: '🏦',
    category: 'savings',
    xpReward: 250,
    check: (data) => {
      const savings = data.transactions.filter(t => t.type === 'saving');
      return { unlocked: savings.length >= 5, progress: savings.length, total: 5 };
    },
  },
  {
    id: 'saving_1000',
    title: 'Mil Dólaares Ahorrados',
    description: 'Acumula $1,000 en transacciones de ahorro.',
    icon: '💵',
    category: 'savings',
    xpReward: 500,
    check: (data) => {
      const total = data.transactions.filter(t => t.type === 'saving').reduce((sum, t) => sum + t.amount, 0);
      return { unlocked: total >= 1000, progress: Math.round(total), total: 1000 };
    },
  },
  // INGRESOS
  {
    id: 'first_income',
    title: 'Primer Ingreso',
    description: 'Registra tu primer ingreso.',
    icon: '💼',
    category: 'milestones',
    xpReward: 100,
    check: (data) => {
      const incomes = data.transactions.filter(t => t.type === 'income');
      return { unlocked: incomes.length >= 1, progress: incomes.length, total: 1 };
    },
  },
  {
    id: 'income_5000',
    title: 'Ingresos Significativos',
    description: 'Acumula $5,000 en ingresos registrados.',
    icon: '📊',
    category: 'milestones',
    xpReward: 500,
    check: (data) => {
      const total = data.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      return { unlocked: total >= 5000, progress: Math.round(total), total: 5000 };
    },
  },
  // GASTOS
  {
    id: 'first_expense',
    title: 'Control de Gastos',
    description: 'Registra tu primer gasto conscientemente.',
    icon: '📝',
    category: 'discipline',
    xpReward: 50,
    check: (data) => {
      const expenses = data.transactions.filter(t => t.type === 'expense');
      return { unlocked: expenses.length >= 1, progress: expenses.length, total: 1 };
    },
  },
  {
    id: 'expense_tracker_50',
    title: 'Contador de Gastos',
    description: 'Registra 50 gastos para tener un mejor control.',
    icon: '📋',
    category: 'discipline',
    xpReward: 300,
    check: (data) => {
      const expenses = data.transactions.filter(t => t.type === 'expense');
      return { unlocked: expenses.length >= 50, progress: expenses.length, total: 50 };
    },
  },
  // CUENTAS
  {
    id: 'first_account',
    title: 'Mi Primera Cuenta',
    description: 'Crea tu primera cuenta financiera.',
    icon: '🏛️',
    category: 'milestones',
    xpReward: 100,
    check: (data) => {
      return { unlocked: data.accounts.length >= 1, progress: data.accounts.length, total: 1 };
    },
  },
  {
    id: 'three_accounts',
    title: 'Diversificación',
    description: 'Crea 3 cuentas financieras diferentes.',
    icon: '🔀',
    category: 'milestones',
    xpReward: 250,
    check: (data) => {
      return { unlocked: data.accounts.length >= 3, progress: data.accounts.length, total: 3 };
    },
  },
  // METAS
  {
    id: 'first_goal',
    title: 'Primera Meta',
    description: 'Crea tu primera meta de ahorro.',
    icon: '🎯',
    category: 'milestones',
    xpReward: 100,
    check: (data) => {
      return { unlocked: data.goals.length >= 1, progress: data.goals.length, total: 1 };
    },
  },
  {
    id: 'goal_completed',
    title: 'Meta Cumplida',
    description: 'Completa tu primera meta de ahorro.',
    icon: '🏁',
    category: 'milestones',
    xpReward: 500,
    check: (data) => {
      const completed = data.goals.filter(g => g.status === 'completed');
      return { unlocked: completed.length >= 1, progress: completed.length, total: 1 };
    },
  },
  {
    id: 'five_goals',
    title: 'Planificador Serial',
    description: 'Crea 5 metas de ahorro.',
    icon: '📈',
    category: 'milestones',
    xpReward: 300,
    check: (data) => {
      return { unlocked: data.goals.length >= 5, progress: data.goals.length, total: 5 };
    },
  },
  // BALANCE
  {
    id: 'balance_1000',
    title: 'Primer Mil',
    description: 'Alcanza un balance total de $1,000 entre todas tus cuentas.',
    icon: '💎',
    category: 'milestones',
    xpReward: 500,
    check: (data) => {
      const total = data.accounts.reduce((sum, a) => sum + a.balance, 0);
      return { unlocked: total >= 1000, progress: Math.round(total), total: 1000 };
    },
  },
  {
    id: 'balance_5000',
    title: 'Arquitecto Financiero',
    description: 'Alcanza un balance total de $5,000.',
    icon: '🏗️',
    category: 'milestones',
    xpReward: 1000,
    check: (data) => {
      const total = data.accounts.reduce((sum, a) => sum + a.balance, 0);
      return { unlocked: total >= 5000, progress: Math.round(total), total: 5000 };
    },
  },
  {
    id: 'balance_10000',
    title: 'Millonario Virtual',
    description: 'Alcanza un balance total de $10,000.',
    icon: '👑',
    category: 'milestones',
    xpReward: 2000,
    check: (data) => {
      const total = data.accounts.reduce((sum, a) => sum + a.balance, 0);
      return { unlocked: total >= 10000, progress: Math.round(total), total: 10000 };
    },
  },
  // TRANSACCIONES TOTALES
  {
    id: 'transactions_10',
    title: 'Usuario Activo',
    description: 'Realiza 10 transacciones en total.',
    icon: '⚡',
    category: 'discipline',
    xpReward: 200,
    check: (data) => {
      return { unlocked: data.transactions.length >= 10, progress: data.transactions.length, total: 10 };
    },
  },
  {
    id: 'transactions_50',
    title: 'Contador Experto',
    description: 'Realiza 50 transacciones en total.',
    icon: '🔥',
    category: 'discipline',
    xpReward: 500,
    check: (data) => {
      return { unlocked: data.transactions.length >= 50, progress: data.transactions.length, total: 50 };
    },
  },
  // EDUCACIÓN (placeholder hasta que haya cursos reales)
  {
    id: 'first_course',
    title: 'Estudiante',
    description: 'Inscribe tu primer curso en la academia.',
    icon: '🎓',
    category: 'education',
    xpReward: 150,
    check: () => ({ unlocked: false, progress: 0, total: 1 }),
  },
  // COMUNIDAD (placeholder)
  {
    id: 'community_member',
    title: 'Miembro Activo',
    description: 'Participa en la comunidad.',
    icon: '🤝',
    category: 'community',
    xpReward: 100,
    check: () => ({ unlocked: false, progress: 0, total: 1 }),
  },
];

export default function LogrosPage() {
  const { user } = useAuth();
  const [xpState, setXPState] = useState<XPState | null>(null);
  const [firebaseAchievements, setFirebaseAchievements] = useState<Achievement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'tasks' | 'achievements'>('tasks');
  const [unlockedToast, setUnlockedToast] = useState<string | null>(null);
  const prevAchievementsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    let cancelled = false;

    async function loadData() {
      try {
        const [xp, ach, tx, acc, g, tp] = await Promise.all([
          getXPByOwnerId(uid),
          getAchievementsByOwnerId(uid),
          getTransactionsByOwnerId(uid),
          getAccountsByOwnerId(uid),
          getGoalsByOwnerId(uid),
          getTaskProgress(uid),
        ]);
        if (!cancelled) {
          setXPState(xp);
          setFirebaseAchievements(ach);
          setTransactions(tx);
          setAccounts(acc);
          setGoals(g);
          setTaskProgress(tp);
          prevAchievementsRef.current = new Set(ach.map(a => a.title));
        }
      } catch (error) {
        console.error('Error loading gamification data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();

    // Suscribirse a XP en tiempo real
    const unsubXP = subscribeToXP(uid, (xp) => {
      if (xp && !cancelled) setXPState(xp);
    });

    // Suscribirse a taskProgress en tiempo real
    const unsubTasks = subscribeToTaskProgress(uid, (tp) => {
      if (!cancelled) setTaskProgress(tp);
    });

    return () => {
      cancelled = true;
      unsubXP();
      unsubTasks();
    };
  }, [user]);

  // Suscribirse a logros en tiempo real para detectar nuevos desbloqueos
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToAchievements(user.uid, (ach) => {
      const prevTitles = prevAchievementsRef.current;
      const newTitles = new Set(ach.map(a => a.title));
      // Detectar nuevos logros
      for (const title of newTitles) {
        if (!prevTitles.has(title)) {
          setUnlockedToast(title);
          setTimeout(() => setUnlockedToast(null), 4000);
          break;
        }
      }
      prevAchievementsRef.current = newTitles;
      setFirebaseAchievements(ach);
    });
    return () => unsub();
  }, [user]);

  // Verificar y desbloquear logros que cumplan condiciones al cargar
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const hasData = transactions.length > 0 || accounts.length > 0 || goals.length > 0;
    if (!hasData) return;
    let cancelled = false;
    async function checkAchievements() {
      try {
        const { checkAndUnlockAchievements } = await import('@/lib/firestore/gamification');
        await checkAndUnlockAchievements(uid, {
          transactions,
          accounts,
          goals,
        });
      } catch (e) {
        if (!cancelled) console.error('Error checking achievements:', e);
      }
    }
    checkAchievements();
    return () => { cancelled = true; };
  }, [user?.uid, transactions, accounts, goals]);

  const userData: UserData = useMemo(() => ({
    transactions,
    accounts,
    goals,
    achievements: firebaseAchievements,
  }), [transactions, accounts, goals, firebaseAchievements]);

  // Calcular logros desbloqueados y en progreso basado en datos reales
  const { unlockedAchievements, lockedAchievements, totalProgress } = useMemo(() => {
    const unlocked: { def: AchievementDef; progress: number; total: number }[] = [];
    const locked: { def: AchievementDef; progress: number; total: number }[] = [];

    ALL_ACHIEVEMENTS.forEach(def => {
      const result = def.check(userData);
      const isUnlocked = firebaseAchievements.some(a => a.title === def.title);
      if (isUnlocked || result.unlocked) {
        unlocked.push({ def, progress: result.progress, total: result.total });
      } else {
        locked.push({ def, progress: result.progress, total: result.total });
      }
    });

    const totalProgress = unlocked.length + locked.filter(l => l.progress > 0).length;
    return { unlockedAchievements: unlocked, lockedAchievements: locked, totalProgress };
  }, [userData, firebaseAchievements]);

  const filteredUnlocked = selectedCategory === 'all'
    ? unlockedAchievements
    : unlockedAchievements.filter(a => a.def.category === selectedCategory);

  const filteredLocked = selectedCategory === 'all'
    ? lockedAchievements
    : lockedAchievements.filter(a => a.def.category === selectedCategory);

  const xpProgress = xpState ? Math.round((xpState.currentXP / xpState.maxXP) * 100) : 0;
  const totalPoints = xpState ? (xpState.level * 1000 + xpState.currentXP) : 0;
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalTransactions = transactions.length;
  const totalGoals = goals.length;

  // Calcular estadísticas de hoy y esta semana
  const { todayStats, weekStats, dailyTasks, weeklyTasks } = useMemo(() => {
    const now = new Date();
    const { start: dayStart, end: dayEnd } = getDayPeriod(now);
    const { start: weekStart, end: weekEnd } = getWeekPeriod(now);

    // Filtrar transacciones de hoy
    const todayTx = transactions.filter(t => t.date >= dayStart && t.date <= dayEnd);
    const weekTx = transactions.filter(t => t.date >= weekStart && t.date <= weekEnd);

    const todayStats = {
      income: todayTx.filter(t => t.type === 'income').length,
      expense: todayTx.filter(t => t.type === 'expense').length,
      saving: todayTx.filter(t => t.type === 'saving').length,
    };

    const weekStats = {
      income: weekTx.filter(t => t.type === 'income').length,
      expense: weekTx.filter(t => t.type === 'expense').length,
      saving: weekTx.filter(t => t.type === 'saving').length,
    };

    // Calcular progreso de tareas
    const dailyTasks = calculateTaskProgress(DAILY_TASKS, taskProgress, {
      income: todayStats.income,
      expense: todayStats.expense,
      saving: todayStats.saving,
      view_accounts: accounts.length > 0 ? 1 : 0,
      goal_fund: goals.length > 0 ? 1 : 0,
    });

    const weeklyTasks = calculateTaskProgress(WEEKLY_TASKS, taskProgress, {
      income: weekStats.income,
      expense: weekStats.expense,
      saving: weekStats.saving,
      goal_update: goals.filter(g => g.updatedAt >= weekStart).length,
      balance_increase: 0, // Se calcularía comparando con balance anterior
    });

    return { todayStats, weekStats, dailyTasks, weeklyTasks };
  }, [transactions, accounts, goals, taskProgress]);

  // Handler para reclamar XP de tarea completada
  const handleClaimTask = async (task: typeof dailyTasks[0]) => {
    if (!user || task.completed || task.progress < task.target) return;
    const { start, end } = task.frequency === 'daily' ? getDayPeriod() : getWeekPeriod();
    try {
      await createOrUpdateTaskProgress({
        ownerId: user.uid,
        taskId: task.id,
        progress: task.target,
        completed: true,
        periodStart: start,
        periodEnd: end,
        completedAt: Date.now(),
      });
      await updateXP(user.uid, task.xpReward);
      // Verificar logros desbloqueados
      const [allTx, allAccounts, allGoals] = await Promise.all([
        getTransactionsByOwnerId(user.uid),
        getAccountsByOwnerId(user.uid),
        getGoalsByOwnerId(user.uid),
      ]);
      await checkAndUnlockAchievements(user.uid, {
        transactions: allTx,
        accounts: allAccounts,
        goals: allGoals,
      });
    } catch (e) {
      console.error('Error completando tarea:', e);
    }
    // El taskProgress se actualiza automáticamente por la suscripción
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="page-content-overflow-fix">
          <style jsx>{`
            .logros-container {
              padding: 24px;
              max-width: 1200px;
              margin: 0 auto;
            }
            .hero-section {
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: flex-end;
              gap: 24px;
              margin-bottom: 32px;
            }
            @media (min-width: 768px) {
              .hero-section {
                flex-direction: row;
                align-items: flex-end;
              }
            }
            .hero-title {
              font-size: 2rem;
              font-weight: 800;
              color: var(--text-primary);
              letter-spacing: -0.02em;
              margin: 0 0 8px 0;
            }
            .hero-subtitle {
              font-size: 1rem;
              color: var(--text-secondary);
              margin: 0;
            }
            .xp-card {
              background: var(--bg-card);
              border-radius: 16px;
              padding: 20px 24px;
              display: flex;
              align-items: center;
              gap: 16px;
              box-shadow: var(--shadow-md);
              border: 1px solid var(--border-default);
            }
            .xp-points {
              text-align: right;
            }
            .xp-label {
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
              margin: 0;
            }
            .xp-value {
              font-size: 1.5rem;
              font-weight: 900;
              color: var(--color-prosper-green);
              margin: 0;
            }
            .xp-icon-container {
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background: linear-gradient(135deg, var(--color-prosper-green), var(--color-pine-400));
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.5rem;
            }
            .stats-row {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              margin-bottom: 32px;
            }
            .stat-mini {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 16px;
              text-align: center;
              border: 1px solid var(--border-default);
            }
            .stat-mini-value {
              font-size: 1.5rem;
              font-weight: 900;
              color: var(--color-prosper-green);
              margin: 0 0 4px 0;
            }
            .stat-mini-label {
              font-size: 0.625rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
              margin: 0;
            }
            .bento-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 24px;
              margin-bottom: 32px;
            }
            @media (min-width: 768px) {
              .bento-grid {
                grid-template-columns: 2fr 1fr;
              }
            }
            .progress-card {
              background: var(--bg-card);
              border-radius: 16px;
              padding: 32px;
              position: relative;
              overflow: hidden;
              border: 1px solid var(--border-default);
            }
            .progress-card::after {
              content: '';
              position: absolute;
              right: -64px;
              bottom: -64px;
              width: 256px;
              height: 256px;
              background: var(--bg-accent-soft);
              border-radius: 50%;
              opacity: 0.5;
            }
            .progress-badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 4px 12px;
              background: var(--bg-accent-soft);
              border-radius: 9999px;
              border: 1px solid var(--color-prosper-green);
              margin-bottom: 24px;
            }
            .progress-badge-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: var(--color-prosper-green);
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            .progress-badge-text {
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--color-prosper-green);
            }
            .progress-title {
              font-size: 1.25rem;
              font-weight: 800;
              color: var(--text-primary);
              margin: 0 0 16px 0;
              max-width: 400px;
            }
            .progress-description {
              font-size: 0.875rem;
              color: var(--text-secondary);
              margin: 0 0 32px 0;
              max-width: 320px;
            }
            .progress-bars {
              display: flex;
              flex-direction: column;
              gap: 24px;
              position: relative;
              z-index: 1;
            }
            .progress-bar-item {
              flex: 1;
            }
            .progress-bar-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .progress-bar-label {
              font-size: 0.6875rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
            }
            .progress-bar-value {
              font-size: 0.6875rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--color-prosper-green);
            }
            .progress-bar-track {
              height: 8px;
              background: var(--bg-input);
              border-radius: 9999px;
              overflow: hidden;
            }
            .progress-bar-fill {
              height: 100%;
              border-radius: 9999px;
              background: linear-gradient(90deg, var(--color-prosper-green), var(--color-pine-400));
              transition: width 0.5s ease;
            }
            .milestone-card {
              background: var(--bg-card);
              border-radius: 16px;
              padding: 32px;
              display: flex;
              flex-direction: column;
              border: 1px solid var(--border-default);
            }
            .milestone-label {
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
              margin: 0 0 24px 0;
            }
            .milestone-image {
              width: 100%;
              height: 128px;
              background: linear-gradient(135deg, var(--bg-accent-soft), var(--bg-input));
              border-radius: 8px;
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 3rem;
            }
            .milestone-title {
              font-size: 1.25rem;
              font-weight: 800;
              color: var(--text-primary);
              margin: 0 0 8px 0;
            }
            .milestone-desc {
              font-size: 0.875rem;
              color: var(--text-secondary);
              margin: 0 0 24px 0;
            }
            .milestone-reward {
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
            }
            .milestone-reward-label {
              font-size: 0.625rem;
              font-weight: 700;
              color: var(--color-prosper-green);
            }
            .milestone-reward-value {
              font-size: 0.625rem;
              font-weight: 700;
              color: var(--text-primary);
            }
            .milestone-btn {
              width: 100%;
              padding: 12px;
              border: 1px solid var(--color-prosper-green);
              background: transparent;
              color: var(--color-prosper-green);
              font-size: 0.75rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s;
            }
            .milestone-btn:hover {
              background: var(--bg-accent-soft);
            }
            .category-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
              flex-wrap: wrap;
              gap: 12px;
            }
            .category-title {
              font-size: 1.125rem;
              font-weight: 800;
              color: var(--text-primary);
              padding-left: 16px;
              border-left: 4px solid var(--color-prosper-green);
            }
            .category-filters {
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
            }
            .category-filter-btn {
              padding: 6px 12px;
              border: 1px solid var(--border-default);
              background: var(--bg-card);
              color: var(--text-secondary);
              font-size: 0.75rem;
              font-weight: 600;
              border-radius: 9999px;
              cursor: pointer;
              transition: all 0.2s;
            }
            .category-filter-btn:hover,
            .category-filter-btn.active {
              border-color: var(--color-prosper-green);
              color: var(--color-prosper-green);
              background: var(--bg-accent-soft);
            }
            .achievements-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 16px;
              margin-bottom: 32px;
            }
            @media (min-width: 640px) {
              .achievements-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            @media (min-width: 1024px) {
              .achievements-grid {
                grid-template-columns: repeat(3, 1fr);
              }
            }
            .achievement-card {
              background: var(--bg-card);
              border-radius: 12px;
              overflow: hidden;
              border: 1px solid var(--border-default);
              transition: all 0.2s;
            }
            .achievement-card:hover {
              border-color: var(--color-prosper-green);
              box-shadow: var(--shadow-md);
            }
            .achievement-card.unlocked {
              border-color: var(--color-prosper-green);
              background: var(--bg-accent-soft);
            }
            .achievement-content {
              padding: 20px;
            }
            .achievement-header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 12px;
            }
            .achievement-icon {
              width: 40px;
              height: 40px;
              border-radius: 8px;
              background: var(--bg-input);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.25rem;
            }
            .achievement-card.unlocked .achievement-icon {
              background: var(--bg-accent-soft);
            }
            .achievement-category {
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
            }
            .achievement-title {
              font-size: 1rem;
              font-weight: 700;
              color: var(--text-primary);
              margin: 0 0 8px 0;
            }
            .achievement-desc {
              font-size: 0.8125rem;
              color: var(--text-secondary);
              margin: 0 0 12px 0;
              line-height: 1.4;
            }
            .achievement-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-top: 12px;
              border-top: 1px solid var(--border-default);
            }
            .achievement-xp {
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--color-prosper-green);
            }
            .achievement-status {
              font-size: 0.6875rem;
              font-weight: 700;
            }
            .achievement-status.unlocked {
              color: var(--color-prosper-green);
            }
            .achievement-status.locked {
              color: var(--text-tertiary);
            }
            .achievement-progress-bar {
              height: 6px;
              background: var(--bg-input);
              border-radius: 9999px;
              overflow: hidden;
              margin-top: 12px;
            }
            .achievement-progress-fill {
              height: 100%;
              background: var(--color-prosper-green);
              border-radius: 9999px;
              transition: width 0.5s ease;
            }
            .level-card {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 24px;
              border: 1px solid var(--border-default);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .level-value {
              font-size: 3rem;
              font-weight: 900;
              color: var(--text-primary);
              margin: 0;
              line-height: 1;
            }
            .level-subtitle {
              font-size: 1rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              margin: 0 0 32px 0;
            }
            .level-progress-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .level-progress-label {
              font-size: 0.6875rem;
              font-weight: 700;
              text-transform: uppercase;
              color: var(--text-secondary);
            }
            .level-progress-value {
              font-size: 0.6875rem;
              font-weight: 700;
              color: var(--text-primary);
            }
            .level-progress-track {
              height: 12px;
              background: var(--bg-input);
              border-radius: 9999px;
              overflow: hidden;
            }
            .level-progress-fill {
              height: 100%;
              background: linear-gradient(90deg, var(--color-prosper-green), var(--color-pine-400));
              border-radius: 9999px;
              transition: width 0.5s ease;
            }
            .loading-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              gap: 16px;
            }
            .loading-spinner {
              width: 48px;
              height: 48px;
              border: 4px solid var(--border-default);
              border-top-color: var(--color-prosper-green);
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .loading-text {
              font-size: 0.875rem;
              color: var(--text-secondary);
            }
            .empty-state {
              text-align: center;
              padding: 48px 24px;
              color: var(--text-tertiary);
            }
            .empty-state-icon {
              font-size: 3rem;
              margin-bottom: 16px;
            }
            .empty-state-title {
              font-size: 1.125rem;
              font-weight: 700;
              color: var(--text-secondary);
              margin: 0 0 8px 0;
            }
            .empty-state-desc {
              font-size: 0.875rem;
              margin: 0;
            }
            .tabs {
              display: flex;
              gap: 8px;
              margin-bottom: 24px;
              border-bottom: 1px solid var(--border-default);
              padding-bottom: 0;
            }
            .tab-btn {
              padding: 12px 24px;
              background: none;
              border: none;
              border-bottom: 2px solid transparent;
              color: var(--text-secondary);
              font-size: 0.875rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            }
            .tab-btn:hover {
              color: var(--text-primary);
            }
            .tab-btn.active {
              color: var(--color-prosper-green);
              border-bottom-color: var(--color-prosper-green);
            }
            .tab-badge {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              background: var(--color-prosper-green);
              color: white;
              font-size: 0.625rem;
              font-weight: 700;
              padding: 2px 6px;
              border-radius: 9999px;
              margin-left: 6px;
            }
            .tasks-section {
              margin-bottom: 32px;
            }
            .tasks-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
            }
            .tasks-title {
              font-size: 1.125rem;
              font-weight: 800;
              color: var(--text-primary);
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .tasks-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 12px;
            }
            @media (min-width: 640px) {
              .tasks-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            .task-card {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 16px;
              border: 1px solid var(--border-default);
              display: flex;
              flex-direction: column;
              gap: 12px;
              transition: all 0.2s;
            }
            .task-card:hover {
              border-color: var(--color-prosper-green);
            }
            .task-card.completed {
              border-color: var(--color-prosper-green);
              background: var(--bg-accent-soft);
              opacity: 0.8;
            }
            .task-header {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .task-icon {
              width: 40px;
              height: 40px;
              border-radius: 8px;
              background: var(--bg-input);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.25rem;
              flex-shrink: 0;
            }
            .task-card.completed .task-icon {
              background: var(--bg-accent-soft);
            }
            .task-info {
              flex: 1;
              min-width: 0;
            }
            .task-name {
              font-size: 0.875rem;
              font-weight: 700;
              color: var(--text-primary);
              margin: 0 0 4px 0;
            }
            .task-desc {
              font-size: 0.75rem;
              color: var(--text-secondary);
              margin: 0;
              line-height: 1.3;
            }
            .task-progress-bar {
              height: 6px;
              background: var(--bg-input);
              border-radius: 9999px;
              overflow: hidden;
            }
            .task-progress-fill {
              height: 100%;
              background: var(--color-prosper-green);
              border-radius: 9999px;
              transition: width 0.5s ease;
            }
            .task-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .task-xp {
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--color-prosper-green);
            }
            .task-progress-text {
              font-size: 0.6875rem;
              color: var(--text-secondary);
            }
            .task-claim-btn {
              padding: 6px 16px;
              background: var(--color-prosper-green);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 0.75rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            }
            .task-claim-btn:hover {
              opacity: 0.9;
            }
            .task-claim-btn:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
            .level-badge {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 4px 8px;
              background: var(--bg-accent-soft);
              border-radius: 9999px;
              font-size: 0.625rem;
              font-weight: 700;
              color: var(--color-prosper-green);
            }
            .achievement-unlock-toast {
              position: fixed;
              bottom: 24px;
              right: 24px;
              background: var(--bg-card);
              border: 2px solid var(--color-prosper-green);
              border-radius: 12px;
              padding: 16px 20px;
              display: flex;
              align-items: center;
              gap: 12px;
              box-shadow: 0 8px 32px rgba(61, 204, 142, 0.3);
              z-index: 9999;
              animation: slideInRight 0.4s ease-out;
            }
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            .toast-content {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .toast-icon {
              font-size: 2rem;
              animation: bounce 0.6s ease-in-out;
            }
            @keyframes bounce {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.3); }
            }
            .toast-text {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .toast-title {
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .toast-name {
              font-size: 0.875rem;
              font-weight: 600;
              color: var(--text-primary);
            }
            .toast-close {
              background: none;
              border: none;
              color: var(--text-tertiary);
              font-size: 1rem;
              cursor: pointer;
              padding: 4px;
              line-height: 1;
            }
            .toast-close:hover {
              color: var(--text-primary);
            }
          `}</style>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Cargando tus logros...</p>
            </div>
          ) : (
            <>
              {/* Hero Section */}
              <div className="hero-section">
                <div>
                  <h1 className="hero-title">Logros y Recompensas</h1>
                  <p className="hero-subtitle">Tu arquitectura financiera en crecimiento constante.</p>
                </div>
                <div className="xp-card">
                  <div className="xp-points">
                    <p className="xp-label">Total de Puntos</p>
                    <p className="xp-value">{totalPoints.toLocaleString()}</p>
                  </div>
                  <div className="xp-icon-container">🏆</div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="stats-row">
                <div className="stat-mini">
                  <p className="stat-mini-value">${totalBalance.toLocaleString()}</p>
                  <p className="stat-mini-label">Balance Total</p>
                </div>
                <div className="stat-mini">
                  <p className="stat-mini-value">{totalTransactions}</p>
                  <p className="stat-mini-label">Transacciones</p>
                </div>
                <div className="stat-mini">
                  <p className="stat-mini-value">{totalGoals}</p>
                  <p className="stat-mini-label">Metas</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs">
                <button
                  className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tasks')}
                >
                  📋 Tareas
                  {dailyTasks.filter(t => t.completed).length + weeklyTasks.filter(t => t.completed).length > 0 && (
                    <span className="tab-badge">
                      {dailyTasks.filter(t => t.completed).length + weeklyTasks.filter(t => t.completed).length}
                    </span>
                  )}
                </button>
                <button
                  className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
                  onClick={() => setActiveTab('achievements')}
                >
                  🏆 Logros
                </button>
              </div>

              {/* Tasks Tab Content */}
              {activeTab === 'tasks' && (
                <>
                  {/* Daily Tasks */}
                  <div className="tasks-section">
                    <div className="tasks-header">
                      <h3 className="tasks-title">📅 Tareas Diarias <span className="level-badge">Se reinician cada día</span></h3>
                    </div>
                    <div className="tasks-grid">
                      {dailyTasks.map(task => (
                        <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''}`}>
                          <div className="task-header">
                            <div className="task-icon">{task.icon}</div>
                            <div className="task-info">
                              <p className="task-name">{task.title}</p>
                              <p className="task-desc">{task.description}</p>
                            </div>
                          </div>
                          <div className="task-progress-bar">
                            <div className="task-progress-fill" style={{ width: `${Math.min((task.progress / task.target) * 100, 100)}%` }}></div>
                          </div>
                          <div className="task-footer">
                            <span className="task-xp">+{task.xpReward} XP</span>
                            <span className="task-progress-text">{task.progress} / {task.target}</span>
                            {task.completed ? (
                              <span className="task-claim-btn" style={{ background: 'var(--text-tertiary)', cursor: 'default' }}>✓ Hecho</span>
                            ) : (
                              <button className="task-claim-btn" disabled={task.progress < task.target}>Completar</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weekly Tasks */}
                  <div className="tasks-section">
                    <div className="tasks-header">
                      <h3 className="tasks-title">📆 Tareas Semanales <span className="level-badge">Se reinician cada semana</span></h3>
                    </div>
                    <div className="tasks-grid">
                      {weeklyTasks.map(task => (
                        <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''}`}>
                          <div className="task-header">
                            <div className="task-icon">{task.icon}</div>
                            <div className="task-info">
                              <p className="task-name">{task.title}</p>
                              <p className="task-desc">{task.description}</p>
                            </div>
                          </div>
                          <div className="task-progress-bar">
                            <div className="task-progress-fill" style={{ width: `${Math.min((task.progress / task.target) * 100, 100)}%` }}></div>
                          </div>
                          <div className="task-footer">
                            <span className="task-xp">+{task.xpReward} XP</span>
                            <span className="task-progress-text">{task.progress} / {task.target}</span>
                            {task.completed ? (
                              <span className="task-claim-btn" style={{ background: 'var(--text-tertiary)', cursor: 'default' }}>✓ Hecho</span>
                            ) : (
                              <button className="task-claim-btn" disabled={task.progress < task.target}>Completar</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Achievements Tab Content */}
              {activeTab === 'achievements' && (
                <>
              {/* Bento Grid */}
              <div className="bento-grid">
                {/* Progress Card */}
                <div className="progress-card">
                  <div className="progress-badge">
                    <div className="progress-badge-dot"></div>
                    <span className="progress-badge-text">Progreso General</span>
                  </div>
                  <h3 className="progress-title">
                    {unlockedAchievements.length > 0 
                      ? `${unlockedAchievements.length} logros desbloqueados`
                      : '¡Comienza tu viaje financiero!'}
                  </h3>
                  <p className="progress-description">
                    {unlockedAchievements.length === 0 
                      ? 'Realiza transacciones, crea cuentas y metas para desbloquear logros.'
                      : 'Sigue así para desbloquear más recompensas.'}
                  </p>
                  <div className="progress-bars">
                    <div className="progress-bar-item">
                      <div className="progress-bar-header">
                        <span className="progress-bar-label">Nivel Actual</span>
                        <span className="progress-bar-value">{xpState?.currentXP || 0} / {xpState?.maxXP || 1000} XP</span>
                      </div>
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${xpProgress}%` }}></div>
                      </div>
                    </div>
                    <div className="progress-bar-item">
                      <div className="progress-bar-header">
                        <span className="progress-bar-label">Logros</span>
                        <span className="progress-bar-value">{unlockedAchievements.length} / {ALL_ACHIEVEMENTS.length}</span>
                      </div>
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${(unlockedAchievements.length / ALL_ACHIEVEMENTS.length) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Milestone Card */}
                <div className="milestone-card">
                  <p className="milestone-label">Próximo Hito</p>
                  <div className="milestone-image">
                    {unlockedAchievements.length === 0 ? '🐣' : '🎯'}
                  </div>
                  <h4 className="milestone-title">
                    {lockedAchievements.length > 0 ? lockedAchievements[0].def.title : '¡Todos completados!'}
                  </h4>
                  <p className="milestone-desc">
                    {lockedAchievements.length > 0 ? lockedAchievements[0].def.description : 'Has desbloqueado todos los logros disponibles.'}
                  </p>
                  <div className="milestone-reward">
                    <span className="milestone-reward-label">RECOMPENSA</span>
                    <span className="milestone-reward-value">
                      {lockedAchievements.length > 0 ? `${lockedAchievements[0].def.xpReward} XP` : '—'}
                    </span>
                  </div>
                  <button className="milestone-btn">Ver Detalles</button>
                </div>
              </div>

              {/* Category Filters */}
              <div className="category-header">
                <h3 className="category-title">Tus Logros</h3>
                <div className="category-filters">
                  <button 
                    className={`category-filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('all')}
                  >
                    Todos
                  </button>
                  {ACHIEVEMENT_CATEGORIES.map(cat => (
                    <button 
                      key={cat.id}
                      className={`category-filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.icon} {cat.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Unlocked Achievements */}
              {filteredUnlocked.length > 0 && (
                <div className="achievements-grid">
                  {filteredUnlocked.map(({ def, progress, total }) => (
                    <div key={def.id} className="achievement-card unlocked">
                      <div className="achievement-content">
                        <div className="achievement-header">
                          <div className="achievement-icon">{def.icon}</div>
                          <span className="achievement-category" style={{ color: ACHIEVEMENT_CATEGORIES.find(c => c.id === def.category)?.color }}>{def.category}</span>
                        </div>
                        <h4 className="achievement-title">{def.title}</h4>
                        <p className="achievement-desc">{def.description}</p>
                        <div className="achievement-footer">
                          <span className="achievement-xp">+{def.xpReward} XP</span>
                          <span className="achievement-status unlocked">✓ Completado</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Locked Achievements */}
              {filteredLocked.length > 0 && (
                <div className="achievements-grid">
                  {filteredLocked.map(({ def, progress, total }) => {
                    const cat = ACHIEVEMENT_CATEGORIES.find(c => c.id === def.category);
                    const progressPercent = Math.min(Math.round((progress / total) * 100), 100);
                    return (
                      <div key={def.id} className="achievement-card">
                        <div className="achievement-content">
                          <div className="achievement-header">
                            <div className="achievement-icon">{def.icon}</div>
                            <span className="achievement-category" style={{ color: cat?.color }}>{cat?.title}</span>
                          </div>
                          <h4 className="achievement-title">{def.title}</h4>
                          <p className="achievement-desc">{def.description}</p>
                          {total > 0 && (
                            <div className="achievement-progress-bar">
                              <div className="achievement-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                          )}
                          <div className="achievement-footer">
                            <span className="achievement-xp">+{def.xpReward} XP</span>
                            <span className="achievement-status locked">{progress} / {total}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty State */}
              {filteredUnlocked.length === 0 && filteredLocked.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">🔒</div>
                  <h3 className="empty-state-title">No hay logros en esta categoría</h3>
                  <p className="empty-state-desc">Selecciona otra categoría o comienza a usar Prosper Pro.</p>
                </div>
              )}

              {/* Level Card */}
              <div className="level-card">
                <div>
                  <h4 className="stat-title" style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '16px' }}>Tu Nivel de Arquitecto</h4>
                  <p className="level-value">NV. {xpState?.level || 1}</p>
                  <p className="level-subtitle">{xpState?.title || 'Novato'}</p>
                </div>
                <div>
                  <div className="level-progress-header">
                    <span className="level-progress-label">Próximo Nivel</span>
                    <span className="level-progress-value">{(xpState?.maxXP || 1000) - (xpState?.currentXP || 0)} XP para subir</span>
                  </div>
                  <div className="level-progress-track">
                    <div className="level-progress-fill" style={{ width: `${xpProgress}%` }}></div>
                  </div>
                </div>
              </div>
                </>
              )}
            </>
          )}

          {/* Toast de logro desbloqueado */}
          {unlockedToast && (
            <div className="achievement-unlock-toast">
              <div className="toast-content">
                <span className="toast-icon">🏆</span>
                <div className="toast-text">
                  <span className="toast-title">¡Logro Desbloqueado!</span>
                  <span className="toast-name">{unlockedToast}</span>
                </div>
              </div>
              <button className="toast-close" onClick={() => setUnlockedToast(null)}>✕</button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
