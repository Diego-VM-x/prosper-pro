'use client';

import { useEffect, useRef } from 'react';
import { db, doc, updateDoc } from '@/lib/firebase';
import type { Reminder } from '@/types';

/**
 * Hook que programa recordatorios para la hora exacta.
 * Cuando llega la hora del recordatorio (date + reminderTime), se marca como inactivo.
 */
export function useReminderScheduler(reminders: Reminder[], userId: string | null) {
  const timersRef = useRef<Map<string, number>>(new Map());
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const now = Date.now();
    const activeReminders = reminders.filter(r => r.isActive && r.reminderTime);

    // Limpiar timers de recordatorios que ya no existen o están inactivos
    timersRef.current.forEach((timerId, reminderId) => {
      const stillActive = activeReminders.some(r => r.id === reminderId);
      if (!stillActive) {
        window.clearTimeout(timerId);
        timersRef.current.delete(reminderId);
      }
    });

    // Programar nuevos timers
    activeReminders.forEach(reminder => {
      // Evitar duplicados
      if (timersRef.current.has(reminder.id)) return;
      if (notifiedRef.current.has(reminder.id)) return;

      const reminderDateTime = getReminderTimestamp(reminder.date, reminder.reminderTime);
      if (!reminderDateTime) return;

      const delay = reminderDateTime - now;

      if (delay <= 0) {
        // La hora ya pasó, desactivar inmediatamente
        notifiedRef.current.add(reminder.id);
        deactivateReminder(reminder.id);
      } else {
        // Programar desactivación futura
        const timerId = window.setTimeout(() => {
          notifiedRef.current.add(reminder.id);
          timersRef.current.delete(reminder.id);
          deactivateReminder(reminder.id);
        }, delay);
        timersRef.current.set(reminder.id, timerId);
      }
    });

    return () => {
      // No limpiar timers al desmontar - queremos que persistan mientras la app esté abierta
    };
  }, [reminders, userId]);

  // Cleanup completo al desmontar el componente que usa el hook
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timerId => window.clearTimeout(timerId));
      timersRef.current.clear();
    };
  }, []);
}

function getReminderTimestamp(dateStr: string, timeStr: string): number | null {
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return date.getTime();
  } catch {
    return null;
  }
}

async function deactivateReminder(reminderId: string) {
  try {
    await updateDoc(doc(db, 'reminders', reminderId), { isActive: false });
  } catch (err) {
    console.error('Error desactivando recordatorio:', err);
  }
}
