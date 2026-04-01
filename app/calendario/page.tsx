'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { subscribeToReminders, createReminder, deleteReminder, updateReminder } from '@/lib/firestore/reminders';
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
    if (!user?.uid) return;
    try {
      const unsubReminders = subscribeToReminders(user.uid, (r) => { if (r.length) setReminders(r); });
      const unsubGoals = subscribeToGoals(user.uid, (goals) => {
        const events = goals.map(goalToCalendarEvent).filter((e): e is CalendarGoalEvent => e !== null);
        setGoalEvents(events);
      });
      return () => { unsubReminders(); unsubGoals(); };
    } catch (e) { console.error(e); }
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
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Calendario</h1>
            <p className="page-subtitle">Gestiona tus recordatorios, metas y sesiones.</p>
          </div>
        </div>

        <div className="calendar-layout">
          {/* Calendario */}
          <div className="calendar-card">
            <div className="calendar-header">
              <button className="calendar-nav-btn" onClick={handlePrevMonth}>◀</button>
              <h2 className="calendar-month-title">{MONTHS_ES[month]} {year}</h2>
              <button className="calendar-nav-btn" onClick={handleNextMonth}>▶</button>
            </div>
            <div className="calendar-grid">
              {DAYS_ES.map((d) => <div key={d} className="calendar-day-name">{d}</div>)}
              {getDaysArray().map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="calendar-day empty" />;
                const dateStr = getDateStr(day);
                const dayEvents = getAllEventsForDate(dateStr);
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                return (
                  <div
                    key={dateStr}
                    className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleDayClick(day)}
                  >
                    <span className="calendar-day-number">{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="calendar-dots">
                        {dayEvents.slice(0, 3).map((ev, idx) => (
                          <span key={idx} className="calendar-dot" style={{ background: 'source' in ev ? ev.color : ev.type === 'mentor' ? 'var(--color-prosper-green)' : ev.type === 'course' ? 'var(--color-pine-500)' : 'var(--color-gold-500)' }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel lateral - Eventos del día seleccionado */}
          <div className="reminders-panel">
            <h3 className="reminders-panel-title">
              {selectedDate ? `Eventos - ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long' })}` : 'Selecciona un día'}
            </h3>
            {selectedEvents.length > 0 ? (
              <div className="reminders-list">
                {selectedEvents.map((ev) => {
                  const isGoal = 'source' in ev;
                  return (
                    <div key={ev.id} className="reminder-item">
                      <div className="reminder-item-header">
                        <span className="reminder-item-icon">{TYPE_ICONS[isGoal ? 'goal' : (ev as Reminder).type] || '📌'}</span>
                        <span className="reminder-item-title">{ev.title}</span>
                        {!isGoal && (
                          <button className="reminder-delete-btn" onClick={() => handleDeleteReminder((ev as Reminder).id)}>✕</button>
                        )}
                      </div>
                      {!isGoal && (
                        <>
                          <p className="reminder-item-time">{(ev as Reminder).startTime} - {(ev as Reminder).endTime}</p>
                          {(ev as Reminder).description && <p className="reminder-item-desc">{(ev as Reminder).description}</p>}
                        </>
                      )}
                      {isGoal && (
                        <p className="reminder-item-time" style={{ color: (ev as CalendarGoalEvent).color }}>Fecha límite de meta</p>
                      )}
                      <span className="reminder-item-type">{TYPE_LABELS[isGoal ? 'goal' : (ev as Reminder).type] || 'Otro'}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="no-reminders">No hay eventos para este día.</p>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingReminder(null); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Nuevo Recordatorio</h2>
                <button className="modal-close" onClick={() => { setShowModal(false); setEditingReminder(null); }}>✕</button>
              </div>
              <div className="modal-body">
                <label className="form-label">Título</label>
                <input className="form-input" type="text" placeholder="Ej: Sesión con mentor" value={newReminder.title} onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })} />
                <label className="form-label">Descripción</label>
                <input className="form-input" type="text" placeholder="Detalles del recordatorio" value={newReminder.description} onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label className="form-label">Hora inicio</label><input className="form-input" type="time" value={newReminder.startTime} onChange={(e) => setNewReminder({ ...newReminder, startTime: e.target.value })} /></div>
                  <div><label className="form-label">Hora fin</label><input className="form-input" type="time" value={newReminder.endTime} onChange={(e) => setNewReminder({ ...newReminder, endTime: e.target.value })} /></div>
                </div>
                <label className="form-label">Tipo</label>
                <select className="form-input" value={newReminder.type} onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value as Reminder['type'] })}>
                  <option value="mentor">Mentor</option>
                  <option value="course">Curso</option>
                  <option value="meeting">Reunión</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => { setShowModal(false); setEditingReminder(null); }}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleAddReminder}>Crear</button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .calendar-layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; }
          @media (max-width: 900px) { .calendar-layout { grid-template-columns: 1fr; } }
          .calendar-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); padding: 20px; }
          .calendar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
          .calendar-nav-btn { background: var(--bg-input); border: 1px solid var(--border-default); border-radius: var(--radius-md); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-primary); font-size: 0.875rem; }
          .calendar-nav-btn:hover { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .calendar-month-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }
          .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
          .calendar-day-name { text-align: center; font-size: 0.6875rem; font-weight: 600; color: var(--text-secondary); padding: 8px 0; }
          .calendar-day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: var(--radius-md); cursor: pointer; transition: all 0.15s; position: relative; min-height: 48px; }
          .calendar-day:hover { background: var(--bg-input); }
          .calendar-day.empty { cursor: default; }
          .calendar-day.today { background: rgba(61, 204, 142, 0.1); }
          .calendar-day.selected { background: var(--color-prosper-green); }
          .calendar-day.selected .calendar-day-number { color: white; }
          .calendar-day.selected .calendar-dot { background: white !important; }
          .calendar-day-number { font-size: 0.8125rem; font-weight: 500; color: var(--text-primary); }
          .calendar-dots { display: flex; gap: 3px; margin-top: 2px; }
          .calendar-dot { width: 5px; height: 5px; border-radius: 50%; }
          .reminders-panel { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); padding: 20px; }
          .reminders-panel-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 16px 0; }
          .reminders-list { display: flex; flex-direction: column; gap: 12px; }
          .reminder-item { background: var(--bg-input); border-radius: var(--radius-md); padding: 12px; }
          .reminder-item-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
          .reminder-item-icon { font-size: 1.25rem; }
          .reminder-item-title { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); flex: 1; }
          .reminder-delete-btn { background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-size: 0.875rem; padding: 2px 6px; border-radius: 50%; }
          .reminder-delete-btn:hover { color: var(--color-error); background: rgba(239,68,68,0.1); }
          .reminder-item-time { font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 4px 0; }
          .reminder-item-desc { font-size: 0.75rem; color: var(--text-tertiary); margin: 0 0 6px 0; }
          .reminder-item-type { display: inline-block; font-size: 0.625rem; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); background: rgba(61, 204, 142, 0.15); color: var(--color-prosper-green); }
          .no-reminders { text-align: center; color: var(--text-secondary); font-size: 0.875rem; padding: 24px 0; }
          .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
          .modal-content { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); width: 90%; max-width: 420px; padding: 24px; }
          .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
          .modal-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; }
          .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.25rem; }
          .modal-body { display: flex; flex-direction: column; gap: 14px; }
          .modal-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
          .form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin-bottom: -6px; }
          .form-input { width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.875rem; outline: none; box-sizing: border-box; }
          .form-input:focus { border-color: var(--color-prosper-green); }
          .btn { padding: 10px 20px; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; }
          .btn-primary { background: var(--color-prosper-green); color: white; }
          .btn-outline { background: transparent; border: 1px solid var(--border-default); color: var(--text-primary); }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
