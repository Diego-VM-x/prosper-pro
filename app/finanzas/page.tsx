'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useToast } from '@/app/components/Toast';
import { ConfirmDialog } from '@/app/components/Toast';
import { getTransactionsByOwnerId, createTransaction, deleteTransaction } from '@/lib/firestore/transactions';
import { addNotification } from '@/lib/firestore/notifications';
import { subscribeToAccounts, createAccount, deleteAccount, clearAccountHistory, deleteTransactionsByType, resetAccountBalance, clearAllTransactionHistory, getTotalBalance, updateAccountBalance, updateAccount, wipeAllTransactions, wipeTransactionsByTypeWithAdjustment, recalculateAccountBalance, recalculateAllBalances, wipeAllUserTransactions, wipeUserTransactionsByType, subscribeToAccountGroups, createAccountGroup, updateAccountGroup, deleteAccountGroup, moveAccountToGroup } from '@/lib/firestore/accounts';
import { CustomSelect } from '@/app/components/CustomSelect';
import { addCustomTransactionCategory, getUserPreferences } from '@/lib/firestore/users';
import { IconPlus, IconX, IconTrash, IconWallet, IconArchive, IconReset } from '@/app/components/icons';
import { FinancialStatusChart } from '@/app/components/FinancialStatusChart';
import { parseReceipt, mapReceiptToTransaction, VEPayReceipt, VEPAY_BANKS } from '@/lib/vepay';
import { getAccountRates, convertCurrency } from '@/lib/currency';
import { safeLocalStorage } from '@/lib/utils/safeStorage';
import type { Transaction, FinancialAccount, AccountType, CurrencyCode, AccountGroup } from '@/types';

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  income: ['💰 Salario', '💼 Freelance', '📊 Inversiones', '🏢 Negocio', '📌 Otro'],
  expense: ['🍔 Comida', '🚗 Transporte', '🏠 Vivienda', '🎬 Entretenimiento', '💊 Salud', '🎓 Educación', '📌 Otro'],
  saving: ['💵 Ahorro', '📈 Inversión', '🛡️ Fondo Emergencia', '📌 Otro'],
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

const TYPE_ICONS: Record<string, string> = { income: '📥', expense: '📤', saving: '💰' };

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
  const [txLimit, setTxLimit] = useState(5);
  const [filterType, setFilterType] = useState<string>('Todos');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
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
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; variant: 'danger' | 'warning' | 'info'; confirmText?: string }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' });

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
    
    transactions.forEach((t) => {
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
  }, [transactions, accounts, displayCurrency, convertBetween]);
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
  const [vepayProcessing, setVepayProcessing] = useState(false);
  const [vepayReceipts, setVepayReceipts] = useState<VEPayReceipt[]>([]);
  const [vepayPreview, setVepayPreview] = useState<string>('');
  const [vepayOverrides, setVepayOverrides] = useState<Record<string, { flow: 'income' | 'expense'; accountId: string; bank: string; date: string }>>({});
  const [vepayManualText, setVepayManualText] = useState('');
  const [vepayManualProcessing, setVepayManualProcessing] = useState(false);
  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const [accountingAction, setAccountingAction] = useState<string>('');
  const [accountingLoading, setAccountingLoading] = useState(false);

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

  // Cargar transacciones
  const loadTransactions = useCallback(async () => {
    if (!uid) return;
    try {
      const txs = await getTransactionsByOwnerId(uid);
      setTransactions(txs);
    } catch (e) { console.error(e); }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    loadTransactions();
  }, [uid, loadTransactions]);

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
      success('Modo P2P activado: conversiones usando precios P2P en tiempo real');
    } else {
      warning('Modo Oficial activado: conversiones usando precios de mercado');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p2pMode]);

  // Filtrar transacciones
  const filteredByAccount = selectedAccount === 'all'
    ? transactions
    : transactions.filter((t) => t.accountId === selectedAccount);

  const categories = filterType === 'Todos' ? Object.values(allCategories).flat() : (allCategories[filterType as keyof typeof allCategories] || []);
  const filteredTx = filteredByAccount.filter((t) => {
    if (filterType !== 'Todos' && t.type !== filterType) return false;
    if (filterCategory !== 'Todas' && t.category !== filterCategory) return false;
    return true;
  });

  const handleAddTransaction = async () => {
    const amount = Number(newTx.amount);
    if (!amount || amount <= 0) {
      warning('Ingresa un monto válido mayor a 0.');
      return;
    }
    if (!uid) {
      error('Debes iniciar sesión.');
      return;
    }

    // Validar fondos si es gasto o ahorro y hay cuenta seleccionada
    if ((newTx.type === 'expense' || newTx.type === 'saving') && newTx.accountId) {
      const acc = accounts.find(a => a.id === newTx.accountId);
      if (acc && acc.balance < amount) {
        error(`Fondos insuficientes en "${acc.name}". Balance: ${formatInCurrency(acc.balance, acc.currency || 'USD')}`);
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
      await loadTransactions();

      const typeLabel = TYPE_LABELS[newTx.type];
      const account = accounts.find(a => a.id === newTx.accountId);
      const txCurrency = account?.currency || 'USD';
      success(`${typeLabel} de ${formatInCurrency(amount, txCurrency)} registrado`);
      setShowModal(false);
      setNewTx({ amount: '', type: 'income', category: 'Salario', description: '', accountId: '', date: todayISO() });
    } catch (e: any) {
      console.error(e);
      error(`Error al registrar: ${e?.message || 'Error desconocido'}`);
    } finally {
      setTxLoading(false);
    }
  };
  const handleDeleteTransaction = async (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    const txAccount = accounts.find((a) => a.id === tx.accountId);
    const txCurrency = txAccount?.currency || 'USD';

    setConfirmState({
      isOpen: true,
      title: 'Eliminar Transacción',
      message: `¿Eliminar "${tx.description || tx.category}" por ${formatInCurrency(tx.amount, txCurrency)}? El balance de la cuenta se ajustará.`,
      variant: 'danger',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await deleteTransaction(txId);

          // Revertir balance si tenía cuenta
          if (tx.accountId) {
            const delta = tx.type === 'income' ? -tx.amount : tx.amount;
            await updateAccountBalance(tx.accountId, delta);
          }

          await loadTransactions();
          success('Transacción eliminada');
        } catch (e: any) {
          error(`Error al eliminar: ${e?.message || 'Error desconocido'}`);
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

  const handleVepayUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    setVepayProcessing(true);
    setVepayReceipts([]);
    setVepayOverrides({});

    try {
      const previewUrl = URL.createObjectURL(file);
      setVepayPreview(previewUrl);

      const result = await parseReceipt(file);

      if (result.receipts && result.receipts.length > 0) {
        setVepayReceipts(result.receipts);
        // Initialize overrides with detected dates
        const initialOverrides: Record<string, { flow: 'income' | 'expense'; accountId: string; bank: string; date: string }> = {};
        result.receipts.forEach(r => {
          const key = r.transaction_key || '';
          let dateStr = todayISO();
          if (r.payment.date_time.iso) {
            dateStr = r.payment.date_time.iso.split('T')[0];
          }
          initialOverrides[key] = { flow: 'expense', accountId: '', bank: '', date: dateStr };
        });
        setVepayOverrides(initialOverrides);
        success(`${result.receipts.length} recibo(s) detectado(s)`);
      } else {
        warning('No se pudo detectar un recibo en la captura.');
      }

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(err => {
          error(`Error: ${err.message}`);
        });
      }
    } catch (err: any) {
      console.error(err);
      error(err?.message || 'Error al procesar la captura');
    } finally {
      setVepayProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleVepayManualParse = async () => {
    if (!vepayManualText.trim() || !uid) return;
    setVepayManualProcessing(true);
    try {
      const { parseMultipleOcrTexts } = await import('@/lib/vepay-core');
      const result = parseMultipleOcrTexts(
        [{ text: vepayManualText, filename: 'manual.txt' }],
        { includeRawText: false }
      );
      if (result.receipts && result.receipts.length > 0) {
        setVepayReceipts(result.receipts);
        const initialOverrides: Record<string, { flow: 'income' | 'expense'; accountId: string; bank: string; date: string }> = {};
        result.receipts.forEach(r => {
          const key = r.transaction_key || '';
          let dateStr = todayISO();
          if (r.payment.date_time.iso) dateStr = r.payment.date_time.iso.split('T')[0];
          initialOverrides[key] = { flow: 'expense', accountId: '', bank: '', date: dateStr };
        });
        setVepayOverrides(initialOverrides);
        success(`${result.receipts.length} recibo(s) detectado(s)`);
      } else {
        warning('No se pudo detectar un recibo en el texto.');
      }
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(err => error(`Error: ${err.message}`));
      }
    } catch (err: any) {
      error(err?.message || 'Error al analizar el texto');
    }
    setVepayManualProcessing(false);
  };

  const handleVepayConfirm = async (receipt: VEPayReceipt) => {
    if (!uid) return;
    setTxLoading(true);

    try {
      const key = receipt.transaction_key || '';
      const override = vepayOverrides[key];
      const tx = mapReceiptToTransaction(receipt, override);

      const account = accounts.find(a => a.id === tx.accountId);
      const accCurrency = account?.currency || 'USD';

      let finalAmount = tx.amount;
      if (accCurrency === 'USD') {
        finalAmount = Number(convertBetween(tx.amount, 'BS', 'USD').toFixed(2));
      }

      const txData: any = {
        ownerId: uid,
        amount: finalAmount,
        type: tx.type,
        category: tx.category,
        description: accCurrency === 'USD'
          ? `${tx.description} (Original: Bs. ${tx.amount.toLocaleString('es')})`
          : tx.description,
        date: tx.date,
      };
      if (tx.accountId) {
        txData.accountId = tx.accountId;
      }

      await createTransaction(txData);

      if (tx.accountId) {
        const delta = tx.type === 'income' ? finalAmount : -finalAmount;
        await updateAccountBalance(tx.accountId, delta);
      }

      await loadTransactions();

      const typeLabel = tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Gasto' : 'Ahorro';
      success(`${typeLabel} de ${formatInCurrency(finalAmount, accCurrency)} registrado desde captura`);

      setVepayReceipts(prev => prev.filter(r => r.transaction_key !== receipt.transaction_key));
      if (vepayReceipts.length <= 1) {
        setShowVepayModal(false);
        setVepayReceipts([]);
        setVepayPreview('');
        setVepayOverrides({});
      }
    } catch (err: any) {
      console.error(err);
      error(`Error al registrar: ${err?.message || 'Error desconocido'}`);
    } finally {
      setTxLoading(false);
    }
  };

  const handleVepaySkip = (receipt: VEPayReceipt) => {
    setVepayReceipts(prev => prev.filter(r => r.transaction_key !== receipt.transaction_key));
    if (vepayReceipts.length <= 1) {
      setShowVepayModal(false);
      setVepayReceipts([]);
      setVepayPreview('');
    }
  };

  const handleTransfer = async () => {
    if (!transfer.amount || !transfer.fromAccountId || !transfer.toAccountId) {
      warning('Completa todos los campos.');
      return;
    }
    if (transfer.fromAccountId === transfer.toAccountId) {
      warning('Las cuentas de origen y destino deben ser diferentes.');
      return;
    }
    const amount = Number(transfer.amount);
    if (isNaN(amount) || amount <= 0) {
      warning('Monto inválido.');
      return;
    }

    const fromAcc = accounts.find((a) => a.id === transfer.fromAccountId);
    const toAcc = accounts.find((a) => a.id === transfer.toAccountId);

    if (!fromAcc || !toAcc) {
      error('Cuenta no encontrada.');
      return;
    }
    if (fromAcc.balance < amount) {
      error(`Fondos insuficientes en "${fromAcc.name}". Balance: ${formatInCurrency(fromAcc.balance, fromAcc.currency)}`);
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

      await loadTransactions();

      success(`Transferencia exitosa: ${fromAcc.name} → ${toAcc.name}`);
      await addNotification({
        ownerId: uid!,
        type: 'transfer',
        title: 'Transferencia realizada',
        message: `Se transfirieron ${formatInCurrency(amount, fromCurrency)} de "${fromAcc.name}" a "${toAcc.name}"`,
        read: false,
        meta: { fromAccountId: transfer.fromAccountId, toAccountId: transfer.toAccountId },
      });
      setShowTransferModal(false);
      setTransfer({ amount: '', fromAccountId: '', toAccountId: '' });
    } catch (e: any) {
      error(`Error al transferir: ${e?.message || 'Error desconocido'}`);
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
      icon: newAccount.type === 'digital' ? '💳' : newAccount.type === 'bank' ? '🏦' : '💱',
      color: newAccount.color || ACCOUNT_TYPE_COLORS[newAccount.type],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(newAccount.rateMode ? { rateMode: newAccount.rateMode } : {}),
    };
    await createAccount(acc);
    success(`Cuenta "${acc.name}" creada`);
    setShowAccountModal(false);
    setNewAccount({ name: '', type: 'digital', balance: 0, currency: 'BS', color: '', rateMode: undefined });
    setAccountCategory('monedas');
  };

  const handleEditAccount = async () => {
    if (!editingAccount || !uid) return;
    await updateAccount(editingAccount.id, { name: editingAccount.name, color: editingAccount.color, updatedAt: Date.now() });
    success('Cuenta actualizada');
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
      success(`Grupo "${groupFormName.trim()}" creado`);
      setShowGroupModal(false);
      setGroupFormName('');
      setGroupFormColor(ACCOUNT_COLORS[0]);
    } catch (e: any) {
      error(`Error: ${e?.message}`);
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
      success(`Grupo "${groupFormName.trim()}" actualizado`);
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
      title: 'Eliminar Grupo',
      message: `¿Eliminar "${group.name}"? Las cuentas del grupo pasarán a "Sin grupo".`,
      variant: 'danger',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          // Unassign accounts from this group first
          const groupAccounts = accounts.filter(a => a.groupId === group.id);
          await Promise.all(groupAccounts.map(a => moveAccountToGroup(a.id, null)));
          await deleteAccountGroup(group.id);
          success('Grupo eliminado');
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
      success(groupId ? 'Cuenta movida al grupo' : 'Cuenta removida del grupo');
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
      title: 'Eliminar Cuenta',
      message: `¿Eliminar "${acc?.name}" y todas sus transacciones? Esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        await deleteAccount(id);
        await loadTransactions();
        success('Cuenta eliminada');
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleClearHistory = async (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    setConfirmState({
      isOpen: true,
      title: 'Borrar Historial',
      message: `¿Borrar el historial de transacciones de "${acc?.name}"? El balance se mantendrá intacto.`,
      variant: 'warning',
      confirmText: 'Borrar historial',
      onConfirm: async () => {
        await clearAccountHistory(id);
        await loadTransactions();
        success('Historial borrado');
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteByType = async (id: string, type: 'income' | 'expense' | 'saving') => {
    const acc = accounts.find((a) => a.id === id);
    const typeLabel = TYPE_LABELS[type];
    setConfirmState({
      isOpen: true,
      title: `Eliminar ${typeLabel}s`,
      message: `¿Eliminar todos los ${typeLabel.toLowerCase()}s de "${acc?.name}"? El balance se ajustará automáticamente.`,
      variant: 'danger',
      confirmText: `Eliminar ${typeLabel}s`,
      onConfirm: async () => {
        await deleteTransactionsByType(id, type);
        await loadTransactions();
        success(`${typeLabel}s eliminados`);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleResetBalance = async (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    setConfirmState({
      isOpen: true,
      title: 'Resetear Balance',
      message: `¿Resetear el balance de "${acc?.name}" a ${formatInCurrency(0, acc?.currency || 'BS')}? Se perderá el saldo actual de ${formatInCurrency(acc?.balance || 0, acc?.currency || 'BS')}.`,
      variant: 'danger',
      confirmText: 'Resetear balance',
      onConfirm: async () => {
        await resetAccountBalance(id);
        success('Balance reseteado');
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleClearAllHistory = async () => {
    setConfirmState({
      isOpen: true,
      title: 'Borrar Todo el Historial',
      message: '¿Borrar el historial de TODAS las transacciones? Los balances se mantendrán intactos.',
      variant: 'danger',
      confirmText: 'Borrar todo el historial',
      onConfirm: async () => {
        if (!uid) return;
        await clearAllTransactionHistory(uid);
        await loadTransactions();
        success('Historial completo borrado');
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
      title: '⚠️ Vaciar TODAS las Transacciones',
      message: 'Se eliminarán TODAS las transacciones de TODAS las cuentas. Los balances se resetearán a $0. Esta acción NO se puede deshacer.',
      variant: 'danger',
      confirmText: 'Vaciar todo',
      onConfirm: async () => {
        if (!uid) return;
        setAccountingLoading(true);
        try {
          await wipeAllUserTransactions(uid);
          await loadTransactions();
          success('Todas las transacciones eliminadas. Balances reseteados.');
        } catch (e: any) {
          error(`Error: ${e?.message || 'Error desconocido'}`);
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
      title: `${typeIcon} Vaciar ${typeLabel}s`,
      message: `Se eliminarán TODOS los ${typeLabel.toLowerCase()}s de TODAS las cuentas. El balance se ${actionText} automáticamente. ¿Continuar?`,
      variant: type === 'income' ? 'warning' : 'danger',
      confirmText: `Vaciar ${typeLabel}s`,
      onConfirm: async () => {
        if (!uid) return;
        setAccountingLoading(true);
        try {
          const result = await wipeUserTransactionsByType(uid, type);
          await loadTransactions();
          const adjustText = result.adjustments.map(a => {
            const acc = accounts.find(acc => acc.id === a.accountId);
            const sign = a.adjustment > 0 ? '+' : '';
            return `${acc?.icon || ''} ${acc?.name || 'Cuenta'}: ${sign}${formatAmount(Math.abs(a.adjustment))}`;
          }).join('\n');
          success(`${result.totalWiped} ${typeLabel.toLowerCase()}s eliminados.${result.adjustments.length > 0 ? '\nAjustes: ' + adjustText : ''}`);
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
      title: '🔄 Recalcular Balances',
      message: 'Se recalcularán los balances de TODAS las cuentas basándose en las transacciones existentes. ¿Continuar?',
      variant: 'info',
      confirmText: 'Recalcular',
      onConfirm: async () => {
        if (!uid) return;
        setAccountingLoading(true);
        try {
          const results = await recalculateAllBalances(uid);
          await loadTransactions();
          const summary = results.map(r => {
            const acc = accounts.find(a => a.id === r.accountId);
            return `${acc?.icon || ''} ${acc?.name || 'Cuenta'}: ${formatAmount(r.balance)}`;
          }).join('\n');
          success('Balances recalculados:\n' + summary);
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
      title = `🗑️ Vaciar "${acc.name}"`;
      message = `Se eliminarán TODAS las transacciones de "${acc.name}" y el balance se reseteará a ${formatInCurrency(0, acc.currency)}.`;
      confirmText = 'Vaciar cuenta';
    } else {
      const typeLabel = TYPE_LABELS[action];
      const typeIcon = TYPE_ICONS[action];
      const actionText = action === 'income' ? 'restará' : 'sumará';
      title = `${typeIcon} Vaciar ${typeLabel}s de "${acc.name}"`;
      message = `Se eliminarán los ${typeLabel.toLowerCase()}s de "${acc.name}". El balance se ${actionText} automáticamente.`;
      confirmText = `Vaciar ${typeLabel}s`;
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
            success(`"${acc.name}" vaciada. Balance: ${formatInCurrency(0, acc.currency)}`);
          } else {
            const result = await wipeTransactionsByTypeWithAdjustment(accountId, action);
            const sign = result.balanceAdjustment > 0 ? '+' : '';
            success(`${result.wipedCount} ${TYPE_LABELS[action].toLowerCase()}s eliminados. Ajuste: ${sign}${formatInCurrency(Math.abs(result.balanceAdjustment), acc.currency)}`);
          }
          await loadTransactions();
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
    if (!accountId) return 'Sin cuenta';
    const acc = accounts.find((a) => a.id === accountId);
    return acc ? `${acc.icon} ${acc.name}` : 'Sin cuenta';
  };

  const currentTypeCats = allCategories[newTx.type] || CATEGORIES[newTx.type];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="finanzas-page">
          {/* Header */}
          <div className="page-header">
            <div className="page-header-left">
              <h1 className="page-title">Finanzas</h1>
              <p className="page-subtitle">Controla tus ingresos, gastos y ahorros.</p>
            </div>
            {/* Desktop actions */}
            <div className="page-header-actions desktop-only-actions">
              <button className="btn btn-outline" onClick={() => setShowAccountModal(true)}>
                <IconPlus width={14} /> Nueva Cuenta
              </button>
              <button className="btn btn-outline" onClick={() => setShowTransferModal(true)}>
                <IconWallet width={14} /> Transferir
              </button>
              <button className="btn btn-outline btn-danger-outline" onClick={handleClearAllHistory} title="Archivar todo el historial">
                <IconArchive width={14} /> Borrar Historial
              </button>
              <button className="btn btn-outline btn-accounting" onClick={() => setShowAccountingModal(true)} title="Gestión contable avanzada">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                <span className="btn-accounting-label">Gestión Contable</span>
              </button>
              <button className="btn btn-outline btn-toggle-visibility" onClick={toggleShowAmounts}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showAmounts ? (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </>
                  ) : (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </>
                  )}
                </svg>
                <span className="btn-toggle-label">{showAmounts ? 'Visible' : 'Oculto'}</span>
              </button>
              <div className="btn-p2p-toggle" title="Elige entre tasa de mercado (Oficial) o precio P2P real para criptos (USDT, SOL, BTC, USDC)">
                <button className={!p2pMode ? 'active' : ''} onClick={() => setP2pMode(false)}>Oficial</button>
                <button className={p2pMode ? 'active' : ''} onClick={() => setP2pMode(true)}>P2P</button>
              </div>
              <button className="btn btn-outline btn-vepay" onClick={() => setShowVepayModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span className="btn-vepay-label">Importar Captura</span>
              </button>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <IconPlus width={14} /> Nueva Transacción
              </button>
            </div>

          </div>

          {/* Tasas de cambio - Collapsible */}
          <div className="rates-section">
            <div 
              className={`rates-section-header ${ratesCollapsed ? 'collapsed' : ''}`}
              onClick={() => setRatesCollapsed(!ratesCollapsed)}
            >
              <div className="rates-section-header-left">
                <span className="rates-section-icon">💱</span>
                <div>
                  <span className="rates-section-title">Mercado de Divisas</span>
                  <span className="rates-section-subtitle">Tasas en tiempo real</span>
                </div>
              </div>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ 
                  transform: ratesCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.2s ease',
                  color: 'var(--text-secondary)'
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            
            {!ratesCollapsed && (
              <div className="rates-tables-wrapper">
                {/* Monedas Fiduciarias */}
                <div className="rates-table-container">
                  <div className="rates-table-header">
                    <div className="rates-table-header-left">
                      <span className="rates-table-icon">💱</span>
                      <div>
                        <span className="rates-table-title">Monedas</span>
                        <span className="rates-table-subtitle">Tasas oficiales BCV</span>
                      </div>
                    </div>
                  </div>
                  <div className="rates-list">
                    {[
                      { code: 'USD', name: 'Dólar', flag: '🇺🇸' },
                      { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
                      { code: 'COP', name: 'Peso Colombiano', flag: '🇨🇴' },
                    ].map(({ code, name, flag }) => {
                      const value = rates.rates[code as keyof typeof rates.rates] as number | undefined;
                      return (
                        <div key={code} className="rates-row">
                          <div className="rates-row-left">
                            <span className="rates-row-flag">{flag}</span>
                            <div className="rates-row-info">
                              <span className="rates-row-code">{code}</span>
                              <span className="rates-row-name">{name}</span>
                            </div>
                          </div>
                          <span className="rates-row-value">
                            {rates.source === 'api' && value
                              ? `Bs. ${value.toLocaleString('es-VE', { minimumFractionDigits: code === 'COP' ? 4 : 2, maximumFractionDigits: code === 'COP' ? 4 : 2 })}`
                              : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cryptos */}
                <div className="rates-table-container">
                  <div className="rates-table-header">
                    <div className="rates-table-header-left">
                      <span className="rates-table-icon">💎</span>
                      <div>
                        <span className="rates-table-title">Cryptos</span>
                        <span className="rates-table-subtitle">USD vs BS</span>
                      </div>
                    </div>
                  </div>
                  <div className="rates-list">
                    {[
                      { code: 'USDT', name: 'Tether', flag: '💎' },
                      { code: 'SOL', name: 'Solana', flag: '☀️' },
                      { code: 'BTC', name: 'Bitcoin', flag: '🟠' },
                      { code: 'ETH', name: 'Ethereum', flag: '💠' },
                      { code: 'USDC', name: 'USD Coin', flag: '🔷' },
                    ].map(({ code, name, flag }) => {
                      const usdPrice = rates.cryptoPrices?.[code] as number | undefined;
                      const bsOfficial = rates.rates[code as keyof typeof rates.rates] as number | undefined;
                      const bsP2p = rates.p2pRates?.[code as keyof typeof rates.p2pRates] as number | undefined;
                      return (
                        <div key={code} className="rates-row">
                          <div className="rates-row-left">
                            <span className="rates-row-flag">{flag}</span>
                            <div className="rates-row-info">
                              <span className="rates-row-code">{code}</span>
                              <span className="rates-row-name">{name}</span>
                            </div>
                          </div>
                          <div className="rates-row-values">
                            <span className="rates-row-val rates-usd-val" title="Precio en USD">
                              {usdPrice ? `$${usdPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span className="rates-row-val rates-bs-official" title="Tasa oficial BS">
                                {bsOfficial ? `Bs. ${formatCompact(bsOfficial)}` : '—'}
                              </span>
                              {bsP2p && (
                                <span className="rates-row-val rates-bs-p2p" title="Tasa P2P BS">
                                  P2P: {formatCompact(bsP2p)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cuentas agrupadas */}
          <div className="accounts-section">
            {/* Header de sección con botón de grupos */}
            <div className="accounts-section-header">
              <h3 className="accounts-section-title">🏦 Mis Cuentas</h3>
              <button className="btn btn-outline btn-sm" onClick={() => openGroupModal()}>
                <IconPlus width={12} /> Nuevo Grupo
              </button>
            </div>

            {(() => {
              // Agrupar cuentas
              const grouped: Record<string, FinancialAccount[]> = {};
              const ungrouped: FinancialAccount[] = [];
              accounts.forEach(acc => {
                if (acc.groupId) {
                  if (!grouped[acc.groupId]) grouped[acc.groupId] = [];
                  grouped[acc.groupId].push(acc);
                } else {
                  ungrouped.push(acc);
                }
              });

              const renderAccountCard = (acc: FinancialAccount, index: number) => (
                <div key={acc.id} className="account-card stagger-item" style={{ borderLeftColor: acc.color, animationDelay: `${index * 0.05}s` }}>
                  <div className="account-card-header">
                    <div className="account-icon" style={{ background: `${acc.color}20` }}>{acc.icon}</div>
                    <div className="account-info">
                      <span className="account-name">{acc.name}</span>
                      <span className="account-type">
                        {acc.type === 'digital' ? 'Billetera Digital' : acc.type === 'bank' ? 'Banco' : 'Divisas'} • {acc.currency || 'BS'}
                      </span>
                    </div>
                    <div className="account-actions-group">
                      <button className="account-action" onClick={() => setShowAssignGroupModal(acc.id)} title="Mover de grupo">📁</button>
                      <button className="account-action" onClick={() => handleClearHistory(acc.id)} title="Archivar historial"><IconArchive width={14} /></button>
                      <button className="account-action" onClick={() => handleResetBalance(acc.id)} title="Resetear balance"><IconReset width={14} /></button>
                    </div>
                  </div>
                  <div className="account-balance-group">
                    <div className="account-balance" style={{ color: acc.color }}>
                      {showAmounts ? formatInCurrency(acc.balance, acc.currency) : '••••••'}
                    </div>
                    {showAmounts && acc.currency !== displayCurrency && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 400 }}>
                        ≈ {formatInCurrency(convertCurrency(acc.balance, acc.currency || 'USD', displayCurrency, getAccountRates(acc, rates, p2pMode)), displayCurrency)}
                      </div>
                    )}
                  </div>
                </div>
              );

              return (
                <>
                  {/* Grupos */}
                  {accountGroups.map((group) => {
                    const groupAccs = grouped[group.id] || [];
                    if (groupAccs.length === 0) return null;
                    const isCollapsed = collapsedGroups.has(group.id);
                    return (
                      <div key={group.id} className="account-group">
                        <div className="account-group-header" onClick={() => toggleGroupCollapse(group.id)} style={{ cursor: 'pointer' }}>
                          <div className="account-group-title" style={{ color: group.color || 'var(--text-primary)' }}>
                            <span className="account-group-chevron">{isCollapsed ? '▸' : '▾'}</span>
                            <span className="account-group-dot" style={{ background: group.color || 'var(--text-primary)' }} />
                            {group.name}
                            <span className="account-group-count">{groupAccs.length}</span>
                          </div>
                          <div className="account-group-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="account-group-btn" onClick={() => openGroupModal(group)} title="Editar">✏️</button>
                            <button className="account-group-btn" onClick={() => handleDeleteGroup(group)} title="Eliminar">🗑️</button>
                          </div>
                        </div>
                        {!isCollapsed && (
                          <div className="accounts-grid">
                            {groupAccs.map((acc, i) => renderAccountCard(acc, i))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Sin grupo */}
                  {ungrouped.length > 0 && (
                    <div className="account-group">
                      <div className="account-group-header">
                        <div className="account-group-title">
                          <span className="account-group-dot" style={{ background: 'var(--text-tertiary)' }} />
                          Sin grupo
                          <span className="account-group-count">{ungrouped.length}</span>
                        </div>
                      </div>
                      <div className="accounts-grid">
                        {ungrouped.map((acc, i) => renderAccountCard(acc, i))}
                      </div>
                    </div>
                  )}

                  {accounts.length === 0 && (
                    <div className="empty-accounts">
                      <p>No tienes cuentas. ¡Crea tu primera cuenta!</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Modal Editar Cuenta */}
          {showEditAccountModal && editingAccount && (
            <div className="modal-overlay" onClick={() => { setShowEditAccountModal(false); setEditingAccount(null); }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">Editar Cuenta</h2>
                    <p className="modal-subtitle">Nombre y color</p>
                  </div>
                  <button className="modal-close" onClick={() => { setShowEditAccountModal(false); setEditingAccount(null); }}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="tx-field">
                    <label className="tx-label">Nombre</label>
                    <input className="tx-input" type="text" placeholder="Nombre de la cuenta" value={editingAccount.name} onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })} />
                  </div>
                  <div className="tx-field">
                    <label className="tx-label">Color</label>
                    <div className="color-picker-row">
                      {ACCOUNT_COLORS.map((c) => (
                        <button
                          key={c}
                          className={`color-dot ${editingAccount.color === c ? 'active' : ''}`}
                          style={{ background: c }}
                          onClick={() => setEditingAccount({ ...editingAccount, color: c })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => { setShowEditAccountModal(false); setEditingAccount(null); }}>Cancelar</button>
                  <button className="btn btn-primary" onClick={handleEditAccount}>Guardar</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Grupo (Crear/Editar) */}
          {showGroupModal && (
            <div className="modal-overlay" onClick={() => { setShowGroupModal(false); setEditingGroup(null); setGroupFormName(''); }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">{editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}</h2>
                    <p className="modal-subtitle">Organiza tus cuentas</p>
                  </div>
                  <button className="modal-close" onClick={() => { setShowGroupModal(false); setEditingGroup(null); setGroupFormName(''); }}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="tx-field">
                    <label className="tx-label">Nombre *</label>
                    <input className="tx-input" type="text" placeholder="Ej: Bancos, Criptos, Efectivo" value={groupFormName} onChange={(e) => setGroupFormName(e.target.value)} autoFocus />
                  </div>
                  <div className="tx-field">
                    <label className="tx-label">Color</label>
                    <div className="color-picker-row">
                      {ACCOUNT_COLORS.map((c) => (
                        <button
                          key={c}
                          className={`color-dot ${groupFormColor === c ? 'active' : ''}`}
                          style={{ background: c }}
                          onClick={() => setGroupFormColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => { setShowGroupModal(false); setEditingGroup(null); setGroupFormName(''); }}>Cancelar</button>
                  <button className="btn btn-primary" onClick={editingGroup ? handleEditGroup : handleCreateGroup} disabled={groupFormLoading || !groupFormName.trim()}>
                    {groupFormLoading ? 'Guardando...' : editingGroup ? 'Guardar' : 'Crear'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Asignar Grupo */}
          {showAssignGroupModal && (
            <div className="modal-overlay" onClick={() => setShowAssignGroupModal(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">Mover a Grupo</h2>
                    <p className="modal-subtitle">Selecciona un grupo para esta cuenta</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowAssignGroupModal(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="group-assign-list">
                    <button
                      className="group-assign-item"
                      onClick={() => handleAssignGroup(showAssignGroupModal, null)}
                    >
                      <span className="group-assign-dot" style={{ background: 'var(--text-tertiary)' }} />
                      <span className="group-assign-name">Sin grupo</span>
                    </button>
                    {accountGroups.map((g) => (
                      <button
                        key={g.id}
                        className="group-assign-item"
                        onClick={() => handleAssignGroup(showAssignGroupModal, g.id)}
                      >
                        <span className="group-assign-dot" style={{ background: g.color || 'var(--text-primary)' }} />
                        <span className="group-assign-name">{g.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowAssignGroupModal(null)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Resumen mensual */}
          <div className="summary-section">
            <div className="summary-grid">
              <SummaryWidget label="Ingresos" value={summary.income} altValue={altSummary.income} color="var(--color-prosper-green)" showAmounts={showAmounts} showConversion={showConversion} altCurrency={altCurrency} formatInCurrency={formatInCurrency} displayCurrency={displayCurrency} />
              <SummaryWidget label="Gastos" value={summary.expenses} altValue={altSummary.expenses} color="var(--color-error)" showAmounts={showAmounts} showConversion={showConversion} altCurrency={altCurrency} formatInCurrency={formatInCurrency} displayCurrency={displayCurrency} />
              <SummaryWidget label="Balance Total" value={totalBalance} altValue={altTotalBalance} color={totalBalance >= 0 ? 'var(--color-prosper-green)' : 'var(--color-error)'} showAmounts={showAmounts} showConversion={showConversion} altCurrency={altCurrency} formatInCurrency={formatInCurrency} displayCurrency={displayCurrency} />
            </div>
            <button
              onClick={() => { const next = !showConversion; setShowConversion(next); try { safeLocalStorage.setItem('finanzas-show-conversion', String(next)); } catch {} }}
              className={`conversion-toggle ${showConversion ? 'active' : ''}`}
              title={showConversion ? 'Ocultar conversión' : 'Ver conversión'}
            >
              ⇄ {showConversion ? `${displayCurrency}/${altCurrency}` : 'Convertir'}
            </button>
          </div>

          {/* Gráfico */}
          <div className="chart-wrapper">
            <FinancialStatusChart />
          </div>

          {/* Filtros - Compact Visual Design */}
          <div className="tx-filters">
            <div className="tx-filters-row">
              <div className="tx-filter-group">
                <span className="tx-filter-label">📊 Cuenta</span>
                <CustomSelect
                  value={selectedAccount}
                  onChange={(val) => setSelectedAccount(val)}
                  options={[
                    { value: 'all', label: 'Todas', icon: '📊' },
                    ...accounts.map((a) => ({ value: a.id, label: a.name, icon: a.icon })),
                  ]}
                  placeholder="Todas"
                />
              </div>
              <div className="tx-filter-group">
                <span className="tx-filter-label">📋 Tipo</span>
                <div className="tx-filter-pills">
                  {['Todos', 'income', 'expense', 'saving'].map((t) => (
                    <button 
                      key={t} 
                      className={`tx-filter-pill ${filterType === t ? 'active' : ''}`} 
                      onClick={() => { setFilterType(t); setFilterCategory('Todas'); }}
                    >
                      {t === 'Todos' ? 'Todos' : `${TYPE_ICONS[t]}`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tx-filter-group tx-filter-group-wide">
                <span className="tx-filter-label">🏷️ Categoría</span>
                <CustomSelect
                  value={filterCategory}
                  onChange={(val) => setFilterCategory(val)}
                  options={[
                    { value: 'Todas', label: 'Todas', icon: '📋' },
                    ...categories.map((c) => ({ value: c, label: c })),
                  ]}
                  placeholder="Todas"
                />
              </div>
            </div>
            <div className="tx-filters-summary">
              <span className="tx-filters-count">{filteredTx.length} transacción{filteredTx.length !== 1 ? 'es' : ''}</span>
              {(selectedAccount !== 'all' || filterType !== 'Todos' || filterCategory !== 'Todas') && (
                <button 
                  className="tx-filters-clear" 
                  onClick={() => { setSelectedAccount('all'); setFilterType('Todos'); setFilterCategory('Todas'); }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Tabla de transacciones */}
          <div className="transactions-table-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.length > 0 ? filteredTx.slice(0, txLimit).map((tx, index) => {
                  const txAccount = accounts.find((a) => a.id === tx.accountId);
                  const txCurrency = txAccount?.currency || 'USD';
                  return (
                    <tr key={tx.id} className="stagger-item" style={{ animationDelay: `${index * 0.05}s` }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="tx-icon-box" style={{ background: TYPE_COLORS[tx.type] + '18', color: TYPE_COLORS[tx.type] }}>
                            {TYPE_ICONS[tx.type]}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{tx.description || '—'}</span>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{formatDate(tx.date)} • {getAccountName(tx.accountId)}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="tx-category-pill">{tx.category}</span></td>
                      <td>
                        <span className="tx-status">
                          <span className="tx-status-dot" style={{ background: tx.type === 'expense' ? '#ffb3af' : '#4edea3' }} />
                          COMPLETADO
                        </span>
                      </td>
                      <td className={`amount-cell ${tx.type === 'income' ? 'amount-income' : tx.type === 'expense' ? 'amount-expense' : 'amount-saving'}`}>
                        {showAmounts ? (
                          <>
                            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                              {tx.type === 'expense' ? '-' : '+'}
                              {formatTableAmount(tx.amount, txCurrency)}
                            </div>
                            {/* Para cryptos: mostrar USD y BS simultáneamente */}
                            {(['BTC', 'ETH', 'SOL', 'USDT', 'USDC'] as CurrencyCode[]).includes(txCurrency) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '2px' }}>
                                {(() => {
                                  const usdPrice = getCryptoUsdPrice(txCurrency);
                                  if (usdPrice) {
                                    const usdAmount = tx.amount * usdPrice;
                                    const bsAmount = convertBetween(tx.amount, txCurrency, 'BS');
                                    return (
                                      <>
                                        <span style={{ fontSize: '10px', color: 'var(--color-prosper-green)', fontWeight: 500 }}>
                                          {tx.type === 'expense' ? '-' : '+'}${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                        </span>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                          ≈ {tx.type === 'expense' ? '-' : '+'}{formatInCurrency(bsAmount, 'BS')}
                                        </span>
                                      </>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                            {/* Para no-cryptos: mostrar conversión a displayCurrency */}
                            {![ 'BTC', 'ETH', 'SOL', 'USDT', 'USDC' ].includes(txCurrency) && txCurrency !== displayCurrency && (
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 400 }}>
                                ≈ {tx.type === 'expense' ? '-' : '+'}
                                {formatInCurrency(convertBetween(tx.amount, txCurrency, displayCurrency), displayCurrency)}
                              </div>
                            )}
                          </>
                        ) : (
                          '••••••'
                        )}
                      </td>
                      <td>
                        <button className="delete-tx-btn" onClick={() => handleDeleteTransaction(tx.id)} title="Eliminar">
                          <IconTrash width={14} />
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5} className="empty-state">No hay transacciones. ¡Agrega tu primera!</td></tr>
                )}
              </tbody>
            </table>
            {filteredTx.length > txLimit && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setTxLimit(prev => prev + 5)}
                >
                  Ver más ({filteredTx.length - txLimit} restantes)
                </button>
              </div>
            )}
          </div>

          {/* Modal Transacción */}
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-content modal-tx" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">Nueva Transacción</h2>
                    <p className="modal-subtitle">Registra un ingreso, gasto o ahorro</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                  {/* Tipo selector visual */}
                  <div className="tx-type-selector">
                    {(['income', 'expense', 'saving'] as const).map(type => (
                      <button
                        key={type}
                        className={`tx-type-btn ${newTx.type === type ? 'active' : ''}`}
                        style={newTx.type === type ? { borderColor: TYPE_COLORS[type], background: TYPE_COLORS[type] + '12' } : {}}
                        onClick={() => {
                          const cats = allCategories[type] || CATEGORIES[type];
                          setNewTx({ ...newTx, type, category: cats[0] });
                        }}
                      >
                        <span className="tx-type-icon">{TYPE_ICONS[type]}</span>
                        <span className="tx-type-label">{TYPE_LABELS[type]}</span>
                      </button>
                    ))}
                  </div>

                  <div className="tx-field">
                    <label className="tx-label">Monto *</label>
                    <div className="tx-input-wrap">
                      <span className="tx-currency">
                        {currencyMap[accounts.find(a => a.id === newTx.accountId)?.currency || displayCurrency].symbol}
                      </span>
                      <input
                        className="tx-input tx-input-amount"
                        type="number"
                        min="0"
                        step={(['BTC','ETH','SOL','USDT','USDC'] as CurrencyCode[]).includes(accounts.find(a => a.id === newTx.accountId)?.currency || displayCurrency) ? '0.00000001' : '0.01'}
                        placeholder="0.00"
                        value={newTx.amount}
                        onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="tx-field-row">
                    <div className="tx-field">
                      <label className="tx-label">Cuenta</label>
                      <CustomSelect
                        value={newTx.accountId}
                        onChange={(val) => setNewTx({ ...newTx, accountId: val })}
                        options={[
                          { value: '', label: 'Sin cuenta', icon: '—' },
                          ...accounts.map((a) => ({ value: a.id, label: a.name, icon: a.icon })),
                        ]}
                        placeholder="Seleccionar..."
                      />
                    </div>
                    <div className="tx-field">
                      <label className="tx-label">Fecha</label>
                      <input
                        className="tx-input tx-input-date"
                        type="date"
                        value={newTx.date}
                        onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="tx-field">
                    <label className="tx-label">Categoría</label>
                    <CustomSelect
                      value={newTx.category}
                      onChange={(val) => setNewTx({ ...newTx, category: val })}
                      options={currentTypeCats.map((c) => ({ value: c, label: c }))}
                      placeholder="Seleccionar..."
                      allowCustom
                      onAddCustom={async (value) => {
                        if (uid) {
                          await addCustomTransactionCategory(uid, value);
                          setCustomTxCategories(prev => [...prev, value]);
                          setAllCategories(prev => ({ ...prev, expense: [...(prev.expense || []), value] }));
                        }
                      }}
                      customPlaceholder="Nombre de la categoría..."
                    />
                  </div>

                  <div className="tx-field">
                    <label className="tx-label">Descripción (opcional)</label>
                    <input
                      className="tx-input"
                      type="text"
                      placeholder="Ej: Pago de nómina mensual"
                      value={newTx.description}
                      onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button className="btn btn-primary btn-tx-submit" onClick={handleAddTransaction} disabled={txLoading || !newTx.amount}>
                    {txLoading ? (
                      <span className="btn-loading">
                        <span className="spinner" /> Guardando...
                      </span>
                    ) : `Registrar ${TYPE_LABELS[newTx.type]}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Transferencia */}
          {showTransferModal && (
            <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">Transferir</h2>
                    <p className="modal-subtitle">Entre tus cuentas</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowTransferModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="tx-field">
                    <label className="tx-label">De</label>
                    <CustomSelect
                      value={transfer.fromAccountId}
                      onChange={(val) => {
                        const oldAcc = accounts.find(a => a.id === transfer.fromAccountId);
                        const newAcc = accounts.find(a => a.id === val);
                        let newAmount = transfer.amount;
                        if (oldAcc && newAcc && transfer.amount) {
                          const amountNum = Number(transfer.amount);
                          if (!isNaN(amountNum) && amountNum > 0) {
                            newAmount = convertBetween(amountNum, oldAcc.currency, newAcc.currency).toFixed(2);
                          }
                        }
                        const nextToId = val === transfer.toAccountId ? '' : transfer.toAccountId;
                        setTransfer({ ...transfer, fromAccountId: val, toAccountId: nextToId, amount: newAmount });
                      }}
                      options={accounts.map((a) => ({ value: a.id, label: `${a.name} (${formatInCurrency(a.balance, a.currency)})`, icon: a.icon }))}
                      placeholder="Cuenta origen..."
                    />
                  </div>
                  <div className="tx-field">
                    <label className="tx-label">A</label>
                    <CustomSelect
                      value={transfer.toAccountId}
                      onChange={(val) => setTransfer({ ...transfer, toAccountId: val })}
                      options={accounts.filter((a) => a.id !== transfer.fromAccountId).map((a) => ({ value: a.id, label: `${a.name} (${formatInCurrency(a.balance, a.currency)})`, icon: a.icon }))}
                      placeholder="Cuenta destino..."
                    />
                  </div>
                  {(() => {
                    const fromAcc = accounts.find(a => a.id === transfer.fromAccountId);
                    const toAcc = accounts.find(a => a.id === transfer.toAccountId);

                    if (fromAcc && toAcc && fromAcc.currency !== toAcc.currency) {
                      return (
                        <>
                          <div className="tx-field">
                            <label className="tx-label">Monto a debitar ({fromAcc.name})</label>
                            <div className="tx-input-wrap">
                              <span className="tx-currency">{currencyMap[fromAcc.currency].symbol}</span>
                              <input
                                className="tx-input tx-input-amount"
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0.00"
                                value={transfer.amount}
                                onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })}
                              />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Saldo disponible: {formatInCurrency(fromAcc.balance, fromAcc.currency)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                            <span style={{ fontSize: '18px', color: 'var(--neon-green)', filter: 'drop-shadow(0 0 4px var(--neon-green))' }}>↓</span>
                          </div>

                          <div className="tx-field">
                            <label className="tx-label">Monto a acreditar ({toAcc.name})</label>
                            <div className="tx-input-wrap" style={{ border: '1px solid var(--neon-green)', boxShadow: '0 0 8px rgba(61, 204, 142, 0.2)' }}>
                              <span className="tx-currency">{currencyMap[toAcc.currency].symbol}</span>
                              <input
                                className="tx-input tx-input-amount"
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0.00"
                                value={transfer.amount ? convertBetween(Number(transfer.amount) || 0, fromAcc.currency, toAcc.currency).toFixed(2) : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val) {
                                    setTransfer({ ...transfer, amount: '' });
                                  } else {
                                    const srcVal = convertBetween(Number(val) || 0, toAcc.currency, fromAcc.currency);
                                    setTransfer({ ...transfer, amount: srcVal.toFixed(2) });
                                  }
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--neon-green)', fontWeight: 500 }}>
                              Tasa BCV en vivo aplicada
                            </span>
                          </div>
                        </>
                      );
                    }

                    return (
                      <div className="tx-field">
                        <label className="tx-label">Monto</label>
                        <div className="tx-input-wrap">
                          <span className="tx-currency">
                            {currencyMap[fromAcc?.currency || displayCurrency].symbol}
                          </span>
                          <input
                            className="tx-input tx-input-amount"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            value={transfer.amount}
                            onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })}
                          />
                        </div>
                        {fromAcc && (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Saldo disponible: {formatInCurrency(fromAcc.balance, fromAcc.currency)}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowTransferModal(false)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={handleTransfer}>Transferir</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Cuenta */}
          {showAccountModal && (
            <div className="modal-overlay" onClick={() => setShowAccountModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">Nueva Cuenta</h2>
                    <p className="modal-subtitle">Corriente, ahorro o efectivo</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowAccountModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="tx-field">
                    <label className="tx-label">Nombre</label>
                    <input className="tx-input" type="text" placeholder="Ej: Cuenta Principal" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} />
                  </div>
                  <div className="tx-field">
                    <label className="tx-label">Tipo</label>
                    <CustomSelect
                      value={newAccount.type}
                      onChange={(val) => setNewAccount({ ...newAccount, type: val as AccountType })}
                      options={[
                        { value: 'digital', label: 'Billetera Digital', icon: '💳' },
                        { value: 'bank', label: 'Banco', icon: '🏦' },
                        { value: 'foreign', label: 'Divisas', icon: '💱' },
                      ]}
                      placeholder="Seleccionar tipo..."
                    />
                  </div>
                  <div className="tx-field">
                    <label className="tx-label">Categoría</label>
                    <CustomSelect
                      value={accountCategory}
                      onChange={(val) => {
                        setAccountCategory(val as 'monedas' | 'criptos');
                        setNewAccount({ ...newAccount, currency: val === 'criptos' ? 'USDT' : 'BS' });
                      }}
                      options={[
                        { value: 'monedas', label: 'Monedas', icon: '💱' },
                        { value: 'criptos', label: 'Criptos', icon: '₿' },
                      ]}
                      placeholder="Seleccionar categoría..."
                    />
                  </div>
                  <div className="tx-field">
                    <label className="tx-label">Moneda</label>
                    <CustomSelect
                      value={newAccount.currency || 'BS'}
                      onChange={(val) => setNewAccount({ ...newAccount, currency: val as CurrencyCode })}
                      options={
                        accountCategory === 'criptos'
                          ? [
                              { value: 'USDT', label: 'Tether (USDT)', icon: '💎' },
                              { value: 'SOL', label: 'Solana (SOL)', icon: '☀️' },
                              { value: 'BTC', label: 'Bitcoin (BTC)', icon: '🟠' },
                              { value: 'USDC', label: 'USD Coin (USDC)', icon: '💠' },
                            ]
                          : [
                              { value: 'BS', label: 'Bolívares (BS)', icon: '🇻🇪' },
                              { value: 'USD', label: 'Dólares (USD)', icon: '🇺🇸' },
                              { value: 'EUR', label: 'Euros (EUR)', icon: '🇪🇺' },
                              { value: 'COP', label: 'Pesos Colombianos (COP)', icon: '🇨🇴' },
                            ]
                      }
                      placeholder="Seleccionar moneda..."
                    />
                  </div>
                  {(newAccount.currency === 'USDT' || newAccount.currency === 'SOL' || newAccount.currency === 'BTC' || newAccount.currency === 'USDC') && (
                    <div className="tx-field">
                      <label className="tx-label">Tasa de conversión</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${newAccount.rateMode !== 'p2p' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setNewAccount({ ...newAccount, rateMode: 'official' })}
                          style={{ flex: 1 }}
                        >
                          Oficial
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${newAccount.rateMode === 'p2p' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setNewAccount({ ...newAccount, rateMode: 'p2p' })}
                          style={{ flex: 1 }}
                        >
                          P2P
                        </button>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                        {newAccount.rateMode === 'p2p' ? 'Usará el precio P2P real para convertir esta cuenta.' : 'Usará la tasa de mercado oficial para convertir esta cuenta.'}
                      </span>
                    </div>
                  )}
                  <div className="tx-field">
                    <label className="tx-label">Balance Inicial</label>
                    <div className="tx-input-wrap">
                      <span className="tx-currency">{currencyMap[newAccount.currency || 'BS'].symbol}</span>
                      <input className="tx-input tx-input-amount" type="number" min="0" step={(['BTC','ETH','SOL','USDT','USDC'] as CurrencyCode[]).includes(newAccount.currency) ? '0.00000001' : '0.01'} placeholder="0.00" value={newAccount.balance || ''} onChange={(e) => setNewAccount({ ...newAccount, balance: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="tx-field">
                    <label className="tx-label">Color (opcional)</label>
                    <div className="color-picker-row">
                      {ACCOUNT_COLORS.map((c) => (
                        <button
                          key={c}
                          className={`color-dot ${newAccount.color === c ? 'active' : ''}`}
                          style={{ background: c }}
                          onClick={() => setNewAccount({ ...newAccount, color: c })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowAccountModal(false)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={handleAddAccount}>Crear Cuenta</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal VEPay - Importar Captura */}
          {showVepayModal && (
            <div className="modal-overlay" onClick={() => { setShowVepayModal(false); setVepayReceipts([]); setVepayPreview(''); }}>
              <div className="modal-content modal-vepay" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">Importar desde Captura</h2>
                    <p className="modal-subtitle">Sube un recibo de pago móvil (Bancamiga, Banesco, BDV, Mercantil, Provincial)</p>
                  </div>
                  <button className="modal-close" onClick={() => { setShowVepayModal(false); setVepayReceipts([]); setVepayPreview(''); }}>✕</button>
                </div>

                {/* Upload area (desktop only) */}
                <div className="vepay-upload-area">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 8 }}>
                    Opción 1: Subir captura (solo funciona en escritorio)
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleVepayUpload}
                    id="vepay-file-input"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="vepay-file-input" className="vepay-upload-label">
                    {vepayProcessing ? (
                      <div className="vepay-uploading">
                        <span className="spinner vepay-spinner" />
                        <span>Procesando captura con OCR...</span>
                      </div>
                    ) : (
                      <>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <span>Seleccionar captura de recibo</span>
                      </>
                    )}
                  </label>
                </div>

                {/* Preview */}
                {vepayPreview && (
                  <div className="vepay-preview">
                    <img src={vepayPreview} alt="Captura" loading="lazy" />
                  </div>
                )}

                {/* Manual text input */}
                <div className="vepay-manual-area" style={{ padding: '0 4px', marginTop: 4 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 6 }}>
                    Opción 2: Pegar el texto del recibo manualmente
                  </div>
                    <textarea
                      className="form-input"
                      rows={6}
                      placeholder="Pega aquí el texto del recibo (pago móvil, transferencia)..."
                      value={vepayManualText}
                      onChange={(e) => setVepayManualText(e.target.value)}
                      style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleVepayManualParse}
                      disabled={vepayManualProcessing || !vepayManualText.trim()}
                      style={{ marginTop: 8, width: '100%' }}
                    >
                      {vepayManualProcessing ? 'Analizando...' : 'Analizar texto'}
                    </button>
                  </div>

                {/* Receipts detected */}
                {vepayReceipts.length > 0 && (
                  <div className="vepay-receipts">
                    <h3 className="vepay-receipts-title">Recibos detectados ({vepayReceipts.length})</h3>
                    {vepayReceipts.map((receipt, idx) => {
                      const key = receipt.transaction_key || String(idx);
                      const override = vepayOverrides[key] || { flow: 'expense', accountId: '', bank: '', date: todayISO() };
                      const tx = mapReceiptToTransaction(receipt, override);
                      const typeColor = tx.type === 'income' ? 'var(--color-prosper-green)' : tx.type === 'expense' ? 'var(--color-error)' : 'var(--color-pine-500)';
                      const typeLabel = tx.type === 'income' ? 'Entrada' : tx.type === 'expense' ? 'Salida' : 'Ahorro';
                      const flowIcon = tx.type === 'income' ? '↓' : '↑';

                      const updateOverride = (updates: Partial<typeof override>) => {
                        setVepayOverrides(prev => ({
                          ...prev,
                          [key]: { ...override, ...updates },
                        }));
                      };

                      return (
                        <div key={key} className="vepay-receipt-card">
                          {/* Flow selector */}
                          <div className="vepay-flow-selector">
                            <button
                              className={`vepay-flow-btn ${override.flow === 'expense' ? 'active-out' : ''}`}
                              onClick={() => updateOverride({ flow: 'expense' })}
                            >
                              ↑ Salida
                            </button>
                            <button
                              className={`vepay-flow-btn ${override.flow === 'income' ? 'active-in' : ''}`}
                              onClick={() => updateOverride({ flow: 'income' })}
                            >
                              ↓ Entrada
                            </button>
                          </div>

                          {/* Account selector */}
                          <div className="vepay-field">
                            <label className="vepay-field-label">Cuenta Prosper</label>
                             <CustomSelect
                               value={override.accountId}
                               onChange={(val) => updateOverride({ accountId: val })}
                               options={[
                                 { value: '', label: 'Seleccionar cuenta...' },
                                 ...accounts.map(acc => ({ value: acc.id, label: `${acc.name} ($${acc.balance.toLocaleString()})`, icon: acc.icon })),
                               ]}
                               placeholder="Seleccionar cuenta..."
                             />
                          </div>

                          {/* Bank selector */}
                          <div className="vepay-field">
                            <label className="vepay-field-label">Banco del pago</label>
                            <CustomSelect
                              value={override.bank || tx.bank}
                              onChange={(val) => updateOverride({ bank: val })}
                              options={[
                                { value: '', label: 'Detectado automáticamente' },
                                ...VEPAY_BANKS.map(b => ({ value: b.value, label: b.label })),
                              ]}
                              placeholder="Seleccionar banco..."
                            />
                          </div>

                          {/* Date selector */}
                          <div className="vepay-field">
                            <label className="vepay-field-label">Fecha de transacción</label>
                            <input
                              className="vepay-select vepay-date-input"
                              type="date"
                              value={override.date}
                              onChange={(e) => updateOverride({ date: e.target.value })}
                            />
                          </div>

                          <div className="vepay-receipt-header">
                            <span className="vepay-bank-badge">{tx.bank}</span>
                            <span className="vepay-type-badge" style={{ background: typeColor + '20', color: typeColor }}>{flowIcon} {typeLabel}</span>
                          </div>
                          <div className="vepay-receipt-amount" style={{ color: typeColor }}>
                            {tx.type === 'expense' ? '-' : '+'}${formatAmount(tx.amount)}
                          </div>
                          <p className="vepay-receipt-concept">{tx.description}</p>
                          <div className="vepay-receipt-details">
                            {receipt.recipient.name && (
                              <div className="vepay-detail-row">
                                <span className="vepay-detail-label">Beneficiario:</span>
                                <span className="vepay-detail-value">{receipt.recipient.name}</span>
                              </div>
                            )}
                            {receipt.origin.account_last_digits && (
                              <div className="vepay-detail-row">
                                <span className="vepay-detail-label">Cuenta origen:</span>
                                <span className="vepay-detail-value">****{receipt.origin.account_last_digits}</span>
                              </div>
                            )}
                            {receipt.recipient.document_id && (
                              <div className="vepay-detail-row">
                                <span className="vepay-detail-label">CI/RIF:</span>
                                <span className="vepay-detail-value">{receipt.recipient.document_id}</span>
                              </div>
                            )}
                          </div>
                          <div className="vepay-receipt-meta">
                            {receipt.payment.reference && <span>Ref: {receipt.payment.reference}</span>}
                            {receipt.payment.date_time.raw && <span>{receipt.payment.date_time.raw}</span>}
                          </div>
                          {!receipt.validation.is_complete && receipt.validation.missing_fields.length > 0 && (
                            <p className="vepay-receipt-warning"> Campos incompletos: {receipt.validation.missing_fields.join(', ')}</p>
                          )}
                          <div className="vepay-receipt-actions">
                            <button className="btn btn-outline btn-sm" onClick={() => handleVepaySkip(receipt)}>Omitir</button>
                            <button className="btn btn-primary btn-sm" onClick={() => handleVepayConfirm(receipt)} disabled={txLoading || !override.accountId}>
                              {txLoading ? <span className="btn-loading"><span className="spinner" /> Guardando...</span> : 'Registrar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Gestión Contable */}
          {showAccountingModal && (
            <div className="modal-overlay" onClick={() => setShowAccountingModal(false)}>
              <div className="modal-content modal-accounting" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">Gestión Contable</h2>
                    <p className="modal-subtitle">Vaciar transacciones y reajustar balances</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowAccountingModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                  {/* Sección: Acciones Globales */}
                  <div className="accounting-section">
                    <h3 className="accounting-section-title"> Acciones Globales</h3>
                    <p className="accounting-section-desc">Afectan a TODAS las cuentas</p>
                    <div className="accounting-actions">
                      <button className="accounting-btn accounting-btn-danger" onClick={handleWipeAllUserTransactions} disabled={accountingLoading}>
                        <span className="accounting-btn-icon">🗑️</span>
                        <div className="accounting-btn-content">
                          <span className="accounting-btn-label">Vaciar TODO</span>
                          <span className="accounting-btn-desc">Elimina todas las transacciones y resetea balances a $0</span>
                        </div>
                      </button>
                      <button className="accounting-btn accounting-btn-warning" onClick={() => handleWipeUserTransactionsByType('income')} disabled={accountingLoading}>
                        <span className="accounting-btn-icon">📥</span>
                        <div className="accounting-btn-content">
                          <span className="accounting-btn-label">Vaciar Ingresos</span>
                          <span className="accounting-btn-desc">Elimina ingresos · Balance se ajusta (-)</span>
                        </div>
                      </button>
                      <button className="accounting-btn accounting-btn-warning" onClick={() => handleWipeUserTransactionsByType('expense')} disabled={accountingLoading}>
                        <span className="accounting-btn-icon">📤</span>
                        <div className="accounting-btn-content">
                          <span className="accounting-btn-label">Vaciar Gastos</span>
                          <span className="accounting-btn-desc">Elimina gastos · Balance se ajusta (+)</span>
                        </div>
                      </button>
                      <button className="accounting-btn accounting-btn-warning" onClick={() => handleWipeUserTransactionsByType('saving')} disabled={accountingLoading}>
                        <span className="accounting-btn-icon">💰</span>
                        <div className="accounting-btn-content">
                          <span className="accounting-btn-label">Vaciar Ahorros</span>
                          <span className="accounting-btn-desc">Elimina ahorros · Balance se ajusta (+)</span>
                        </div>
                      </button>
                      <button className="accounting-btn accounting-btn-info" onClick={handleRecalculateAllBalances} disabled={accountingLoading}>
                        <span className="accounting-btn-icon">🔄</span>
                        <div className="accounting-btn-content">
                          <span className="accounting-btn-label">Recalcular Balances</span>
                          <span className="accounting-btn-desc">Recalcula desde transacciones existentes</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Sección: Por Cuenta */}
                  {accounts.length > 0 && (
                    <div className="accounting-section">
                      <h3 className="accounting-section-title">🏦 Por Cuenta</h3>
                      <p className="accounting-section-desc">Acciones específicas por cuenta</p>
                      <div className="accounting-accounts-list">
                        {accounts.map(acc => (
                          <div key={acc.id} className="accounting-account-card" style={{ borderLeftColor: acc.color }}>
                            <div className="accounting-account-header">
                              <span className="accounting-account-icon" style={{ background: `${acc.color}20` }}>{acc.icon}</span>
                              <div className="accounting-account-info">
                                <span className="accounting-account-name">{acc.name}</span>
                                <span className="accounting-account-balance" style={{ color: acc.color }}>
                                  {showAmounts ? formatInCurrency(acc.balance, acc.currency) : '••••••'}
                                </span>
                              </div>
                            </div>
                            <div className="accounting-account-actions">
                              <button className="accounting-mini-btn accounting-mini-danger" onClick={() => handleWipeAccountTransactions(acc.id, 'all')} disabled={accountingLoading} title="Vaciar toda la cuenta">
                                🗑️ Vaciar
                              </button>
                              <button className="accounting-mini-btn accounting-mini-warning" onClick={() => handleWipeAccountTransactions(acc.id, 'income')} disabled={accountingLoading} title="Vaciar ingresos">
                                📥 Ingresos
                              </button>
                              <button className="accounting-mini-btn accounting-mini-warning" onClick={() => handleWipeAccountTransactions(acc.id, 'expense')} disabled={accountingLoading} title="Vaciar gastos">
                                📤 Gastos
                              </button>
                              <button className="accounting-mini-btn accounting-mini-warning" onClick={() => handleWipeAccountTransactions(acc.id, 'saving')} disabled={accountingLoading} title="Vaciar ahorros">
                                💰 Ahorros
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Info contable */}
                  <div className="accounting-info-box">
                    <span className="accounting-info-icon">💡</span>
                    <div className="accounting-info-text">
                      <strong>Lógica contable:</strong> Al eliminar transacciones, el balance se ajusta automáticamente. Eliminar ingresos resta del balance, eliminar gastos/ahorros suma al balance.
                    </div>
                  </div>

                  {/* Sección: Editar Cuentas */}
                  {accounts.length > 0 && (
                    <div className="accounting-section">
                      <h3 className="accounting-section-title">️ Editar Cuentas</h3>
                      <p className="accounting-section-desc">Cambiar nombre, color, moneda o eliminar</p>
                      <div className="accounting-accounts-list">
                        {accounts.map(acc => (
                          <div key={acc.id} className="accounting-account-card" style={{ borderLeftColor: acc.color }}>
                            <div className="accounting-account-header">
                              <span className="accounting-account-icon" style={{ background: `${acc.color}20` }}>{acc.icon}</span>
                              <div className="accounting-account-info">
                                <span className="accounting-account-name">{acc.name}</span>
                                <span className="accounting-account-balance" style={{ color: acc.color }}>
                                  {showAmounts ? formatInCurrency(acc.balance, acc.currency) : '••••••'}
                                </span>
                              </div>
                            </div>
                            <div className="accounting-account-actions">
                              <button className="accounting-mini-btn accounting-mini-info" onClick={() => { openEditAccount(acc); setShowAccountingModal(false); }} title="Editar nombre/color">
                                ✏️ Editar
                              </button>
                              <button className="accounting-mini-btn accounting-mini-danger" onClick={() => handleDeleteAccount(acc.id)} title="Eliminar cuenta">
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowAccountingModal(false)}>Cerrar</button>
                </div>
              </div>
            </div>
          )}

          <ConfirmDialog
            isOpen={confirmState.isOpen}
            title={confirmState.title}
            message={confirmState.message}
            variant={confirmState.variant}
            confirmText={confirmState.confirmText || 'Confirmar'}
            onConfirm={confirmState.onConfirm}
            onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
          />
        </div>

        <style>{`
          .finanzas-page { padding: 0; }
          .btn-toggle-label { display: none; }
          .page-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
          .btn-danger-outline { color: var(--color-error) !important; border-color: var(--color-error) !important; }
          .btn-danger-outline:hover { background: var(--color-error) !important; color: white !important; }
          .btn-toggle-visibility { gap: 4px; }

          /* Type selector in modal */
          .tx-type-selector { display: flex; gap: 8px; margin-bottom: 4px; }
          .tx-type-btn {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 12px 8px;
            border-radius: 10px;
            border: 2px solid var(--border-default);
            background: var(--bg-input);
            cursor: pointer;
            transition: all 0.2s;
          }
          .tx-type-btn:hover { border-color: var(--color-prosper-green); }
          .tx-type-btn.active { font-weight: 600; }
          .tx-type-icon { font-size: 1.25rem; }
          .tx-type-label { font-size: 0.6875rem; color: var(--text-secondary); }
          .tx-type-btn.active .tx-type-label { color: var(--text-primary); }

          /* Fields */
          .tx-field { display: flex; flex-direction: column; gap: 6px; }
          .tx-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .tx-label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary); }
          .color-picker-row { display: flex; gap: 8px; flex-wrap: wrap; }
          .color-dot { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: all var(--transition-fast); }
          .color-dot:hover { transform: scale(1.15); }
          .color-dot.active { border-color: var(--text-primary); box-shadow: 0 0 8px rgba(255,255,255,0.3); }
          .tx-input {
            width: 100%;
            padding: 10px 14px;
            border-radius: 10px;
            border: 1px solid var(--border-default);
            background: var(--bg-input);
            color: var(--text-primary);
            font-size: 0.875rem;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
            font-family: inherit;
            box-sizing: border-box;
          }
          .tx-input:focus { border-color: var(--color-prosper-green); box-shadow: 0 0 0 3px rgba(61,204,142,0.12); }
          .tx-input-amount { font-size: 1.25rem; font-weight: 700; padding-left: 28px; }
          .tx-input-date { cursor: pointer; }
          .tx-input-wrap { position: relative; }
          .tx-currency { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 0.875rem; font-weight: 600; color: var(--text-tertiary); pointer-events: none; }

          /* Modal subtitle */
          .modal-subtitle { font-size: 0.75rem; color: var(--text-tertiary); margin: 2px 0 0 0; }

          /* Submit button */
          .btn-tx-submit { min-width: 160px; justify-content: center; }
          .btn-loading { display: flex; align-items: center; gap: 8px; }
          .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }

          /* Delete tx button */
          .delete-tx-btn {
            background: none;
            border: none;
            color: var(--text-tertiary);
            cursor: pointer;
            padding: 6px;
            border-radius: 6px;
            display: flex;
            transition: all 0.15s;
          }
          .delete-tx-btn:hover { color: var(--color-error); background: rgba(239,68,68,0.1); }

          /* Accounts Section with Groups */
          .accounts-section { margin-bottom: 24px; }
          .accounts-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
          .accounts-section-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
          .account-group { margin-bottom: 20px; }
          .account-group:last-child { margin-bottom: 0; }
          .account-group-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding: 6px 4px; border-radius: 8px; transition: background 0.15s; }
          .account-group-header:hover { background: var(--bg-input); }
          .account-group-title { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.04em; user-select: none; }
          .account-group-chevron { font-size: 0.625rem; color: var(--text-tertiary); width: 12px; text-align: center; transition: transform 0.2s; }
          .account-group-dot { width: 8px; height: 8px; border-radius: 50%; }
          .account-group-count { font-size: 0.625rem; font-weight: 600; color: var(--text-tertiary); background: var(--bg-input); padding: 2px 8px; border-radius: var(--radius-full); }
          .account-group-actions { display: flex; gap: 4px; }
          .account-group-btn { background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px; border-radius: 6px; font-size: 0.75rem; transition: all 0.15s; }
          .account-group-btn:hover { background: var(--bg-input); color: var(--text-primary); }
          .accounts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
          .account-card { background: var(--bg-card); border: 1px solid var(--border-default); border-left: 4px solid; border-radius: var(--radius-lg); padding: 16px; transition: all var(--transition-fast); }
          .account-card:hover { box-shadow: var(--shadow-sm); transform: translateY(-2px); }
          .account-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
          .account-icon { width: 36px; height: 36px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 1.125rem; }
          .account-info { flex: 1; }
          .account-name { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); display: block; }
          .account-type { font-size: 0.6875rem; color: var(--text-tertiary); text-transform: capitalize; }
          .account-actions-group { display: flex; gap: 2px; align-items: center; }
          .account-action { background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px; border-radius: 50%; display: flex; transition: all var(--transition-fast); }
          .account-action:hover { color: var(--color-gold-500); background: rgba(245,158,11,0.1); }
          .account-balance { font-size: 1.375rem; font-weight: 800; }
          .empty-accounts { text-align: center; padding: 24px; color: var(--text-secondary); font-size: 0.875rem; grid-column: 1 / -1; }

          /* Group Assign Modal */
          .group-assign-list { display: flex; flex-direction: column; gap: 4px; }
          .group-assign-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-default); cursor: pointer; transition: all 0.15s; font-family: inherit; width: 100%; }
          .group-assign-item:hover { border-color: var(--color-prosper-green); background: rgba(61,204,142,0.06); }
          .group-assign-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
          .group-assign-name { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }

          /* Rates Tables */
          .rates-tables-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; align-items: start; }
          .rates-table-container { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }
          .rates-table-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: linear-gradient(180deg, rgba(255,255,255,0.03), var(--bg-input)); border-bottom: 1px solid var(--border-default); }
          .rates-table-header-left { display: flex; align-items: center; gap: 12px; }
          .rates-table-icon { font-size: 1.25rem; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(61,204,142,0.08); border-radius: 10px; }
          .rates-table-title { display: block; font-size: 0.875rem; font-weight: 700; color: var(--text-primary); line-height: 1.3; }
          .rates-table-subtitle { display: block; font-size: 0.6875rem; color: var(--text-tertiary); font-weight: 500; line-height: 1.3; }

          .rates-list { display: flex; flex-direction: column; }
          .rates-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--border-default); transition: background 0.15s ease; min-height: 56px; }
          .rates-row:last-child { border-bottom: none; }
          .rates-row:hover { background: var(--bg-input); }
          .rates-row-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex-shrink: 0; }
          .rates-row-flag { font-size: 1.25rem; flex-shrink: 0; }
          .rates-row-info { display: flex; flex-direction: column; gap: 1px; }
          .rates-row-code { font-weight: 700; font-size: 0.8125rem; color: var(--text-primary); }
          .rates-row-name { font-size: 0.6875rem; color: var(--text-tertiary); font-weight: 500; }
          .rates-row-value { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-weight: 600; color: var(--color-prosper-green); font-size: 0.875rem; white-space: nowrap; flex-shrink: 0; }
          .rates-row-values { display: flex; align-items: center; gap: 20px; flex-shrink: 0; }
          .rates-row-val { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-weight: 600; font-size: 0.8125rem; white-space: nowrap; min-width: 70px; text-align: right; }
          .rates-usd-val { color: #3B82F6; font-weight: 700; font-size: 0.875rem; }
          .rates-bs-official { color: var(--color-prosper-green); }
          .rates-bs-p2p { color: var(--text-tertiary); font-size: 0.6875rem; font-weight: 500; }

          /* Summary (legacy) */
          .summary-section { position: relative; margin-bottom: 32px; }
          .chart-wrapper { margin-bottom: 24px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
          .summary-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 4px; }
          .summary-label { font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; }
          .summary-value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
          .summary-alt { font-size: 0.75rem; color: var(--text-secondary); opacity: 0.8; margin-top: 2px; }
          .conversion-toggle { position: absolute; top: 0; right: 0; padding: 6px 12px; font-size: 11px; font-weight: 500; color: var(--text-secondary); background: var(--bg-input); border: 1px solid var(--border-default); border-radius: var(--radius-md); cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all var(--transition-fast); margin-bottom: 8px; }
          .conversion-toggle.active { color: var(--color-prosper-green); background: rgba(61,204,142,0.1); border-color: var(--color-prosper-green); }
          .summary-income { border-left: 4px solid var(--color-prosper-green); }
          .summary-expense { border-left: 4px solid var(--color-error); }
          .summary-saving { border-left: 4px solid var(--color-pine-500); }
          .summary-balance { border-left: 4px solid var(--color-gold-500); }

          /* Transaction Filters - Compact Visual Design */
          .tx-filters { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 20px; }
          .tx-filters-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
          .tx-filter-group { display: flex; flex-direction: column; gap: 6px; min-width: 140px; }
          .tx-filter-group-wide { flex: 1; min-width: 200px; }
          .tx-filter-label { font-size: 0.625rem; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.06em; }
          .tx-filter-pills { display: flex; gap: 4px; }
          .tx-filter-pill {
            padding: 8px 14px; border-radius: var(--radius-full);
            background: var(--bg-input); border: 1px solid var(--border-default);
            color: var(--text-secondary); font-size: 0.875rem;
            font-weight: 600; cursor: pointer; transition: all 0.15s ease;
            font-family: inherit;
          }
          .tx-filter-pill:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .tx-filter-pill.active { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .tx-filters-summary { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-default); }
          .tx-filters-count { font-size: 0.75rem; color: var(--text-secondary); font-weight: 500; }
          .tx-filters-clear { background: none; border: none; color: var(--color-prosper-green); font-size: 0.75rem; font-weight: 600; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.15s; }
          .tx-filters-clear:hover { background: rgba(61,204,142,0.1); }

          /* Rates Section - Collapsible */
          .rates-section { margin-bottom: 20px; }
          .rates-section-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 14px 18px; background: var(--bg-card);
            border: 1px solid var(--border-default); border-radius: var(--radius-lg);
            cursor: pointer; transition: all 0.15s ease; user-select: none;
          }
          .rates-section-header:hover { border-color: rgba(61,204,142,0.3); }
          .rates-section-header-left { display: flex; align-items: center; gap: 12px; }
          .rates-section-icon { font-size: 1.25rem; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(61,204,142,0.08); border-radius: 10px; }
          .rates-section-title { display: block; font-size: 0.875rem; font-weight: 700; color: var(--text-primary); line-height: 1.3; }
          .rates-section-subtitle { display: block; font-size: 0.6875rem; color: var(--text-tertiary); font-weight: 500; line-height: 1.3; }

          /* Table */
          .transactions-table-wrapper { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .transactions-table { width: 100%; border-collapse: collapse; }
          .transactions-table th { text-align: left; padding: 12px 16px; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); background: var(--bg-input); border-bottom: 1px solid var(--border-default); }
          .transactions-table td { padding: 12px 16px; font-size: 0.8125rem; color: var(--text-primary); border-bottom: 1px solid var(--border-default); }
          .transactions-table tr:last-child td { border-bottom: none; }
          .transactions-table tr:hover { background: var(--bg-input); }
          .type-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-full); font-size: 0.6875rem; font-weight: 600; }
          .account-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-full); font-size: 0.6875rem; font-weight: 600; background: var(--bg-input); color: var(--text-secondary); }
          .amount-cell { font-weight: 700; }
          .amount-income { color: var(--color-prosper-green); }
          .amount-expense { color: var(--color-error); }
          .amount-saving { color: var(--color-pine-500); }

          /* Tabla premium */
          .tx-icon-box {
            width: 38px; height: 38px;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.125rem;
            flex-shrink: 0;
          }
          .tx-category-pill {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            background: rgba(255,255,255,0.06);
            color: var(--text-secondary);
            font-size: 0.6875rem;
            font-weight: 600;
          }
          .tx-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.6875rem;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: var(--text-secondary);
          }
          .tx-status-dot {
            width: 6px; height: 6px;
            border-radius: 50%;
          }

          .empty-state { text-align: center; padding: 32px; color: var(--text-secondary); }

           /* Modal */
           .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px); -webkit-tap-highlight-color: transparent; }
           .modal-content { background: #ffffff; border: 1px solid var(--border-default); border-radius: var(--radius-xl); width: 92%; max-width: 440px; padding: 24px; max-height: 90vh; display: flex; flex-direction: column; animation: modalIn 0.25s ease; }
           .modal-body { flex: 1; overflow-y: auto; padding: 0; margin: 16px 0; }
          [data-theme="dark"] .modal-content { background: #0a1628; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6); }
          [data-theme="amoled"] .modal-content { background: #0a0a0a; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9); }
          .modal-tx { max-width: 480px; }
          @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: none; } }
          .modal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
          .modal-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }
          .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.25rem; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; padding: 8px; border-radius: 8px; transition: background 0.15s; }
          .modal-close:hover { background: var(--bg-input); }
          .modal-body { display: flex; flex-direction: column; gap: 16px; }
          .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

          /* Buttons */
          .btn { padding: 10px 18px; border-radius: var(--radius-md); font-size: 0.8125rem; font-weight: 600; cursor: pointer; border: none; display: flex; align-items: center; gap: 6px; transition: all 0.2s; white-space: nowrap; }
          .btn-primary { background: var(--color-prosper-green); color: white; }
          .btn-primary:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
          .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
          .btn-outline { background: transparent; border: 1px solid var(--border-default); color: var(--text-primary); }
          .btn-outline:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .btn-vepay { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .btn-vepay:hover { background: var(--color-prosper-green); color: white; }
          .btn-vepay-label { display: none; }
          .btn-p2p-active { border-color: #4edea3 !important; background: rgba(78,222,163,0.12) !important; color: #4edea3 !important; }
          .btn-p2p-idle { border-color: rgba(78,222,163,0.4) !important; color: #4edea3 !important; }
          .btn-p2p-idle:hover { background: rgba(78,222,163,0.08) !important; }
          .btn-sm { padding: 8px 14px; font-size: 0.75rem; }
          .btn-p2p-toggle { display: inline-flex; border-radius: 8px; border: 1px solid var(--border-default); overflow: hidden; font-size: 0.8125rem; font-weight: 600; }
          .btn-p2p-toggle button { padding: 6px 12px; border: none; background: transparent; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; font-size: inherit; font-weight: inherit; font-family: inherit; }
          .btn-p2p-toggle button.active:first-child { background: var(--color-prosper-green); color: #fff; }
          .btn-p2p-toggle button.active:last-child { background: #4edea3; color: #003824; }

          /* VEPay Modal */
          .modal-vepay { max-width: 520px; }
          .vepay-upload-area {
            border: 2px dashed var(--border-default);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            transition: border-color 0.2s;
            margin-bottom: 16px;
          }
          .vepay-upload-area:hover { border-color: var(--color-prosper-green); }
          .vepay-upload-label {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            color: var(--text-secondary);
            font-size: 0.8125rem;
            font-weight: 500;
          }
          .vepay-upload-label svg { color: var(--text-tertiary); }
          .vepay-uploading { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--color-prosper-green); }
          .vepay-spinner { width: 24px; height: 24px; border-width: 3px; border-color: rgba(61,204,142,0.2); border-top-color: var(--color-prosper-green); }
          .vepay-preview { margin-bottom: 16px; border-radius: 8px; overflow: hidden; max-height: 200px; }
          .vepay-preview img { width: 100%; height: 100%; object-fit: contain; display: block; }
          .vepay-receipts { display: flex; flex-direction: column; gap: 12px; }
          .vepay-receipts-title { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; }
          .vepay-receipt-card {
            background: var(--bg-input);
            border: 1px solid var(--border-default);
            border-radius: 10px;
            padding: 14px;
          }
          .vepay-receipt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          .vepay-bank-badge {
            padding: 3px 10px;
            border-radius: 6px;
            background: var(--bg-card);
            font-size: 0.6875rem;
            font-weight: 700;
            color: var(--text-primary);
            text-transform: capitalize;
          }
          .vepay-type-badge { padding: 3px 8px; border-radius: 6px; font-size: 0.625rem; font-weight: 700; }
          .vepay-receipt-amount { font-size: 1.375rem; font-weight: 800; margin-bottom: 6px; }
          .vepay-receipt-concept { font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 8px 0; line-height: 1.4; }
          .vepay-receipt-meta { display: flex; gap: 12px; font-size: 0.625rem; color: var(--text-tertiary); margin-bottom: 8px; }
          .vepay-receipt-warning { font-size: 0.6875rem; color: var(--color-gold-500); margin: 0 0 8px 0; }
          .vepay-receipt-actions { display: flex; gap: 8px; justify-content: flex-end; }
          .vepay-receipt-details { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; padding: 8px 10px; background: var(--bg-card); border-radius: 8px; }
          .vepay-detail-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.6875rem; }
          .vepay-detail-label { color: var(--text-tertiary); font-weight: 600; }
          .vepay-detail-value { color: var(--text-primary); font-weight: 700; }
          .vepay-flow-selector { display: flex; gap: 8px; margin-bottom: 12px; }
          .vepay-flow-btn {
            flex: 1;
            padding: 10px;
            border-radius: 8px;
            border: 2px solid var(--border-default);
            background: var(--bg-input);
            color: var(--text-secondary);
            font-size: 0.8125rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
          }
          .vepay-flow-btn:hover { border-color: var(--color-prosper-green); }
          .vepay-flow-btn.active-out { border-color: var(--color-error); background: rgba(239,68,68,0.1); color: var(--color-error); }
          .vepay-flow-btn.active-in { border-color: var(--color-prosper-green); background: rgba(61,204,142,0.1); color: var(--color-prosper-green); }
          .vepay-field { margin-bottom: 10px; }
          .vepay-field-label { display: block; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary); margin-bottom: 4px; }
          .vepay-select {
            width: 100%;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid var(--border-default);
            background: var(--bg-input);
            color: var(--text-primary);
            font-size: 0.8125rem;
            outline: none;
            cursor: pointer;
          }
          .vepay-select:focus { border-color: var(--color-prosper-green); }
          .vepay-date-input { cursor: pointer; }

          /* Gestión Contable Modal */
          .btn-accounting { border-color: var(--color-gold-500); color: var(--color-gold-500); }
          .btn-accounting:hover { background: var(--color-gold-500); color: white; }
          .btn-accounting-label { display: none; }
          .modal-accounting { max-width: 600px; }

          .accounting-section { margin-bottom: 20px; }
          .accounting-section:last-child { margin-bottom: 0; }
          .accounting-section-title { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; }
          .accounting-section-desc { font-size: 0.6875rem; color: var(--text-tertiary); margin: 0 0 12px 0; }

          .accounting-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .accounting-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid var(--border-default);
            background: var(--bg-input);
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            width: 100%;
          }
          .accounting-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--shadow-sm); }
          .accounting-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .accounting-btn-icon { font-size: 1.125rem; flex-shrink: 0; }
          .accounting-btn-content { flex: 1; min-width: 0; }
          .accounting-btn-label { display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-primary); }
          .accounting-btn-desc { display: block; font-size: 0.625rem; color: var(--text-tertiary); margin-top: 2px; line-height: 1.3; }

          .accounting-btn-danger { border-color: var(--color-error); }
          .accounting-btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.1); border-color: var(--color-error); }
          .accounting-btn-danger .accounting-btn-label { color: var(--color-error); }

          .accounting-btn-warning { border-color: var(--color-gold-500); }
          .accounting-btn-warning:hover:not(:disabled) { background: rgba(245,158,11,0.1); border-color: var(--color-gold-500); }
          .accounting-btn-warning .accounting-btn-label { color: var(--color-gold-500); }

          .accounting-btn-info { border-color: var(--color-blue-500); }
          .accounting-btn-info:hover:not(:disabled) { background: rgba(59,130,246,0.1); border-color: var(--color-blue-500); }
          .accounting-btn-info .accounting-btn-label { color: var(--color-blue-500); }

          .accounting-accounts-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .accounting-account-card {
            background: var(--bg-input);
            border: 1px solid var(--border-default);
            border-left: 4px solid;
            border-radius: 10px;
            padding: 10px;
          }
          .accounting-account-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
          .accounting-account-icon { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; }
          .accounting-account-info { flex: 1; min-width: 0; }
          .accounting-account-name { display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .accounting-account-balance { display: block; font-size: 0.8125rem; font-weight: 800; }
          .accounting-account-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
          .accounting-mini-btn {
            padding: 5px 6px;
            border-radius: 6px;
            border: 1px solid var(--border-default);
            background: var(--bg-card);
            font-size: 0.625rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
            color: var(--text-secondary);
            text-align: center;
          }
          .accounting-mini-btn:hover:not(:disabled) { transform: translateY(-1px); }
          .accounting-mini-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .accounting-mini-danger:hover:not(:disabled) { border-color: var(--color-error); color: var(--color-error); background: rgba(239,68,68,0.1); }
          .accounting-mini-warning:hover:not(:disabled) { border-color: var(--color-gold-500); color: var(--color-gold-500); background: rgba(245,158,11,0.1); }
          .accounting-mini-info:hover:not(:disabled) { border-color: var(--color-prosper-green); color: var(--color-prosper-green); background: rgba(61,204,142,0.1); }

          .accounting-info-box {
            display: flex;
            gap: 10px;
            padding: 12px;
            border-radius: 10px;
            background: rgba(61,204,142,0.08);
            border: 1px solid rgba(61,204,142,0.2);
            margin-top: 16px;
          }
          .accounting-info-icon { font-size: 1.25rem; flex-shrink: 0; }
          .accounting-info-text { font-size: 0.75rem; color: var(--text-secondary); line-height: 1.5; }
          .accounting-info-text strong { color: var(--text-primary); }

          /* Responsive */
          @media (max-width: 1024px) {
            .accounts-grid { grid-template-columns: repeat(2, 1fr); }
            .summary-grid { grid-template-columns: repeat(2, 1fr); }
            .rates-tables-wrapper { grid-template-columns: 1fr 1fr; gap: 12px; }
            .rates-row { padding: 12px 14px; min-height: 52px; }
            .rates-row-value { font-size: 0.8125rem; }
            .rates-row-val { font-size: 0.75rem; min-width: 60px; }
            .rates-row-values { gap: 12px; }
            .rates-table-header { padding: 12px 14px; }
            .page-header-actions { flex-wrap: wrap; }
            .page-header-actions .btn { flex: 1; min-width: 140px; }
          }
          @media (max-width: 768px) {
            .page-header { flex-direction: column; align-items: stretch; gap: 12px; }
            .page-header-left { text-align: center; }
            .page-title { font-size: 1.375rem; }
            .page-subtitle { font-size: 0.8125rem; }
            /* Hide desktop buttons on mobile - use FAB instead */
            .desktop-only-actions { display: none !important; }
            .btn-toggle-label { display: inline; }
            .btn-vepay-label { display: inline; }
            .btn-accounting-label { display: inline; }
            .modal-accounting { max-width: none; }
            .accounting-actions { grid-template-columns: 1fr 1fr; }
            .accounting-accounts-list { grid-template-columns: 1fr 1fr; }
            .accounting-account-actions { grid-template-columns: repeat(4, 1fr); }
            .accounting-btn { padding: 8px 10px; gap: 8px; }
            .accounting-btn-icon { font-size: 1rem; }
            .accounting-btn-label { font-size: 0.6875rem; }
            .accounting-btn-desc { font-size: 0.5625rem; }
            .accounting-account-card { padding: 8px; }
            .accounting-mini-btn { padding: 4px 4px; font-size: 0.5625rem; }
            /* Force rates tables to show on mobile */
            .rates-tables-wrapper { display: grid !important; grid-template-columns: 1fr !important; gap: 12px !important; margin-bottom: 20px !important; visibility: visible !important; }
            .rates-table-container { display: block !important; visibility: visible !important; }
            .rates-section-header { padding: 12px 14px; }
            .rates-row { padding: 12px 14px; min-height: 52px; }
            .tx-filters { padding: 12px; }
            .tx-filters-row { flex-direction: column; align-items: stretch; gap: 10px; }
            .tx-filter-group { min-width: 0; }
            .tx-filter-group-wide { min-width: 0; }
            .tx-filter-pills { justify-content: center; }
            .tx-filters-summary { margin-top: 10px; padding-top: 10px; }
            .rates-row-value { font-size: 0.8125rem; }
            .rates-row-val { font-size: 0.75rem; min-width: 60px; }
            .rates-row-values { gap: 14px; }
            .rates-table-header { padding: 12px 14px; }
            .rates-table-icon { width: 32px; height: 32px; font-size: 1.125rem; }
            .summary-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .summary-card { padding: 12px; }
            .summary-section { margin-bottom: 24px; }
            .chart-wrapper { margin-bottom: 20px; }
            .summary-value { font-size: 1.25rem; }
            .summary-alt { font-size: 0.6875rem; }
            .conversion-toggle { font-size: 10px; padding: 4px 8px; }
            .accounts-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
            .account-card { padding: 12px; }
            .account-balance { font-size: 1.125rem; }
            .filter-bar { flex-direction: column; align-items: stretch; gap: 8px; }
            .filter-bar > .custom-select-wrapper { width: 100%; }
            .transactions-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 10px; border: 1px solid var(--border-default); }
            .transactions-table { min-width: 600px; font-size: 0.8125rem; }
            .transactions-table th { padding: 10px 8px; font-size: 0.6875rem; }
            .transactions-table td { padding: 10px 8px; }
            .modal-content { width: 96%; max-width: none; padding: 20px 16px; max-height: 92vh; }
            .modal-tx { max-width: none; }
            .modal-footer { flex-direction: column-reverse; gap: 8px; }
            .modal-footer .btn { width: 100%; justify-content: center; padding: 14px; }
            .tx-type-selector { gap: 6px; }
            .tx-type-btn { padding: 10px 6px; }
            .tx-field-row { grid-template-columns: 1fr; }
            .modal-vepay { max-width: none; }
            .vepay-upload-area { padding: 20px 16px; }
            .vepay-receipt-card { padding: 12px; }
          }
          @media (max-width: 480px) {
            .desktop-only-actions { display: none !important; }
            .page-header-actions { grid-template-columns: 1fr; }
            .page-header-actions .btn-primary { grid-column: auto; }
            .tx-filters { padding: 10px; border-radius: 10px; }
            .tx-filter-pill { padding: 6px 10px; font-size: 0.8125rem; }
            .rates-section-header { padding: 10px 12px; }
            .rates-section-icon { width: 32px; height: 32px; font-size: 1.125rem; }
            .page-title { font-size: 1.25rem; }
            .summary-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
            .summary-card { padding: 10px 8px; }
            .summary-section { margin-bottom: 20px; }
            .chart-wrapper { margin-bottom: 16px; }
            .summary-label { font-size: 0.625rem; }
            .summary-value { font-size: 1.125rem; }
            .summary-alt { font-size: 0.625rem; }
            .conversion-toggle { font-size: 9px; padding: 4px 6px; }
            .accounts-grid { grid-template-columns: 1fr; gap: 8px; }
            .account-card { padding: 10px; }
            .account-icon { width: 32px; height: 32px; font-size: 1rem; }
            .account-name { font-size: 0.8125rem; }
            .account-balance { font-size: 1rem; }
            .page-header-actions .btn { font-size: 0.75rem; padding: 10px 12px; }
            .modal-content { max-height: 96vh; padding: 16px 12px; border-radius: 12px; }
            .modal-title { font-size: 1rem; }
            .modal-subtitle { font-size: 0.6875rem; }
            .tx-type-icon { font-size: 1rem; }
            .tx-type-label { font-size: 0.625rem; }
            .tx-input-amount { font-size: 1.125rem; }
            .vepay-flow-selector { gap: 6px; }
            .vepay-flow-btn { padding: 8px; font-size: 0.75rem; }
            .vepay-receipt-amount { font-size: 1.25rem; }
            .vepay-receipt-actions { flex-direction: column; }
            .vepay-receipt-actions .btn { width: 100%; justify-content: center; }
            .accounting-actions { grid-template-columns: 1fr 1fr; }
            .accounting-accounts-list { grid-template-columns: 1fr 1fr; }
            .accounting-account-actions { grid-template-columns: repeat(4, 1fr); }
            .accounting-btn { padding: 6px 8px; gap: 6px; }
            .accounting-btn-icon { font-size: 0.875rem; }
            .accounting-btn-label { font-size: 0.625rem; }
            .accounting-btn-desc { font-size: 0.5rem; }
            .accounting-account-card { padding: 6px; }
            .accounting-account-icon { width: 24px; height: 24px; font-size: 0.75rem; }
            .accounting-account-name { font-size: 0.6875rem; }
            .accounting-account-balance { font-size: 0.75rem; }
            .accounting-mini-btn { padding: 3px 2px; font-size: 0.5rem; }
            .accounting-info-box { padding: 8px; gap: 8px; }
            .accounting-info-icon { font-size: 1rem; }
            .accounting-info-text { font-size: 0.625rem; }
          }
          @media (max-width: 360px) {
            .page-title { font-size: 1.125rem; }
            .summary-value { font-size: 1rem; }
            .account-balance { font-size: 0.9375rem; }
            .transactions-table { min-width: 550px; font-size: 0.75rem; }
            .modal-content { padding: 14px 10px; }
          }

          /* Mobile FAB - Always fixed bottom-right */
          .mobile-fab-container {
            display: none;
          }
          .mobile-fab-backdrop {
            display: none;
          }
          @media (max-width: 768px) {
            .mobile-fab-container {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              position: fixed;
              bottom: 20px;
              right: 20px;
              z-index: 9999;
            }
            .mobile-fab-main {
              width: 56px;
              height: 56px;
              border-radius: 16px;
              background: var(--color-prosper-green);
              color: white;
              border: none;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: 0 4px 20px rgba(61,204,142,0.5), 0 0 0 4px rgba(61,204,142,0.15);
              transition: all 0.2s ease;
            }
            .mobile-fab-main:active {
              transform: scale(0.92);
            }
            .mobile-fab-menu {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 8px;
              margin-bottom: 12px;
              opacity: 0;
              transform: translateY(16px) scale(0.95);
              pointer-events: none;
              transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .mobile-fab-container.open .mobile-fab-menu {
              opacity: 1;
              transform: translateY(0) scale(1);
              pointer-events: auto;
            }
            .mobile-fab-item {
              display: flex;
              align-items: center;
              gap: 10px;
              background: var(--bg-card);
              border: 1px solid var(--border-default);
              border-radius: 999px;
              padding: 10px 16px 10px 12px;
              font-size: 0.875rem;
              font-weight: 600;
              color: var(--text-primary);
              cursor: pointer;
              white-space: nowrap;
              box-shadow: 0 4px 16px rgba(0,0,0,0.2);
              transition: all 0.15s ease;
              font-family: inherit;
            }
            .mobile-fab-item:active {
              transform: scale(0.95);
            }
            .mobile-fab-item:hover {
              border-color: var(--color-prosper-green);
            }
            .mobile-fab-item-danger {
              color: var(--color-error);
              border-color: rgba(239,68,68,0.3);
            }
            .mobile-fab-item-danger:hover {
              border-color: var(--color-error);
              background: rgba(239,68,68,0.08);
            }
            .mobile-fab-icon {
              font-size: 1.125rem;
            }
            .mobile-fab-label {
              font-size: 0.8125rem;
            }
            .mobile-fab-backdrop {
              display: block;
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.4);
              z-index: 9998;
              backdrop-filter: blur(2px);
              animation: fadeIn 0.2s ease;
              touch-action: none;
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          }
        `}</style>

        {/* Mobile FAB - Fixed at bottom of page */}
        <div className={`mobile-fab-container ${fabOpen ? 'open' : ''}`}>
          <div className="mobile-fab-menu">
            <button className="mobile-fab-item" onClick={() => { setFabOpen(false); setShowModal(true); }}>
              <span className="mobile-fab-icon">💸</span>
              <span className="mobile-fab-label">Nueva Transacción</span>
            </button>
            <button className="mobile-fab-item" onClick={() => { setFabOpen(false); setShowAccountModal(true); }}>
              <span className="mobile-fab-icon">💳</span>
              <span className="mobile-fab-label">Nueva Cuenta</span>
            </button>
            <button className="mobile-fab-item" onClick={() => { setFabOpen(false); setShowTransferModal(true); }}>
              <span className="mobile-fab-icon">🔄</span>
              <span className="mobile-fab-label">Transferir</span>
            </button>
            <button className="mobile-fab-item" onClick={() => { setFabOpen(false); setShowVepayModal(true); }}>
              <span className="mobile-fab-icon">📷</span>
              <span className="mobile-fab-label">Importar Captura</span>
            </button>
            <button className="mobile-fab-item" onClick={() => { setFabOpen(false); setShowAccountingModal(true); }}>
              <span className="mobile-fab-icon">📊</span>
              <span className="mobile-fab-label">Gestión Contable</span>
            </button>
            <button className="mobile-fab-item" onClick={() => { setFabOpen(false); toggleShowAmounts(); }}>
              <span className="mobile-fab-icon">{showAmounts ? '🙈' : '👁️'}</span>
              <span className="mobile-fab-label">{showAmounts ? 'Ocultar Saldos' : 'Mostrar Saldos'}</span>
            </button>
            <button className="mobile-fab-item" onClick={() => { setFabOpen(false); setP2pMode(!p2pMode); }}>
              <span className="mobile-fab-icon">💱</span>
              <span className="mobile-fab-label">Modo {p2pMode ? 'P2P' : 'Oficial'}</span>
            </button>
            <button className="mobile-fab-item mobile-fab-item-danger" onClick={() => { setFabOpen(false); handleClearAllHistory(); }}>
              <span className="mobile-fab-icon">🗑️</span>
              <span className="mobile-fab-label">Borrar Historial</span>
            </button>
          </div>
          <button className="mobile-fab-main" onClick={() => setFabOpen(!fabOpen)} aria-label="Acciones">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        {fabOpen && <div className="mobile-fab-backdrop" onClick={() => setFabOpen(false)} />}
      </DashboardLayout>
    </ProtectedRoute>
  );
});
export default FinanzasPage;
