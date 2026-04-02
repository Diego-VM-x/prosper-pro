'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToGoals, createGoal, updateGoal, deleteGoal, getGoalsByOwnerId } from '@/lib/firestore/goals';
import { subscribeToReminders, createReminder, updateReminder, deleteReminder, getRemindersByOwnerId } from '@/lib/firestore/reminders';
import type { Goal, Reminder } from '@/types';

interface GoalsContextType {
  userId: string;
  goals: Goal[];
  reminders: Reminder[];
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateGoalFn: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoalFn: (id: string) => Promise<void>;
  addReminder: (reminder: Omit<Reminder, 'id'>) => Promise<string>;
  updateReminderFn: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminderFn: (id: string) => Promise<void>;
  goalsToday: Goal[];
  remindersToday: Reminder[];
}

const GoalsContext = createContext<GoalsContextType>({
  userId: '',
  goals: [],
  reminders: [],
  addGoal: async () => '',
  updateGoalFn: async () => {},
  deleteGoalFn: async () => {},
  addReminder: async () => '',
  updateReminderFn: async () => {},
  deleteReminderFn: async () => {},
  goalsToday: [],
  remindersToday: [],
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
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Cargar metas directamente
  useEffect(() => {
    if (loading) return;
    const uid = user?.uid;
    if (!uid) { setGoals([]); return; }
    let cancelled = false;
    async function loadGoals() {
      try {
        const data = await getGoalsByOwnerId(uid as string);
        if (!cancelled) setGoals(data);
      } catch (e) {
        console.error('[GoalsContext] Error cargando metas:', e);
      }
    }
    loadGoals();
    return () => { cancelled = true; };
  }, [user?.uid, loading, refreshKey]);

  // Cargar recordatorios directamente
  useEffect(() => {
    if (loading) return;
    const uid = user?.uid;
    if (!uid) { setReminders([]); return; }
    let cancelled = false;
    async function loadReminders() {
      try {
        const data = await getRemindersByOwnerId(uid as string);
        if (!cancelled) setReminders(data);
      } catch (e) {
        console.error('[GoalsContext] Error cargando recordatorios:', e);
      }
    }
    loadReminders();
    return () => { cancelled = true; };
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

  const addReminder = useCallback(async (reminder: Omit<Reminder, 'id'>) => {
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

  // Filtrar metas y recordatorios que vencen hoy
  const todayISO = getTodayISO();
  const goalsToday = goals.filter((g) => {
    const iso = parseDeadlineToISO(g.deadline);
    return iso === todayISO && g.status !== 'completed';
  });
  const remindersToday = reminders.filter((r) => r.date === todayISO && r.isActive);

  if (loading) return null;

  return (
    <GoalsContext.Provider value={{
      userId: user?.uid || '',
      goals,
      reminders,
      addGoal,
      updateGoalFn,
      deleteGoalFn,
      addReminder,
      updateReminderFn,
      deleteReminderFn,
      goalsToday,
      remindersToday,
    }}>
      {children}
    </GoalsContext.Provider>
  );
};
