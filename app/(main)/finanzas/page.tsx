'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useToast } from '@/app/components/Toast';
import { ConfirmDialog } from '@/app/components/Toast';
import { getTransactionsByOwnerId, getAllTransactionsByOwnerId, getArchivedTransactionsByOwnerId, createTransaction, deleteTransaction, archiveTransactions, unarchiveTransactions, deleteTransactionsPermanently } from '@/lib/firestore/transactions';
import { addNotification } from '@/lib/firestore/notifications';
import { subscribeToAccounts, createAccount, deleteAccount, clearAccountHistory, deleteTransactionsByType, resetAccountBalance, clearAllTransactionHistory, getTotalBalance, updateAccountBalance, updateAccount, wipeAllTransactions, wipeTransactionsByTypeWithAdjustment, recalculateAccountBalance, recalculateAllBalances, wipeAllUserTransactions, wipeUserTransactionsByType, subscribeToAccountGroups, createAccountGroup, updateAccountGroup, deleteAccountGroup, moveAccountToGroup, toggleAccountFavorite } from '@/lib/firestore/accounts';
import { CustomSelect } from '@/app/components/CustomSelect';
import { addCustomTransactionCategory, getUserPreferences } from '@/lib/firestore/users';
import { IconPlus, IconX, IconTrash, IconWallet, IconArchive, IconReset } from '@/app/components/icons';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';
import { CurrencyFlag } from '@/app/components/CryptoIcons';
import { X, Star } from 'lucide-react';
import dynamic from 'next/dynamic';
const FinancialStatusChart = dynamic(() => import('@/app/components/FinancialStatusChart').then(m => ({ default: m.FinancialStatusChart })), { ssr: false });
const VepayModal = dynamic(() => import('@/app/components/VepayModal').then(m => ({ default: m.VepayModal })), { ssr: false });
import { getAccountRates, convertCurrency } from '@/lib/currency';
import { safeLocalStorage } from '@/lib/utils/safeStorage';
import type { Transaction, FinancialAccount, AccountType, CurrencyCode, AccountGroup } from '@/types';

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  income: ['Salario', 'Freelance', 'Inversiones', 'Negocio', 'Otro'],
  expense: ['Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación', 'Otro'],
  saving: ['Ahorro', 'Inversión', 'Fondo Emergencia', 'Otro'],
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  checking: '#3B82F6',
  savings: '#3DCC8E',
  cash: '#F59E0B',
};

const ACCOUNT_COLORS = [
  '#3B82F6', '#3DCC8E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
  '#06B6D4', '#6366F1', '#F97316', '#84CC16', '#14B8A6', '#A855F7',
  '#E11D48', '#0EA5E9', '#10B981', '#D946EF', '#F43F5E', '#22C55E',
  '#64748B', '#C026D3', '#0891B2', '#B45309', '#1D4ED8', '#15803D',
];

const TYPE_ICONS: Record<string, string> = { income: 'Download', expense: 'Send', saving: 'Wallet' };

const CATEGORIES: Record<string, string[]> = {
  income: ['Salario', 'Freelance', 'Inversiones', 'Negocio', 'Otro'],
  expense: ['Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación', 'Otro'],
  saving: ['Ahorro', 'Inversión', 'Fondo Emergencia', 'Otro'],
};

const TYPE_LABELS: Record<string, string> = { income: 'Ingreso', expense: 'Gasto', saving: 'Ahorro' };
const TYPE_COLORS: Record<string, string> = { income: 'var(--color-prosper-green)', expense: 'var(--color-error)', saving: 'var(--color-pine-500)' };

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoToTimestamp(iso: string): number {
  return new Date(iso + 'T12:00:00').getTime();
}

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toLocaleString('es-VE', { maximumFractionDigits: 2 }) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('es-VE', { maximumFractionDigits: 2 }) + 'M';
  if (n >= 1_000) return n.toLocaleString('es-VE', { maximumFractionDigits: 2 });
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

interface SummaryWidgetProps {
  label: string;
  value: number;
  altValue: number;
  color: string;
  showAmounts: boolean;
  showConversion: boolean;
  altCurrency: CurrencyCode;
  formatInCurrency: (amount: number, code: CurrencyCode) => string;
  displayCurrency: CurrencyCode;
}

function SummaryWidget({ label, value, altValue, color, showAmounts, showConversion, altCurrency, formatInCurrency, displayCurrency }: SummaryWidgetProps) {
  return (
    <div className="summary-card">
      <span className="summary-label">
        {label} {showConversion && showAmounts && <span style={{ fontSize: '10px', opacity: 0.7 }}>({altCurrency})</span>}
      </span>
      <span className="summary-value" style={{ color: showAmounts ? color : undefined }}>
        {showAmounts
          ? showConversion
            ? formatInCurrency(altValue, altCurrency)
            : formatInCurrency(value, displayCurrency)
          : '••••••'}
      </span>
      {showConversion && showAmounts && (
        <span className="summary-alt">
          ≈ {formatInCurrency(value, displayCurrency)} {displayCurrency}
        </span>
      )}
    </div>
  );
}

const FinanzasPage = memo(function FinanzasPage() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const { formatAmount, currencyMap, displayCurrency, convertBetween, formatInCurrency, rates, p2pMode, setP2pMode } = useCurrency();
  const { t } = useTranslation(['finanzas', 'common']);

  /** Formatea monto para tabla: crypto muestra USD + BS, resto en su moneda nativa */
  const formatTableAmount = useCallback((amount: number, currency: CurrencyCode) => {
    return formatInCurrency(amount, currency);
  }, [formatInCurrency]);

  /** Devuelve precio en USD de una crypto */
  const getCryptoUsdPrice = useCallback((currency: CurrencyCode): number | null => {
    return rates.cryptoPrices?.[currency] ?? null;
  }, [rates.cryptoPrices]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [archivedTransactions, setArchivedTransactions] = useState<Transaction[]>([]);
  const [txTab, setTxTab] = useState<'activas' | 'archivadas'>('activas');
  const [txLimit, setTxLimit] = useState(5);
  const [filterType, setFilterType] = useState<string>('Todos');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [newTx, setNewTx] = useState({ amount: '', type: 'income' as Transaction['type'], category: 'Salario', description: '', accountId: '', date: todayISO() });
  const [newAccount, setNewAccount] = useState({ name: '', type: 'digital' as AccountType, balance: 0, currency: 'BS' as CurrencyCode, color: '', rateMode: undefined as 'official' | 'p2p' | undefined });
  const [accountCategory, setAccountCategory] = useState<'monedas' | 'criptos'>('monedas');
  const [transfer, setTransfer] = useState({ amount: '', fromAccountId: '', toAccountId: '' });
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{ id: string; name: string; color: string } | null>(null);
  const [customTxCategories, setCustomTxCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<Record<string, string[]>>({ ...DEFAULT_CATEGORIES });
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; variant: 'danger' | 'warning' | 'info'; confirmText?: string; secondaryText?: string; onSecondary?: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' });

  // Account groups
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AccountGroup | null>(null);
  const [groupFormName, setGroupFormName] = useState('');
  const [groupFormColor, setGroupFormColor] = useState(ACCOUNT_COLORS[0]);
  const [groupFormLoading, setGroupFormLoading] = useState(false);
  const [showAssignGroupModal, setShowAssignGroupModal] = useState<string | null>(null);

  // Collapsed groups (persisted in localStorage)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const saved = safeLocalStorage.getItem('finanzas-collapsed-groups');
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      try { safeLocalStorage.setItem('finanzas-collapsed-groups', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // P2P rates come from CurrencyContext now (rates.p2pRates)

  // Calcular balance total reactivamente
  // Suma los balances de todas las cuentas y convierte a displayCurrency
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      const converted = convertCurrency(acc.balance, acc.currency || 'USD', displayCurrency, getAccountRates(acc, rates, p2pMode));
      return sum + converted;
    }, 0);
  }, [accounts, displayCurrency, rates, p2pMode]);

  // Calcular resumen mensual reactivamente
  // ESTRATEGIA: Sumar en moneda nativa de cada cuenta primero, luego convertir totales
  const summary = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    // Acumuladores por moneda nativa
    const totalsByCurrency: Record<string, { income: number; expenses: number }> = {};
    
    allTransactions.forEach((t) => {
      if (t.date >= startOfMonth && t.category !== 'Transferencia') {
        const account = accounts.find((a) => a.id === t.accountId);
        const txCurrency = account?.currency || 'USD';
        
        if (!totalsByCurrency[txCurrency]) {
          totalsByCurrency[txCurrency] = { income: 0, expenses: 0 };
        }
        
        if (t.type === 'income') {
          totalsByCurrency[txCurrency].income += t.amount;
        } else if (t.type === 'expense') {
          totalsByCurrency[txCurrency].expenses += t.amount;
        }
      }
    });
    
    // Convertir totales agregados a la moneda de display
    let income = 0;
    let expenses = 0;
    
    Object.entries(totalsByCurrency).forEach(([currency, totals]) => {
      income += convertBetween(totals.income, currency as CurrencyCode, displayCurrency);
      expenses += convertBetween(totals.expenses, currency as CurrencyCode, displayCurrency);
    });
    
    return {
      income,
      expenses,
      balance: income - expenses
    };
  }, [allTransactions, accounts, displayCurrency, convertBetween]);
  const [showAmounts, setShowAmounts] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return safeLocalStorage.getItem('finanzas-show-amounts') === 'true';
      }
    } catch {}
    return false;
  });
  const [showConversion, setShowConversion] = useState(() => {
    try {
      return safeLocalStorage.getItem('finanzas-show-conversion') === 'true';
    } catch {
      return false;
    }
  });
  const altCurrency: CurrencyCode = displayCurrency === 'USD' ? 'BS' : 'USD';
  const altSummary = useMemo(() => ({
    income: convertBetween(summary.income, displayCurrency, altCurrency),
    expenses: convertBetween(summary.expenses, displayCurrency, altCurrency),
    balance: convertBetween(summary.balance, displayCurrency, altCurrency),
  }), [summary, displayCurrency, altCurrency, convertBetween]);
  const altTotalBalance = useMemo(() => {
    return convertBetween(totalBalance, displayCurrency, altCurrency);
  }, [totalBalance, displayCurrency, altCurrency, convertBetween]);

  const [txLoading, setTxLoading] = useState(false);
  const [showVepayModal, setShowVepayModal] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [ratesCollapsed, setRatesCollapsed] = useState(() => {
    try { return safeLocalStorage.getItem('finanzas-rates-collapsed') === 'true'; } catch { return false; }
  });

  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const [accountingAction, setAccountingAction] = useState<string>('');
  const [accountingLoading, setAccountingLoading] = useState(false);

  const handleToggleFavorite = async (accountId: string) => {
    if (!uid) return;
    const result = await toggleAccountFavorite(accountId, uid, accounts);
    if (!result.success) {
      warning(result.message || t('finanzas:toast.favoriteUpdated'));
    }
  };

  const uid = user?.uid;

  // Suscribirse a cuentas en tiempo real
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToAccounts(uid, (accs) => {
      setAccounts(accs);
    });
    return () => unsub();
  }, [uid]);

  // Suscribirse a grupos de cuentas en tiempo real
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToAccountGroups(uid, (groups) => {
      setAccountGroups(groups);
    });
    return () => unsub();
  }, [uid]);

  // Cargar preferencias
  useEffect(() => {
    if (!uid) return;
    const currentUid = uid;
    let cancelled = false;
    async function loadPrefs() {
      try {
        const prefs = await getUserPreferences(currentUid);
        if (!cancelled && prefs.customTransactionCategories) {
          setCustomTxCategories(prefs.customTransactionCategories);
          const updated = { ...DEFAULT_CATEGORIES };
          prefs.customTransactionCategories.forEach((cat) => {
            updated.expense = [...updated.expense, cat];
          });
          setAllCategories(updated);
        }
      } catch (e) { console.error(e); }
    }
    loadPrefs();
    return () => { cancelled = true; };
  }, [uid]);

  const loadAllTransactions = useCallback(async () => {
    if (!uid) return;
    try {
      const txs = await getAllTransactionsByOwnerId(uid);
      setAllTransactions(txs);
    } catch (e) { console.error(e); }
  }, [uid]);

  // Cargar transacciones
  const loadTransactions = useCallback(async () => {
    if (!uid) return;
    try {
      const txs = await getTransactionsByOwnerId(uid);
      setTransactions(txs);
    } catch (e) { console.error(e); }
  }, [uid]);

  const loadArchivedTransactions = useCallback(async () => {
    if (!uid) return;
    try {
      const txs = await getArchivedTransactionsByOwnerId(uid);
      setArchivedTransactions(txs);
    } catch (e) { console.error(e); }
  }, [uid]);

  const reloadAllTransactionData = useCallback(async () => {
    if (!uid) return;
    await Promise.all([
      loadTransactions(),
      loadArchivedTransactions(),
      loadAllTransactions(),
    ]);
  }, [uid, loadTransactions, loadArchivedTransactions, loadAllTransactions]);

  useEffect(() => {
    if (!uid) return;
    reloadAllTransactionData();
  }, [uid, reloadAllTransactionData]);

  // Auto-open modal from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'add-transaction') {
      setShowModal(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (action === 'add-account') {
      setShowAccountModal(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (action === 'transfer') {
      setShowTransferModal(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (action === 'vepay') {
      setShowVepayModal(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Toast de confirmación al cambiar modo P2P (skip on mount)
  const didMountP2P = useRef(false);
  useEffect(() => {
    if (!didMountP2P.current) {
      didMountP2P.current = true;
      return;
    }
    if (p2pMode) {
      success(t('finanzas:toast.p2pEnabled'));
    } else {
      warning(t('finanzas:toast.officialEnabled'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p2pMode]);

  // Filtrar transacciones
  const activeTxList = txTab === 'activas' ? transactions : archivedTransactions;
  const filteredByAccount = selectedAccount === 'all'
    ? activeTxList
    : activeTxList.filter((t) => t.accountId === selectedAccount);

  const categories = filterType === 'Todos' ? Object.values(allCategories).flat() : (allCategories[filterType as keyof typeof allCategories] || []);
  const filteredTx = filteredByAccount.filter((t) => {
    if (filterType !== 'Todos' && t.type !== filterType) return false;
    if (filterCategory !== 'Todas' && t.category !== filterCategory) return false;
    return true;
  });

  const handleAddTransaction = async () => {
    const amount = Number(newTx.amount);
    if (!amount || amount <= 0) {
      warning(t('finanzas:toast.invalidAmount'));
      return;
    }
    if (!uid) {
      error(t('finanzas:toast.loginRequired'));
      return;
    }

    // Validar fondos si es gasto o ahorro y hay cuenta seleccionada
    if ((newTx.type === 'expense' || newTx.type === 'saving') && newTx.accountId) {
      const acc = accounts.find(a => a.id === newTx.accountId);
      if (acc && acc.balance < amount) {
        error(t('finanzas:toast.insufficientFunds', { name: acc.name, balance: formatInCurrency(acc.balance, acc.currency || 'USD') }));
        return;
      }
    }

    setTxLoading(true);
    const txData: any = {
      ownerId: uid,
      amount,
      type: newTx.type,
      category: newTx.category,
      description: newTx.description,
      date: isoToTimestamp(newTx.date),
    };
    if (newTx.accountId) {
      txData.accountId = newTx.accountId;
    }

    try {
      await createTransaction(txData);

      // Actualizar balance de la cuenta
      if (newTx.accountId) {
        const delta = newTx.type === 'income' ? amount : -amount;
        await updateAccountBalance(newTx.accountId, delta);
      }

      // Recargar datos
      await reloadAllTransactionData();

      const typeLabel = TYPE_LABELS[newTx.type];
      const account = accounts.find(a => a.id === newTx.accountId);
      const txCurrency = account?.currency || 'USD';
      success(t('finanzas:toast.transactionRegistered', { type: typeLabel, amount: formatInCurrency(amount, txCurrency) }));
      setShowModal(false);
      setNewTx({ amount: '', type: 'income', category: 'Salario', description: '', accountId: '', date: todayISO() });
    } catch (e: any) {
      console.error(e);
      error(t('finanzas:toast.registerError', { message: e?.message || 'Error desconocido' }));
    } finally {
      setTxLoading(false);
    }
  };
  const handleDeleteTransaction = async (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    const txAccount = accounts.find((a) => a.id === tx.accountId);
    const txCurrency = txAccount?.currency || 'USD';
    const hasAccount = !!tx.accountId;

    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.deleteTransaction'),
      message: t('finanzas:modals.confirm.deleteTransactionMessage', { description: tx.description || tx.category, amount: formatInCurrency(tx.amount, txCurrency) }) + (hasAccount ? '\n\n• ' + t('finanzas:modals.confirm.deleteAndAdjustDesc') + '\n• ' + t('finanzas:modals.confirm.deleteFromHistoryDesc') : ''),
      variant: 'danger',
      confirmText: hasAccount ? t('finanzas:modals.confirm.deleteAndAdjust') : t('common:buttons.delete'),
      secondaryText: hasAccount ? t('finanzas:modals.confirm.deleteFromHistory') : undefined,
      onConfirm: async () => {
        // Eliminar y recalcular balance
        try {
          await deleteTransaction(txId);
          if (tx.accountId) {
            const delta = tx.type === 'income' ? -tx.amount : tx.amount;
            await updateAccountBalance(tx.accountId, delta);
          }
          await reloadAllTransactionData();
          success(t('finanzas:toast.transactionDeletedAdjusted'));
        } catch (e: any) {
          error(t('finanzas:toast.deleteError', { message: e?.message || 'Error desconocido' }));
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
      onSecondary: hasAccount ? async () => {
        // Solo eliminar del historial, sin tocar balance
        try {
          await deleteTransaction(txId);
          await reloadAllTransactionData();
          success(t('finanzas:toast.transactionDeletedHistory'));
        } catch (e: any) {
          error(`Error al eliminar: ${e?.message || 'Error desconocido'}`);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      } : undefined,
    });
  };

  // ── Selection & bulk archive handlers ──────────────────────────────
  const toggleTxSelection = (txId: string) => {
    setSelectedTxIds(prev => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId); else next.add(txId);
      return next;
    });
  };

  const selectAllVisible = () => {
    const visibleIds = filteredTx.slice(0, txLimit).map(t => t.id);
    setSelectedTxIds(new Set(visibleIds));
  };

  const deselectAll = () => setSelectedTxIds(new Set());

  const handleArchiveSelected = async () => {
    if (selectedTxIds.size === 0) return;
    const ids = Array.from(selectedTxIds);
    try {
      await archiveTransactions(ids);
      await reloadAllTransactionData();
      setSelectedTxIds(new Set());
      success(t('finanzas:toast.transactionsArchived', { count: ids.length }));
    } catch (e: any) {
      error(t('finanzas:toast.deleteError', { message: e?.message || 'Error desconocido' }));
    }
  };

  const handleUnarchiveSelected = async () => {
    if (selectedTxIds.size === 0) return;
    const ids = Array.from(selectedTxIds);
    try {
      await unarchiveTransactions(ids);
      await reloadAllTransactionData();
      setSelectedTxIds(new Set());
      success(t('finanzas:toast.transactionsUnarchived', { count: ids.length }));
    } catch (e: any) {
      error(t('finanzas:toast.deleteError', { message: e?.message || 'Error desconocido' }));
    }
  };

  const handleDeleteSelectedPermanent = async () => {
    if (selectedTxIds.size === 0) return;
    const ids = Array.from(selectedTxIds);
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.deleteTransaction'),
      message: `¿Eliminar permanentemente ${ids.length} transacciones? Esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: t('common:buttons.delete'),
      onConfirm: async () => {
        try {
          await deleteTransactionsPermanently(ids);
          await reloadAllTransactionData();
          setSelectedTxIds(new Set());
          success(t('finanzas:toast.transactionsDeletedPermanent', { count: ids.length }));
        } catch (e: any) {
          error(t('finanzas:toast.deleteError', { message: e?.message || 'Error desconocido' }));
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const toggleShowAmounts = () => {
    const newVal = !showAmounts;
    setShowAmounts(newVal);
    try { safeLocalStorage.setItem('finanzas-show-amounts', String(newVal)); } catch {}
  };

  const handleTransfer = async () => {
    if (!transfer.amount || !transfer.fromAccountId || !transfer.toAccountId) {
      warning(t('finanzas:toast.completeFields'));
      return;
    }
    if (transfer.fromAccountId === transfer.toAccountId) {
      warning(t('finanzas:toast.sameAccount'));
      return;
    }
    const amount = Number(transfer.amount);
    if (isNaN(amount) || amount <= 0) {
      warning(t('finanzas:toast.invalidAmountShort'));
      return;
    }

    const fromAcc = accounts.find((a) => a.id === transfer.fromAccountId);
    const toAcc = accounts.find((a) => a.id === transfer.toAccountId);

    if (!fromAcc || !toAcc) {
      error(t('finanzas:toast.accountNotFound'));
      return;
    }
    if (fromAcc.balance < amount) {
      error(t('finanzas:toast.insufficientFunds', { name: fromAcc.name, balance: formatInCurrency(fromAcc.balance, fromAcc.currency) }));
      return;
    }

    try {
      const fromCurrency = fromAcc.currency || 'USD';
      const toCurrency = toAcc.currency || 'USD';
      const convertedAmount = convertBetween(amount, fromCurrency, toCurrency);

      await updateAccountBalance(transfer.fromAccountId, -amount);
      await updateAccountBalance(transfer.toAccountId, convertedAmount);

      const txDataOut: any = {
        ownerId: uid || 'local',
        amount,
        type: 'saving',
        category: 'Transferencia',
        description: `Transferencia a: ${toAcc.name}${fromCurrency !== toCurrency ? ` (Conv. ${formatInCurrency(convertedAmount, toCurrency)})` : ''}`,
        date: Date.now(),
        accountId: transfer.fromAccountId,
        currency: fromCurrency,
      };
      await createTransaction(txDataOut);

      const txDataIn: any = {
        ownerId: uid || 'local',
        amount: convertedAmount,
        type: 'income',
        category: 'Transferencia',
        description: `Transferencia recibida de: ${fromAcc.name}${fromCurrency !== toCurrency ? ` (Conv. ${formatInCurrency(amount, fromCurrency)})` : ''}`,
        date: Date.now(),
        accountId: transfer.toAccountId,
        currency: toCurrency,
      };
      await createTransaction(txDataIn);

      await reloadAllTransactionData();

      success(t('finanzas:toast.transferSuccess', { from: fromAcc.name, to: toAcc.name }));
      await addNotification({
        ownerId: uid!,
        type: 'transfer',
        title: t('finanzas:toast.transferNotificationTitle'),
        message: t('finanzas:toast.transferNotificationMessage', { amount: formatInCurrency(amount, fromCurrency), from: fromAcc.name, to: toAcc.name }),
        read: false,
        meta: { fromAccountId: transfer.fromAccountId, toAccountId: transfer.toAccountId },
      });
      setShowTransferModal(false);
      setTransfer({ amount: '', fromAccountId: '', toAccountId: '' });
    } catch (e: any) {
      error(t('finanzas:toast.transferError', { message: e?.message || 'Error desconocido' }));
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.name || !uid) return;
    const acc: Omit<FinancialAccount, 'id'> = {
      ownerId: uid,
      name: newAccount.name,
      type: newAccount.type,
      balance: newAccount.balance,
      currency: newAccount.currency || 'BS',
      icon: newAccount.type === 'digital' ? 'CreditCard' : newAccount.type === 'bank' ? 'Landmark' : 'ArrowLeftRight',
      color: newAccount.color || ACCOUNT_TYPE_COLORS[newAccount.type],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(newAccount.rateMode ? { rateMode: newAccount.rateMode } : {}),
    };
    await createAccount(acc);
    success(t('finanzas:toast.accountCreated', { name: acc.name }));
    setShowAccountModal(false);
    setNewAccount({ name: '', type: 'digital', balance: 0, currency: 'BS', color: '', rateMode: undefined });
    setAccountCategory('monedas');
  };

  const handleEditAccount = async () => {
    if (!editingAccount || !uid) return;
    await updateAccount(editingAccount.id, { name: editingAccount.name, color: editingAccount.color, updatedAt: Date.now() });
    success(t('finanzas:toast.accountUpdated'));
    setShowEditAccountModal(false);
    setEditingAccount(null);
  };

  // ── Account Groups Handlers ──
  const handleCreateGroup = async () => {
    if (!groupFormName.trim() || !uid) return;
    setGroupFormLoading(true);
    try {
      await createAccountGroup({
        ownerId: uid,
        name: groupFormName.trim(),
        color: groupFormColor,
        order: accountGroups.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      success(t('finanzas:toast.groupCreated', { name: groupFormName.trim() }));
      setShowGroupModal(false);
      setGroupFormName('');
      setGroupFormColor(ACCOUNT_COLORS[0]);
    } catch (e: any) {
      error(t('finanzas:toast.genericError', { message: e?.message }));
    } finally {
      setGroupFormLoading(false);
    }
  };

  const handleEditGroup = async () => {
    if (!editingGroup || !groupFormName.trim() || !uid) return;
    setGroupFormLoading(true);
    try {
      await updateAccountGroup(editingGroup.id, {
        name: groupFormName.trim(),
        color: groupFormColor,
        updatedAt: Date.now(),
      });
      success(t('finanzas:toast.groupUpdated', { name: groupFormName.trim() }));
      setShowGroupModal(false);
      setEditingGroup(null);
      setGroupFormName('');
      setGroupFormColor(ACCOUNT_COLORS[0]);
    } catch (e: any) {
      error(`Error: ${e?.message}`);
    } finally {
      setGroupFormLoading(false);
    }
  };

  const handleDeleteGroup = (group: AccountGroup) => {
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.deleteGroup'),
      message: `¿Eliminar "${group.name}"? Las cuentas del grupo pasarán a "{t('finanzas:accounts.noGroup')}".`,
      variant: 'danger',
      confirmText: t('common:buttons.delete'),
      onConfirm: async () => {
        try {
          // Unassign accounts from this group first
          const groupAccounts = accounts.filter(a => a.groupId === group.id);
          await Promise.all(groupAccounts.map(a => moveAccountToGroup(a.id, null)));
          await deleteAccountGroup(group.id);
          success(t('finanzas:toast.groupDeleted'));
        } catch (e: any) {
          error(`Error: ${e?.message}`);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const openGroupModal = (group?: AccountGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupFormName(group.name);
      setGroupFormColor(group.color || ACCOUNT_COLORS[0]);
    } else {
      setEditingGroup(null);
      setGroupFormName('');
      setGroupFormColor(ACCOUNT_COLORS[0]);
    }
    setShowGroupModal(true);
  };

  const handleAssignGroup = async (accountId: string, groupId: string | null) => {
    try {
      await moveAccountToGroup(accountId, groupId);
      success(groupId ? t('finanzas:toast.groupMovedIn') : t('finanzas:toast.groupMovedOut'));
      setShowAssignGroupModal(null);
    } catch (e: any) {
      error(`Error: ${e?.message}`);
    }
  };

  const openEditAccount = (acc: FinancialAccount) => {
    setEditingAccount({ id: acc.id, name: acc.name, color: acc.color || '#3DCC8E' });
    setShowEditAccountModal(true);
  };

  const handleDeleteAccount = async (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.deleteAccount'),
      message: t('finanzas:modals.confirm.deleteAccountMessage', { name: acc?.name }),
      variant: 'danger',
      confirmText: t('common:buttons.delete'),
      onConfirm: async () => {
        await deleteAccount(id);
        await reloadAllTransactionData();
        success(t('finanzas:toast.accountDeleted'));
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleClearHistory = async (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.clearHistory'),
      message: t('finanzas:modals.confirm.clearHistoryMessage', { name: acc?.name }),
      variant: 'warning',
      confirmText: t('finanzas:modals.confirm.clearHistoryConfirm'),
      onConfirm: async () => {
        await clearAccountHistory(id);
        await reloadAllTransactionData();
        success(t('finanzas:toast.historyCleared'));
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteByType = async (id: string, type: 'income' | 'expense' | 'saving') => {
    const acc = accounts.find((a) => a.id === id);
    const typeLabel = TYPE_LABELS[type];
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.wipeType', { icon: TYPE_ICONS[type], type: typeLabel }),
      message: t('finanzas:modals.confirm.wipeAccountTypeMessage', { type: typeLabel.toLowerCase(), name: acc?.name, action: type === 'income' ? 'restará' : 'sumará' }),
      variant: 'danger',
      confirmText: t('finanzas:modals.confirm.wipeAccountTypeConfirm', { type: typeLabel }),
      onConfirm: async () => {
        await deleteTransactionsByType(id, type);
        await reloadAllTransactionData();
        success(t('finanzas:toast.typesDeleted', { type: typeLabel }));
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleResetBalance = async (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.resetBalance'),
      message: t('finanzas:modals.confirm.resetBalanceMessage', { name: acc?.name, amount: formatInCurrency(0, acc?.currency || 'BS'), currentBalance: formatInCurrency(acc?.balance || 0, acc?.currency || 'BS') }),
      variant: 'danger',
      confirmText: t('finanzas:modals.confirm.resetBalanceConfirm'),
      onConfirm: async () => {
        await resetAccountBalance(id);
        success(t('finanzas:toast.balanceReset'));
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleClearAllHistory = async () => {
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.clearAllHistory'),
      message: t('finanzas:modals.confirm.clearAllHistoryMessage'),
      variant: 'danger',
      confirmText: t('finanzas:modals.confirm.clearAllHistoryConfirm'),
      onConfirm: async () => {
        if (!uid) return;
        await clearAllTransactionHistory(uid);
        await reloadAllTransactionData();
        success(t('finanzas:toast.allHistoryCleared'));
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // ============================================================
  // GESTIÓN CONTABLE AVANZADA
  // ============================================================

  const handleWipeAllUserTransactions = async () => {
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.wipeAllTransactions'),
      message: t('finanzas:modals.confirm.wipeAllTransactionsMessage'),
      variant: 'danger',
      confirmText: t('finanzas:modals.confirm.wipeAllConfirm'),
      onConfirm: async () => {
        if (!uid) return;
        setAccountingLoading(true);
        try {
          await wipeAllUserTransactions(uid);
          await reloadAllTransactionData();
          success(t('finanzas:toast.allTransactionsWiped'));
        } catch (e: any) {
          error(t('finanzas:toast.genericError', { message: e?.message || 'Error desconocido' }));
        } finally {
          setAccountingLoading(false);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleWipeUserTransactionsByType = async (type: 'income' | 'expense' | 'saving') => {
    const typeLabel = TYPE_LABELS[type];
    const typeIcon = TYPE_ICONS[type];
    const actionText = type === 'income' ? 'restará' : 'sumará';

    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.wipeType', { icon: typeIcon, type: typeLabel }),
      message: t('finanzas:modals.confirm.wipeTypeMessage', { type: typeLabel.toLowerCase(), action: actionText }),
      variant: type === 'income' ? 'warning' : 'danger',
      confirmText: t('finanzas:modals.confirm.wipeAccountTypeConfirm', { type: typeLabel }),
      onConfirm: async () => {
        if (!uid) return;
        setAccountingLoading(true);
        try {
          const result = await wipeUserTransactionsByType(uid, type);
          await reloadAllTransactionData();
          const adjustText = result.adjustments.map(a => {
            const acc = accounts.find(acc => acc.id === a.accountId);
            const sign = a.adjustment > 0 ? '+' : '';
            return `${acc?.icon || ''} ${acc?.name || t('finanzas:modals.newAccount.noAccount')}: ${sign}${formatAmount(Math.abs(a.adjustment))}`;
          }).join('\n');
          success(t('finanzas:toast.typesWiped', { count: result.totalWiped, type: typeLabel.toLowerCase() }) + (result.adjustments.length > 0 ? '\nAjustes: ' + adjustText : ''));
        } catch (e: any) {
          error(`Error: ${e?.message || 'Error desconocido'}`);
        } finally {
          setAccountingLoading(false);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleRecalculateAllBalances = async () => {
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.recalculateBalances'),
      message: t('finanzas:modals.confirm.recalculateBalancesMessage'),
      variant: 'info',
      confirmText: t('finanzas:modals.confirm.recalculateConfirm'),
      onConfirm: async () => {
        if (!uid) return;
        setAccountingLoading(true);
        try {
          const results = await recalculateAllBalances(uid);
          await reloadAllTransactionData();
          const summary = results.map(r => {
            const acc = accounts.find(a => a.id === r.accountId);
            return `${acc?.icon || ''} ${acc?.name || t('finanzas:modals.newAccount.noAccount')}: ${formatAmount(r.balance)}`;
          }).join('\n');
          success(t('finanzas:toast.balancesRecalculated') + summary);
        } catch (e: any) {
          error(`Error: ${e?.message || 'Error desconocido'}`);
        } finally {
          setAccountingLoading(false);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleWipeAccountTransactions = async (accountId: string, action: 'all' | 'income' | 'expense' | 'saving') => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;

    let title = '';
    let message = '';
    let confirmText = '';

    if (action === 'all') {
      title = t('finanzas:modals.confirm.wipeAccount', { name: acc.name });
      message = t('finanzas:modals.confirm.wipeAccountMessage', { name: acc.name, amount: formatInCurrency(0, acc.currency) });
      confirmText = t('finanzas:modals.confirm.wipeAccountConfirm');
    } else {
      const typeLabel = TYPE_LABELS[action];
      const typeIcon = TYPE_ICONS[action];
      const actionText = action === 'income' ? 'restará' : 'sumará';
      title = t('finanzas:modals.confirm.wipeAccountType', { icon: typeIcon, type: typeLabel, name: acc.name });
      message = t('finanzas:modals.confirm.wipeAccountTypeMessage', { type: typeLabel.toLowerCase(), name: acc.name, action: actionText });
      confirmText = t('finanzas:modals.confirm.wipeAccountTypeConfirm', { type: typeLabel });
    }

    setConfirmState({
      isOpen: true,
      title,
      message,
      variant: action === 'all' ? 'danger' : 'warning',
      confirmText,
      onConfirm: async () => {
        setAccountingLoading(true);
        try {
          if (action === 'all') {
            await wipeAllTransactions(accountId);
            success(t('finanzas:toast.accountEmptied', { name: acc.name, balance: formatInCurrency(0, acc.currency) }));
          } else {
            const result = await wipeTransactionsByTypeWithAdjustment(accountId, action);
            const sign = result.balanceAdjustment > 0 ? '+' : '';
            success(t('finanzas:toast.typesWipedFromAccount', { count: result.wipedCount, type: TYPE_LABELS[action].toLowerCase(), adjustment: sign + formatInCurrency(Math.abs(result.balanceAdjustment), acc.currency) }));
          }
          await reloadAllTransactionData();
        } catch (e: any) {
          error(`Error: ${e?.message || 'Error desconocido'}`);
        } finally {
          setAccountingLoading(false);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const getAccountName = (accountId?: string) => {
    if (!accountId) return t('finanzas:modals.newTransaction.noAccount');
    const acc = accounts.find((a) => a.id === accountId);
    return acc ? <><InlineIcon icon={acc.icon || 'Wallet'} size={12} /> {acc.name}</> : t('finanzas:modals.newTransaction.noAccount');
  };

  const currentTypeCats = allCategories[newTx.type] || CATEGORIES[newTx.type];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="finanzas-page">
          {/* Header */}
          <div className="page-header">
            <div className="page-header-left">
              <h1 className="page-title">{t('finanzas:title')}</h1>
              <p className="page-subtitle">{t('finanzas:subtitle')}</p>
            </div>
            {/* Desktop actions */}
            <div className="page-header-actions desktop-only-actions">
              <button className="btn btn-outline" onClick={() => setShowAccountModal(true)}>
                <IconPlus width={16} height={16} /> {t('finanzas:accounts.add')}
              </button>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <IconPlus width={16} height={16} /> {t('finanzas:transactions.add')}
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="summary-cards">
            <SummaryWidget
              label={t('finanzas:summary.income')}
              value={summary.income}
              altValue={altSummary.income}
              color="var(--color-prosper-green)"
              showAmounts={showAmounts}
              showConversion={showConversion}
              altCurrency={altCurrency}
              formatInCurrency={formatInCurrency}
              displayCurrency={displayCurrency}
            />
            <SummaryWidget
              label={t('finanzas:summary.expenses')}
              value={summary.expenses}
              altValue={altSummary.expenses}
              color="var(--color-error)"
              showAmounts={showAmounts}
              showConversion={showConversion}
              altCurrency={altCurrency}
              formatInCurrency={formatInCurrency}
              displayCurrency={displayCurrency}
            />
            <SummaryWidget
              label={t('finanzas:summary.balance')}
              value={summary.balance}
              altValue={altSummary.balance}
              color={summary.balance >= 0 ? 'var(--color-prosper-green)' : 'var(--color-error)'}
              showAmounts={showAmounts}
              showConversion={showConversion}
              altCurrency={altCurrency}
              formatInCurrency={formatInCurrency}
              displayCurrency={displayCurrency}
            />
            <SummaryWidget
              label={t('finanzas:summary.totalBalance')}
              value={totalBalance}
              altValue={altTotalBalance}
              color="var(--color-prosper-navy)"
              showAmounts={showAmounts}
              showConversion={showConversion}
              altCurrency={altCurrency}
              formatInCurrency={formatInCurrency}
              displayCurrency={displayCurrency}
            />
          </div>

          {/* Chart */}
          <FinancialStatusChart />

          {/* Accounts */}
          <div className="accounts-section">
            <div className="section-header">
              <h2>{t('finanzas:accounts.title')}</h2>
              <div className="section-actions">
                <button className="btn btn-sm btn-outline" onClick={() => setShowAccountModal(true)}>
                  <IconPlus width={14} height={14} /> {t('finanzas:accounts.add')}
                </button>
              </div>
            </div>

            <div className="accounts-list">
              {accounts.length === 0 ? (
                <div className="empty-state">
                  <p>{t('finanzas:accounts.empty')}</p>
                  <button className="btn btn-primary" onClick={() => setShowAccountModal(true)}>
                    {t('finanzas:accounts.addFirst')}
                  </button>
                </div>
              ) : (
                accounts.map((acc) => (
                  <div key={acc.id} className="account-card" style={{ borderLeftColor: acc.color || '#3DCC8E' }}>
                    <div className="account-card-header">
                      <div className="account-card-info">
                        <div className="account-card-icon" style={{ background: acc.color || '#3DCC8E' }}>
                          <InlineIcon icon={acc.icon || 'Wallet'} size={18} />
                        </div>
                        <div>
                          <h3>{acc.name}</h3>
                          <span className="account-card-type">{acc.type}</span>
                        </div>
                      </div>
                      <div className="account-card-balance">
                        <span className="account-card-amount">{formatInCurrency(acc.balance, acc.currency || 'USD')}</span>
                        <span className="account-card-currency">{acc.currency}</span>
                      </div>
                    </div>
                    <div className="account-card-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => openEditAccount(acc)}>
                        {t('common:buttons.edit')}
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => handleClearHistory(acc.id)}>
                        <IconArchive width={14} height={14} /> {t('finanzas:accounts.archive')}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteAccount(acc.id)}>
                        <IconTrash width={14} height={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Transactions */}
          <div className="transactions-section">
            <div className="section-header">
              <h2>{t('finanzas:transactions.title')}</h2>
              <div className="section-actions">
                <button className="btn btn-sm btn-outline" onClick={() => setShowModal(true)}>
                  <IconPlus width={14} height={14} /> {t('finanzas:transactions.add')}
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="transaction-filters">
              <CustomSelect
                value={selectedAccount}
                onChange={setSelectedAccount}
                options={[
                  { value: 'all', label: t('finanzas:filters.allAccounts') },
                  ...accounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
              <CustomSelect
                value={filterType}
                onChange={setFilterType}
                options={[
                  { value: 'Todos', label: t('finanzas:filters.allTypes') },
                  { value: 'income', label: t('finanzas:filters.income') },
                  { value: 'expense', label: t('finanzas:filters.expense') },
                  { value: 'saving', label: t('finanzas:filters.saving') },
                ]}
              />
              <CustomSelect
                value={filterCategory}
                onChange={setFilterCategory}
                options={[
                  { value: 'Todas', label: t('finanzas:filters.allCategories') },
                  ...Object.values(allCategories).flat().map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>

            {/* Transaction Tabs */}
            <div className="transaction-tabs">
              <button
                className={`tab ${txTab === 'activas' ? 'active' : ''}`}
                onClick={() => setTxTab('activas')}
              >
                {t('finanzas:transactions.active')}
              </button>
              <button
                className={`tab ${txTab === 'archivadas' ? 'active' : ''}`}
                onClick={() => setTxTab('archivadas')}
              >
                {t('finanzas:transactions.archived')}
              </button>
            </div>

            {/* Bulk Actions */}
            {selectedTxIds.size > 0 && (
              <div className="bulk-actions">
                <span>{selectedTxIds.size} {t('finanzas:transactions.selected')}</span>
                {txTab === 'activas' ? (
                  <button className="btn btn-sm btn-outline" onClick={handleArchiveSelected}>
                    <IconArchive width={14} height={14} /> {t('finanzas:transactions.archiveSelected')}
                  </button>
                ) : (
                  <>
                    <button className="btn btn-sm btn-outline" onClick={handleUnarchiveSelected}>
                      <IconReset width={14} height={14} /> {t('finanzas:transactions.unarchiveSelected')}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={handleDeleteSelectedPermanent}>
                      <IconTrash width={14} height={14} /> {t('finanzas:transactions.deleteSelected')}
                    </button>
                  </>
                )}
                <button className="btn btn-sm btn-outline" onClick={deselectAll}>
                  {t('common:buttons.cancel')}
                </button>
              </div>
            )}

            {/* Transaction List */}
            <div className="transaction-list">
              {filteredTx.length === 0 ? (
                <div className="empty-state">
                  <p>{t('finanzas:transactions.empty')}</p>
                </div>
              ) : (
                <>
                  <div className="transaction-list-header">
                    <input
                      type="checkbox"
                      checked={filteredTx.slice(0, txLimit).every(t => selectedTxIds.has(t.id))}
                      onChange={(e) => e.target.checked ? selectAllVisible() : deselectAll()}
                    />
                    <span>{t('finanzas:transactions.date')}</span>
                    <span>{t('finanzas:transactions.type')}</span>
                    <span>{t('finanzas:transactions.category')}</span>
                    <span>{t('finanzas:transactions.amount')}</span>
                    <span>{t('finanzas:transactions.account')}</span>
                    <span></span>
                  </div>
                  {filteredTx.slice(0, txLimit).map((tx) => (
                    <div key={tx.id} className={`transaction-item ${tx.type}`}>
                      <input
                        type="checkbox"
                        checked={selectedTxIds.has(tx.id)}
                        onChange={() => toggleTxSelection(tx.id)}
                      />
                      <span className="tx-date">{formatDate(tx.date)}</span>
                      <span className="tx-type" style={{ color: TYPE_COLORS[tx.type] }}>
                        {TYPE_LABELS[tx.type]}
                      </span>
                      <span className="tx-category">{tx.category}</span>
                      <span className="tx-amount" style={{ color: tx.type === 'income' ? 'var(--color-prosper-green)' : 'var(--color-error)' }}>
                        {tx.type === 'income' ? '+' : '-'}{formatTableAmount(tx.amount, accounts.find(a => a.id === tx.accountId)?.currency || 'USD')}
                      </span>
                      <span className="tx-account">{getAccountName(tx.accountId)}</span>
                      <button className="tx-delete" onClick={() => handleDeleteTransaction(tx.id)}>
                        <IconX width={14} height={14} />
                      </button>
                    </div>
                  ))}
                  {filteredTx.length > txLimit && (
                    <button className="btn btn-sm btn-outline load-more" onClick={() => setTxLimit(prev => prev + 10)}>
                      {t('finanzas:transactions.loadMore')}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* VEPay Modal */}
          {showVepayModal && (
            <VepayModal
              uid={uid}
              accounts={accounts}
              onTransactionCreated={reloadAllTransactionData}
              onClose={() => setShowVepayModal(false)}
              open={showVepayModal}
              todayISO={todayISO}
              formatAmount={formatAmount}
              convertBetween={convertBetween}
              success={success}
              warning={warning}
              error={error}
              txLoading={txLoading}
              setTxLoading={setTxLoading}
              formatInCurrency={formatInCurrency}
            />
          )}

          {/* Add Transaction Modal */}
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('finanzas:modals.newTransaction.title')}</h2>
                  <button className="modal-close" onClick={() => setShowModal(false)}>
                    <IconX width={20} height={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>{t('finanzas:modals.newTransaction.amount')}</label>
                    <input
                      type="number"
                      value={newTx.amount}
                      onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('finanzas:modals.newTransaction.type')}</label>
                    <div className="type-selector">
                      {(['income', 'expense', 'saving'] as const).map((type) => (
                        <button
                          key={type}
                          className={`type-btn ${newTx.type === type ? 'active' : ''}`}
                          onClick={() => setNewTx({ ...newTx, type, category: CATEGORIES[type][0] })}
                        >
                          {TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{t('finanzas:modals.newTransaction.category')}</label>
                    <CustomSelect
                      value={newTx.category}
                      onChange={(val) => setNewTx({ ...newTx, category: val })}
                      options={currentTypeCats.map((c) => ({ value: c, label: c }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('finanzas:modals.newTransaction.description')}</label>
                    <input
                      type="text"
                      value={newTx.description}
                      onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                      placeholder={t('finanzas:modals.newTransaction.descriptionPlaceholder')}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('finanzas:modals.newTransaction.account')}</label>
                    <CustomSelect
                      value={newTx.accountId}
                      onChange={(val) => setNewTx({ ...newTx, accountId: val })}
                      options={[
                        { value: '', label: t('finanzas:modals.newTransaction.noAccount') },
                        ...accounts.map((a) => ({ value: a.id, label: a.name })),
                      ]}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('finanzas:modals.newTransaction.date')}</label>
                    <input
                      type="date"
                      value={newTx.date}
                      onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowModal(false)}>
                    {t('common:buttons.cancel')}
                  </button>
                  <button className="btn btn-primary" onClick={handleAddTransaction} disabled={txLoading}>
                    {txLoading ? t('common:buttons.loading') : t('common:buttons.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Account Modal */}
          {showAccountModal && (
            <div className="modal-overlay" onClick={() => setShowAccountModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('finanzas:modals.newAccount.title')}</h2>
                  <button className="modal-close" onClick={() => setShowAccountModal(false)}>
                    <IconX width={20} height={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>{t('finanzas:modals.newAccount.name')}</label>
                    <input
                      type="text"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      placeholder={t('finanzas:modals.newAccount.namePlaceholder')}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('finanzas:modals.newAccount.type')}</label>
                    <div className="type-selector">
                      {(['digital', 'bank', 'foreign'] as const).map((type) => (
                        <button
                          key={type}
                          className={`type-btn ${newAccount.type === type ? 'active' : ''}`}
                          onClick={() => setNewAccount({ ...newAccount, type })}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{t('finanzas:modals.newAccount.currency')}</label>
                    <CustomSelect
                      value={newAccount.currency}
                      onChange={(val) => setNewAccount({ ...newAccount, currency: val as CurrencyCode })}
                      options={[
                        { value: 'USD', label: 'USD' },
                        { value: 'BS', label: 'BS' },
                        { value: 'EUR', label: 'EUR' },
                      ]}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('finanzas:modals.newAccount.balance')}</label>
                    <input
                      type="number"
                      value={newAccount.balance}
                      onChange={(e) => setNewAccount({ ...newAccount, balance: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowAccountModal(false)}>
                    {t('common:buttons.cancel')}
                  </button>
                  <button className="btn btn-primary" onClick={handleAddAccount}>
                    {t('common:buttons.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Dialog */}
          <ConfirmDialog
            isOpen={confirmState.isOpen}
            title={confirmState.title}
            message={confirmState.message}
            onConfirm={confirmState.onConfirm}
            onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
            variant={confirmState.variant}
            confirmText={confirmState.confirmText}
            secondaryText={confirmState.secondaryText}
            onSecondary={confirmState.onSecondary}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
});

export default FinanzasPage;
