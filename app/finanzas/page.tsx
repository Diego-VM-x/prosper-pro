'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/app/components/Toast';
import { ConfirmDialog } from '@/app/components/Toast';
import { getTransactionsByOwnerId, getMonthlySummary, createTransaction, deleteTransaction } from '@/lib/firestore/transactions';
import { subscribeToAccounts, createAccount, deleteAccount, clearAccountHistory, deleteTransactionsByType, resetAccountBalance, clearAllTransactionHistory, createDefaultAccounts, getTotalBalance } from '@/lib/firestore/accounts';
import { CustomSelect } from '@/app/components/CustomSelect';
import { addCustomTransactionCategory, getUserPreferences } from '@/lib/firestore/users';
import { IconPlus, IconX, IconTrash, IconWallet, IconArchive, IconReset } from '@/app/components/icons';
import { FinancialStatusChart } from '@/app/components/FinancialStatusChart';
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

export default function FinanzasPage() {
  const { user } = useAuth();
  const { success, error, warning, info } = useToast();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, saving: 0, balance: 0 });
  const [filterType, setFilterType] = useState<string>('Todos');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [showModal, setShowModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newTx, setNewTx] = useState({ amount: '', type: 'income' as Transaction['type'], category: 'Salario', description: '', accountId: '' });
  const [newAccount, setNewAccount] = useState({ name: '', type: 'checking' as AccountType, balance: 0 });
  const [showTransferModal, setShowTransferModal] = useState(false);
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

  // Suscribirse a cuentas en tiempo real
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;

    const unsub = subscribeToAccounts(uid, (accs) => {
      setAccounts(accs);
      if (accs.length === 0) {
        createDefaultAccounts(uid);
      }
    });

    return () => unsub();
  }, [user?.uid]);

  // Calcular balance total
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    getTotalBalance(uid).then(setTotalBalance);
  }, [accounts, user?.uid]);

  // Cargar preferencias
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let cancelled = false;
    async function loadPrefs() {
      try {
        const prefs = await getUserPreferences(uid as string);
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
  }, [user?.uid]);

  // Cargar transacciones
  useEffect(() => {
    const uid = user?.uid as string;
    if (!uid) return;
    let cancelled = false;
    async function loadData() {
      try {
        const [txs, summary] = await Promise.all([
          getTransactionsByOwnerId(uid),
          getMonthlySummary(uid),
        ]);
        if (!cancelled) {
          if (txs.length) setTransactions(txs);
          setSummary(summary);
        }
      } catch (e) { console.error(e); }
    }
    loadData();
    return () => { cancelled = true; };
  }, [user?.uid]);

  // Filtrar transacciones por cuenta seleccionada
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
    if (!newTx.amount) return;
    const txData: any = {
      ownerId: user?.uid || 'local',
      amount: Number(newTx.amount),
      type: newTx.type,
      category: newTx.category,
      description: newTx.description,
      date: Date.now(),
    };
    // Solo incluir accountId si hay una cuenta seleccionada (evita undefined)
    if (newTx.accountId) {
      txData.accountId = newTx.accountId;
    }
    const tx: Transaction = { id: 't' + Date.now(), ...txData };
    setTransactions((prev) => [tx, ...prev]);
    if (user?.uid) {
      try {
        await createTransaction(txData);
        // Actualizar balance de la cuenta si hay una seleccionada
        if (newTx.accountId) {
          const { updateAccountBalance } = await import('@/lib/firestore/accounts');
          const amount = tx.type === 'expense' ? -tx.amount : tx.amount;
          await updateAccountBalance(newTx.accountId, amount);
        }
      } catch (e) { console.error(e); }
    }
    setShowModal(false);
    setNewTx({ amount: '', type: 'income', category: 'Salario', description: '', accountId: '' });
  };

  const toggleShowAmounts = () => {
    const newVal = !showAmounts;
    setShowAmounts(newVal);
    localStorage.setItem('finanzas-show-amounts', String(newVal));
  };

  const handleTransfer = async () => {
    console.log('[Transfer] Iniciando...', transfer);
    if (!transfer.amount || !transfer.fromAccountId || !transfer.toAccountId) {
      console.warn('[Transfer] Campos incompletos');
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
    console.log('[Transfer] From:', fromAcc, 'To:', toAcc, 'Amount:', amount);

    if (!fromAcc) {
      error('Cuenta de origen no encontrada.');
      return;
    }
    if (!toAcc) {
      error('Cuenta de destino no encontrada.');
      return;
    }
    if (fromAcc.balance < amount) {
      error(`Fondos insuficientes en "${fromAcc.name}". Balance: $${fromAcc.balance.toLocaleString()}`);
      return;
    }

    try {
      const { updateAccountBalance } = await import('@/lib/firestore/accounts');
      console.log('[Transfer] Debitando', amount, 'de', fromAcc.name);
      // Debitar de origen
      await updateAccountBalance(transfer.fromAccountId, -amount);
      console.log('[Transfer] Acreditando', amount, 'en', toAcc.name);
      // Acreditar en destino
      await updateAccountBalance(transfer.toAccountId, amount);

      // Crear transacción de registro
      const txData: any = {
        ownerId: user?.uid || 'local',
        amount,
        type: 'saving',
        category: 'Transferencia',
        description: `Transferencia: ${fromAcc.name} → ${toAcc.name}`,
        date: Date.now(),
        accountId: transfer.fromAccountId,
      };
      console.log('[Transfer] Creando transacción:', txData);
      await createTransaction(txData);
      setTransactions((prev) => [{ id: 't' + Date.now(), ...txData }, ...prev]);

      console.log('[Transfer] Completada exitosamente');
      success(`Transferencia exitosa: ${fromAcc.name} → ${toAcc.name}`);
      setShowTransferModal(false);
      setTransfer({ amount: '', fromAccountId: '', toAccountId: '' });
    } catch (e: any) {
      console.error('[Transfer] Error:', e);
      error(`Error al transferir: ${e?.message || 'Error desconocido'}`);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.name || !user?.uid) return;
    const acc: Omit<FinancialAccount, 'id'> = {
      ownerId: user.uid,
      name: newAccount.name,
      type: newAccount.type,
      balance: newAccount.balance,
      icon: newAccount.type === 'checking' ? '🏦' : newAccount.type === 'savings' ? '💰' : '💵',
      color: ACCOUNT_TYPE_COLORS[newAccount.type],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await createAccount(acc);
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
      message: `¿Eliminar todos los ${typeLabel.toLowerCase()}s de "${acc?.name}"? El balance se ajustará automáticamente. Esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: `Eliminar ${typeLabel}s`,
      onConfirm: async () => {
        await deleteTransactionsByType(id, type);
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
      message: `¿Resetear el balance de "${acc?.name}" a $0? Se perderá el saldo actual de $${acc?.balance.toLocaleString()}. Esta acción no se puede deshacer.`,
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
      message: '¿Borrar el historial de TODAS las transacciones? Los balances de las cuentas se mantendrán intactos. Esta acción no se puede deshacer.',
      variant: 'danger',
      confirmText: 'Borrar todo el historial',
      onConfirm: async () => {
        if (!user?.uid) return;
        await clearAllTransactionHistory(user.uid);
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

  return (
    <ProtectedRoute>
      <DashboardLayout>
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
              <span>{showAmounts ? 'Montos visibles' : 'Montos ocultos'}</span>
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

        {/* Gráfico Progreso Financiero en Tiempo Real */}
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
                </tr>
              )) : (
                <tr><td colSpan={6} className="empty-state">No hay transacciones</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Transacción */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Nueva Transacción</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <label className="form-label">Tipo</label>
                <CustomSelect
                  value={newTx.type}
                  onChange={(val) => {
                    const type = val as Transaction['type'];
                    const cats = allCategories[type] || CATEGORIES[type];
                    setNewTx({ ...newTx, type, category: cats[0] });
                  }}
                  options={[
                    { value: 'income', label: 'Ingreso', icon: '📥' },
                    { value: 'expense', label: 'Gasto', icon: '📤' },
                    { value: 'saving', label: 'Ahorro', icon: '💰' },
                  ]}
                  placeholder="Seleccionar tipo..."
                />
                <label className="form-label">Cuenta</label>
                <CustomSelect
                  value={newTx.accountId}
                  onChange={(val) => setNewTx({ ...newTx, accountId: val })}
                  options={[
                    { value: '', label: 'Sin cuenta', icon: '—' },
                    ...accounts.map((a) => ({ value: a.id, label: `${a.name} ($${a.balance.toLocaleString()})`, icon: a.icon })),
                  ]}
                  placeholder="Seleccionar cuenta..."
                />
                <label className="form-label">Monto ($)</label>
                <input className="form-input" type="number" placeholder="0" value={newTx.amount} onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })} />
                <label className="form-label">Categoría</label>
                <CustomSelect
                  value={newTx.category}
                  onChange={(val) => setNewTx({ ...newTx, category: val })}
                  options={(allCategories[newTx.type] || CATEGORIES[newTx.type]).map((c) => ({ value: c, label: c }))}
                  placeholder="Seleccionar categoría..."
                  allowCustom
                  onAddCustom={async (value, label) => {
                    const uid = user?.uid;
                    if (uid) {
                      await addCustomTransactionCategory(uid, value);
                      setCustomTxCategories(prev => [...prev, value]);
                      setAllCategories(prev => ({ ...prev, expense: [...(prev.expense || []), value] }));
                    }
                  }}
                  customPlaceholder="Nombre de la categoría..."
                />
                <label className="form-label">Descripción (opcional)</label>
                <input className="form-input" type="text" placeholder="Ej: Pago de nómina" value={newTx.description} onChange={(e) => setNewTx({ ...newTx, description: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleAddTransaction}>Agregar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Transferencia */}
        {showTransferModal && (
          <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <h2 className="modal-title">Transferir entre Cuentas</h2>
                <button className="modal-close" onClick={() => setShowTransferModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <label className="form-label">De</label>
                <CustomSelect
                  value={transfer.fromAccountId}
                  onChange={(val) => setTransfer({ ...transfer, fromAccountId: val })}
                  options={accounts.map((a) => ({ value: a.id, label: `${a.name} ($${a.balance.toLocaleString()})`, icon: a.icon }))}
                  placeholder="Seleccionar cuenta origen..."
                />
                <label className="form-label">A</label>
                <CustomSelect
                  value={transfer.toAccountId}
                  onChange={(val) => setTransfer({ ...transfer, toAccountId: val })}
                  options={accounts.filter((a) => a.id !== transfer.fromAccountId).map((a) => ({ value: a.id, label: `${a.name} ($${a.balance.toLocaleString()})`, icon: a.icon }))}
                  placeholder="Seleccionar cuenta destino..."
                />
                <label className="form-label">Monto ($)</label>
                <input className="form-input" type="number" placeholder="0" value={transfer.amount} onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })} />
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
                <h2 className="modal-title">Nueva Cuenta</h2>
                <button className="modal-close" onClick={() => setShowAccountModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <label className="form-label">Nombre</label>
                <input className="form-input" type="text" placeholder="Ej: Cuenta Corriente" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} />
                <label className="form-label">Tipo</label>
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
                <label className="form-label">Balance Inicial ($)</label>
                <input className="form-input" type="number" placeholder="0" value={newAccount.balance} onChange={(e) => setNewAccount({ ...newAccount, balance: Number(e.target.value) })} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowAccountModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleAddAccount}>Crear Cuenta</button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .chart-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px; }
          .chart-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
          .chart-card-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }
          .chart-card-subtitle { font-size: 0.875rem; color: var(--text-secondary); margin: 4px 0 0 0; }
          .chart-period-toggle { display: flex; gap: 2px; background: var(--bg-input); border-radius: var(--radius-md); padding: 3px; }
          .period-btn { padding: 5px 10px; border: none; border-radius: var(--radius-sm); background: transparent; color: var(--text-tertiary); font-size: 0.6875rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); text-transform: uppercase; letter-spacing: 0.5px; }
          .period-btn.active { background: var(--color-prosper-green); color: white; }
          .period-btn:hover:not(.active) { color: var(--text-primary); }
          .page-header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
          .btn-danger-outline { color: var(--color-error) !important; border-color: var(--color-error) !important; }
          .btn-danger-outline:hover { background: var(--color-error) !important; color: white !important; }
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
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
          .summary-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 4px; }
          .summary-label { font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; }
          .summary-value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
          .summary-income { border-left: 4px solid var(--color-prosper-green); }
          .summary-expense { border-left: 4px solid var(--color-error); }
          .summary-saving { border-left: 4px solid var(--color-pine-500); }
          .summary-balance { border-left: 4px solid var(--color-gold-500); }
          .filter-bar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
          .filter-select { padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-primary); font-size: 0.8125rem; }
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
          .delete-btn { background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-size: 1rem; padding: 4px; border-radius: 50%; }
          .delete-btn:hover { color: var(--color-error); background: rgba(239,68,68,0.1); }
          .empty-state { text-align: center; padding: 32px; color: var(--text-secondary); }
          .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); -webkit-tap-highlight-color: transparent; }
          .modal-content { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); width: 90%; max-width: 420px; padding: 24px; max-height: 90vh; overflow-y: auto; }
          .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
          .modal-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; }
          .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.25rem; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; padding: 8px; }
          .modal-body { display: flex; flex-direction: column; gap: 14px; }
          .modal-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
          .form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin-bottom: -6px; }
          .form-input { width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.875rem; outline: none; box-sizing: border-box; }
          .form-input:focus { border-color: var(--color-prosper-green); }
          .btn { padding: 10px 20px; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; display: flex; align-items: center; gap: 6px; }
          .btn-primary { background: var(--color-prosper-green); color: white; }
          .btn-outline { background: transparent; border: 1px solid var(--border-default); color: var(--text-primary); }
          .filter-btn { padding: 8px 16px; border-radius: var(--radius-full); background: var(--bg-card); border: 1px solid var(--border-default); color: var(--text-secondary); font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); white-space: nowrap; }
          .filter-btn.active { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .filter-btn:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }

          @media (max-width: 768px) {
            .summary-grid { grid-template-columns: repeat(2, 1fr); }
            .filter-bar { flex-direction: column; align-items: stretch; }
            .filter-select { width: 100%; }
            .transactions-table-wrapper { overflow-x: auto; }
            .transactions-table { min-width: 700px; }
            .page-header { flex-direction: column; }
            .page-header-actions { width: 100%; }
            .page-header-actions .btn { flex: 1; justify-content: center; }
            .modal-content { width: 95%; padding: 16px; }
            .modal-footer { flex-direction: column-reverse; }
            .modal-footer .btn { width: 100%; text-align: center; padding: 14px; }
          }
          @media (max-width: 480px) {
            .summary-grid { grid-template-columns: 1fr; }
            .accounts-grid { grid-template-columns: 1fr; }
          }
        `}</style>
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          variant={confirmState.variant}
          confirmText={confirmState.confirmText || 'Confirmar'}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
