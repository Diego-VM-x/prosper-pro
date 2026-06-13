'use client';

import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useGoals } from '@/lib/contexts/GoalsContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/app/components/Toast';
import { CustomSelect } from '@/app/components/CustomSelect';
import { addCustomReminderType, getUserPreferences } from '@/lib/firestore/users';
import { getTransactionsByOwnerId } from '@/lib/firestore/transactions';

import { useReminderScheduler } from '@/lib/hooks/useReminderScheduler';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';
import type { Reminder, FinancialPlan, Transaction } from '@/types';

const DEFAULT_TYPES: Record<string, string> = { mentor: 'GraduationCap', course: 'Library', meeting: 'Handshake', other: 'Pin' };
const TYPE_ICONS: Record<string, string> = { mentor: 'GraduationCap', course: 'Library', meeting: 'Handshake', other: 'Pin' };
// TYPE_LABELS moved into component for i18n
const CATEGORY_COLORS: Record<string, string> = { Ahorro: '#3DCC8E', Inversión: '#3B82F6', Educación: '#F59E0B', Otro: '#8B5CF6' };



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

function formatDateLong(dateStr: string, locale: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

type CalendarEventType = 'plan' | 'reminder' | 'transaction_summary';

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: CalendarEventType;
  color: string;
  icon: string;
  data: any;
}

const CalendarioPage = memo(function CalendarioPage() {
  const { t, i18n } = useTranslation(['calendario', 'common']);
  const { plans, reminders, userId, addReminder, deleteReminderFn } = useGoals();
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  
  const DAYS = t('days', { returnObjects: true }) as string[];
  const MONTHS = t('months', { returnObjects: true }) as string[];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', description: '', reminderTime: '09:00', type: 'other' as Reminder['type'] });
  const [allTypes, setAllTypes] = useState<Record<string, string>>({ ...DEFAULT_TYPES });
  const [typeLabels, setTypeLabels] = useState<Record<string, string>>({
    mentor: t('types.mentor'),
    course: t('types.course'),
    meeting: t('types.meeting'),
    other: t('types.other'),
  });
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Cargar preferencias y transacciones
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let cancelled = false;

    async function loadData() {
      try {
        const [prefs, txs] = await Promise.all([
          getUserPreferences(uid as string),
          getTransactionsByOwnerId(uid as string)
        ]);
        
        if (!cancelled) {
          if (prefs.customReminderTypes) {
            setCustomTypes(prefs.customReminderTypes);
            const typeIcons = ['ClipboardList', 'Activity', 'Briefcase', 'Sparkles', 'Phone', 'Bell', 'Zap', 'Target'];
            const newTypes: Record<string, string> = {};
            prefs.customReminderTypes.forEach((t, i) => {
              newTypes[t] = typeIcons[i % typeIcons.length];
            });
            setAllTypes(prev => ({ ...prev, ...newTypes }));
          }
          setTransactions(txs);
        }
      } catch (e) { console.error(e); }
    }
    loadData();
    
    // Seleccionar hoy por defecto al montar
    setSelectedDate(todayStr);

    return () => { cancelled = true; };
  }, [user?.uid, todayStr]);

  // Generar eventos
  const transactionSummaries = useMemo(() => {
    const groups: Record<string, { income: number; expense: number; saving: number, count: number }> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!groups[dStr]) groups[dStr] = { income: 0, expense: 0, saving: 0, count: 0 };
      groups[dStr][t.type] += t.amount;
      groups[dStr].count++;
    });
    
    return Object.entries(groups).map(([date, totals]) => {
      const details = [];
      if (totals.income > 0) details.push(`+$${totals.income}`);
      if (totals.expense > 0) details.push(`-$${totals.expense}`);
      if (totals.saving > 0) details.push(`+$${totals.saving} (${t('common:topbar.savings')})`);

      return {
        id: `tx-${date}`,
        date,
        title: t('transactionSummary', { count: totals.count }),
        type: 'transaction_summary' as CalendarEventType,
        color: '#6B7280',
        icon: 'CreditCard',
        data: { ...totals, details: details.join(' | ') }
      };
    });
  }, [transactions, t]);

  const planToEvents = useCallback((plan: FinancialPlan): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    if (plan.status === 'completed' || plan.status === 'cancelled') return events;

    if (plan.type === 'recurring' && plan.nextDueDate) {
      const dStr = parseDeadlineToISO(plan.nextDueDate);
      if (dStr) {
        events.push({
          id: `plan-${plan.id}-rec`,
          date: dStr,
          title: t('eventTitles.recurringPayment', { title: plan.title }),
          type: 'plan',
          color: plan.color || '#F59E0B',
          icon: plan.icon || 'RefreshCw',
          data: plan
        });
      }
    } else if ((plan.type === 'savings' || plan.type === 'expense') && plan.deadline) {
      const dStr = parseDeadlineToISO(plan.deadline);
      if (dStr) {
        events.push({
          id: `plan-${plan.id}-dl`,
          date: dStr,
          title: t('eventTitles.due', { title: plan.title }),
          type: 'plan',
          color: plan.color || '#3DCC8E',
          icon: plan.icon || 'Target',
          data: plan
        });
      }
    }
    return events;
  }, [t]);

  const allEvents = useMemo(() => {
    const pEvents = plans.flatMap(planToEvents);
    const rEvents = reminders.filter(r => r.isActive).map(r => ({
      id: `rem-${r.id}`,
      date: r.date,
      title: r.title,
      type: 'reminder' as CalendarEventType,
      color: '#3B82F6',
      icon: TYPE_ICONS[r.type] || 'Bell',
      data: r
    }));
    return [...pEvents, ...rEvents, ...transactionSummaries].sort((a, b) => a.date.localeCompare(b.date));
  }, [plans, reminders, transactionSummaries, allTypes, planToEvents]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const firstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getDaysArray = () => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    const remainder = days.length % 7;
    if (remainder > 0) {
      for (let i = 0; i < 7 - remainder; i++) days.push(null);
    }
    return days;
  };

  const getDateStr = (day: number) => {
    const d = new Date(year, month, day);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getEventsForDate = (dateStr: string) => allEvents.filter(e => e.date === dateStr);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => { setCurrentDate(new Date()); setSelectedDate(todayStr); };

  const handleAddReminder = async () => {
    if (!newReminder.title || !selectedDate) return;
    await addReminder({
      ownerId: userId || 'local',
      title: newReminder.title,
      description: newReminder.description,
      reminderTime: newReminder.reminderTime,
      date: selectedDate,
      type: newReminder.type,
      isActive: true,
    });
    setShowModal(false);
    setNewReminder({ title: '', description: '', reminderTime: '09:00', type: 'other' });
    success(t('toast.reminderCreated'));
  };

  // Programar notificaciones de recordatorios
  useReminderScheduler(reminders, userId);

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="cal-page-header">
          <div>
            <h1 className="cal-page-title">{t('title')}</h1>
            <p className="cal-page-subtitle">{t('subtitle')}</p>
          </div>
          <div className="cal-header-actions">
            <button className="cal-btn-today" onClick={handleToday}>{t('goToday')}</button>
            <button className="cal-add-event-btn" onClick={() => setShowModal(true)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              {t('new')}
            </button>
          </div>
        </div>

        <div className="cal-main-layout">
          {/* Calendario Compacto (Izquierda) */}
          <div className="cal-card cal-left-panel">
            <div className="cal-month-nav">
              <button className="cal-nav-arrow" onClick={handlePrevMonth}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <h2 className="cal-month-label">{MONTHS[month]} {year}</h2>
              <button className="cal-nav-arrow" onClick={handleNextMonth}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            <div className="cal-grid">
              {DAYS.map((d) => <div key={d} className="cal-weekday">{d}</div>)}
              {getDaysArray().map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="cal-cell cal-cell-empty" />;
                const dateStr = getDateStr(day);
                const dayEvents = getEventsForDate(dateStr);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                // Extraemos tipos únicos para los indicadores
                const hasPlan = dayEvents.some(e => e.type === 'plan');
                const hasReminder = dayEvents.some(e => e.type === 'reminder');
                const hasTx = dayEvents.some(e => e.type === 'transaction_summary');

                return (
                  <div
                    key={dateStr}
                    className={`cal-cell ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''}`}
                    onClick={() => setSelectedDate(dateStr)}
                  >
                    <span className="cal-day-num">{day}</span>
                    <div className="cal-event-indicators">
                      {hasPlan && <span className="cal-indicator cal-indicator-plan" />}
                      {hasReminder && <span className="cal-indicator cal-indicator-reminder" />}
                      {hasTx && <span className="cal-indicator cal-indicator-tx" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cal-legend">
              <div className="cal-legend-item"><div className="cal-legend-dot cal-indicator-plan" /> {t('legend.plans')}</div>
              <div className="cal-legend-item"><div className="cal-legend-dot cal-indicator-reminder" /> {t('legend.reminders')}</div>
              <div className="cal-legend-item"><div className="cal-legend-dot cal-indicator-tx" /> {t('legend.movements')}</div>
            </div>
          </div>

          {/* Agenda del Día (Derecha) */}
          <div className="cal-right-panel">
            <div className="cal-card cal-agenda-card">
              <div className="cal-detail-header">
                <h3 className="cal-detail-title">
                  {selectedDate ? formatDateLong(selectedDate, i18n.language) : t('agenda.selectDay')}
                </h3>
              </div>

              <div className="cal-agenda-content">
                {selectedDate && selectedEvents.length > 0 ? (
                  <div className="cal-detail-events">
                    {selectedEvents.map((ev) => {
                      if (ev.type === 'transaction_summary') {
                        return (
                          <div key={ev.id} className="cal-event-card cal-event-tx">
                            <div className="cal-event-icon-box" style={{ background: 'var(--bg-input)' }}>
                              <InlineIcon icon={ev.icon} size={16} />
                            </div>
                            <div className="cal-event-body">
                              <h4 className="cal-event-title">{ev.title}</h4>
                              <p className="cal-event-desc">{ev.data.details}</p>
                            </div>
                          </div>
                        );
                      }

                      if (ev.type === 'plan') {
                        const plan = ev.data as FinancialPlan;
                        const pct = Math.min((plan.current / plan.target) * 100, 100);
                        return (
                          <div key={ev.id} className="cal-event-card cal-event-plan" style={{ borderLeftColor: ev.color }}>
                            <div className="cal-event-icon-box" style={{ color: ev.color, background: ev.color + '15' }}>
                              <InlineIcon icon={ev.icon} size={16} />
                            </div>
                            <div className="cal-event-body">
                              <h4 className="cal-event-title">{ev.title}</h4>
                              <p className="cal-event-desc">{plan.category} • {plan.type === 'recurring' ? t('planTypes.recurring') : t('planTypes.goal')}</p>
                              {plan.type !== 'recurring' && (
                                <div className="cal-plan-progress">
                                  <div className="cal-plan-bar"><div className="cal-plan-fill" style={{ width: `${pct}%`, background: ev.color }} /></div>
                                  <span className="cal-plan-pct">{Math.round(pct)}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // reminder
                      const rem = ev.data as Reminder;
                      return (
                        <div key={ev.id} className="cal-event-card cal-event-rem">
                          <div className="cal-event-icon-box" style={{ background: 'var(--color-blue-500)', color: 'white' }}>
                            <InlineIcon icon={ev.icon} size={16} />
                          </div>
                          <div className="cal-event-body">
                            <div className="cal-event-header-row">
                              <h4 className="cal-event-title">{ev.title}</h4>
                              <button className="cal-event-delete" onClick={(e) => { e.stopPropagation(); deleteReminderFn(rem.id); }}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              </button>
                            </div>
                            <p className="cal-event-desc">
                              {rem.reminderTime} {rem.description && `• ${rem.description}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : selectedDate ? (
                  <div className="cal-empty-state">
                    <span className="cal-empty-icon"><InlineIcon icon="Sparkles" size={24} /></span>
                    <p>{t('agenda.noEvents')}</p>
                  </div>
                ) : (
                  <div className="cal-empty-state">
                    <p>{t('agenda.selectDayCalendar')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Nuevo Recordatorio */}
        {showModal && (
          <div className="cal-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cal-modal-header">
                <h2 className="cal-modal-title">{t('modal.title')}</h2>
                <button className="cal-modal-close" onClick={() => setShowModal(false)}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
              <p className="cal-modal-date">{selectedDate ? formatDateLong(selectedDate, i18n.language) : t('modal.selectDate')}</p>
              <div className="cal-modal-body">
                <label className="cal-form-label">{t('modal.form.title')}</label>
                <input className="cal-form-input" type="text" placeholder={t('modal.form.titlePlaceholder')} value={newReminder.title} onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })} />
                <label className="cal-form-label">{t('modal.form.description')}</label>
                <input className="cal-form-input" type="text" placeholder={t('modal.form.descriptionPlaceholder')} value={newReminder.description} onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })} />
                <div className="cal-form-row">
                  <div className="cal-form-col">
                    <label className="cal-form-label">{t('modal.form.notificationTime')}</label>
                    <input className="cal-form-input" type="time" value={newReminder.reminderTime} onChange={(e) => setNewReminder({ ...newReminder, reminderTime: e.target.value })} />
                  </div>
                </div>
                <label className="cal-form-label">{t('modal.form.type')}</label>
                <CustomSelect
                  value={newReminder.type}
                  onChange={(val) => setNewReminder({ ...newReminder, type: val as Reminder['type'] })}
                  options={Object.entries(allTypes).map(([key, icon]) => ({ value: key, label: typeLabels[key] || key, icon }))}
                  placeholder={t('modal.form.selectType')}
                  allowCustom
                  onAddCustom={async (value, label) => {
                    const uid = user?.uid;
                    if (uid) {
                      await addCustomReminderType(uid, value);
                      setCustomTypes(prev => [...prev, value]);
                      const typeIcons = ['ClipboardList', 'Activity', 'Briefcase', 'Sparkles', 'Phone', 'Bell', 'Zap', 'Target'];
                      const newIcon = typeIcons[customTypes.length % typeIcons.length];
                      setAllTypes(prev => ({ ...prev, [value]: newIcon }));
                      TYPE_ICONS[value] = newIcon;
                      setTypeLabels(prev => ({ ...prev, [value]: label }));
                    }
                  }}
                  customPlaceholder={t('modal.form.customTypePlaceholder')}
                />
              </div>
              <div className="cal-modal-footer">
                <button className="cal-btn-cancel" onClick={() => setShowModal(false)}>{t('common:buttons.cancel')}</button>
                <button className="cal-btn-create" onClick={handleAddReminder}>{t('common:buttons.save')}</button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          /* === PAGE HEADER === */
          .cal-page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
          .cal-page-title { font-size: 1.75rem; font-weight: 900; color: var(--text-primary); margin: 0; letter-spacing: -0.02em; }
          .cal-page-subtitle { font-size: 0.875rem; color: var(--text-secondary); margin: 4px 0 0; }
          .cal-header-actions { display: flex; gap: 10px; align-items: center; }
          .cal-btn-today { padding: 8px 16px; border: 1px solid var(--border-default); background: var(--bg-card); border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; color: var(--text-primary); cursor: pointer; transition: all var(--transition-fast); }
          .cal-btn-today:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); box-shadow: var(--glow-sm); }
          .cal-add-event-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; background: var(--color-prosper-green); color: white; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 700; cursor: pointer; transition: all var(--transition-fast); box-shadow: var(--shadow-sm); }
          .cal-add-event-btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: var(--glow-sm); }

          /* === LAYOUT COMPACTO === */
          .cal-main-layout { display: grid; grid-template-columns: minmax(320px, 1.2fr) 1fr; gap: 24px; align-items: start; }
          .cal-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); padding: 24px; box-shadow: var(--shadow-sm); }
          .cal-left-panel { flex-direction: column; display: flex; }
          .cal-right-panel { display: flex; flex-direction: column; gap: 24px; position: sticky; top: 24px; }
          .cal-agenda-card { display: flex; flex-direction: column; min-height: 480px; }

          /* === MONTH NAV === */
          .cal-month-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; background: var(--bg-input); padding: 8px; border-radius: var(--radius-lg); }
          .cal-nav-arrow { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: none; border-radius: var(--radius-md); background: transparent; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
          .cal-nav-arrow:hover { color: var(--color-prosper-green); background: var(--bg-card); box-shadow: var(--shadow-sm); }
          .cal-month-label { font-size: 1.125rem; font-weight: 800; color: var(--text-primary); margin: 0; text-transform: capitalize; }

          /* === CALENDAR GRID (COMPACT) === */
          .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
          .cal-weekday { text-align: center; font-size: 0.6875rem; font-weight: 700; color: var(--text-tertiary); padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
          .cal-cell { position: relative; height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast); background: var(--bg-primary); border: 1px solid transparent; }
          .cal-cell:hover:not(.cal-cell-empty) { background: var(--bg-input); border-color: var(--border-default); transform: translateY(-1px); }
          .cal-cell-empty { background: transparent; cursor: default; }
          .cal-day-num { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); z-index: 1; margin-bottom: 4px; }
          
          /* Estados de celda */
          .cal-today { background: rgba(61,204,142,0.05); border-color: rgba(61,204,142,0.3); }
          .cal-today .cal-day-num { color: var(--color-prosper-green); font-weight: 800; }
          .cal-selected { background: var(--color-prosper-green) !important; border-color: var(--color-prosper-green) !important; box-shadow: var(--glow-sm); }
          .cal-selected .cal-day-num { color: white !important; font-weight: 800; }

          /* Indicadores (Dots) */
          .cal-event-indicators { display: flex; gap: 4px; height: 6px; justify-content: center; }
          .cal-indicator { width: 6px; height: 6px; border-radius: 50%; }
          .cal-indicator-plan { background: var(--color-prosper-green); }
          .cal-indicator-reminder { background: var(--color-blue-500); }
          .cal-indicator-tx { background: var(--text-tertiary); }
          .cal-selected .cal-indicator { background: white !important; opacity: 0.8; }

          /* === LEGEND === */
          .cal-legend { display: flex; gap: 16px; justify-content: center; margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--border-default); flex-wrap: wrap; }
          .cal-legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; }
          .cal-legend-dot { width: 8px; height: 8px; border-radius: 50%; }

          /* === RIGHT PANEL (AGENDA) === */
          .cal-detail-header { border-bottom: 1px solid var(--border-default); padding-bottom: 16px; margin-bottom: 16px; }
          .cal-detail-title { font-size: 1.125rem; font-weight: 800; color: var(--text-primary); margin: 0; text-transform: capitalize; }
          .cal-agenda-content { flex: 1; overflow-y: auto; padding-right: 4px; }
          .cal-agenda-content::-webkit-scrollbar { width: 4px; }
          .cal-agenda-content::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 4px; }
          
          /* Event Cards */
          .cal-detail-events { display: flex; flex-direction: column; gap: 12px; }
          .cal-event-card { display: flex; gap: 12px; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border-default); border-radius: var(--radius-lg); align-items: center; transition: all var(--transition-fast); border-left-width: 4px; }
          .cal-event-card:hover { transform: translateX(2px); box-shadow: var(--shadow-sm); }
          .cal-event-icon-box { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; color: var(--text-primary); }
          .cal-event-body { flex: 1; min-width: 0; }
          .cal-event-header-row { display: flex; justify-content: space-between; align-items: flex-start; }
          .cal-event-title { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .cal-event-desc { font-size: 0.75rem; color: var(--text-secondary); margin: 0; }
          
          /* Variaciones por tipo */
          .cal-event-tx { border-left-color: var(--text-tertiary); }
          .cal-event-rem { border-left-color: var(--color-blue-500); }
          
          /* Progreso de Planes */
          .cal-plan-progress { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
          .cal-plan-bar { flex: 1; height: 4px; background: var(--bg-input); border-radius: 2px; overflow: hidden; }
          .cal-plan-fill { height: 100%; border-radius: 2px; }
          .cal-plan-pct { font-size: 0.6875rem; font-weight: 700; color: var(--text-primary); min-width: 28px; text-align: right; }

          /* Botón borrar */
          .cal-event-delete { background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px; display: flex; border-radius: 50%; transition: all var(--transition-fast); }
          .cal-event-delete:hover { color: var(--color-error); background: rgba(239,68,68,0.1); }

          /* === EMPTY STATE === */
          .cal-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; height: 100%; color: var(--text-tertiary); }
          .cal-empty-icon { font-size: 2rem; margin-bottom: 12px; opacity: 0.5; color: var(--text-secondary); }
          
          /* === MODAL === */
          .cal-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px); animation: calFadeIn 0.2s ease; padding-top: 64px; }
          .cal-modal { background: #ffffff; width: 100%; max-width: 400px; border-radius: var(--radius-xl); overflow: hidden; box-shadow: var(--shadow-xl); border: 1px solid var(--border-default); display: flex; flex-direction: column; }
          [data-theme="dark"] .cal-modal { background: #0a1628; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6); }
          [data-theme="amoled"] .cal-modal { background: #0a0a0a; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9); }
          .cal-modal-header { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-default); }
          .cal-modal-title { font-size: 1.125rem; font-weight: 800; color: var(--text-primary); margin: 0; }
          .cal-modal-close { background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px; display: flex; transition: color var(--transition-fast); }
          .cal-modal-close:hover { color: var(--text-primary); }
          .cal-modal-date { padding: 12px 20px 0; font-size: 0.8125rem; font-weight: 600; color: var(--color-prosper-green); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
          .cal-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; max-height: 60dvh; }
          .cal-form-label { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
          .cal-form-input { width: 100%; background: var(--bg-input); border: 1px solid var(--border-default); padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.875rem; color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); font-family: inherit; }
          .cal-form-input:focus { border-color: var(--color-prosper-green); box-shadow: 0 0 0 2px rgba(61,204,142,0.1); }
          .cal-form-row { display: flex; gap: 12px; }
          .cal-form-col { flex: 1; }
          .cal-modal-footer { padding: 20px; border-top: 1px solid var(--border-default); display: flex; justify-content: flex-end; gap: 12px; background: var(--bg-primary); }
          .cal-btn-cancel { padding: 8px 16px; border: 1px solid var(--border-default); background: transparent; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; color: var(--text-primary); cursor: pointer; }
          .cal-btn-cancel:hover { background: var(--bg-input); }
          .cal-btn-create { padding: 8px 16px; border: none; background: var(--color-prosper-green); color: white; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 700; cursor: pointer; box-shadow: var(--shadow-sm); }
          .cal-btn-create:hover { filter: brightness(1.1); box-shadow: var(--glow-sm); }

          @keyframes calFadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }

          /* === RESPONSIVE === */
          @media (max-width: 1024px) {
            .cal-main-layout { grid-template-columns: 1fr; }
            .cal-right-panel { position: static; }
          }
          @media (max-width: 480px) {
            .cal-cell { height: 48px; }
            .cal-day-num { font-size: 0.75rem; }
            .cal-page-header { flex-direction: column; }
            .cal-header-actions { width: 100%; justify-content: space-between; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
});
export default CalendarioPage;
