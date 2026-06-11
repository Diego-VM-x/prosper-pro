'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToGoals, createGoal, updateGoal, deleteGoal } from '@/lib/firestore/goals';
import { subscribeToReminders, createReminder, updateReminder, deleteReminder } from '@/lib/firestore/reminders';
import { subscribeToPlans, createPlan, updatePlan, deletePlan, getPlansByOwnerId, getSharedPlans, subscribeToSharedPlans } from '@/lib/firestore/plans';
import { checkAndResetRecurringPlans } from '@/lib/firestore/recurring';
import { getReceivedRequests } from '@/lib/firestore/requests';
import type { Goal, Reminder, FinancialPlan, ExpenseRequest } from '@/types';

interface GoalsContextType {
  userId: string;
  goals: Goal[];
  plans: FinancialPlan[];
  reminders: Reminder[];
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateGoalFn: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoalFn: (id: string) => Promise<void>;
  addPlan: (plan: Omit<FinancialPlan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePlanFn: (id: string, updates: Partial<FinancialPlan>) => Promise<void>;
  deletePlanFn: (id: string) => Promise<void>;
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => Promise<string>;
  updateReminderFn: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminderFn: (id: string) => Promise<void>;
  goalsToday: Goal[];
  plansToday: FinancialPlan[];
  remindersToday: Reminder[];
  pendingRequests: ExpenseRequest[];
  refresh: () => void;
}

const GoalsContext = createContext<GoalsContextType>({
  userId: '',
  goals: [],
  plans: [],
  reminders: [],
  addGoal: async () => '',
  updateGoalFn: async () => {},
  deleteGoalFn: async () => {},
  addPlan: async () => '',
  updatePlanFn: async () => {},
  deletePlanFn: async () => {},
  addReminder: async () => '',
  updateReminderFn: async () => {},
  deleteReminderFn: async () => {},
  goalsToday: [],
  plansToday: [],
  remindersToday: [],
  pendingRequests: [],
  refresh: () => {},
});

export const useGoals = () => useContext(GoalsContext);

/** Parsea deadline tipo "YYYY-MM-DD" o "Dic 2026" a fecha de hoy para comparación */
function parseDeadlineToISO(deadline: string): string | null {
  if (!deadline) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return deadline;
  const monthMap: Record<string, string> = {
    ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
    jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
    enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
    julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
  };
  const match = deadline.toLowerCase().match(/^([a-záéíóú]+)\s+(\d{4})$/);
  if (match) {
    const month = monthMap[match[1]] || monthMap[match[1].substring(0, 3)];
    if (month) return `${match[2]}-${month}-01`;
  }
  return null;
}

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const GoalsProvider = ({ children }: { children: React.ReactNode }) => {
  const authContext = useAuth();
  const { user, loading } = authContext;
  const [goals, setGoals] = useState<Goal[]>([]);
  const [plans, setPlans] = useState<FinancialPlan[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ExpenseRequest[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Cargar metas en tiempo real
  useEffect(() => {
    if (loading) return;
    const uid = user?.uid;
    if (!uid) { setGoals([]); return; }

    const unsub = subscribeToGoals(uid, (data) => {
      setGoals(data);
    });

    return () => unsub();
  }, [user?.uid, loading]);

  // Cargar planes financieros (propios + compartidos) en tiempo real
  useEffect(() => {
    if (loading) return;
    const uid = user?.uid;
    if (!uid) { setPlans([]); return; }

    // Reiniciar planes recurrentes vencidos al cargar
    checkAndResetRecurringPlans(uid).catch(() => {});

    // Verificar cada hora mientras la app está abierta (por si pasa medianoche)
    const intervalId = setInterval(() => {
      checkAndResetRecurringPlans(uid).catch(() => {});
    }, 3600000); // 1 hora

    const unsubOwn = subscribeToPlans(uid, (ownPlans) => {
      const ownIds = new Set(ownPlans.map(p => p.id));
      setPlans(prev => {
        const shared = prev.filter(p => !ownIds.has(p.id));
        const all = [...ownPlans, ...shared];
        all.sort((a, b) => b.createdAt - a.createdAt);
        return all;
      });
    });

    const unsubShared = subscribeToSharedPlans(uid, (sharedPlans) => {
      setPlans(prev => {
        const own = prev.filter(p => p.ownerId === uid);
        const ownIds = new Set(own.map(p => p.id));
        const shared = sharedPlans.filter(p => !ownIds.has(p.id));
        const all = [...own, ...shared];
        all.sort((a, b) => b.createdAt - a.createdAt);
        return all;
      });
    });

    return () => {
      clearInterval(intervalId);
      unsubOwn();
      unsubShared();
    };
  }, [user?.uid, loading]);

  // Cargar recordatorios en tiempo real
  useEffect(() => {
    if (loading) return;
    const uid = user?.uid;
    if (!uid) { setReminders([]); return; }

    const unsub = subscribeToReminders(uid, (data) => {
      setReminders(data);
    });

    return () => unsub();
  }, [user?.uid, loading]);

  // Cargar solicitudes recibidas
  useEffect(() => {
    if (loading) return;
    const uid = user?.uid;
    if (!uid) { setReceivedRequests([]); return; }

    getReceivedRequests(uid).then(setReceivedRequests);
  }, [user?.uid, loading, refreshKey]);

  const addGoal = useCallback(async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!goal.ownerId) throw new Error('Usuario no autenticado');
    const goalData = { ...goal, createdAt: Date.now(), updatedAt: Date.now() };
    const id = await createGoal(goalData);
    refresh();
    return id;
  }, [refresh]);

  const updateGoalFn = useCallback(async (id: string, updates: Partial<Goal>) => {
    await updateGoal(id, updates);
    refresh();
  }, [refresh]);

  const deleteGoalFn = useCallback(async (id: string) => {
    await deleteGoal(id);
    refresh();
  }, [refresh]);

  const addPlan = useCallback(async (plan: Omit<FinancialPlan, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!plan.ownerId) throw new Error('Usuario no autenticado');
    const id = await createPlan(plan);
    refresh();
    return id;
  }, [refresh]);

  const updatePlanFn = useCallback(async (id: string, updates: Partial<FinancialPlan>) => {
    await updatePlan(id, updates);
    refresh();
  }, [refresh]);

  const deletePlanFn = useCallback(async (id: string) => {
    await deletePlan(id);
    refresh();
  }, [refresh]);

  const addReminder = useCallback(async (reminder: Omit<Reminder, 'id' | 'createdAt'>) => {
    const id = await createReminder(reminder);
    refresh();
    return id;
  }, [refresh]);

  const updateReminderFn = useCallback(async (id: string, updates: Partial<Reminder>) => {
    await updateReminder(id, updates);
    refresh();
  }, [refresh]);

  const deleteReminderFn = useCallback(async (id: string) => {
    await deleteReminder(id);
    refresh();
  }, [refresh]);

  // Filtrar metas, planes y recordatorios que vencen hoy
  const todayISO = getTodayISO();
  const goalsToday = goals.filter((g) => {
    const iso = g.deadline ? parseDeadlineToISO(g.deadline) : null;
    return iso === todayISO && g.status !== 'completed';
  });
  const plansToday = plans.filter((p) => {
    if (p.status === 'completed' || p.status === 'cancelled') return false;
    const dl = p.deadline ? parseDeadlineToISO(p.deadline) : null;
    const nd = p.nextDueDate ? parseDeadlineToISO(p.nextDueDate) : null;
    return dl === todayISO || nd === todayISO;
  });
  const remindersToday = reminders.filter((r) => r.date === todayISO && r.isActive);
  const pendingRequests = receivedRequests.filter((r) => r.status === 'pending');

  return (
    <GoalsContext.Provider value={{
      userId: user?.uid || '',
      goals,
      plans,
      reminders,
      addGoal,
      updateGoalFn,
      deleteGoalFn,
      addPlan,
      updatePlanFn,
      deletePlanFn,
      addReminder,
      updateReminderFn,
      deleteReminderFn,
      goalsToday,
      plansToday,
      remindersToday,
      pendingRequests,
      refresh,
    }}>
      {children}
    </GoalsContext.Provider>
  );
};
