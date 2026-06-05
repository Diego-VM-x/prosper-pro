'use client';

import { useEffect, useRef } from 'react';
import type { Reminder } from '@/types';
import { sendBrowserNotification } from '@/lib/firestore/notifications';

/**
 * Hook que programa notificaciones de recordatorios para la hora exacta.
 * Usa setTimeout para notificaciones client-side.
 * 
 * Cuando llega la hora del recordatorio (date + reminderTime), se envía:
 * 1. Una notificación push al navegador (si tiene permiso)
 * 2. Se marca el recordatorio como inactivo para no repetir
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
        // La hora ya pasó, notificar inmediatamente
        notify(reminder);
        notifiedRef.current.add(reminder.id);
      } else {
        // Programar notificación futura
        const timerId = window.setTimeout(() => {
          notify(reminder);
          notifiedRef.current.add(reminder.id);
          timersRef.current.delete(reminder.id);
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

function notify(reminder: Reminder) {
  const title = `📅 ${reminder.title}`;
  const body = reminder.description 
    ? `${reminder.description} — ${reminder.date}` 
    : `Recordatorio programado para ${reminder.date}`;
  
  sendBrowserNotification(title, body, 'calendar');
}
