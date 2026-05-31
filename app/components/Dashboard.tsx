'use client';

import React, { useState, useEffect, lazy, Suspense, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from './DashboardLayout';
import { useSearch } from '@/lib/contexts/SearchContext';
import { useGoals } from '@/lib/contexts/GoalsContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  IconPlus,
  IconX,
  IconTrendUp,
  IconWallet,
  IconCalendar,
  IconTasks,
  IconClock,
  IconArrowForward,
  IconZap,
  IconReceipt,
} from './icons';
import { CustomSelect } from './CustomSelect';
import '../dashboard.css';
import { addCustomCategory, getUserPreferences } from '@/lib/firestore/users';
import { subscribeToAccounts, getTotalBalance } from '@/lib/firestore/accounts';
import { getPlanSummary } from '@/lib/firestore/plans';
import { getDueRecurringPlans, getMonthlyRecurringSummary } from '@/lib/firestore/recurring';
import { useCurrency } from '@/lib/contexts/CurrencyContext';

const FinancialStatusChart = lazy(() =>
  import('./FinancialStatusChart').then((m) => ({ default: m.FinancialStatusChart }))
);
import type { Goal, GoalCategory, FinancialAccount, FinancialPlan, Reminder, Transaction } from '@/types';

const DEFAULT_CATEGORIES: Record<string, string> = { Ahorro: '💰', Inversión: '📈', Educación: '🎓', Otro: '📌' };

function parseDeadlineToISO(deadline: string): string | null {
  if (!deadline) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return deadline;
  const monthMap: Record<string, string> = {
    ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
    jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
  };
  const match = deadline.toLowerCase().match(/^([a-záéíóú]+)\s+(\d{4})$/);
  if (match) {
    const month = monthMap[match[1]] || monthMap[match[1].substring(0, 3)];
    if (month) return `${match[2]}-${month}-01`;
  }
  return null;
}

function getDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T12:00:00'); target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}



export function Dashboard() {
  const router = useRouter();
  const { query } = useSearch();
  const { goals, plans, reminders, goalsToday, remindersToday, userId, addGoal } = useGoals();
  const { user } = useAuth();
  const { formatAmount, currencyMap, displayCurrency, convertBetween, formatInCurrency } = useCurrency();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyRecurring, setMonthlyRecurring] = useState(0);
  const [dueRecurringCount, setDueRecurringCount] = useState(0);
  const [allCategories, setAllCategories] = useState<Record<string, string>>({ ...DEFAULT_CATEGORIES });
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [showBalances, setShowBalances] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard-show-balances');
      return saved !== 'false';
    } catch {
      return true;
    }
  });
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const statsScrollRef = useRef<HTMLDivElement>(null);
  const [statsAtStart, setStatsAtStart] = useState(true);
  const [statsAtEnd, setStatsAtEnd] = useState(false);
  const [bottomAtStart, setBottomAtStart] = useState(true);
  const [bottomAtEnd, setBottomAtEnd] = useState(false);

  const [statsHover, setStatsHover] = useState(false);
  const [bottomHover, setBottomHover] = useState(false);
  const autoScrollRef = useRef<number | null>(null);

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      return sum + convertBetween(acc.balance, acc.currency || 'USD', displayCurrency);
    }, 0);
  }, [accounts, displayCurrency, convertBetween]);

  const monthlySavings = useMemo(() => {
    const savings = transactions.filter((t) => t.type === 'saving');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return savings
      .filter((t) => t.date >= startOfMonth)
      .reduce((sum, t) => {
        const account = accounts.find((a) => a.id === t.accountId);
        const txCurrency = account?.currency || 'USD';
        return sum + convertBetween(t.amount, txCurrency, displayCurrency);
      }, 0);
  }, [transactions, accounts, displayCurrency, convertBetween]);

  useEffect(() => {
    const el = bottomScrollRef.current;
    if (!el) return;
    const check = () => {
      setBottomAtStart(el.scrollLeft <= 2);
      setBottomAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };
    el.addEventListener('scroll', check);
    check();
    return () => el.removeEventListener('scroll', check);
  }, []);

  useEffect(() => {
    const el = statsScrollRef.current;
    if (!el) return;
    const check = () => {
      setStatsAtStart(el.scrollLeft <= 2);
      setStatsAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };
    el.addEventListener('scroll', check);
    check();
    return () => el.removeEventListener('scroll', check);
  }, []);

  const startAutoScroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    stopAutoScroll();
    const step = () => {
      const el = ref.current;
      if (!el) return;
      el.scrollBy({ left: dir === 'left' ? -8 : 8, behavior: 'auto' });
      autoScrollRef.current = window.setTimeout(step, 16);
    };
    step();
  };

  const stopAutoScroll = () => {
    if (autoScrollRef.current !== null) {
      clearTimeout(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  };

  const scrollBy = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    ref.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  const [newGoal, setNewGoal] = useState({
    title: '',
    category: 'Ahorro' as GoalCategory,
    current: 0,
    target: 0,
    deadline: '',
    color: '#3DCC8E',
    icon: '🎯',
  });

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let cancelled = false;
    async function loadPrefs() {
      try {
        const prefs = await getUserPreferences(uid as string);
        if (!cancelled && prefs.customCategories) {
          setCustomCats(prefs.customCategories);
          const customColors = ['#10B981', '#6366F1', '#EC4899', '#F97316', '#14B8A6', '#A855F7', '#06B6D4', '#84CC16'];
          const newColors: Record<string, string> = {};
          prefs.customCategories.forEach((cat, i) => {
            newColors[cat] = customColors[i % customColors.length];
          });
          setAllCategories(prev => ({ ...prev, ...newColors }));
        }
      } catch (e) { console.error(e); }
    }
    loadPrefs();
    return () => { cancelled = true; };
  }, [user?.uid]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const unsub = subscribeToAccounts(uid, (accs) => setAccounts(accs));
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const uid = userId as string;
    if (!uid) return;
    let cancelled = false;

    async function loadData() {
      try {
        const [{ getTransactionsByOwnerId }] = await Promise.all([
          import('@/lib/firestore/transactions'),
        ]);

        if (cancelled) return;

        const transactionsData = await getTransactionsByOwnerId(uid);

        if (!cancelled) {
          setTransactions(transactionsData);
        }
      } catch (e) {
        console.error('Firestore load error:', e);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let cancelled = false;

    async function loadRecurring() {
      try {
        const uidStr = uid as string;
        const [duePlans, summary] = await Promise.all([
          getDueRecurringPlans(uidStr),
          getMonthlyRecurringSummary(uidStr),
        ]);
        if (!cancelled) {
          setDueRecurringCount(duePlans.length);
          setMonthlyRecurring(summary.totalMonthly);
        }
      } catch (e) { console.error(e); }
    }
    loadRecurring();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const activeGoals = goals.filter((g) => g.status !== 'completed' && (!query || g.title.toLowerCase().includes(query.toLowerCase())));
  const completedGoals = goals.filter((g) => g.status === 'completed' && (!query || g.title.toLowerCase().includes(query.toLowerCase())));
  const totalGoals = goals.length;
  const progressPct = totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressPct / 100);

  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 5);
  }, [transactions]);

  const startOfMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }, []);

  const monthlyIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income' && t.date >= startOfMonth)
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const txCurrency = account?.currency || 'USD';
        return sum + convertBetween(t.amount, txCurrency, displayCurrency);
      }, 0);
  }, [transactions, accounts, displayCurrency, convertBetween, startOfMonth]);

  const monthlyExpenses = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' && t.date >= startOfMonth)
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const txCurrency = account?.currency || 'USD';
        return sum + convertBetween(t.amount, txCurrency, displayCurrency);
      }, 0);
  }, [transactions, accounts, displayCurrency, convertBetween, startOfMonth]);

  const activePlans = plans.filter((p) => p.status === 'progress' || p.status === 'pending');
  const savingsPlans = plans.filter((p) => p.type === 'savings' && p.status !== 'completed');
  const totalSavingsTarget = savingsPlans.reduce((sum, p) => sum + p.target, 0);
  const totalSavingsCurrent = savingsPlans.reduce((sum, p) => sum + p.current, 0);

  const handleCreateGoal = async () => {
    if (!newGoal.title || !newGoal.target) return;
    await addGoal({
      ownerId: userId || 'local',
      title: newGoal.title,
      category: newGoal.category,
      current: newGoal.current,
      target: newGoal.target,
      deadline: newGoal.deadline,
      status: newGoal.current >= newGoal.target ? 'completed' : 'pending',
      color: newGoal.color,
      icon: newGoal.icon,
    });
    setShowNewGoalModal(false);
    setNewGoal({ title: '', category: 'Ahorro', current: 0, target: 0, deadline: '', color: '#3DCC8E', icon: '🎯' });
  };

  const upcomingDeadlines = [...goals, ...plans]
    .filter((item) => item.status !== 'completed' && item.deadline)
    .map((item) => ({
      ...item,
      iso: parseDeadlineToISO(item.deadline as string),
    }))
    .filter((item) => item.iso !== null)
    .sort((a, b) => (a.iso as string).localeCompare(b.iso as string))
    .slice(0, 5);

  const todayItems = [
    ...goalsToday.map((g) => ({ ...g, itemType: 'goal' as const })),
    ...remindersToday.map((r) => ({ ...r, itemType: 'reminder' as const })),
  ];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  // Cursor neon glow (desktop only)
  const glowRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -500, y: -500 });
  const rafRef = useRef<number>(0);
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDesktop) return;
    mouseRef.current = { x: e.clientX, y: e.clientY };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        if (glowRef.current) {
          glowRef.current.style.transform = `translate(${mouseRef.current.x - 400}px, ${mouseRef.current.y - 400}px)`;
        }
      });
    }
  }, [isDesktop]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <DashboardLayout>
      {isDesktop && (
        <div
          className="cursor-glow"
          ref={glowRef}
        />
      )}
      <div className="dashboard-container" onMouseMove={handleMouseMove}>
        {/* Welcome Banner */}
        <div className="welcome-banner dash-item" style={{animationDelay: '0s'}}>
          <div className="welcome-content">
            <p className="welcome-greeting">{greeting()},</p>
            <h1 className="welcome-title">{user?.displayName || 'Usuario'}</h1>
            <p className="welcome-subtitle">Aquí tienes un resumen de tu situación financiera</p>
          </div>
          <div className="welcome-actions">
            <button className="btn btn-primary btn-sm" onClick={() => router.push('/metas')}>
              <IconPlus width={14} /> Nuevo Plan
            </button>
          </div>
          <div className="welcome-bg-shapes">
            <div className="welcome-shape welcome-shape-1" />
            <div className="welcome-shape welcome-shape-2" />
            <div className="welcome-shape welcome-shape-3" />
          </div>
        </div>

        {/* Stats Pills - Grid visible */}
        <div className="stats-grid dash-stagger">
          <div className="stat-pill dash-item" style={{animationDelay: '0.05s'}} onClick={() => router.push('/finanzas')}>
            <div className="stat-pill-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>📈</div>
            <div className="stat-pill-info">
              <span className="stat-pill-label">Ahorro Mensual</span>
              <span className="stat-pill-value">{formatInCurrency(monthlySavings, displayCurrency)}</span>
            </div>
          </div>
          <div className="stat-pill dash-item" style={{animationDelay: '0.11s'}} onClick={() => router.push('/metas')}>
            <div className="stat-pill-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>🎯</div>
            <div className="stat-pill-info">
              <span className="stat-pill-label">Ahorro en Planes</span>
              <span className="stat-pill-value">{formatAmount(totalSavingsCurrent)}</span>
            </div>
          </div>
          <div className="stat-pill dash-item" style={{animationDelay: '0.17s'}} onClick={() => router.push('/metas')}>
            <div className="stat-pill-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>🔄</div>
            <div className="stat-pill-info">
              <span className="stat-pill-label">Recurrentes/Mes</span>
              <span className="stat-pill-value">{formatAmount(monthlyRecurring)}</span>
            </div>
            {dueRecurringCount > 0 && <span className="stat-pill-badge">{dueRecurringCount}</span>}
          </div>
          <div className="stat-pill dash-item" style={{animationDelay: '0.23s'}} onClick={() => router.push('/metas')}>
            <div className="stat-pill-icon" style={{ background: 'rgba(236,72,153,0.15)' }}>✓</div>
            <div className="stat-pill-info">
              <span className="stat-pill-label">Metas Completadas</span>
              <span className="stat-pill-value">{completedGoals.length}</span>
            </div>
          </div>
        </div>

        {/* Today Section - Avisos */}
        {todayItems.length > 0 && (
          <div className="today-section dash-item" style={{animationDelay: '0.3s'}}>
            <div className="section-header">
              <div className="section-header-left">
                <IconCalendar width={18} />
                <h2 className="section-title">Para Hoy</h2>
              </div>
              <span className="section-count">{todayItems.length} pendiente{todayItems.length > 1 ? 's' : ''}</span>
            </div>
            <div className="today-list">
              {todayItems.map((item) => (
                <div
                  key={item.id}
                  className="today-item"
                  onClick={() => router.push(item.itemType === 'goal' ? '/metas' : '/calendario')}
                >
                  <div className="today-item-dot" style={{ background: item.itemType === 'goal' ? 'var(--color-prosper-green)' : 'var(--color-gold-500)' }} />
                  <div className="today-item-content">
                    <span className="today-item-title">{item.title}</span>
                    <span className="today-item-desc">
                      {item.itemType === 'goal'
                        ? `${formatAmount((item as Goal).current)} de ${formatAmount((item as Goal).target)}`
                        : (item as Reminder).type}
                    </span>
                  </div>
                  <span className="today-item-arrow">›</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Widgets Grid - all visible */}
        <div className="widgets-grid dash-stagger">

          {/* Active Plans */}
          <div className="content-card plans-card dash-item" style={{animationDelay: '0.35s'}}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconTasks width={18} />
                <h2 className="content-card-title">Planes Activos</h2>
              </div>
              <button className="content-card-action" onClick={() => router.push('/metas')}>
                Ver todo
              </button>
            </div>
            <div className="plans-list">
              {activePlans.slice(0, 5).map((plan: FinancialPlan) => {
                const pct = Math.min((plan.current / plan.target) * 100, 100);
                const typeColors: Record<string, string> = {
                  savings: 'var(--color-prosper-green)',
                  expense: 'var(--color-gold-500)',
                  recurring: 'var(--color-blue-500, #3B82F6)',
                };
                const typeIcons: Record<string, string> = {
                  savings: '🏦',
                  expense: '📋',
                  recurring: '🔄',
                };
                return (
                  <div className="plan-item" key={plan.id} onClick={() => router.push('/metas')}>
                    <div className="plan-item-header">
                      <div className="plan-item-icon">{plan.icon || typeIcons[plan.type] || '📌'}</div>
                      <div className="plan-item-info">
                        <span className="plan-item-title">{plan.title}</span>
                        <span className="plan-item-meta">{plan.category} · {plan.type === 'savings' ? 'Ahorro' : plan.type === 'expense' ? 'Gasto' : 'Recurrente'}</span>
                      </div>
                    </div>
                    <div className="plan-item-progress">
                      <div className="plan-progress-track">
                        <div
                          className="plan-progress-fill"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${typeColors[plan.type]}, ${typeColors[plan.type]}dd)` }}
                        />
                      </div>
                      <div className="plan-progress-info">
                        <span className="plan-progress-pct" style={{ color: typeColors[plan.type] }}>{Math.round(pct)}%</span>
                        <span className="plan-progress-amounts">{formatAmount(plan.current)} / {formatAmount(plan.target)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {activePlans.length === 0 && (
                <div className="plans-empty">
                  <p>No hay planes activos</p>
                  <button className="plans-empty-btn" onClick={() => router.push('/metas')}>Crear primer plan</button>
                </div>
              )}
            </div>
          </div>

          {/* Progress Ring */}
          <div className="content-card progress-section dash-item" style={{animationDelay: '0.42s'}}>
            <div className="content-card-header">
              <h2 className="content-card-title">Progreso General</h2>
            </div>
            <div className="progress-ring-wrapper">
              <div className="progress-ring-container">
                <svg className="progress-ring" viewBox="0 0 120 120">
                  <circle className="progress-ring-track" cx="60" cy="60" r="54" />
                  <circle className="progress-ring-fill" cx="60" cy="60" r="54" style={{ strokeDashoffset }} />
                </svg>
                <div className="progress-ring-center">
                  <span className="progress-pct">{progressPct}%</span>
                  <span className="progress-label">Completado</span>
                </div>
              </div>
              <div className="progress-stats">
                <div className="progress-stat">
                  <span className="progress-stat-value">{activeGoals.length}</span>
                  <span className="progress-stat-label">Activas</span>
                </div>
                <div className="progress-stat">
                  <span className="progress-stat-value">{completedGoals.length}</span>
                  <span className="progress-stat-label">Completadas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="content-card deadlines-section dash-item" style={{animationDelay: '0.55s'}}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconClock width={18} />
                <h2 className="content-card-title">Próximos Vencimientos</h2>
              </div>
            </div>
            <div className="deadlines-list">
              {upcomingDeadlines.length > 0 ? upcomingDeadlines.map((item) => {
                const daysLeft = getDaysUntil(item.iso as string);
                const urgency = daysLeft <= 0 ? 'urgent' : daysLeft <= 7 ? 'warning' : 'normal';
                return (
                  <div className="deadline-item" key={item.id} onClick={() => router.push('/metas')}>
                    <div className={`deadline-badge ${urgency}`}>
                      <span className="deadline-badge-days">{daysLeft <= 0 ? '!' : daysLeft}</span>
                      <span className="deadline-badge-label">{daysLeft <= 0 ? 'vencido' : daysLeft === 1 ? 'día' : 'días'}</span>
                    </div>
                    <div className="deadline-info">
                      <span className="deadline-title">{item.title}</span>
                      <span className="deadline-amount">{formatAmount(item.current)} / {formatAmount(item.target)}</span>
                    </div>
                  </div>
                );
              }) : (
                <p className="empty-msg">No hay vencimientos próximos</p>
              )}
            </div>
          </div>

          {/* Quick Access Accounts */}
          <div className="content-card accounts-section dash-item" style={{animationDelay: '0.48s'}}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconWallet width={18} />
                <h2 className="content-card-title">Mis Cuentas</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="content-card-action" onClick={() => { const next = !showBalances; setShowBalances(next); try { localStorage.setItem('dashboard-show-balances', String(next)); } catch {} }} title={showBalances ? 'Ocultar saldos' : 'Mostrar saldos'} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                  {showBalances ? ' Ocultar' : '👁️ Mostrar'}
                </button>
                <button className="content-card-action" onClick={() => router.push('/finanzas')}>
                  Gestionar
                </button>
              </div>
            </div>
            <div className="accounts-list">
              {accounts.slice(0, 4).map((acc) => {
                const typeIcons: Record<string, string> = { checking: '🏦', savings: '💰', cash: '💵' };
                return (
                  <div className="account-item" key={acc.id} onClick={() => router.push('/finanzas')}>
                    <div className="account-item-icon" style={{ background: `${acc.color}20` }}>
                      {acc.icon || typeIcons[acc.type] || '💳'}
                    </div>
                    <div className="account-item-info">
                      <span className="account-item-name">{acc.name}</span>
                      <span className="account-item-type">
                        {acc.type === 'checking' ? 'Corriente' : acc.type === 'savings' ? 'Ahorro' : 'Efectivo'} • {acc.currency || 'BS'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className="account-item-balance" style={{ color: showBalances ? (acc.balance >= 0 ? 'var(--color-prosper-green)' : 'var(--color-error)') : 'var(--text-tertiary)', fontWeight: 600 }}>
                        {showBalances ? formatInCurrency(acc.balance, acc.currency) : '••••••'}
                      </span>
                      {showBalances && acc.currency !== displayCurrency && (
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                          ≈ {formatInCurrency(convertBetween(acc.balance, acc.currency, displayCurrency), displayCurrency)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {accounts.length === 0 && (
                <p className="empty-msg">Sin cuentas configuradas</p>
              )}
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="content-card summary-card dash-item" style={{animationDelay: '0.62s'}}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconWallet width={18} />
                <h2 className="content-card-title">Resumen del Mes</h2>
              </div>
            </div>
            <div className="summary-body">
              <div className="summary-row">
                <span className="summary-label">Ingresos</span>
                <span className="summary-value income">{formatInCurrency(monthlyIncome, displayCurrency)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Gastos</span>
                <span className="summary-value expense">{formatInCurrency(monthlyExpenses, displayCurrency)}</span>
              </div>
              {(monthlyIncome + monthlyExpenses) > 0 && (
                <div className="summary-bar">
                  <div className="summary-bar-track">
                    <div className="summary-bar-fill income-fill" style={{ width: `${(monthlyIncome / (monthlyIncome + monthlyExpenses)) * 100}%` }} />
                    <div className="summary-bar-fill expense-fill" style={{ width: `${(monthlyExpenses / (monthlyIncome + monthlyExpenses)) * 100}%` }} />
                  </div>
                </div>
              )}
              <div className="summary-row summary-total">
                <span className="summary-label">Balance</span>
                <span className={`summary-value ${monthlyIncome - monthlyExpenses >= 0 ? 'income' : 'expense'}`}>
                  {formatInCurrency(monthlyIncome - monthlyExpenses, displayCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="content-card recent-tx-card dash-item" style={{animationDelay: '0.69s'}}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconReceipt width={18} />
                <h2 className="content-card-title">Últimos Movimientos</h2>
              </div>
              <button className="content-card-action" onClick={() => router.push('/finanzas')}>
                Ver todo
              </button>
            </div>
            <div className="recent-tx-list">
              {recentTransactions.length > 0 ? recentTransactions.map((tx) => {
                const txIcon = tx.type === 'income' ? '📥' : tx.type === 'expense' ? '📤' : '💰';
                const txAccount = accounts.find(a => a.id === tx.accountId);
                const txCurr = txAccount?.currency || 'USD';
                return (
                  <div className="recent-tx-item" key={tx.id} onClick={() => router.push('/finanzas')}>
                    <div className={`recent-tx-icon tx-${tx.type}`}>{txIcon}</div>
                    <div className="recent-tx-info">
                      <span className="recent-tx-desc">{tx.description || tx.category}</span>
                      <span className="recent-tx-date">{tx.date ? new Date(tx.date).toLocaleDateString() : ''}</span>
                    </div>
                    <span className={`recent-tx-amount tx-${tx.type}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatInCurrency(tx.amount, txCurr)}
                    </span>
                  </div>
                );
              }) : (
                <p className="empty-msg" style={{ padding: '24px 0' }}>Sin movimientos recientes</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="content-card quick-actions-card dash-item" style={{animationDelay: '0.76s'}}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconZap width={18} />
                <h2 className="content-card-title">Acciones Rápidas</h2>
              </div>
            </div>
            <div className="quick-actions-grid">
              <button className="quick-action-btn" onClick={() => router.push('/metas?action=add-plan')}>
                <span className="quick-action-icon">🎯</span>
                <span className="quick-action-label">Nuevo Plan</span>
              </button>
              <button className="quick-action-btn" onClick={() => router.push('/finanzas?action=add-account')}>
                <span className="quick-action-icon">💳</span>
                <span className="quick-action-label">Nueva Cuenta</span>
              </button>
              <button className="quick-action-btn" onClick={() => router.push('/finanzas?action=add-transaction')}>
                <span className="quick-action-icon">💸</span>
                <span className="quick-action-label">Transacción</span>
              </button>
              <button className="quick-action-btn" onClick={() => router.push('/calendario')}>
                <span className="quick-action-icon">📅</span>
                <span className="quick-action-label">Calendario</span>
              </button>
            </div>
          </div>

          {/* Herramientas */}
          <div className="content-card quick-actions-card dash-item" style={{animationDelay: '0.8s'}}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                <h2 className="content-card-title">Herramientas</h2>
              </div>
              <span style={{fontSize:'0.6rem',padding:'2px 8px',borderRadius:'999px',background:'rgba(61,204,142,0.15)',color:'#3DCC8E',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.04em'}}>En Desarrollo</span>
            </div>
            <div className="quick-actions-grid">
              <div className="quick-action-btn" style={{opacity:0.5,cursor:'default'}}>
                <span className="quick-action-icon">💱</span>
                <span className="quick-action-label">USD/BS</span>
              </div>
              <div className="quick-action-btn" style={{opacity:0.5,cursor:'default'}}>
                <span className="quick-action-icon">🧾</span>
                <span className="quick-action-label">Importar factura</span>
              </div>
              <div className="quick-action-btn" style={{opacity:0.5,cursor:'default'}}>
                <span className="quick-action-icon">🛒</span>
                <span className="quick-action-label">Listas de compras</span>
              </div>
              <div className="quick-action-btn" style={{opacity:0.5,cursor:'default'}}>
                <span className="quick-action-icon">🤖</span>
                <span className="quick-action-label">Asistente AI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart - Full width at bottom */}
        <div className="chart-bottom-wrapper dash-item" style={{animationDelay: '0.85s'}}>
          <div className="content-card chart-card">
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconTrendUp width={18} />
                <h2 className="content-card-title">Rendimiento Financiero</h2>
              </div>
              <button className="content-card-action" onClick={() => router.push('/finanzas')}>
                Ver detalles <IconArrowForward width={14} />
              </button>
            </div>
            <Suspense fallback={<div className="chart-skeleton" style={{ width: '100%', height: '280px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }} />}>
              <FinancialStatusChart />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Modal Nueva Meta */}
      {showNewGoalModal && (
        <div className="modal-overlay" onClick={() => setShowNewGoalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva Meta</h2>
              <button className="modal-close" onClick={() => setShowNewGoalModal(false)}><IconX width={20} /></button>
            </div>
            <div className="modal-body">
              <label className="form-label">Título</label>
              <input className="form-input" type="text" placeholder="Ej: Fondo de Emergencia" value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} />
              <label className="form-label">Categoría</label>
              <CustomSelect
                value={newGoal.category}
                onChange={(val) => setNewGoal({ ...newGoal, category: val as GoalCategory })}
                options={Object.entries(allCategories).map(([key, icon]) => ({ value: key, label: key, icon }))}
                placeholder="Seleccionar categoría..."
                allowCustom
                onAddCustom={async (value, label) => {
                  const uid = user?.uid;
                  if (uid) {
                    await addCustomCategory(uid, value);
                    setCustomCats(prev => [...prev, value]);
                    const customColors = ['#10B981', '#6366F1', '#EC4899', '#F97316', '#14B8A6', '#A855F7', '#06B6D4', '#84CC16'];
                    const newColor = customColors[customCats.length % customColors.length];
                    setAllCategories(prev => ({ ...prev, [value]: newColor }));
                  }
                }}
                customPlaceholder="Nombre de la categoría..."
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">{`Monto Actual (${currencyMap[displayCurrency].symbol})`}</label><input className="form-input" type="number" placeholder="0" value={newGoal.current || ''} onChange={(e) => setNewGoal({ ...newGoal, current: Number(e.target.value) })} /></div>
                <div><label className="form-label">{`Meta (${currencyMap[displayCurrency].symbol})`}</label><input className="form-input" type="number" placeholder="10000" value={newGoal.target || ''} onChange={(e) => setNewGoal({ ...newGoal, target: Number(e.target.value) })} /></div>
              </div>
              <label className="form-label">Fecha Límite</label>
              <input className="form-input" type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} />
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['#3DCC8E', '#1E3A6E', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'].map((c) => (
                  <button key={c} onClick={() => setNewGoal({ ...newGoal, color: c })} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: newGoal.color === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
              <label className="form-label">Icono</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['??', '???', '??', '??', '??', '??', '??'].map((icon) => (
                  <button key={icon} onClick={() => setNewGoal({ ...newGoal, icon })} style={{ fontSize: '1.25rem', padding: 6, borderRadius: 'var(--radius-md)', background: newGoal.icon === icon ? 'var(--bg-input)' : 'transparent', border: newGoal.icon === icon ? '2px solid var(--color-prosper-green)' : '2px solid transparent', cursor: 'pointer' }}>{icon}</button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setShowNewGoalModal(false)}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreateGoal}>Crear Meta</button>
            </div>
          </div>
        </div>
      )}


    </DashboardLayout>
  );
}


