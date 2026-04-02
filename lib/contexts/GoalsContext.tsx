'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToGoals, createGoal, updateGoal, deleteGoal, createGoalWithId } from '@/lib/firestore/goals';
import { subscribeToReminders, createReminder, updateReminder, deleteReminder } from '@/lib/firestore/reminders';
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
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Suscribirse a metas en tiempo real
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) { setGoals([]); return; }
    const unsubscribe = subscribeToGoals(uid, (data) => setGoals(data));
    return () => unsubscribe();
  }, [user?.uid]);

  // Suscribirse a recordatorios en tiempo real
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) { setReminders([]); return; }
    const unsubscribe = subscribeToReminders(uid, (data) => setReminders(data));
    return () => unsubscribe();
  }, [user?.uid]);

  const addGoal = useCallback(async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('[DEBUG GoalsContext addGoal] Llamado con:', JSON.stringify(goal, null, 2));
    console.log('[DEBUG GoalsContext addGoal] user?.uid:', user?.uid);
    const goalData = { ...goal, userId: user?.uid || goal.userId };
    console.log('[DEBUG GoalsContext addGoal] Datos finales:', JSON.stringify(goalData, null, 2));
    try {
      const id = await createGoal(goalData);
      console.log('[DEBUG GoalsContext addGoal] Meta creada con ID:', id);
      return id;
    } catch (error: any) {
      console.error('[DEBUG GoalsContext addGoal] ERROR:', error);
      console.error('[DEBUG GoalsContext addGoal] Error code:', error?.code);
      console.error('[DEBUG GoalsContext addGoal] Error message:', error?.message);
      throw error;
    }
  }, [user?.uid]);

  const updateGoalFn = useCallback(async (id: string, updates: Partial<Goal>) => {
    console.log('[DEBUG GoalsContext updateGoalFn] ID:', id, 'Updates:', JSON.stringify(updates, null, 2));
    try {
      await updateGoal(id, updates);
      console.log('[DEBUG GoalsContext updateGoalFn] Meta actualizada exitosamente');
    } catch (error: any) {
      console.error('[DEBUG GoalsContext updateGoalFn] ERROR:', error);
      console.error('[DEBUG GoalsContext updateGoalFn] Error code:', error?.code);
      console.error('[DEBUG GoalsContext updateGoalFn] Error message:', error?.message);
      throw error;
    }
  }, []);

  const deleteGoalFn = useCallback(async (id: string) => {
    console.log('[DEBUG GoalsContext deleteGoalFn] Eliminando meta ID:', id);
    try {
      await deleteGoal(id);
      console.log('[DEBUG GoalsContext deleteGoalFn] Meta eliminada exitosamente');
    } catch (error: any) {
      console.error('[DEBUG GoalsContext deleteGoalFn] ERROR:', error);
      console.error('[DEBUG GoalsContext deleteGoalFn] Error code:', error?.code);
      console.error('[DEBUG GoalsContext deleteGoalFn] Error message:', error?.message);
      throw error;
    }
  }, []);

  const addReminder = useCallback(async (reminder: Omit<Reminder, 'id'>) => {
    return await createReminder(reminder);
  }, []);

  const updateReminderFn = useCallback(async (id: string, updates: Partial<Reminder>) => {
    await updateReminder(id, updates);
  }, []);

  const deleteReminderFn = useCallback(async (id: string) => {
    await deleteReminder(id);
  }, []);

  // Filtrar metas y recordatorios que vencen hoy
  const todayISO = getTodayISO();
  const goalsToday = goals.filter((g) => {
    const iso = parseDeadlineToISO(g.deadline);
    return iso === todayISO && g.status !== 'completed';
  });
  const remindersToday = reminders.filter((r) => r.date === todayISO && r.isActive);

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
