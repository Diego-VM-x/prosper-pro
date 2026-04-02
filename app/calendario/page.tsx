'use client';

import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useGoals } from '@/lib/contexts/GoalsContext';
import type { Reminder, Goal } from '@/types';

const TYPE_ICONS: Record<string, string> = { mentor: '👨‍🏫', course: '📚', meeting: '🤝', other: '📌', goal: '🎯' };
const TYPE_LABELS: Record<string, string> = { mentor: 'Mentor', course: 'Curso', meeting: 'Reunión', other: 'Otro', goal: 'Meta' };
const CATEGORY_COLORS: Record<string, string> = { Ahorro: '#3DCC8E', Inversión: '#3B82F6', Educación: '#F59E0B', Otro: '#8B5CF6' };
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

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

type CalendarGoalEvent = { id: string; date: string; title: string; type: string; color: string; source: 'goal'; goal: Goal };

function goalToCalendarEvent(goal: Goal): CalendarGoalEvent | null {
  const dateStr = parseDeadlineToISO(goal.deadline);
  if (!dateStr) return null;
  return { id: goal.id, date: dateStr, title: goal.title, type: 'goal', color: goal.color, source: 'goal', goal };
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T12:00:00');
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function CalendarioPage() {
  const { goals, reminders, userId, addReminder, deleteReminderFn } = useGoals();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [newReminder, setNewReminder] = useState({ title: '', description: '', startTime: '09:00', endTime: '10:00', type: 'other' as Reminder['type'] });

  const goalEvents = useMemo(() => goals.map(goalToCalendarEvent).filter((e): e is CalendarGoalEvent => e !== null), [goals]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Upcoming goals (next 30 days)
  const upcomingGoals = useMemo(() => {
    return goalEvents
      .filter((e) => {
        const days = getDaysUntil(e.date);
        return days >= 0 && days <= 30 && e.goal.status !== 'completed';
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [goalEvents]);

  const getDaysArray = () => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getDateStr = (day: number) => {
    const d = new Date(year, month, day);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getRemindersForDate = (dateStr: string) => reminders.filter((r) => r.date === dateStr);
  const getGoalEventsForDate = (dateStr: string) => goalEvents.filter((e) => e.date === dateStr);
  const getAllEventsForDate = (dateStr: string) => [...getRemindersForDate(dateStr), ...getGoalEventsForDate(dateStr)];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => { setCurrentDate(new Date()); setSelectedDate(todayStr); };

  const handleAddReminder = async () => {
    if (!newReminder.title || !selectedDate) return;
    await addReminder({
      ownerId: userId || 'local',
      title: newReminder.title,
      description: newReminder.description,
      startTime: newReminder.startTime,
      endTime: newReminder.endTime,
      date: selectedDate,
      type: newReminder.type,
      isActive: true,
    });
    setShowModal(false);
    setNewReminder({ title: '', description: '', startTime: '09:00', endTime: '10:00', type: 'other' });
  };

  const handleDeleteReminder = async (id: string) => {
    await deleteReminderFn(id);
  };

  const handleDayClick = (day: number) => {
    const dateStr = getDateStr(day);
    setSelectedDate(dateStr === selectedDate ? null : dateStr);
  };

  const selectedEvents = selectedDate ? getAllEventsForDate(selectedDate) : [];

  // Agenda view: all events in the month sorted by date
  const monthEvents = useMemo(() => {
    const events: { date: string; items: (Reminder | CalendarGoalEvent)[] }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = getDateStr(d);
      const items = getAllEventsForDate(dateStr);
      if (items.length > 0) events.push({ date: dateStr, items });
    }
    return events;
  }, [goals, reminders, year, month, daysInMonth]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header */}
        <div className="cal-page-header">
          <div>
            <h1 className="cal-page-title">Calendario</h1>
            <p className="cal-page-subtitle">Sincronizado con tus metas y recordatorios</p>
          </div>
          <div className="cal-header-actions">
            <div className="cal-view-toggle">
              <button className={`cal-view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>Mes</button>
              <button className={`cal-view-btn ${viewMode === 'agenda' ? 'active' : ''}`} onClick={() => setViewMode('agenda')}>Agenda</button>
            </div>
            <button className="cal-btn-today" onClick={handleToday}>Hoy</button>
          </div>
        </div>

        <div className="cal-main-layout">
          {/* Left: Calendar or Agenda */}
          <div className="cal-left-col">
            {viewMode === 'month' ? (
              <div className="cal-card">
                {/* Month navigation */}
                <div className="cal-month-nav">
                  <button className="cal-nav-arrow" onClick={handlePrevMonth}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <h2 className="cal-month-label">{MONTHS_ES[month]} {year}</h2>
                  <button className="cal-nav-arrow" onClick={handleNextMonth}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>

                {/* Calendar grid */}
                <div className="cal-grid">
                  {DAYS_ES.map((d) => <div key={d} className="cal-weekday">{d}</div>)}
                  {getDaysArray().map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} className="cal-cell cal-cell-empty" />;
                    const dateStr = getDateStr(day);
                    const dayReminders = getRemindersForDate(dateStr);
                    const dayGoals = getGoalEventsForDate(dateStr);
                    const totalEvents = dayReminders.length + dayGoals.length;
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;
                    const isPast = dateStr < todayStr;

                    return (
                      <div
                        key={dateStr}
                        className={`cal-cell ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''} ${isPast ? 'cal-past' : ''} ${totalEvents > 0 ? 'cal-has-events' : ''}`}
                        onClick={() => handleDayClick(day)}
                      >
                        <span className="cal-day-num">{day}</span>
                        {totalEvents > 0 && (
                          <div className="cal-event-indicators">
                            {dayGoals.slice(0, 2).map((g, idx) => (
                              <span key={`g-${idx}`} className="cal-indicator cal-indicator-goal" style={{ background: g.color }} />
                            ))}
                            {dayReminders.slice(0, 2).map((r, idx) => (
                              <span key={`r-${idx}`} className="cal-indicator cal-indicator-reminder" />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="cal-legend">
                  <span className="cal-legend-item"><span className="cal-legend-dot" style={{ background: 'var(--color-prosper-green)' }} /> Metas</span>
                  <span className="cal-legend-item"><span className="cal-legend-dot" style={{ background: 'var(--color-blue-500)' }} /> Recordatorios</span>
                </div>
              </div>
            ) : (
              /* Agenda View */
              <div className="cal-card">
                <div className="cal-month-nav">
                  <button className="cal-nav-arrow" onClick={handlePrevMonth}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <h2 className="cal-month-label">{MONTHS_ES[month]} {year}</h2>
                  <button className="cal-nav-arrow" onClick={handleNextMonth}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
                <div className="cal-agenda-list">
                  {monthEvents.length > 0 ? monthEvents.map(({ date, items }) => (
                    <div key={date} className="cal-agenda-day">
                      <div className="cal-agenda-date">
                        <span className="cal-agenda-date-num">{new Date(date + 'T12:00:00').getDate()}</span>
                        <span className="cal-agenda-date-label">{new Date(date + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', month: 'short' })}</span>
                        {date === todayStr && <span className="cal-agenda-today-badge">Hoy</span>}
                      </div>
                      <div className="cal-agenda-items">
                        {items.map((ev) => {
                          const isGoal = 'source' in ev;
                          return (
                            <div key={ev.id} className={`cal-agenda-item ${isGoal ? 'cal-agenda-goal' : 'cal-agenda-reminder'}`}>
                              <div className="cal-agenda-item-bar" style={{ background: isGoal ? (ev as CalendarGoalEvent).color : 'var(--color-blue-500)' }} />
                              <div className="cal-agenda-item-content">
                                <span className="cal-agenda-item-icon">{TYPE_ICONS[isGoal ? 'goal' : (ev as Reminder).type] || '📌'}</span>
                                <div>
                                  <p className="cal-agenda-item-title">{isGoal ? `${(ev as CalendarGoalEvent).goal.icon} ${ev.title}` : ev.title}</p>
                                  {isGoal && (
                                    <div className="cal-agenda-goal-progress">
                                      <div className="cal-mini-progress-bar">
                                        <div className="cal-mini-progress-fill" style={{ width: `${Math.min(((ev as CalendarGoalEvent).goal.current / (ev as CalendarGoalEvent).goal.target) * 100, 100)}%`, background: (ev as CalendarGoalEvent).color }} />
                                      </div>
                                      <span className="cal-agenda-goal-amount">${(ev as CalendarGoalEvent).goal.current.toLocaleString()} / ${(ev as CalendarGoalEvent).goal.target.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {!isGoal && <p className="cal-agenda-item-time">{(ev as Reminder).startTime} - {(ev as Reminder).endTime}</p>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )) : (
                    <div className="cal-empty-state">
                      <span className="cal-empty-icon">📅</span>
                      <p>No hay eventos este mes</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upcoming Goals */}
            {upcomingGoals.length > 0 && (
              <div className="cal-card cal-upcoming">
                <h3 className="cal-section-title">🎯 Próximas Metas</h3>
                <div className="cal-upcoming-list">
                  {upcomingGoals.slice(0, 5).map((ev) => {
                    const daysLeft = getDaysUntil(ev.date);
                    const pct = Math.min((ev.goal.current / ev.goal.target) * 100, 100);
                    return (
                      <div key={ev.id} className="cal-upcoming-item">
                        <div className="cal-upcoming-icon" style={{ background: ev.color + '20', color: ev.color }}>{ev.goal.icon}</div>
                        <div className="cal-upcoming-info">
                          <p className="cal-upcoming-name">{ev.goal.title}</p>
                          <div className="cal-upcoming-bar">
                            <div className="cal-upcoming-bar-fill" style={{ width: `${pct}%`, background: ev.color }} />
                          </div>
                          <div className="cal-upcoming-meta">
                            <span className="cal-upcoming-category" style={{ color: CATEGORY_COLORS[ev.goal.category] || '#888' }}>{ev.goal.category}</span>
                            <span className="cal-upcoming-days">{daysLeft === 0 ? 'Hoy' : daysLeft === 1 ? 'Mañana' : `${daysLeft} días`}</span>
                          </div>
                        </div>
                        <div className="cal-upcoming-amount">
                          <span className="cal-upcoming-current">${ev.goal.current.toLocaleString()}</span>
                          <span className="cal-upcoming-target">/ ${ev.goal.target.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Day detail panel */}
          <div className="cal-right-col">
            <div className="cal-card cal-detail-panel">
              <div className="cal-detail-header">
                <h3 className="cal-detail-title">
                  {selectedDate ? formatDateLong(selectedDate) : 'Selecciona un día'}
                </h3>
                {selectedDate && (
                  <button className="cal-add-btn" onClick={() => setShowModal(true)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Recordatorio
                  </button>
                )}
              </div>

              {selectedDate && selectedEvents.length > 0 ? (
                <div className="cal-detail-events">
                  {selectedEvents.map((ev) => {
                    const isGoal = 'source' in ev;
                    const goalData = isGoal ? (ev as CalendarGoalEvent).goal : null;
                    return (
                      <div key={ev.id} className={`cal-event-card ${isGoal ? 'cal-event-goal' : 'cal-event-reminder'}`}>
                        <div className="cal-event-card-bar" style={{ background: isGoal ? (ev as CalendarGoalEvent).color : ev.type === 'mentor' ? 'var(--color-prosper-green)' : ev.type === 'course' ? 'var(--color-gold-500)' : 'var(--color-blue-500)' }} />
                        <div className="cal-event-card-body">
                          <div className="cal-event-card-top">
                            <span className="cal-event-card-icon">{TYPE_ICONS[isGoal ? 'goal' : (ev as Reminder).type] || '📌'}</span>
                            <span className="cal-event-card-label">{TYPE_LABELS[isGoal ? 'goal' : (ev as Reminder).type]}</span>
                            {!isGoal && (
                              <button className="cal-event-delete" onClick={() => handleDeleteReminder((ev as Reminder).id)}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              </button>
                            )}
                          </div>
                          <p className="cal-event-card-title">{isGoal ? `${goalData?.icon} ${ev.title}` : ev.title}</p>

                          {isGoal && goalData && (
                            <div className="cal-goal-detail">
                              <div className="cal-goal-progress-row">
                                <div className="cal-goal-progress-bar">
                                  <div className="cal-goal-progress-fill" style={{ width: `${Math.min((goalData.current / goalData.target) * 100, 100)}%`, background: goalData.color }} />
                                </div>
                                <span className="cal-goal-pct">{Math.round((goalData.current / goalData.target) * 100)}%</span>
                              </div>
                              <div className="cal-goal-amounts">
                                <span>${goalData.current.toLocaleString()}</span>
                                <span className="cal-goal-target-label">de ${goalData.target.toLocaleString()}</span>
                              </div>
                              <span className="cal-goal-category-badge" style={{ background: (CATEGORY_COLORS[goalData.category] || '#888') + '20', color: CATEGORY_COLORS[goalData.category] || '#888' }}>
                                {goalData.category}
                              </span>
                            </div>
                          )}

                          {!isGoal && (
                            <>
                              <p className="cal-event-time">🕐 {(ev as Reminder).startTime} - {(ev as Reminder).endTime}</p>
                              {(ev as Reminder).description && <p className="cal-event-desc">{(ev as Reminder).description}</p>}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : selectedDate ? (
                <div className="cal-empty-state">
                  <span className="cal-empty-icon">✨</span>
                  <p>Sin eventos para este día</p>
                  <button className="cal-empty-cta" onClick={() => setShowModal(true)}>Agregar recordatorio</button>
                </div>
              ) : (
                <div className="cal-empty-state">
                  <span className="cal-empty-icon">👈</span>
                  <p>Haz clic en un día para ver los detalles</p>
                </div>
              )}
            </div>

            {/* Goals summary for the month */}
            <div className="cal-card cal-month-summary">
              <h3 className="cal-section-title">📊 Resumen del Mes</h3>
              <div className="cal-summary-stats">
                <div className="cal-summary-stat">
                  <span className="cal-summary-num">{goalEvents.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length}</span>
                  <span className="cal-summary-label">Metas</span>
                </div>
                <div className="cal-summary-stat">
                  <span className="cal-summary-num">{reminders.filter((r) => r.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length}</span>
                  <span className="cal-summary-label">Recordatorios</span>
                </div>
                <div className="cal-summary-stat">
                  <span className="cal-summary-num">{goals.filter((g) => g.status === 'completed').length}</span>
                  <span className="cal-summary-label">Completadas</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="cal-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cal-modal-header">
                <h2 className="cal-modal-title">Nuevo Recordatorio</h2>
                <button className="cal-modal-close" onClick={() => setShowModal(false)}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
              {selectedDate && <p className="cal-modal-date">{formatDateLong(selectedDate)}</p>}
              <div className="cal-modal-body">
                <label className="cal-form-label">Título</label>
                <input className="cal-form-input" type="text" placeholder="Ej: Sesión con mentor" value={newReminder.title} onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })} />
                <label className="cal-form-label">Descripción</label>
                <input className="cal-form-input" type="text" placeholder="Detalles del recordatorio" value={newReminder.description} onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })} />
                <div className="cal-form-row">
                  <div className="cal-form-col">
                    <label className="cal-form-label">Hora inicio</label>
                    <input className="cal-form-input" type="time" value={newReminder.startTime} onChange={(e) => setNewReminder({ ...newReminder, startTime: e.target.value })} />
                  </div>
                  <div className="cal-form-col">
                    <label className="cal-form-label">Hora fin</label>
                    <input className="cal-form-input" type="time" value={newReminder.endTime} onChange={(e) => setNewReminder({ ...newReminder, endTime: e.target.value })} />
                  </div>
                </div>
                <label className="cal-form-label">Tipo</label>
                <select className="cal-form-input" value={newReminder.type} onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value as Reminder['type'] })}>
                  <option value="mentor">👨‍🏫 Mentor</option>
                  <option value="course">📚 Curso</option>
                  <option value="meeting">🤝 Reunión</option>
                  <option value="other">📌 Otro</option>
                </select>
              </div>
              <div className="cal-modal-footer">
                <button className="cal-btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="cal-btn-create" onClick={handleAddReminder}>Crear</button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          /* === PAGE HEADER === */
          .cal-page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
          .cal-page-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin: 0; }
          .cal-page-subtitle { font-size: 0.875rem; color: var(--text-secondary); margin: 4px 0 0; }
          .cal-header-actions { display: flex; gap: 10px; align-items: center; }
          .cal-view-toggle { display: flex; background: var(--bg-input); border-radius: var(--radius-md); padding: 3px; }
          .cal-view-btn { padding: 6px 14px; border: none; background: transparent; border-radius: var(--radius-sm); font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
          .cal-view-btn.active { background: var(--bg-card); color: var(--text-primary); box-shadow: var(--shadow-sm); }
          .cal-btn-today { padding: 6px 16px; border: 1px solid var(--border-default); background: var(--bg-card); border-radius: var(--radius-md); font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); cursor: pointer; transition: all var(--transition-fast); }
          .cal-btn-today:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }

          /* === LAYOUT === */
          .cal-main-layout { display: grid; grid-template-columns: 1fr 360px; gap: 20px; }
          .cal-left-col { display: flex; flex-direction: column; gap: 20px; }
          .cal-right-col { display: flex; flex-direction: column; gap: 20px; }
          .cal-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); padding: 24px; }

          /* === MONTH NAV === */
          .cal-month-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
          .cal-nav-arrow { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
          .cal-nav-arrow:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); background: rgba(61,204,142,0.06); }
          .cal-month-label { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }

          /* === CALENDAR GRID === */
          .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
          .cal-weekday { text-align: center; font-size: 0.6875rem; font-weight: 700; color: var(--text-tertiary); padding: 8px 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .cal-cell { position: relative; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast); min-height: 52px; }
          .cal-cell:hover:not(.cal-cell-empty) { background: var(--bg-input); }
          .cal-cell-empty { cursor: default; }
          .cal-day-num { font-size: 0.8125rem; font-weight: 500; color: var(--text-primary); z-index: 1; }
          .cal-past .cal-day-num { color: var(--text-tertiary); }
          .cal-today { background: rgba(61,204,142,0.08); }
          .cal-today .cal-day-num { color: var(--color-prosper-green); font-weight: 700; }
          .cal-today::before { content: ''; position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; border-radius: 50%; background: var(--color-prosper-green); }
          .cal-selected { background: var(--color-prosper-green) !important; }
          .cal-selected .cal-day-num { color: white !important; font-weight: 700; }
          .cal-selected::before { background: white !important; }
          .cal-selected .cal-indicator { background: white !important; opacity: 0.8; }
          .cal-has-events { font-weight: 600; }

          /* === EVENT INDICATORS === */
          .cal-event-indicators { display: flex; gap: 3px; margin-top: 2px; }
          .cal-indicator { width: 5px; height: 5px; border-radius: 50%; transition: all var(--transition-fast); }
          .cal-indicator-reminder { background: var(--color-blue-500); }

          /* === LEGEND === */
          .cal-legend { display: flex; gap: 16px; justify-content: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-default); }
          .cal-legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-secondary); }
          .cal-legend-dot { width: 8px; height: 8px; border-radius: 50%; }

          /* === DETAIL PANEL === */
          .cal-detail-panel { min-height: 300px; }
          .cal-detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 12px; }
          .cal-detail-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; text-transform: capitalize; }
          .cal-add-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border: none; background: var(--color-prosper-green); color: white; border-radius: var(--radius-md); font-size: 0.75rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all var(--transition-fast); }
          .cal-add-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }

          /* === EVENT CARDS === */
          .cal-detail-events { display: flex; flex-direction: column; gap: 12px; }
          .cal-event-card { display: flex; border-radius: var(--radius-md); overflow: hidden; background: var(--bg-input); transition: all var(--transition-fast); }
          .cal-event-card:hover { box-shadow: var(--shadow-sm); }
          .cal-event-card-bar { width: 4px; flex-shrink: 0; }
          .cal-event-card-body { padding: 12px 14px; flex: 1; }
          .cal-event-card-top { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
          .cal-event-card-icon { font-size: 0.875rem; }
          .cal-event-card-label { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-tertiary); flex: 1; }
          .cal-event-delete { background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 2px; display: flex; border-radius: 50%; transition: all var(--transition-fast); }
          .cal-event-delete:hover { color: var(--color-red-500); background: rgba(239,68,68,0.1); }
          .cal-event-card-title { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); margin: 0 0 8px; }
          .cal-event-time { font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 4px; }
          .cal-event-desc { font-size: 0.75rem; color: var(--text-tertiary); margin: 0; }

          /* === GOAL DETAIL IN PANEL === */
          .cal-goal-detail { display: flex; flex-direction: column; gap: 8px; }
          .cal-goal-progress-row { display: flex; align-items: center; gap: 8px; }
          .cal-goal-progress-bar { flex: 1; height: 6px; background: var(--bg-card); border-radius: var(--radius-full); overflow: hidden; }
          .cal-goal-progress-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.5s ease; }
          .cal-goal-pct { font-size: 0.75rem; font-weight: 700; color: var(--text-primary); min-width: 36px; text-align: right; }
          .cal-goal-amounts { display: flex; gap: 4px; font-size: 0.8125rem; }
          .cal-goal-amounts span:first-child { font-weight: 700; color: var(--text-primary); }
          .cal-goal-target-label { color: var(--text-tertiary); }
          .cal-goal-category-badge { display: inline-block; padding: 2px 10px; border-radius: var(--radius-full); font-size: 0.6875rem; font-weight: 600; width: fit-content; }

          /* === EMPTY STATE === */
          .cal-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; }
          .cal-empty-icon { font-size: 2rem; margin-bottom: 12px; }
          .cal-empty-state p { color: var(--text-secondary); font-size: 0.875rem; margin: 0; }
          .cal-empty-cta { margin-top: 12px; padding: 8px 16px; background: var(--color-prosper-green); color: white; border: none; border-radius: var(--radius-md); font-size: 0.8125rem; font-weight: 600; cursor: pointer; }

          /* === UPCOMING GOALS === */
          .cal-section-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 16px; }
          .cal-upcoming-list { display: flex; flex-direction: column; gap: 14px; }
          .cal-upcoming-item { display: flex; align-items: center; gap: 12px; }
          .cal-upcoming-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.125rem; flex-shrink: 0; }
          .cal-upcoming-info { flex: 1; min-width: 0; }
          .cal-upcoming-name { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .cal-upcoming-bar { height: 4px; background: var(--bg-input); border-radius: var(--radius-full); overflow: hidden; margin-bottom: 4px; }
          .cal-upcoming-bar-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.5s ease; }
          .cal-upcoming-meta { display: flex; gap: 8px; font-size: 0.6875rem; }
          .cal-upcoming-category { font-weight: 600; }
          .cal-upcoming-days { color: var(--text-tertiary); }
          .cal-upcoming-amount { text-align: right; flex-shrink: 0; }
          .cal-upcoming-current { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); display: block; }
          .cal-upcoming-target { font-size: 0.6875rem; color: var(--text-tertiary); }

          /* === MONTH SUMMARY === */
          .cal-summary-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .cal-summary-stat { text-align: center; padding: 12px 8px; background: var(--bg-input); border-radius: var(--radius-md); }
          .cal-summary-num { display: block; font-size: 1.25rem; font-weight: 800; color: var(--color-prosper-green); }
          .cal-summary-label { font-size: 0.6875rem; color: var(--text-secondary); font-weight: 500; }

          /* === AGENDA VIEW === */
          .cal-agenda-list { display: flex; flex-direction: column; gap: 0; }
          .cal-agenda-day { display: flex; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--border-default); }
          .cal-agenda-day:last-child { border-bottom: none; }
          .cal-agenda-date { width: 60px; flex-shrink: 0; text-align: center; }
          .cal-agenda-date-num { display: block; font-size: 1.5rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
          .cal-agenda-date-label { font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; }
          .cal-agenda-today-badge { display: inline-block; margin-top: 4px; padding: 1px 8px; background: var(--color-prosper-green); color: white; border-radius: var(--radius-full); font-size: 0.625rem; font-weight: 700; }
          .cal-agenda-items { flex: 1; display: flex; flex-direction: column; gap: 8px; }
          .cal-agenda-item { display: flex; border-radius: var(--radius-md); overflow: hidden; background: var(--bg-input); }
          .cal-agenda-item-bar { width: 4px; flex-shrink: 0; }
          .cal-agenda-item-content { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; flex: 1; }
          .cal-agenda-item-icon { font-size: 1rem; margin-top: 1px; }
          .cal-agenda-item-title { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin: 0 0 4px; }
          .cal-agenda-item-time { font-size: 0.75rem; color: var(--text-secondary); margin: 0; }
          .cal-agenda-goal-progress { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
          .cal-mini-progress-bar { width: 80px; height: 4px; background: var(--bg-card); border-radius: var(--radius-full); overflow: hidden; }
          .cal-mini-progress-fill { height: 100%; border-radius: var(--radius-full); }
          .cal-agenda-goal-amount { font-size: 0.6875rem; color: var(--text-secondary); }

          /* === MODAL === */
          .cal-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); animation: calFadeIn 0.2s ease; }
          .cal-modal { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); width: 90%; max-width: 440px; padding: 24px; animation: calSlideUp 0.3s ease; }
          .cal-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
          .cal-modal-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }
          .cal-modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; display: flex; border-radius: var(--radius-sm); }
          .cal-modal-close:hover { color: var(--text-primary); background: var(--bg-input); }
          .cal-modal-date { font-size: 0.8125rem; color: var(--text-secondary); margin: 0 0 16px; text-transform: capitalize; }
          .cal-modal-body { display: flex; flex-direction: column; gap: 14px; }
          .cal-modal-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
          .cal-form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin-bottom: -6px; }
          .cal-form-input { width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.875rem; outline: none; box-sizing: border-box; transition: border-color var(--transition-fast); }
          .cal-form-input:focus { border-color: var(--color-prosper-green); }
          .cal-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .cal-form-col { display: flex; flex-direction: column; gap: 6px; }
          .cal-btn-cancel { padding: 10px 20px; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; cursor: pointer; background: transparent; border: 1px solid var(--border-default); color: var(--text-primary); }
          .cal-btn-create { padding: 10px 20px; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; cursor: pointer; background: var(--color-prosper-green); color: white; border: none; }
          .cal-btn-create:hover { filter: brightness(1.1); }

          /* === ANIMATIONS === */
          @keyframes calFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes calSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

          /* === RESPONSIVE === */
          @media (max-width: 900px) {
            .cal-main-layout { grid-template-columns: 1fr; }
            .cal-right-col { order: -1; }
            .cal-detail-panel { min-height: auto; }
            .cal-page-header { flex-direction: column; }
          }
          @media (max-width: 480px) {
            .cal-card { padding: 16px; }
            .cal-cell { min-height: 40px; }
            .cal-day-num { font-size: 0.75rem; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
