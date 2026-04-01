'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getRemindersByUserId, createReminder, deleteReminder, updateReminder } from '@/lib/firestore/reminders';
import { subscribeToGoals } from '@/lib/firestore/goals';
import type { Reminder, Goal } from '@/types';

const TYPE_ICONS: Record<string, string> = { mentor: '👨‍🏫', course: '📚', meeting: '🤝', other: '📌', goal: '🎯' };
const TYPE_LABELS: Record<string, string> = { mentor: 'Mentor', course: 'Curso', meeting: 'Reunión', other: 'Otro', goal: 'Meta' };
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Parsea deadline tipo "Dic 2026" o "2026-12-31" a string YYYY-MM-DD */
function parseDeadlineToISO(deadline: string): string | null {
  if (!deadline) return null;
  // Formato ISO directo
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return deadline;
  // Formato "Dic 2026" o "Diciembre 2026"
  const monthMap: Record<string, string> = {
    ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
    jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
    enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
    julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
  };
  const match = deadline.toLowerCase().match(/^([a-záéíóú]+)\s+(\d{4})$/);
  if (match) {
    const month = monthMap[match[1]] || monthMap[match[1].substring(0, 3)];
    if (month) return `${match[2]}-${month}-01`; // Primer día del mes
  }
  return null;
}

type CalendarGoalEvent = { id: string; date: string; title: string; type: string; color: string; source: 'goal' };

/** Convierte una Goal a un evento de calendario */
function goalToCalendarEvent(goal: Goal): CalendarGoalEvent | null {
  const dateStr = parseDeadlineToISO(goal.deadline);
  if (!dateStr) return null;
  return { id: goal.id, date: dateStr, title: `🎯 ${goal.title}`, type: 'goal', color: goal.color, source: 'goal' };
}

export default function CalendarioPage() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [goalEvents, setGoalEvents] = useState<CalendarGoalEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [newReminder, setNewReminder] = useState({ title: '', description: '', startTime: '09:00', endTime: '10:00', type: 'other' as Reminder['type'] });

  useEffect(() => {
    const uid = user?.uid as string;
    if (!uid) return;

    // Cargar recordatorios (una vez)
    let cancelled = false;
    async function loadReminders() {
      try {
        const data = await getRemindersByUserId(uid);
        if (!cancelled && data.length) setReminders(data);
      } catch (e) { console.error(e); }
    }
    loadReminders();

    // Suscribirse a metas en tiempo real
    const unsubscribe = subscribeToGoals(uid, (goals) => {
      const events = goals.map(goalToCalendarEvent).filter((e): e is CalendarGoalEvent => e !== null);
      setGoalEvents(events);
    });

    return () => {
      cancelled = true;
      unsubscribe(); // Limpiar suscripción para evitar fugas de memoria
    };
  }, [user?.uid]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const getDaysArray = () => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getDateStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const getRemindersForDate = (dateStr: string) => reminders.filter((r) => r.date === dateStr);
  const getGoalEventsForDate = (dateStr: string) => goalEvents.filter((e) => e.date === dateStr);
  const getAllEventsForDate = (dateStr: string) => [...getRemindersForDate(dateStr), ...getGoalEventsForDate(dateStr)];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleAddReminder = async () => {
    if (!newReminder.title || !selectedDate) return;
    const reminder: Reminder = {
      id: 'r' + Date.now(),
      userId: user?.uid || 'local',
      ...newReminder,
      date: selectedDate,
      isActive: true,
    };
    setReminders((prev) => [...prev, reminder]);
    if (user?.uid) {
      try { await createReminder(reminder); } catch (e) { console.error(e); }
    }
    setShowModal(false);
    setNewReminder({ title: '', description: '', startTime: '09:00', endTime: '10:00', type: 'other' });
  };

  const handleDeleteReminder = async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    if (user?.uid) {
      try { await deleteReminder(id); } catch (e) { console.error(e); }
    }
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(getDateStr(day));
    setShowModal(true);
  };

  const selectedEvents = selectedDate ? getAllEventsForDate(selectedDate) : [];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendario</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Gestiona tus recordatorios, metas y sesiones.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* Calendario */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <button
                className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-green-500 hover:text-white dark:hover:bg-green-600 transition-colors"
                onClick={handlePrevMonth}
              >◀</button>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{MONTHS_ES[month]} {year}</h2>
              <button
                className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-green-500 hover:text-white dark:hover:bg-green-600 transition-colors"
                onClick={handleNextMonth}
              >▶</button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAYS_ES.map((d) => <div key={d} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">{d}</div>)}
              {getDaysArray().map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="aspect-square" />;
                const dateStr = getDateStr(day);
                const dayEvents = getAllEventsForDate(dateStr);
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                return (
                  <div
                    key={dateStr}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all min-h-[48px] ${
                      isToday ? 'bg-green-50 dark:bg-green-900/20' : ''
                    } ${isSelected ? 'bg-green-500 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    onClick={() => handleDayClick(day)}
                  >
                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((ev, idx) => (
                          <span
                            key={idx}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: isSelected ? 'white' : ('source' in ev ? ev.color : ev.type === 'mentor' ? '#3DCC8E' : ev.type === 'course' ? '#0EA5E9' : '#F59E0B') }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel lateral - Eventos del día seleccionado */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
              {selectedDate ? `Eventos - ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long' })}` : 'Selecciona un día'}
            </h3>
            {selectedEvents.length > 0 ? (
              <div className="flex flex-col gap-3">
                {selectedEvents.map((ev) => {
                  const isGoal = 'source' in ev;
                  return (
                    <div key={ev.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{TYPE_ICONS[isGoal ? 'goal' : (ev as Reminder).type] || '📌'}</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1">{ev.title}</span>
                        {!isGoal && (
                          <button
                            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-sm"
                            onClick={() => handleDeleteReminder((ev as Reminder).id)}
                          >✕</button>
                        )}
                      </div>
                      {!isGoal && (
                        <>
                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">{(ev as Reminder).startTime} - {(ev as Reminder).endTime}</p>
                          {(ev as Reminder).description && <p className="text-xs text-gray-500 dark:text-gray-400 ml-7 mt-1">{(ev as Reminder).description}</p>}
                        </>
                      )}
                      {isGoal && (
                        <p className="text-xs ml-7" style={{ color: (ev as CalendarGoalEvent).color }}>Fecha límite de meta</p>
                      )}
                      <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        {TYPE_LABELS[isGoal ? 'goal' : (ev as Reminder).type] || 'Otro'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">No hay eventos para este día.</p>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); setEditingReminder(null); }}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nuevo Recordatorio</h2>
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => { setShowModal(false); setEditingReminder(null); }}
                >✕</button>
              </div>
              <div className="p-5 space-y-3.5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Título</label>
                  <input
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-green-500 focus:outline-none"
                    type="text"
                    placeholder="Ej: Sesión con mentor"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Descripción</label>
                  <input
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-green-500 focus:outline-none"
                    type="text"
                    placeholder="Detalles del recordatorio"
                    value={newReminder.description}
                    onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Hora inicio</label>
                    <input
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-green-500 focus:outline-none"
                      type="time"
                      value={newReminder.startTime}
                      onChange={(e) => setNewReminder({ ...newReminder, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Hora fin</label>
                    <input
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-green-500 focus:outline-none"
                      type="time"
                      value={newReminder.endTime}
                      onChange={(e) => setNewReminder({ ...newReminder, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tipo</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-green-500 focus:outline-none cursor-pointer"
                    value={newReminder.type}
                    onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value as Reminder['type'] })}
                  >
                    <option value="mentor">Mentor</option>
                    <option value="course">Curso</option>
                    <option value="meeting">Reunión</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => { setShowModal(false); setEditingReminder(null); }}
                >Cancelar</button>
                <button
                  className="flex-1 px-4 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors"
                  onClick={handleAddReminder}
                >Crear</button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
