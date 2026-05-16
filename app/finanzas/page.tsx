'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/app/components/Toast';
import { ConfirmDialog } from '@/app/components/Toast';
import { getTransactionsByOwnerId, getMonthlySummary, createTransaction, deleteTransaction } from '@/lib/firestore/transactions';
import { subscribeToAccounts, createAccount, deleteAccount, clearAccountHistory, deleteTransactionsByType, resetAccountBalance, clearAllTransactionHistory, createDefaultAccounts, getTotalBalance, updateAccountBalance } from '@/lib/firestore/accounts';
import { CustomSelect } from '@/app/components/CustomSelect';
import { addCustomTransactionCategory, getUserPreferences } from '@/lib/firestore/users';
import { IconPlus, IconX, IconTrash, IconWallet, IconArchive, IconReset } from '@/app/components/icons';
import { FinancialStatusChart } from '@/app/components/FinancialStatusChart';
import { parseReceipt, mapReceiptToTransaction, VEPayReceipt } from '@/lib/vepay';
import type { Transaction, FinancialAccount, AccountType } from '@/types';

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

export default function FinanzasPage() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, saving: 0, balance: 0 });
  const [filterType, setFilterType] = useState<string>('Todos');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [showModal, setShowModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [newTx, setNewTx] = useState({ amount: '', type: 'income' as Transaction['type'], category: 'Salario', description: '', accountId: '', date: todayISO() });
  const [newAccount, setNewAccount] = useState({ name: '', type: 'checking' as AccountType, balance: 0 });
  const [transfer, setTransfer] = useState({ amount: '', fromAccountId: '', toAccountId: '' });
  const [customTxCategories, setCustomTxCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<Record<string, string[]>>({ ...DEFAULT_CATEGORIES });
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; variant: 'danger' | 'warning' | 'info'; confirmText?: string }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' });
  const [showAmounts, setShowAmounts] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('finanzas-show-amounts') === 'true';
    }
    return false;
  });
  const [txLoading, setTxLoading] = useState(false);
  const [showVepayModal, setShowVepayModal] = useState(false);
  const [vepayProcessing, setVepayProcessing] = useState(false);
  const [vepayReceipts, setVepayReceipts] = useState<VEPayReceipt[]>([]);
  const [vepayPreview, setVepayPreview] = useState<string>('');

  const uid = user?.uid;

  // Suscribirse a cuentas en tiempo real
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToAccounts(uid, (accs) => {
      setAccounts(accs);
      if (accs.length === 0) {
        createDefaultAccounts(uid);
      }
    });
    return () => unsub();
  }, [uid]);

  // Calcular balance total
  useEffect(() => {
    if (!uid) return;
    getTotalBalance(uid).then(setTotalBalance);
  }, [accounts, uid]);

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
      const [txs, summaryData] = await Promise.all([
        getTransactionsByOwnerId(uid),
        getMonthlySummary(uid),
      ]);
      setTransactions(txs);
      setSummary(summaryData);
    } catch (e) { console.error(e); }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    loadTransactions();
  }, [uid, loadTransactions]);

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

    // Validar fondos si es gasto y hay cuenta seleccionada
    if (newTx.type === 'expense' && newTx.accountId) {
      const acc = accounts.find(a => a.id === newTx.accountId);
      if (acc && acc.balance < amount) {
        error(`Fondos insuficientes en "${acc.name}". Balance: $${acc.balance.toLocaleString()}`);
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
        const delta = newTx.type === 'expense' ? -amount : amount;
        await updateAccountBalance(newTx.accountId, delta);
      }

      // Recargar datos
      await loadTransactions();

      const typeLabel = TYPE_LABELS[newTx.type];
      success(`${typeLabel} de $${amount.toLocaleString()} registrado`);
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

    setConfirmState({
      isOpen: true,
      title: 'Eliminar Transacción',
      message: `¿Eliminar "${tx.description || tx.category}" por $${tx.amount.toLocaleString()}? El balance de la cuenta se ajustará.`,
      variant: 'danger',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await deleteTransaction(txId);

          // Revertir balance si tenía cuenta
          if (tx.accountId) {
            const delta = tx.type === 'expense' ? tx.amount : -tx.amount;
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
    localStorage.setItem('finanzas-show-amounts', String(newVal));
  };

  const handleVepayUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    setVepayProcessing(true);
    setVepayReceipts([]);

    try {
      const previewUrl = URL.createObjectURL(file);
      setVepayPreview(previewUrl);

      const result = await parseReceipt(file);

      if (result.receipts && result.receipts.length > 0) {
        setVepayReceipts(result.receipts);
        success(`${result.receipts.length} recibo(s) detectado(s)`);
      } else {
        warning('No se pudo detectar un recibo en la captura.');
      }

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(err => {
          error(`Error: ${err.error}`);
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

  const handleVepayConfirm = async (receipt: VEPayReceipt) => {
    if (!uid) return;
    setTxLoading(true);

    try {
      const tx = mapReceiptToTransaction(receipt);

      const txData: any = {
        ownerId: uid,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        description: tx.description,
        date: tx.date,
      };

      await createTransaction(txData);
      await loadTransactions();

      const typeLabel = tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Gasto' : 'Ahorro';
      success(`${typeLabel} de $${tx.amount.toLocaleString()} registrado desde captura`);

      setVepayReceipts(prev => prev.filter(r => r.transaction_key !== receipt.transaction_key));
      if (vepayReceipts.length <= 1) {
        setShowVepayModal(false);
        setVepayReceipts([]);
        setVepayPreview('');
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
      error(`Fondos insuficientes en "${fromAcc.name}". Balance: $${fromAcc.balance.toLocaleString()}`);
      return;
    }

    try {
      await updateAccountBalance(transfer.fromAccountId, -amount);
      await updateAccountBalance(transfer.toAccountId, amount);

      const txData: any = {
        ownerId: uid || 'local',
        amount,
        type: 'saving',
        category: 'Transferencia',
        description: `Transferencia: ${fromAcc.name} → ${toAcc.name}`,
        date: Date.now(),
        accountId: transfer.fromAccountId,
      };
      await createTransaction(txData);
      await loadTransactions();

      success(`Transferencia exitosa: ${fromAcc.name} → ${toAcc.name}`);
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
      icon: newAccount.type === 'checking' ? '🏦' : newAccount.type === 'savings' ? '💰' : '💵',
      color: ACCOUNT_TYPE_COLORS[newAccount.type],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await createAccount(acc);
    success(`Cuenta "${acc.name}" creada`);
    setShowAccountModal(false);
    setNewAccount({ name: '', type: 'checking', balance: 0 });
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
      message: `¿Resetear el balance de "${acc?.name}" a $0? Se perderá el saldo actual de $${acc?.balance.toLocaleString()}.`,
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
            <div className="page-header-actions">
              <button className="btn btn-outline" onClick={() => setShowAccountModal(true)}>
                <IconPlus width={14} /> Nueva Cuenta
              </button>
              <button className="btn btn-outline" onClick={() => setShowTransferModal(true)}>
                <IconWallet width={14} /> Transferir
              </button>
              <button className="btn btn-outline btn-danger-outline" onClick={handleClearAllHistory} title="Borrar todo el historial">
                <IconArchive width={14} /> Borrar Historial
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

          {/* Cuentas */}
          <div className="accounts-grid">
            {accounts.map((acc) => (
              <div key={acc.id} className="account-card" style={{ borderLeftColor: acc.color }}>
                <div className="account-card-header">
                  <div className="account-icon" style={{ background: `${acc.color}20` }}>{acc.icon}</div>
                  <div className="account-info">
                    <span className="account-name">{acc.name}</span>
                    <span className="account-type">{acc.type}</span>
                  </div>
                  <div className="account-actions-group">
                    <button className="account-action" onClick={() => handleClearHistory(acc.id)} title="Archivar historial"><IconArchive width={14} /></button>
                    <button className="account-action" onClick={() => handleResetBalance(acc.id)} title="Resetear balance"><IconReset width={14} /></button>
                    <div className="account-dropdown-wrapper">
                      <button className="account-action account-action-more" title="Más opciones">⋮</button>
                      <div className="account-dropdown">
                        <button className="account-dropdown-item" onClick={() => handleDeleteByType(acc.id, 'income')}>📥 Eliminar Ingresos</button>
                        <button className="account-dropdown-item" onClick={() => handleDeleteByType(acc.id, 'expense')}>📤 Eliminar Gastos</button>
                        <button className="account-dropdown-item" onClick={() => handleDeleteByType(acc.id, 'saving')}>💰 Eliminar Ahorros</button>
                        <div className="account-dropdown-divider" />
                        <button className="account-dropdown-item account-dropdown-danger" onClick={() => handleDeleteAccount(acc.id)}>🗑️ Eliminar Cuenta</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="account-balance" style={{ color: acc.color }}>
                  {showAmounts ? `$${acc.balance.toLocaleString()}` : '••••••'}
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="empty-accounts">
                <p>No tienes cuentas. ¡Crea tu primera cuenta!</p>
              </div>
            )}
          </div>

          {/* Resumen mensual */}
          <div className="summary-grid">
            <div className="summary-card summary-income">
              <span className="summary-label">Ingresos</span>
              <span className="summary-value">{showAmounts ? `$${summary.income.toLocaleString()}` : '••••••'}</span>
            </div>
            <div className="summary-card summary-expense">
              <span className="summary-label">Gastos</span>
              <span className="summary-value">{showAmounts ? `$${summary.expenses.toLocaleString()}` : '••••••'}</span>
            </div>
            <div className="summary-card summary-saving">
              <span className="summary-label">Ahorro</span>
              <span className="summary-value">{showAmounts ? `$${summary.saving.toLocaleString()}` : '••••••'}</span>
            </div>
            <div className="summary-card summary-balance">
              <span className="summary-label">Balance Total</span>
              <span className="summary-value">{showAmounts ? `$${totalBalance.toLocaleString()}` : '••••••'}</span>
            </div>
          </div>

          {/* Gráfico */}
          <FinancialStatusChart />

          {/* Filtros */}
          <div className="filter-bar">
            <CustomSelect
              value={selectedAccount}
              onChange={(val) => setSelectedAccount(val)}
              options={[
                { value: 'all', label: 'Todas las cuentas', icon: '📊' },
                ...accounts.map((a) => ({ value: a.id, label: a.name, icon: a.icon })),
              ]}
              placeholder="Seleccionar cuenta..."
            />
            {['Todos', 'income', 'expense', 'saving'].map((t) => (
              <button key={t} className={`filter-btn ${filterType === t ? 'active' : ''}`} onClick={() => { setFilterType(t); setFilterCategory('Todas'); }}>
                {t === 'Todos' ? 'Todos' : `${TYPE_ICONS[t]} ${TYPE_LABELS[t]}`}
              </button>
            ))}
            <CustomSelect
              value={filterCategory}
              onChange={(val) => setFilterCategory(val)}
              options={[
                { value: 'Todas', label: 'Todas las categorías', icon: '📋' },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
              placeholder="Seleccionar categoría..."
            />
          </div>

          {/* Tabla de transacciones */}
          <div className="transactions-table-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cuenta</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.length > 0 ? filteredTx.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.description || '—'}</td>
                    <td><span className="account-badge">{getAccountName(tx.accountId)}</span></td>
                    <td>{tx.category}</td>
                    <td><span className="type-badge" style={{ background: TYPE_COLORS[tx.type] + '20', color: TYPE_COLORS[tx.type] }}>{TYPE_LABELS[tx.type]}</span></td>
                    <td>{formatDate(tx.date)}</td>
                    <td className={`amount-cell ${tx.type === 'income' ? 'amount-income' : tx.type === 'expense' ? 'amount-expense' : 'amount-saving'}`}>
                      {showAmounts ? `${tx.type === 'expense' ? '-' : '+'}$${tx.amount.toLocaleString()}` : '••••••'}
                    </td>
                    <td>
                      <button className="delete-tx-btn" onClick={() => handleDeleteTransaction(tx.id)} title="Eliminar">
                        <IconTrash width={14} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="empty-state">No hay transacciones. ¡Agrega tu primera!</td></tr>
                )}
              </tbody>
            </table>
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
                      <span className="tx-currency">$</span>
                      <input
                        className="tx-input tx-input-amount"
                        type="number"
                        min="0"
                        step="0.01"
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
                      onChange={(val) => setTransfer({ ...transfer, fromAccountId: val })}
                      options={accounts.map((a) => ({ value: a.id, label: `${a.name} ($${a.balance.toLocaleString()})`, icon: a.icon }))}
                      placeholder="Cuenta origen..."
                    />
                  </div>
                  <div className="tx-field">
                    <label className="tx-label">A</label>
                    <CustomSelect
                      value={transfer.toAccountId}
                      onChange={(val) => setTransfer({ ...transfer, toAccountId: val })}
                      options={accounts.filter((a) => a.id !== transfer.fromAccountId).map((a) => ({ value: a.id, label: `${a.name} ($${a.balance.toLocaleString()})`, icon: a.icon }))}
                      placeholder="Cuenta destino..."
                    />
                  </div>
                  <div className="tx-field">
                    <label className="tx-label">Monto</label>
                    <div className="tx-input-wrap">
                      <span className="tx-currency">$</span>
                      <input className="tx-input tx-input-amount" type="number" min="0" placeholder="0.00" value={transfer.amount} onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })} />
                    </div>
                  </div>
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
                        { value: 'checking', label: 'Corriente', icon: '🏦' },
                        { value: 'savings', label: 'Ahorro', icon: '💰' },
                        { value: 'cash', label: 'Efectivo', icon: '💵' },
                      ]}
                      placeholder="Seleccionar tipo..."
                    />
                  </div>
                  <div className="tx-field">
                    <label className="tx-label">Balance Inicial</label>
                    <div className="tx-input-wrap">
                      <span className="tx-currency">$</span>
                      <input className="tx-input tx-input-amount" type="number" min="0" placeholder="0.00" value={newAccount.balance || ''} onChange={(e) => setNewAccount({ ...newAccount, balance: Number(e.target.value) })} />
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

                {/* Upload area */}
                <div className="vepay-upload-area">
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
                    <img src={vepayPreview} alt="Captura" />
                  </div>
                )}

                {/* Receipts detected */}
                {vepayReceipts.length > 0 && (
                  <div className="vepay-receipts">
                    <h3 className="vepay-receipts-title">Recibos detectados ({vepayReceipts.length})</h3>
                    {vepayReceipts.map((receipt, idx) => {
                      const tx = mapReceiptToTransaction(receipt);
                      const typeColor = tx.type === 'income' ? 'var(--color-prosper-green)' : tx.type === 'expense' ? 'var(--color-error)' : 'var(--color-pine-500)';
                      const typeLabel = tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Gasto' : 'Ahorro';
                      return (
                        <div key={receipt.transaction_key || idx} className="vepay-receipt-card">
                          <div className="vepay-receipt-header">
                            <span className="vepay-bank-badge">{receipt.payment.bank_app || 'Banco'}</span>
                            <span className="vepay-type-badge" style={{ background: typeColor + '20', color: typeColor }}>{typeLabel}</span>
                          </div>
                          <div className="vepay-receipt-amount" style={{ color: typeColor }}>
                            {tx.type === 'expense' ? '-' : '+'}${tx.amount.toLocaleString('es', { minimumFractionDigits: 2 })}
                          </div>
                          <p className="vepay-receipt-concept">{tx.description}</p>
                          <div className="vepay-receipt-meta">
                            {receipt.payment.reference && <span>Ref: {receipt.payment.reference}</span>}
                            {receipt.payment.date_time.raw && <span>{receipt.payment.date_time.raw}</span>}
                          </div>
                          {!receipt.validation.complete && receipt.validation.missing_fields.length > 0 && (
                            <p className="vepay-receipt-warning">⚠ Campos incompletos: {receipt.validation.missing_fields.join(', ')}</p>
                          )}
                          <div className="vepay-receipt-actions">
                            <button className="btn btn-outline btn-sm" onClick={() => handleVepaySkip(receipt)}>Omitir</button>
                            <button className="btn btn-primary btn-sm" onClick={() => handleVepayConfirm(receipt)} disabled={txLoading}>
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

          /* Accounts */
          .accounts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
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
          .account-action-more { font-size: 22px; line-height: 1; padding: 6px; }
          .account-dropdown-wrapper { position: relative; }
          .account-dropdown { display: none; position: absolute; right: 0; top: 100%; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 100; min-width: 180px; overflow: hidden; }
          .account-dropdown-wrapper:hover .account-dropdown { display: block; }
          .account-dropdown-item { display: block; width: 100%; padding: 10px 14px; border: none; background: none; text-align: left; font-size: 0.8125rem; color: var(--text-primary); cursor: pointer; transition: background var(--transition-fast); }
          .account-dropdown-item:hover { background: var(--bg-input); }
          .account-dropdown-divider { height: 1px; background: var(--border-default); margin: 4px 0; }
          .account-dropdown-danger { color: var(--color-error) !important; }
          .account-dropdown-danger:hover { background: rgba(239,68,68,0.1) !important; }
          .account-balance { font-size: 1.375rem; font-weight: 800; }
          .empty-accounts { text-align: center; padding: 24px; color: var(--text-secondary); font-size: 0.875rem; grid-column: 1 / -1; }

          /* Summary */
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
          .summary-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 4px; }
          .summary-label { font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; }
          .summary-value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
          .summary-income { border-left: 4px solid var(--color-prosper-green); }
          .summary-expense { border-left: 4px solid var(--color-error); }
          .summary-saving { border-left: 4px solid var(--color-pine-500); }
          .summary-balance { border-left: 4px solid var(--color-gold-500); }

          /* Filters */
          .filter-bar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
          .filter-btn { padding: 8px 16px; border-radius: var(--radius-full); background: var(--bg-card); border: 1px solid var(--border-default); color: var(--text-secondary); font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); white-space: nowrap; }
          .filter-btn.active { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .filter-btn:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }

          /* Table */
          .transactions-table-wrapper { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }
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
          .empty-state { text-align: center; padding: 32px; color: var(--text-secondary); }

          /* Modal */
          .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); -webkit-tap-highlight-color: transparent; }
          .modal-content { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); width: 92%; max-width: 440px; padding: 24px; max-height: 90vh; overflow-y: auto; animation: modalIn 0.25s ease; }
          .modal-tx { max-width: 480px; }
          @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
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
          .btn-sm { padding: 8px 14px; font-size: 0.75rem; }

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

          /* Responsive */
          @media (max-width: 768px) {
            .page-header { flex-direction: column; gap: 12px; }
            .page-header-actions { width: 100%; flex-wrap: wrap; }
            .page-header-actions .btn { flex: 1; justify-content: center; min-width: 0; }
            .btn-toggle-label { display: inline; }
            .btn-vepay-label { display: inline; }
            .summary-grid { grid-template-columns: repeat(2, 1fr); }
            .filter-bar { flex-direction: column; align-items: stretch; }
            .transactions-table-wrapper { overflow-x: auto; }
            .transactions-table { min-width: 650px; }
            .modal-content { width: 95%; padding: 20px 16px; }
            .modal-footer { flex-direction: column-reverse; }
            .modal-footer .btn { width: 100%; justify-content: center; padding: 14px; }
            .tx-type-selector { gap: 6px; }
            .tx-type-btn { padding: 10px 6px; }
            .tx-field-row { grid-template-columns: 1fr; }
          }
          @media (max-width: 480px) {
            .summary-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
            .summary-card { padding: 12px; }
            .summary-value { font-size: 1.25rem; }
            .accounts-grid { grid-template-columns: 1fr; }
            .page-header-actions .btn { font-size: 0.75rem; padding: 8px 12px; }
            .modal-content { max-height: 95vh; padding: 16px 14px; }
            .modal-title { font-size: 1rem; }
            .tx-type-icon { font-size: 1rem; }
            .tx-type-label { font-size: 0.625rem; }
            .tx-input-amount { font-size: 1.125rem; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
