'use client';

import React, { useState, useEffect, Suspense, useRef, useMemo, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useTranslation, Trans } from 'react-i18next';
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
import { InlineIcon, IconBadge } from '@/app/components/IconMap';
import { CurrencyFlag } from '@/app/components/CryptoIcons';
import { Star, Settings } from 'lucide-react';
import { safeLocalStorage } from '@/lib/utils/safeStorage';
import { CustomSelect } from './CustomSelect';
import { useDashboardLayout } from '@/lib/contexts/DashboardLayoutContext';

import { addCustomCategory, getUserPreferences } from '@/lib/firestore/users';
import { subscribeToAccounts, getTotalBalance, updateAccountBalance, subscribeToAccountGroups, toggleAccountFavorite } from '@/lib/firestore/accounts';
import { getDueRecurringPlans, getMonthlyRecurringSummary } from '@/lib/firestore/recurring';
import { createTransaction } from '@/lib/firestore/transactions';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { getAccountRates, convertCurrency, CURRENCY_MAP } from '@/lib/currency';

const FinancialStatusChart = dynamic(() =>
  import('./FinancialStatusChart').then((m) => ({ default: m.FinancialStatusChart })),
  { ssr: false }
);
import type { Goal, GoalCategory, FinancialAccount, FinancialPlan, Reminder, Transaction, AccountGroup, CurrencyCode, ExpenseRequest, DashboardWidgetConfig, WidgetCategory } from '@/types';

const DEFAULT_CATEGORIES: Record<string, string> = { Ahorro: 'Wallet', Inversión: 'TrendingUp', Educación: 'GraduationCap', Otro: 'Pin' };

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

// ── Secciones colapsables ───────────────────────────────────────────
function useCollapsedSections(categoryIds: string[]) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const saved = safeLocalStorage.getItem('dashboard-collapsed-sections');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure all current categories exist
        categoryIds.forEach(id => { if (!(id in parsed)) parsed[id] = false; });
        return parsed;
      }
    } catch {}
    const initial: Record<string, boolean> = {};
    categoryIds.forEach(id => initial[id] = false);
    return initial;
  });

  useEffect(() => {
    setCollapsed(prev => {
      const next = { ...prev };
      categoryIds.forEach(id => { if (!(id in next)) next[id] = false; });
      return next;
    });
  }, [categoryIds.join(',')]);

  const toggle = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { safeLocalStorage.setItem('dashboard-collapsed-sections', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { collapsed, toggle };
}

// ── Widget de Tasas de Cambio ───────────────────────────────────────
const CRYPTO_LIST = [
  { code: 'USDT', name: 'Tether' },
  { code: 'SOL', name: 'Solana' },
  { code: 'BTC', name: 'Bitcoin' },
  { code: 'ETH', name: 'Ethereum' },
  { code: 'USDC', name: 'USD Coin' },
] as const;

const FIAT_LIST = [
  { code: 'USD', name: 'Dólar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'COP', name: 'Peso Col.', flag: '🇨🇴' },
] as const;

function WidgetTasasCambio({ rates, p2pMode, className = '' }: { rates: import('@/types').ExchangeRates; p2pMode: boolean; className?: string }) {
  const { t } = useTranslation('dashboard');
  const oficialRate = rates.rates.USD || 40;
  const eurRate = rates.rates.EUR || 48.5;
  const copRate = rates.rates.COP || 0.0105;

  return (
    <div className={`content-card rates-card dash-item ${className}`} style={{ animationDelay: '0.7s' }}>
      <div className="content-card-header">
        <div className="content-card-header-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <h2 className="content-card-title">{t('market.exchangeRates')}</h2>
        </div>
      </div>
      <div className="rates-list">
        {/* Fiat */}
        <div className="rates-group">
          <span className="rates-group-label">{t('market.fiat')}</span>
          <div className="rates-items">
            <div className="rate-item">
              <CurrencyFlag code="USD" size={16} className="rate-flag" />
              <span className="rate-name">USD</span>
              <span className="rate-value">{CURRENCY_MAP.BS.symbol}{oficialRate.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="rate-item">
              <CurrencyFlag code="EUR" size={16} className="rate-flag" />
              <span className="rate-name">EUR</span>
              <span className="rate-value">{CURRENCY_MAP.BS.symbol}{eurRate.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="rate-item">
              <CurrencyFlag code="COP" size={16} className="rate-flag" />
              <span className="rate-name">COP</span>
              <span className="rate-value">{CURRENCY_MAP.BS.symbol}{copRate.toLocaleString('es-VE', { maximumFractionDigits: 4 })}</span>
            </div>
          </div>
        </div>
        {/* Cryptos */}
        <div className="rates-group">
          <span className="rates-group-label">{t('market.cryptos')}</span>
          <div className="rates-items">
            {CRYPTO_LIST.map(({ code, name }) => {
              const usdPrice = rates.cryptoPrices?.[code];
              const bsRate = rates.rates[code as CurrencyCode];
              const p2pRate = rates.p2pRates?.[code];
              const displayBs = p2pMode && p2pRate ? p2pRate : bsRate;
              return (
                <div className="rate-item" key={code}>
                  <CurrencyFlag code={code} size={16} className="rate-flag" />
                  <span className="rate-name">{code}</span>
                  <div className="rate-values">
                    {usdPrice && (
                      <span className="rate-usd">${usdPrice.toLocaleString('en-US', { maximumFractionDigits: code === 'BTC' || code === 'ETH' ? 0 : 2 })}</span>
                    )}
                    {displayBs && (
                      <span className="rate-bs">{CURRENCY_MAP.BS.symbol}{displayBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section Header con toggle colapsable ────────────────────────────
function SectionHeader({ icon, title, count, collapsed, onToggle }: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation('dashboard');
  return (
    <div className="dash-section-header" onClick={onToggle}>
      <div className="dash-section-header-left">
        {icon}
        <h2 className="dash-section-title">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="dash-section-count">{count}</span>
        )}
      </div>
      <button className="dash-section-toggle" aria-label={collapsed ? t('aria.expandSection') : t('aria.collapseSection')} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}

export const Dashboard = memo(function Dashboard() {
  const router = useRouter();
  const { query } = useSearch();
  const { goals, plans, reminders, goalsToday, plansToday, remindersToday, pendingRequests, userId, addGoal } = useGoals();
  const { user } = useAuth();
  const { formatAmount, currencyMap, displayCurrency, convertBetween, formatInCurrency, rates, p2pMode } = useCurrency();
  const { t } = useTranslation(['dashboard', 'common']);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyRecurring, setMonthlyRecurring] = useState(0);
  const [dueRecurringCount, setDueRecurringCount] = useState(0);
  const [allCategories, setAllCategories] = useState<Record<string, string>>({ ...DEFAULT_CATEGORIES });
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const { layout } = useDashboardLayout();
  const [showBalances, setShowBalances] = useState(() => {
    try {
      const saved = safeLocalStorage.getItem('dashboard-show-balances');
      return saved !== 'false';
    } catch {
      return true;
    }
  });
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferMsg, setTransferMsg] = useState('');
  const transferMsgTimeout = useRef<number | null>(null);

  const handleToggleFavorite = async (accountId: string) => {
    const uid = user?.uid;
    if (!uid) return;
    const result = await toggleAccountFavorite(accountId, uid, accounts);
    if (!result.success) {
      alert(result.message || t('alerts.favoriteError'));
    }
  };

  const categoryIds = useMemo(() => layout.categories.map(c => c.id), [layout.categories]);
  const { collapsed, toggle } = useCollapsedSections(categoryIds);

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      return sum + convertCurrency(acc.balance, acc.currency || 'USD', displayCurrency, getAccountRates(acc, rates, p2pMode));
    }, 0);
  }, [accounts, displayCurrency, rates, p2pMode]);

  const monthlySavings = useMemo(() => {
    const savings = transactions.filter((t) => t.type === 'saving' && t.category !== 'Transferencia');
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

  const [newGoal, setNewGoal] = useState({
    title: '',
    category: 'Ahorro' as GoalCategory,
    current: 0,
    target: 0,
    deadline: '',
    color: '#3DCC8E',
    icon: 'Target',
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
    const unsub = subscribeToAccounts(uid, (accs) => {
      // Deduplicar cuentas por id (previene duplicados de Firestore)
      const seen = new Set<string>();
      const unique = accs.filter(acc => {
        if (seen.has(acc.id)) return false;
        seen.add(acc.id);
        return true;
      });
      setAccounts(unique);
    });
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to account groups
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const unsub = subscribeToAccountGroups(uid, (groups) => setAccountGroups(groups));
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

  const handleTransfer = async () => {
    const uid = user?.uid;
    if (!uid) return;
    const from = accounts.find(a => a.id === transferFrom);
    const to = accounts.find(a => a.id === transferTo);
    const amount = parseFloat(transferAmount);
    if (!from || !to) { setTransferMsg(t('transfer.selectAccounts')); showTransferMsg(); return; }
    if (from.id === to.id) { setTransferMsg(t('transfer.accountsMustDiffer')); showTransferMsg(); return; }
    if (!amount || amount <= 0) { setTransferMsg(t('transfer.enterValidAmount')); showTransferMsg(); return; }
    if (from.balance < amount) { setTransferMsg(t('transfer.insufficientFunds')); showTransferMsg(); return; }
    setTransferring(true);
    setTransferMsg('');
    try {
      const fromCurr = from.currency || 'USD', toCurr = to.currency || 'USD';
      const convertedAmount = fromCurr === toCurr ? amount : convertBetween(amount, fromCurr, toCurr);
      await updateAccountBalance(from.id, -amount);
      await updateAccountBalance(to.id, convertedAmount);
      const date = Date.now();
      await createTransaction({ ownerId: uid, amount, type: 'saving', category: 'Transferencia', description: `Transferencia a: ${to.name}${fromCurr !== toCurr ? ` (Conv. ${formatInCurrency(convertedAmount, toCurr)})` : ''}`, date, accountId: from.id, currency: fromCurr });
      await createTransaction({ ownerId: uid, amount: convertedAmount, type: 'income', category: 'Transferencia', description: `Transferencia recibida de: ${from.name}${fromCurr !== toCurr ? ` (Conv. ${formatInCurrency(amount, fromCurr)})` : ''}`, date, accountId: to.id, currency: toCurr });
      setTransferAmount('');
      setTransferFrom('');
      setTransferTo('');
      setTransferMsg(t('transfer.success'));
      showTransferMsg();
    } catch (e: any) {
      setTransferMsg(t('transfer.error', { message: e?.message || t('transfer.retry', { defaultValue: 'intenta de nuevo' }) }));
      showTransferMsg();
    }
    setTransferring(false);
  };

  function showTransferMsg() {
    if (transferMsgTimeout.current) clearTimeout(transferMsgTimeout.current);
    transferMsgTimeout.current = window.setTimeout(() => setTransferMsg(''), 4000) as unknown as number;
  }

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
    setNewGoal({ title: '', category: 'savings' as GoalCategory, current: 0, target: 0, deadline: '', color: '#3DCC8E', icon: 'Target' });
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
    ...plansToday.map((p) => ({ ...p, itemType: 'plan' as const })),
    ...remindersToday.map((r) => ({ ...r, itemType: 'reminder' as const })),
    ...pendingRequests.map((r) => ({ ...r, itemType: 'request' as const })),
  ];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting.morning');
    if (hour < 18) return t('greeting.afternoon');
    return t('greeting.evening');
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

  // ── Computed data for widgets ─────────────────────────────────────
  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 4);
  }, [transactions]);

  const startOfMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }, []);

  const monthlyIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income' && t.category !== 'Transferencia' && t.date >= startOfMonth)
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const txCurrency = account?.currency || 'USD';
        return sum + convertBetween(t.amount, txCurrency, displayCurrency);
      }, 0);
  }, [transactions, accounts, displayCurrency, convertBetween, startOfMonth]);

  const monthlyExpenses = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' && t.category !== 'Transferencia' && t.date >= startOfMonth)
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const txCurrency = account?.currency || 'USD';
        return sum + convertBetween(t.amount, txCurrency, displayCurrency);
      }, 0);
  }, [transactions, accounts, displayCurrency, convertBetween, startOfMonth]);

  // Accounts grouped by groupId - Lógica robusta y simple
  const groupedAccounts = useMemo(() => {
    // Mapa de grupoId -> { group, accounts[] }
    const groupMap = new Map<string, { group: AccountGroup | null; accounts: FinancialAccount[] }>();
    const ungrouped: FinancialAccount[] = [];

    // Paso 1: Crear entradas para todos los grupos existentes (incluso vacíos)
    accountGroups.forEach(g => {
      groupMap.set(g.id, { group: g, accounts: [] });
    });

    // Paso 2: Asignar cada cuenta a su grupo o a ungrouped
    accounts.forEach(acc => {
      const gid = acc.groupId?.trim();
      if (gid && groupMap.has(gid)) {
        groupMap.get(gid)!.accounts.push(acc);
      } else if (gid && !groupMap.has(gid)) {
        // groupId referencia un grupo que ya no existe -> cuenta huérfana
        ungrouped.push(acc);
      } else {
        // Sin groupId
        ungrouped.push(acc);
      }
    });

    // Paso 3: Convertir a array y ordenar grupos
    const grouped = Array.from(groupMap.values())
      .filter(g => g.accounts.length > 0) // Solo grupos con cuentas
      .sort((a, b) => (a.group?.order ?? 999) - (b.group?.order ?? 999));

    return { grouped, ungrouped };
  }, [accounts, accountGroups]);

  // Helper: format crypto transaction with USD + BS
  const formatCryptoTx = (tx: Transaction, txCurrency: CurrencyCode) => {
    const isCrypto = ['BTC', 'ETH', 'SOL', 'USDT', 'USDC'].includes(txCurrency);
    if (!isCrypto) return null;
    const usdPrice = rates.cryptoPrices?.[txCurrency];
    if (!usdPrice) return null;
    const usdAmount = tx.amount * usdPrice;
    const bsAmount = convertCurrency(usdAmount, 'USD', 'BS', rates.rates);
    return (
      <span className="recent-tx-crypto">
        ≈ ${usdAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} · {CURRENCY_MAP.BS.symbol}{bsAmount.toLocaleString('es-VE', { maximumFractionDigits: 0 })}
      </span>
    );
  };

  const renderWidget = (widget: DashboardWidgetConfig) => {
    const sizeClass = `widget-${widget.size}`;
    switch (widget.type) {
      case 'welcome_banner':
        return (
          <div key={widget.id} className={`welcome-banner dash-item ${sizeClass}`}>
            <div className="welcome-content">
              <p className="welcome-greeting">{greeting()},</p>
              <h1 className="welcome-title">{user?.displayName || t('common:user')}</h1>
              <p className="welcome-subtitle">{t('welcome.subtitle')}</p>
            </div>
            <div className="welcome-actions">
              <button className="btn btn-primary btn-sm" onClick={() => router.push('/metas')}>
                <IconPlus width={14} /> {t('welcome.newPlan')}
              </button>
            </div>
            <div className="welcome-bg-shapes">
              <div className="welcome-shape welcome-shape-1" />
              <div className="welcome-shape welcome-shape-2" />
              <div className="welcome-shape welcome-shape-3" />
            </div>
          </div>
        );

      case 'stats_pills':
        return (
          <div key={widget.id} className={`stats-grid dash-stagger ${sizeClass}`}>
            <div className="stat-pill dash-item" style={{ animationDelay: '0.05s' }} onClick={() => router.push('/metas')}>
              <div className="stat-pill-icon" style={{ background: 'rgba(139,92,246,0.15)' }}><InlineIcon icon="Target" size={16} /></div>
              <div className="stat-pill-info">
                <span className="stat-pill-label">{t('stats.savingsInPlans')}</span>
                <span className="stat-pill-value">{formatAmount(totalSavingsCurrent)}</span>
              </div>
            </div>
            <div className="stat-pill dash-item" style={{ animationDelay: '0.17s' }} onClick={() => router.push('/metas')}>
              <div className="stat-pill-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><InlineIcon icon="RefreshCw" size={16} /></div>
              <div className="stat-pill-info">
                <span className="stat-pill-label">{t('stats.recurringPerMonth')}</span>
                <span className="stat-pill-value">{formatAmount(monthlyRecurring)}</span>
              </div>
              {dueRecurringCount > 0 && <span className="stat-pill-badge">{dueRecurringCount}</span>}
            </div>
            <div className="stat-pill dash-item" style={{ animationDelay: '0.23s' }} onClick={() => router.push('/metas')}>
              <div className="stat-pill-icon" style={{ background: 'rgba(236,72,153,0.15)' }}><InlineIcon icon="CheckCircle2" size={16} /></div>
              <div className="stat-pill-info">
                <span className="stat-pill-label">{t('stats.goalsAndPlans')}</span>
                <span className="stat-pill-value">{goals.filter(g => g.status === 'completed').length + plans.filter(p => p.status === 'completed').length}</span>
              </div>
            </div>
          </div>
        );

      case 'today_section':
        if (todayItems.length === 0) return null;
        return (
          <div key={widget.id} className={`today-section dash-item ${sizeClass}`} style={{ animationDelay: '0.3s' }}>
            <div className="section-header">
              <div className="section-header-left">
                <IconCalendar width={18} />
                <h2 className="section-title">{widget.title}</h2>
              </div>
              <span className="section-count">{t('today.pending', { count: todayItems.length })}</span>
            </div>
            <div className="today-list">
              {todayItems.map((item) => (
                <div key={item.id} className="today-item" onClick={() => router.push(item.itemType === 'reminder' ? '/calendario' : '/metas')}>
                  <div className="today-item-dot" style={{
                    background: item.itemType === 'goal' ? 'var(--color-prosper-green)' : item.itemType === 'plan' ? 'var(--color-purple-500, #8B5CF6)' : item.itemType === 'request' ? 'var(--color-blue-500, #3B82F6)' : 'var(--color-gold-500)'
                  }} />
                  <div className="today-item-content">
                    <span className="today-item-title">
                      {item.itemType === 'request' ? t('today.planInvitation', { amount: formatAmount((item as ExpenseRequest).amount) }) : item.title}
                    </span>
                    <span className="today-item-desc">
                      {item.itemType === 'goal' ? `${formatAmount((item as Goal).current)} de ${formatAmount((item as Goal).target)}` : item.itemType === 'plan' ? `${(item as FinancialPlan).category} · ${Math.round(((item as FinancialPlan).current / (item as FinancialPlan).target) * 100)}%` : item.itemType === 'request' ? (item as ExpenseRequest).message || t('today.noMessage') : (item as Reminder).type}
                    </span>
                  </div>
                  <span className="today-item-arrow">›</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'quick_actions':
        return (
          <div key={widget.id} className={`content-card quick-actions-card dash-item ${sizeClass}`} style={{ animationDelay: '0.6s' }}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconZap width={18} />
                <h2 className="content-card-title">{widget.title}</h2>
              </div>
            </div>
            <div className="quick-actions-grid">
              <button className="quick-action-btn" onClick={() => router.push('/metas?action=add-plan')}>
                <IconBadge icon="Target" size={18} />
                <span className="quick-action-label">{t('quickActions.newPlan')}</span>
              </button>
              <button className="quick-action-btn" onClick={() => router.push('/finanzas?action=add-account')}>
                <IconBadge icon="CreditCard" size={18} />
                <span className="quick-action-label">{t('quickActions.newAccount')}</span>
              </button>
              <button className="quick-action-btn" onClick={() => router.push('/finanzas?action=add-transaction')}>
                <IconBadge icon="Banknote" size={18} />
                <span className="quick-action-label">{t('quickActions.transaction')}</span>
              </button>
              <button className="quick-action-btn" onClick={() => router.push('/calendario')}>
                <IconBadge icon="CalendarDays" size={18} />
                <span className="quick-action-label">{t('quickActions.calendar')}</span>
              </button>
            </div>
          </div>
        );

      case 'tool_converter':
        return (
          <div key={widget.id} className={`content-card tool-card dash-item ${sizeClass}`} style={{ animationDelay: '0.65s' }}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconBadge icon="ArrowLeftRight" size={18} />
                <h2 className="content-card-title">{widget.title}</h2>
              </div>
              <span className="tool-badge">{t('tools.inDevelopment')}</span>
            </div>
            <p className="tool-desc">{t('tools.usdBsDesc')}</p>
          </div>
        );

      case 'tool_invoice':
        return (
          <div key={widget.id} className={`content-card tool-card dash-item ${sizeClass}`} style={{ animationDelay: '0.7s' }}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconBadge icon="Receipt" size={18} />
                <h2 className="content-card-title">{widget.title}</h2>
              </div>
              <span className="tool-badge">{t('tools.inDevelopment')}</span>
            </div>
            <p className="tool-desc">{t('tools.importInvoiceDesc')}</p>
          </div>
        );

      case 'tool_shopping':
        return (
          <div key={widget.id} className={`content-card tool-card dash-item ${sizeClass}`} style={{ animationDelay: '0.75s' }}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconBadge icon="ShoppingCart" size={18} />
                <h2 className="content-card-title">{widget.title}</h2>
              </div>
              <span className="tool-badge">{t('tools.inDevelopment')}</span>
            </div>
            <p className="tool-desc">{t('tools.shoppingListsDesc')}</p>
          </div>
        );

      case 'tool_ai':
        return (
          <div key={widget.id} className={`content-card tool-card dash-item ${sizeClass}`} style={{ animationDelay: '0.8s' }}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconBadge icon="Bot" size={18} />
                <h2 className="content-card-title">{widget.title}</h2>
              </div>
              <span className="tool-badge">{t('tools.inDevelopment')}</span>
            </div>
            <p className="tool-desc">{t('tools.aiAssistantDesc')}</p>
          </div>
        );

      case 'monthly_summary':
        return (
          <div key={widget.id} className={`content-card summary-card dash-item ${sizeClass}`} style={{ animationDelay: '0.35s' }}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconWallet width={18} />
                <h2 className="content-card-title">{widget.title}</h2>
              </div>
            </div>
            <div className="summary-body">
              <div className="summary-row">
                <span className="summary-label">{t('finances.income')}</span>
                <span className="summary-value income">{formatInCurrency(monthlyIncome, displayCurrency)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">{t('finances.expenses')}</span>
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
                <span className="summary-label">{t('finances.balance')}</span>
                <span className={`summary-value ${monthlyIncome - monthlyExpenses >= 0 ? 'income' : 'expense'}`}>
                  {formatInCurrency(monthlyIncome - monthlyExpenses, displayCurrency)}
                </span>
              </div>
            </div>
          </div>
        );

      case 'accounts':
        return (
          <div key={widget.id} className={`content-card accounts-section dash-item ${sizeClass}`} style={{ animationDelay: '0.42s' }}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconWallet width={18} />
                <h2 className="content-card-title">{widget.title}</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="content-card-action" onClick={() => { const next = !showBalances; setShowBalances(next); try { safeLocalStorage.setItem('dashboard-show-balances', String(next)); } catch {} }} title={showBalances ? t('finances.hideBalances') : t('finances.showBalances')} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                  {showBalances ? ' ' + t('finances.hide') : <><InlineIcon icon="Eye" size={14} />{' ' + t('finances.show')}</>}
                </button>
                <button className="content-card-action" onClick={() => router.push('/finanzas')}>
                  {t('finances.manage')}
                </button>
              </div>
            </div>
            <div className="accounts-list">
              {(() => {
                const favoriteAccounts = accounts.filter((a) => a.favorite).slice(0, 3);
                if (favoriteAccounts.length === 0) {
                  return (
                    <p className="empty-msg" style={{ textAlign: 'center', padding: '16px 0' }}>
                      <Trans i18nKey="dashboard:finances.noFavorites" components={{ strong: <strong /> }} />
                    </p>
                  );
                }
                return favoriteAccounts.map((acc) => {
                  const typeIcons: Record<string, string> = { digital: 'CreditCard', bank: 'Landmark', foreign: 'ArrowLeftRight' };
                  return (
                    <div className="account-item" key={acc.id}>
                      <div className="account-item-icon" style={{ background: `${acc.color}20` }}>
                        <InlineIcon icon={acc.icon || typeIcons[acc.type] || 'CreditCard'} size={16} />
                      </div>
                      <div className="account-item-info">
                        <span className="account-item-name">{acc.name}</span>
                        <span className="account-item-type">
                          {t(`finances.accountTypes.${acc.type}`, { defaultValue: acc.type })} • {acc.currency || 'BS'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span className="account-item-balance" style={{ color: showBalances ? (acc.balance >= 0 ? 'var(--color-prosper-green)' : 'var(--color-error)') : 'var(--text-tertiary)', fontWeight: 600 }}>
                          {showBalances ? formatInCurrency(acc.balance, acc.currency) : '••••••'}
                        </span>
                        {showBalances && acc.currency !== displayCurrency && (
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                            ≈ {formatInCurrency(convertCurrency(acc.balance, acc.currency || 'USD', displayCurrency, getAccountRates(acc, rates, p2pMode)), displayCurrency)}
                          </span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(acc.id); }} title={t('aria.removeFavorite')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#F59E0B', padding: 0, lineHeight: 1 }}>
                          <Star size={14} fill="#F59E0B" color="#F59E0B" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        );

      case 'recent_transactions':
        return (
          <div key={widget.id} className={`content-card recent-tx-card dash-item ${sizeClass}`} style={{ animationDelay: '0.5s' }}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconReceipt width={18} />
                <h2 className="content-card-title">{widget.title}</h2>
              </div>
              <button className="content-card-action" onClick={() => router.push('/finanzas')}>
                {t('finances.viewAll')}
              </button>
            </div>
            <div className="recent-tx-list">
              {recentTransactions.length > 0 ? recentTransactions.map((tx) => {
                const txIcon = tx.type === 'income' ? 'Download' : tx.type === 'expense' ? 'Send' : 'Wallet';
                const txAccount = accounts.find(a => a.id === tx.accountId);
                const txCurr = txAccount?.currency || 'USD';
                const isCrypto = ['BTC', 'ETH', 'SOL', 'USDT', 'USDC'].includes(txCurr);
                return (
                  <div className="recent-tx-item" key={tx.id} onClick={() => router.push('/finanzas')}>
                    <div className={`recent-tx-icon tx-${tx.type}`}><InlineIcon icon={txIcon} size={16} /></div>
                    <div className="recent-tx-info">
                      <span className="recent-tx-desc">{tx.description || tx.category}</span>
                      <span className="recent-tx-date">{tx.date ? new Date(tx.date).toLocaleDateString() : ''}</span>
                      {isCrypto && formatCryptoTx(tx, txCurr)}
                    </div>
                    <span className={`recent-tx-amount tx-${tx.type}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatInCurrency(tx.amount, txCurr)}
                    </span>
                  </div>
                );
              }) : (
                <p className="empty-msg" style={{ padding: '24px 0' }}>{t('finances.noRecentTransactions')}</p>
              )}
            </div>
          </div>
        );

      case 'quick_transfer':
        return (
          <div key={widget.id} className={`content-card transfer-card dash-item ${sizeClass}`} style={{ animationDelay: '0.55s' }}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <h2 className="content-card-title">{widget.title}</h2>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <CustomSelect
                    value={transferFrom}
                    onChange={(v) => { setTransferFrom(v); if (v === transferTo) setTransferTo(''); }}
                    options={accounts.map((a: FinancialAccount) => ({ value: a.id, label: `${a.name} (${formatInCurrency(a.balance, a.currency || 'USD')})` }))}
                    placeholder={t('finances.fromPlaceholder')}
                  />
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <div style={{ flex: 1 }}>
                  <CustomSelect
                    value={transferTo}
                    onChange={setTransferTo}
                    options={accounts.filter((a: FinancialAccount) => a.id !== transferFrom).map((a: FinancialAccount) => ({ value: a.id, label: `${a.name} (${formatInCurrency(a.balance, a.currency || 'USD')})` }))}
                    placeholder={t('finances.toPlaceholder')}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input className="form-input" type="number" placeholder={t('finances.amountPlaceholder')} value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} style={{ width: '100%' }} />
                  {transferFrom && transferTo && (() => {
                    const f = accounts.find(a => a.id === transferFrom);
                    const t = accounts.find(a => a.id === transferTo);
                    if (!f || !t || f.currency === t.currency) return null;
                    const amt = parseFloat(transferAmount);
                    if (!amt || amt <= 0) return null;
                    const converted = convertBetween(amt, f.currency || 'USD', t.currency || 'USD');
                    return <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>≈ {formatInCurrency(converted, t.currency || 'USD')}</span>;
                  })()}
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleTransfer} disabled={transferring || !transferFrom || !transferTo || !transferAmount} style={{ whiteSpace: 'nowrap', height: 36 }}>
                  {transferring ? t('finances.transferLoading') : t('finances.transfer')}
                </button>
              </div>
              {transferMsg && (
                <span style={{ fontSize: '0.75rem', color: transferMsg.includes('Error') || transferMsg.includes('insuficiente') || transferMsg.includes('insufficient') ? 'var(--color-error)' : transferMsg.includes('realizada') || transferMsg.includes('completed') ? 'var(--color-prosper-green)' : 'var(--text-secondary)' }}>
                  {transferMsg}
                </span>
              )}
            </div>
          </div>
        );

      case 'active_plans':
        return (
          <div key={widget.id} className={`content-card plans-card dash-item ${sizeClass}`} style={{ animationDelay: '0.35s' }}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconTasks width={18} />
                <h2 className="content-card-title">{widget.title}</h2>
              </div>
              <button className="content-card-action" onClick={() => router.push('/metas')}>
                {t('finances.viewAll')}
              </button>
            </div>
            <div className="plans-list">
              {activePlans.slice(0, 5).map((plan: FinancialPlan) => {
                const pct = Math.min((plan.current / plan.target) * 100, 100);
                const typeColors: Record<string, string> = { savings: 'var(--color-prosper-green)', expense: 'var(--color-gold-500)', recurring: 'var(--color-blue-500, #3B82F6)' };
                const typeIcons: Record<string, string> = { savings: 'Landmark', expense: 'ClipboardList', recurring: 'RefreshCw' };
                return (
                  <div className="plan-item" key={plan.id} onClick={() => router.push('/metas')}>
                    <div className="plan-item-header">
                      <div className="plan-item-icon"><InlineIcon icon={plan.icon || typeIcons[plan.type] || 'Pin'} size={16} /></div>
                      <div className="plan-item-info">
                        <span className="plan-item-title">{plan.title}</span>
                        <span className="plan-item-meta">{plan.category} · {t(`goals.planTypes.${plan.type}`, { defaultValue: plan.type })}</span>
                      </div>
                    </div>
                    <div className="plan-item-progress">
                      <div className="plan-progress-track">
                        <div className="plan-progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${typeColors[plan.type]}, ${typeColors[plan.type]}dd)` }} />
                      </div>
                      <div className="plan-progress-info">
                        <span className="plan-progress-pct" style={{ color: typeColors[plan.type] }}>{Math.round(pct)}%</span>
                        <span className="plan-progress-amounts">{formatInCurrency(plan.current, plan.currency || displayCurrency)} / {formatInCurrency(plan.target, plan.currency || displayCurrency)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {activePlans.length === 0 && (
                <div className="plans-empty">
                  <p>{t('goals.noActivePlans')}</p>
                  <button className="plans-empty-btn" onClick={() => router.push('/metas')}>{t('goals.createFirstPlan')}</button>
                </div>
              )}
            </div>
          </div>
        );

      case 'upcoming_deadlines':
        return (
          <div key={widget.id} className={`content-card deadlines-section dash-item ${sizeClass}`} style={{ animationDelay: '0.42s' }}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconClock width={18} />
                <h2 className="content-card-title">{widget.title}</h2>
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
                      <span className="deadline-badge-label">{daysLeft <= 0 ? t('goals.overdue') : t('goals.day', { count: daysLeft })}</span>
                    </div>
                    <div className="deadline-info">
                      <span className="deadline-title">{item.title}</span>
                      <span className="deadline-amount">{formatAmount(item.current)} / {formatAmount(item.target)}</span>
                    </div>
                  </div>
                );
              }) : (
                <p className="empty-msg">{t('goals.noUpcomingDeadlines')}</p>
              )}
            </div>
          </div>
        );

      case 'exchange_rates':
        return <WidgetTasasCambio key={widget.id} rates={rates} p2pMode={p2pMode} className={sizeClass} />;

      case 'financial_chart':
        return (
          <div key={widget.id} className={`content-card chart-card dash-item ${sizeClass}`} style={{ animationDelay: '0.75s' }}>
            <div className="content-card-header">
              <div className="content-card-header-left">
                <IconTrendUp width={18} />
                <h2 className="content-card-title">{widget.title}</h2>
              </div>
              <button className="content-card-action" onClick={() => router.push('/finanzas')}>
                {t('market.viewDetails')} <IconArrowForward width={14} />
              </button>
            </div>
            <Suspense fallback={<div className="chart-skeleton" style={{ width: '100%', height: '280px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }} />}>
              <FinancialStatusChart />
            </Suspense>
          </div>
        );

      default:
        return null;
    }
  };

  const sortedCategories = [...layout.categories].sort((a, b) => a.order - b.order);

  return (
    <DashboardLayout>
      {isDesktop && (
        <div className="cursor-glow" ref={glowRef} />
      )}
      <div className="dashboard-container" onMouseMove={handleMouseMove}>
        {sortedCategories.map(cat => {
          const catWidgets = layout.widgets
            .filter(w => w.categoryId === cat.id)
            .sort((a, b) => a.order - b.order);
          return (
            <div className="dash-section" key={cat.id}>
              <SectionHeader
                icon={<InlineIcon icon={cat.icon} size={18} />}
                title={cat.name}
                count={catWidgets.length}
                collapsed={collapsed[cat.id] || false}
                onToggle={() => toggle(cat.id)}
              />
              <div className={`widgets-grid dash-stagger ${collapsed[cat.id] ? 'dash-section-collapsed' : ''}`}>
                {catWidgets.map(widget => renderWidget(widget))}
              </div>
            </div>
          );
        })}

        <button className="dashboard-customize-btn" onClick={() => router.push('/configuracion/dashboard')}>
          <Settings size={16} /> {t('customize.title', { defaultValue: 'Personalizar' })}
        </button>
      </div>

      {/* Modal Nueva Meta */}
      {showNewGoalModal && (
        <div className="modal-overlay" onClick={() => setShowNewGoalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{t('modal.newGoal')}</h2>
              <button className="modal-close" onClick={() => setShowNewGoalModal(false)}><IconX width={20} /></button>
            </div>
            <div className="modal-body">
              <label className="form-label">{t('modal.titleLabel')}</label>
              <input className="form-input" type="text" placeholder={t('modal.titlePlaceholder')} value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} />
              <label className="form-label">{t('modal.categoryLabel')}</label>
              <CustomSelect
                value={newGoal.category}
                onChange={(val) => setNewGoal({ ...newGoal, category: val as GoalCategory })}
                options={Object.entries(allCategories).map(([key, icon]) => ({ value: key, label: t(`categories.${key}`, { defaultValue: key }), icon }))}
                placeholder={t('modal.categoryPlaceholder')}
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
                customPlaceholder={t('modal.customCategoryPlaceholder')}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">{t('modal.currentAmountLabel', { symbol: currencyMap[displayCurrency].symbol })}</label><input className="form-input" type="number" placeholder="0" value={newGoal.current || ''} onChange={(e) => setNewGoal({ ...newGoal, current: Number(e.target.value) })} /></div>
                <div><label className="form-label">{t('modal.targetAmountLabel', { symbol: currencyMap[displayCurrency].symbol })}</label><input className="form-input" type="number" placeholder="10000" value={newGoal.target || ''} onChange={(e) => setNewGoal({ ...newGoal, target: Number(e.target.value) })} /></div>
              </div>
              <label className="form-label">{t('modal.deadlineLabel')}</label>
              <input className="form-input" type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} />
              <label className="form-label">{t('modal.colorLabel')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['#3DCC8E', '#1E3A6E', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'].map((c) => (
                  <button key={c} onClick={() => setNewGoal({ ...newGoal, color: c })} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: newGoal.color === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
              <label className="form-label">{t('modal.iconLabel')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Target', 'Wallet', 'TrendingUp', 'GraduationCap', 'Home', 'Car', 'Plane'].map((icon) => (
                  <button key={icon} onClick={() => setNewGoal({ ...newGoal, icon })} style={{ fontSize: '1.25rem', padding: 6, borderRadius: 'var(--radius-md)', background: newGoal.icon === icon ? 'var(--bg-input)' : 'transparent', border: newGoal.icon === icon ? '2px solid var(--color-prosper-green)' : '2px solid transparent', cursor: 'pointer', color: 'var(--text-primary)' }}><InlineIcon icon={icon} size={20} /></button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setShowNewGoalModal(false)}>{t('common:buttons.cancel')}</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreateGoal}>{t('modal.createGoal')}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
});
