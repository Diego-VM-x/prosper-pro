'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useToast, ConfirmDialog } from '@/app/components/Toast';
import { InlineIcon } from '@/app/components/IconMap';
import { CustomSelect } from '@/app/components/CustomSelect';
import { IconPlus, IconX } from '@/app/components/icons';
import {
  subscribeToAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  wipeAllTransactions,
  wipeTransactionsByTypeWithAdjustment,
  recalculateAllBalances,
  wipeAllUserTransactions,
  wipeUserTransactionsByType,
} from '@/lib/firestore/accounts';
import { getUserProfile, updateUserProfile, addCustomAccountType } from '@/lib/firestore/users';
import { safeLocalStorage } from '@/lib/utils/safeStorage';
import type { FinancialAccount, AccountType, CurrencyCode } from '@/types';

const ACCOUNT_COLORS = [
  '#3B82F6', '#3DCC8E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
  '#06B6D4', '#6366F1', '#F97316', '#84CC16', '#14B8A6', '#A855F7',
  '#E11D48', '#0EA5E9', '#10B981', '#D946EF', '#F43F5E', '#22C55E',
  '#64748B', '#C026D3', '#0891B2', '#B45309', '#1D4ED8', '#15803D',
];

const FIXED_ACCOUNT_TYPES: { value: AccountType; labelKey: string; icon: string }[] = [
  { value: 'digital', labelKey: 'finanzas:accounts.walletDigital', icon: 'CreditCard' },
  { value: 'bank', labelKey: 'finanzas:accounts.bank', icon: 'Landmark' },
  { value: 'foreign', labelKey: 'finanzas:accounts.foreign', icon: 'ArrowLeftRight' },
  { value: 'cash', labelKey: 'finanzas:accounts.cash', icon: 'Banknote' },
];

const TX_TYPE_LABELS: Record<'income' | 'expense' | 'saving', string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  saving: 'Ahorro',
};

function getAccountIcon(type: AccountType): string {
  switch (type) {
    case 'digital': return 'CreditCard';
    case 'bank': return 'Landmark';
    case 'cash': return 'Banknote';
    case 'foreign': return 'ArrowLeftRight';
    default: return 'Wallet';
  }
}

function getAccountColor(type: AccountType): string {
  switch (type) {
    case 'digital': return '#3B82F6';
    case 'bank': return '#3DCC8E';
    case 'foreign': return '#F59E0B';
    case 'cash': return '#10B981';
    default: return '#3DCC8E';
  }
}

export default function ContabilidadPanel() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { formatInCurrency, currencyMap } = useCurrency();
  const { t } = useTranslation(['configuracion', 'finanzas', 'common']);

  const uid = user?.uid;

  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [showAmounts, setShowAmounts] = useState(() => {
    try { return safeLocalStorage.getItem('finanzas-show-amounts') === 'true'; } catch { return false; }
  });

  // Create / edit account modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'digital' as AccountType,
    balance: 0,
    currency: 'BS' as CurrencyCode,
    color: '',
    rateMode: undefined as 'official' | 'p2p' | undefined,
  });
  const [accountCategory, setAccountCategory] = useState<'monedas' | 'criptos'>('monedas');

  // Custom type input
  const [newCustomType, setNewCustomType] = useState('');

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'danger' | 'warning' | 'info'; confirmText?: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', variant: 'info', onConfirm: () => {} });

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const unsub = subscribeToAccounts(uid, (data) => {
      setAccounts(data);
      setLoading(false);
    });
    getUserProfile(uid).then((p) => {
      if (p) setCustomTypes((p as any).customAccountTypes || []);
    });
    return () => unsub();
  }, [uid]);

  const allTypeOptions = useMemo(() => {
    const fixed = FIXED_ACCOUNT_TYPES.map((ft) => ({ value: ft.value, label: t(ft.labelKey), icon: ft.icon }));
    const custom = customTypes.map((type) => ({ value: type, label: type, icon: 'Wallet' }));
    return [...fixed, ...custom];
  }, [customTypes, t]);

  const openCreateAccount = () => {
    setEditingAccount(null);
    setAccountForm({ name: '', type: 'digital', balance: 0, currency: 'BS', color: '', rateMode: undefined });
    setAccountCategory('monedas');
    setShowAccountModal(true);
  };

  const openEditAccount = (acc: FinancialAccount) => {
    setEditingAccount(acc);
    setAccountForm({
      name: acc.name,
      type: acc.type,
      balance: acc.balance,
      currency: acc.currency,
      color: acc.color || '',
      rateMode: acc.rateMode,
    });
    setAccountCategory(['USDT', 'SOL', 'BTC', 'USDC', 'ETH'].includes(acc.currency) ? 'criptos' : 'monedas');
    setShowAccountModal(true);
  };

  const closeAccountModal = () => {
    setShowAccountModal(false);
    setEditingAccount(null);
    setAccountForm({ name: '', type: 'digital', balance: 0, currency: 'BS', color: '', rateMode: undefined });
    setAccountCategory('monedas');
  };

  const handleSaveAccount = async () => {
    if (!uid || !accountForm.name.trim()) return;
    try {
      const isCustom = !FIXED_ACCOUNT_TYPES.some((ft) => ft.value === accountForm.type);
      if (isCustom && !customTypes.includes(accountForm.type)) {
        await addCustomAccountType(uid, accountForm.type);
        setCustomTypes((prev) => [...prev, accountForm.type]);
      }

      if (editingAccount) {
        await updateAccount(editingAccount.id, {
          name: accountForm.name.trim(),
          type: accountForm.type,
          currency: accountForm.currency,
          color: accountForm.color || getAccountColor(accountForm.type),
          icon: getAccountIcon(accountForm.type),
          rateMode: accountForm.rateMode,
          updatedAt: Date.now(),
        });
        success(t('finanzas:toast.accountUpdated'));
      } else {
        await createAccount({
          ownerId: uid,
          name: accountForm.name.trim(),
          type: accountForm.type,
          balance: accountForm.balance,
          currency: accountForm.currency,
          icon: getAccountIcon(accountForm.type),
          color: accountForm.color || getAccountColor(accountForm.type),
          rateMode: accountForm.rateMode,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        success(t('finanzas:toast.accountCreated', { name: accountForm.name.trim() }));
      }
      closeAccountModal();
    } catch (e: any) {
      error(e?.message || t('messages.saveError'));
    }
  };

  const handleAddCustomType = async () => {
    if (!uid || !newCustomType.trim()) return;
    const type = newCustomType.trim();
    if (customTypes.includes(type) || FIXED_ACCOUNT_TYPES.some((ft) => ft.value === type)) {
      setNewCustomType('');
      return;
    }
    try {
      await addCustomAccountType(uid, type);
      setCustomTypes((prev) => [...prev, type]);
      setNewCustomType('');
      success(t('configuracion:contabilidad.typeAdded', { type }));
    } catch (e: any) {
      error(e?.message || t('messages.saveError'));
    }
  };

  const handleDeleteCustomType = (type: string) => {
    if (!uid) return;
    setConfirmState({
      isOpen: true,
      title: t('configuracion:contabilidad.deleteTypeTitle'),
      message: t('configuracion:contabilidad.deleteTypeMessage', { type }),
      variant: 'warning',
      confirmText: t('common:buttons.delete'),
      onConfirm: async () => {
        try {
          const next = customTypes.filter((t) => t !== type);
          await updateUserProfile(uid, { customAccountTypes: next } as any);
          setCustomTypes(next);
          success(t('configuracion:contabilidad.typeDeleted'));
        } catch (e: any) {
          error(e?.message || t('messages.saveError'));
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteAccount = (acc: FinancialAccount) => {
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.deleteAccount'),
      message: t('finanzas:modals.confirm.deleteAccountMessage', { name: acc.name }),
      variant: 'danger',
      confirmText: t('common:buttons.delete'),
      onConfirm: async () => {
        try {
          await deleteAccount(acc.id);
          success(t('finanzas:toast.accountDeleted'));
        } catch (e: any) {
          error(e?.message || t('messages.deleteError'));
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleWipeAllUserTransactions = () => {
    if (!uid) return;
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.wipeAllTransactions'),
      message: t('finanzas:modals.confirm.wipeAllTransactionsMessage'),
      variant: 'danger',
      confirmText: t('finanzas:modals.confirm.wipeAllConfirm'),
      onConfirm: async () => {
        setAccountingLoading(true);
        try {
          await wipeAllUserTransactions(uid);
          success(t('finanzas:toast.allTransactionsWiped'));
        } catch (e: any) {
          error(e?.message || t('messages.saveError'));
        } finally {
          setAccountingLoading(false);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleWipeUserTransactionsByType = (type: 'income' | 'expense' | 'saving') => {
    if (!uid) return;
    const typeLabel = TX_TYPE_LABELS[type];
    const actionText = type === 'income' ? t('finanzas:modals.confirm.actionSubtract') : t('finanzas:modals.confirm.actionAdd');
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.wipeType', { type: typeLabel }),
      message: t('finanzas:modals.confirm.wipeTypeMessage', { type: typeLabel.toLowerCase(), action: actionText }),
      variant: type === 'income' ? 'warning' : 'danger',
      confirmText: t('finanzas:modals.confirm.wipeAccountTypeConfirm', { type: typeLabel }),
      onConfirm: async () => {
        setAccountingLoading(true);
        try {
          const result = await wipeUserTransactionsByType(uid, type);
          const adjustText = result.adjustments.map((a) => {
            const account = accounts.find((acc) => acc.id === a.accountId);
            const sign = a.adjustment > 0 ? '+' : '';
            return `${account?.icon || ''} ${account?.name || ''}: ${sign}${formatInCurrency(Math.abs(a.adjustment), account?.currency || 'USD')}`;
          }).join('\n');
          success(t('finanzas:toast.typesWiped', { count: result.totalWiped, type: typeLabel.toLowerCase() }) + (result.adjustments.length > 0 ? '\n' + t('finanzas:toast.adjustments') + ' ' + adjustText : ''));
        } catch (e: any) {
          error(e?.message || t('messages.saveError'));
        } finally {
          setAccountingLoading(false);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleRecalculateAllBalances = () => {
    if (!uid) return;
    setConfirmState({
      isOpen: true,
      title: t('finanzas:modals.confirm.recalculateBalances'),
      message: t('finanzas:modals.confirm.recalculateBalancesMessage'),
      variant: 'info',
      confirmText: t('finanzas:modals.confirm.recalculateConfirm'),
      onConfirm: async () => {
        setAccountingLoading(true);
        try {
          const results = await recalculateAllBalances(uid);
          const summary = results.map((r) => {
            const acc = accounts.find((a) => a.id === r.accountId);
            return `${acc?.icon || ''} ${acc?.name || ''}: ${formatInCurrency(r.balance, acc?.currency || 'USD')}`;
          }).join('\n');
          success(t('finanzas:toast.balancesRecalculated') + summary);
        } catch (e: any) {
          error(e?.message || t('messages.saveError'));
        } finally {
          setAccountingLoading(false);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleWipeAccountTransactions = (accountId: string, action: 'all' | 'income' | 'expense' | 'saving') => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    const typeLabel = action === 'all' ? '' : TX_TYPE_LABELS[action];
    const title = action === 'all'
      ? t('finanzas:modals.confirm.wipeAccount', { name: acc.name })
      : t('finanzas:modals.confirm.wipeAccountType', { type: typeLabel, name: acc.name });
    const message = action === 'all'
      ? t('finanzas:modals.confirm.wipeAccountMessage', { name: acc.name })
      : t('finanzas:modals.confirm.wipeAccountTypeMessage', { type: typeLabel.toLowerCase(), name: acc.name, action: action === 'income' ? t('finanzas:modals.confirm.actionSubtract') : t('finanzas:modals.confirm.actionAdd') });
    setConfirmState({
      isOpen: true,
      title,
      message,
      variant: action === 'all' ? 'danger' : 'warning',
      confirmText: action === 'all' ? t('finanzas:modals.confirm.wipeAccountConfirm') : t('finanzas:modals.confirm.wipeAccountTypeConfirm', { type: typeLabel }),
      onConfirm: async () => {
        setAccountingLoading(true);
        try {
          if (action === 'all') {
            await wipeAllTransactions(accountId);
            success(t('finanzas:toast.accountEmptied', { name: acc.name }));
          } else {
            const result = await wipeTransactionsByTypeWithAdjustment(accountId, action);
            const sign = result.balanceAdjustment > 0 ? '+' : '';
            success(t('finanzas:toast.typesWipedFromAccount', { count: result.wipedCount, type: TX_TYPE_LABELS[action].toLowerCase(), adjustment: sign + formatInCurrency(Math.abs(result.balanceAdjustment), acc.currency) }));
          }
        } catch (e: any) {
          error(e?.message || t('messages.saveError'));
        } finally {
          setAccountingLoading(false);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const isCrypto = ['BTC', 'ETH', 'SOL', 'USDT', 'USDC'].includes(accountForm.currency);

  return (
    <div className="settings-panel">
      <div className="panel-card">
        <div className="panel-header">
          <h2 className="panel-title">{t('configuracion:contabilidad.title')}</h2>
          <p className="panel-desc">{t('configuracion:contabilidad.subtitle')}</p>
        </div>

        {loading ? (
          <div className="panel-loading"><span className="spinner" /> {t('common:loading')}</div>
        ) : (
          <div className="contabilidad-content">
            {/* Account Types */}
            <section className="contabilidad-section">
              <h3 className="contabilidad-section-title">{t('configuracion:contabilidad.typesTitle')}</h3>
              <p className="contabilidad-section-desc">{t('configuracion:contabilidad.typesDesc')}</p>
              <div className="contabilidad-types-grid">
                {FIXED_ACCOUNT_TYPES.map((ft) => (
                  <div key={ft.value} className="contabilidad-type-card fixed">
                    <span className="contabilidad-type-icon"><InlineIcon icon={ft.icon} size={18} /></span>
                    <span className="contabilidad-type-name">{t(ft.labelKey)}</span>
                    <span className="contabilidad-type-badge">{t('configuracion:contabilidad.fixed')}</span>
                  </div>
                ))}
                {customTypes.map((type) => (
                  <div key={type} className="contabilidad-type-card custom">
                    <span className="contabilidad-type-icon"><InlineIcon icon="Wallet" size={18} /></span>
                    <span className="contabilidad-type-name">{type}</span>
                    <button className="contabilidad-type-delete" onClick={() => handleDeleteCustomType(type)} title={t('common:buttons.delete')}>
                      <IconX width={12} height={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="contabilidad-add-type">
                <input
                  type="text"
                  className="tx-input"
                  placeholder={t('configuracion:contabilidad.newTypePlaceholder')}
                  value={newCustomType}
                  onChange={(e) => setNewCustomType(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomType()}
                />
                <button className="btn btn-primary" onClick={handleAddCustomType} disabled={!newCustomType.trim()}>
                  <IconPlus width={14} /> {t('configuracion:contabilidad.addType')}
                </button>
              </div>
            </section>

            {/* Accounts */}
            <section className="contabilidad-section">
              <div className="contabilidad-section-header">
                <div>
                  <h3 className="contabilidad-section-title">{t('configuracion:contabilidad.accountsTitle')}</h3>
                  <p className="contabilidad-section-desc">{t('configuracion:contabilidad.accountsDesc')}</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateAccount}>
                  <IconPlus width={14} /> {t('finanzas:header.newAccount')}
                </button>
              </div>
              {accounts.length === 0 ? (
                <div className="contabilidad-empty">{t('configuracion:contabilidad.noAccounts')}</div>
              ) : (
                <div className="contabilidad-accounts-list">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="contabilidad-account-card" style={{ borderLeftColor: acc.color }}>
                      <div className="contabilidad-account-main">
                        <span className="contabilidad-account-icon" style={{ background: `${acc.color}20` }}>
                          <InlineIcon icon={acc.icon || 'Wallet'} size={16} />
                        </span>
                        <div className="contabilidad-account-info">
                          <span className="contabilidad-account-name">{acc.name}</span>
                          <span className="contabilidad-account-meta">{acc.type} · {acc.currency}</span>
                          <span className="contabilidad-account-balance" style={{ color: acc.color }}>
                            {showAmounts ? formatInCurrency(acc.balance, acc.currency) : '••••••'}
                          </span>
                        </div>
                      </div>
                      <div className="contabilidad-account-actions">
                        <button className="btn btn-sm btn-outline" onClick={() => openEditAccount(acc)}>{t('common:buttons.edit')}</button>
                        <button className="btn btn-sm btn-outline accounting-mini-danger" onClick={() => handleDeleteAccount(acc)}>{t('common:buttons.delete')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Advanced accounting */}
            <section className="contabilidad-section">
              <h3 className="contabilidad-section-title">{t('finanzas:modals.accounting.globalActions')}</h3>
              <p className="contabilidad-section-desc">{t('finanzas:modals.accounting.globalActionsDesc')}</p>
              <div className="accounting-actions">
                <button className="accounting-btn accounting-btn-danger" onClick={handleWipeAllUserTransactions} disabled={accountingLoading}>
                  <span className="accounting-btn-icon"><InlineIcon icon="Trash2" size={18} /></span>
                  <div className="accounting-btn-content">
                    <span className="accounting-btn-label">{t('finanzas:modals.accounting.wipeAll')}</span>
                    <span className="accounting-btn-desc">{t('finanzas:modals.accounting.wipeAllDesc')}</span>
                  </div>
                </button>
                <button className="accounting-btn accounting-btn-warning" onClick={() => handleWipeUserTransactionsByType('income')} disabled={accountingLoading}>
                  <span className="accounting-btn-icon"><InlineIcon icon="Download" size={18} /></span>
                  <div className="accounting-btn-content">
                    <span className="accounting-btn-label">{t('finanzas:modals.accounting.wipeIncome')}</span>
                    <span className="accounting-btn-desc">{t('finanzas:modals.accounting.wipeIncomeDesc')}</span>
                  </div>
                </button>
                <button className="accounting-btn accounting-btn-warning" onClick={() => handleWipeUserTransactionsByType('expense')} disabled={accountingLoading}>
                  <span className="accounting-btn-icon"><InlineIcon icon="Send" size={18} /></span>
                  <div className="accounting-btn-content">
                    <span className="accounting-btn-label">{t('finanzas:modals.accounting.wipeExpenses')}</span>
                    <span className="accounting-btn-desc">{t('finanzas:modals.accounting.wipeExpensesDesc')}</span>
                  </div>
                </button>
                <button className="accounting-btn accounting-btn-warning" onClick={() => handleWipeUserTransactionsByType('saving')} disabled={accountingLoading}>
                  <span className="accounting-btn-icon"><InlineIcon icon="Wallet" size={18} /></span>
                  <div className="accounting-btn-content">
                    <span className="accounting-btn-label">{t('finanzas:modals.accounting.wipeSavings')}</span>
                    <span className="accounting-btn-desc">{t('finanzas:modals.accounting.wipeSavingsDesc')}</span>
                  </div>
                </button>
                <button className="accounting-btn accounting-btn-info" onClick={handleRecalculateAllBalances} disabled={accountingLoading}>
                  <span className="accounting-btn-icon"><InlineIcon icon="RefreshCw" size={18} /></span>
                  <div className="accounting-btn-content">
                    <span className="accounting-btn-label">{t('finanzas:modals.accounting.recalculate')}</span>
                    <span className="accounting-btn-desc">{t('finanzas:modals.accounting.recalculateDesc')}</span>
                  </div>
                </button>
              </div>
            </section>

            {/* Per-account wipe */}
            {accounts.length > 0 && (
              <section className="contabilidad-section">
                <h3 className="contabilidad-section-title">{t('finanzas:modals.accounting.perAccount')}</h3>
                <p className="contabilidad-section-desc">{t('finanzas:modals.accounting.perAccountDesc')}</p>
                <div className="accounting-accounts-list">
                  {accounts.map((acc) => (
                    <div key={`wipe-${acc.id}`} className="accounting-account-card" style={{ borderLeftColor: acc.color }}>
                      <div className="accounting-account-header">
                        <span className="accounting-account-icon" style={{ background: `${acc.color}20` }}><InlineIcon icon={acc.icon || 'Wallet'} size={14} /></span>
                        <div className="accounting-account-info">
                          <span className="accounting-account-name">{acc.name}</span>
                          <span className="accounting-account-balance" style={{ color: acc.color }}>
                            {showAmounts ? formatInCurrency(acc.balance, acc.currency) : '••••••'}
                          </span>
                        </div>
                      </div>
                      <div className="accounting-account-actions">
                        <button className="accounting-mini-btn accounting-mini-danger" onClick={() => handleWipeAccountTransactions(acc.id, 'all')} disabled={accountingLoading}>{t('finanzas:modals.accounting.emptyAccount')}</button>
                        <button className="accounting-mini-btn accounting-mini-warning" onClick={() => handleWipeAccountTransactions(acc.id, 'income')} disabled={accountingLoading}>{t('finanzas:modals.accounting.income')}</button>
                        <button className="accounting-mini-btn accounting-mini-warning" onClick={() => handleWipeAccountTransactions(acc.id, 'expense')} disabled={accountingLoading}>{t('finanzas:modals.accounting.expenses')}</button>
                        <button className="accounting-mini-btn accounting-mini-warning" onClick={() => handleWipeAccountTransactions(acc.id, 'saving')} disabled={accountingLoading}>{t('finanzas:modals.accounting.savings')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="accounting-info-box">
              <span className="accounting-info-icon"><InlineIcon icon="Lightbulb" size={18} /></span>
              <div className="accounting-info-text">
                <strong>{t('finanzas:modals.accounting.accountingLogic')}</strong> {t('finanzas:modals.accounting.accountingInfo')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="modal-overlay" onClick={closeAccountModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{editingAccount ? t('finanzas:modals.editAccount.title') : t('finanzas:modals.newAccount.title')}</h2>
                <p className="modal-subtitle">{editingAccount ? t('finanzas:modals.editAccount.subtitle') : t('finanzas:modals.newAccount.subtitle')}</p>
              </div>
              <button className="modal-close" onClick={closeAccountModal}><IconX width={18} height={18} /></button>
            </div>
            <div className="modal-body">
              <div className="tx-field">
                <label className="tx-label">{t('finanzas:modals.newAccount.name')}</label>
                <input className="tx-input" type="text" placeholder={t('finanzas:modals.newAccount.namePlaceholder')} value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} />
              </div>
              <div className="tx-field">
                <label className="tx-label">{t('finanzas:modals.newAccount.type')}</label>
                <CustomSelect
                  value={accountForm.type}
                  onChange={(val) => setAccountForm({ ...accountForm, type: val as AccountType })}
                  options={allTypeOptions}
                  placeholder={t('finanzas:modals.newAccount.typePlaceholder')}
                  allowCustom
                  onAddCustom={(val) => setAccountForm({ ...accountForm, type: val as AccountType })}
                />
              </div>
              {!editingAccount && (
                <>
                  <div className="tx-field">
                    <label className="tx-label">{t('finanzas:modals.newAccount.category')}</label>
                    <CustomSelect
                      value={accountCategory}
                      onChange={(val) => {
                        setAccountCategory(val as 'monedas' | 'criptos');
                        setAccountForm({ ...accountForm, currency: val === 'criptos' ? 'USDT' : 'BS' });
                      }}
                      options={[
                        { value: 'monedas', label: t('finanzas:rates.fiatTitle'), icon: 'ArrowLeftRight' },
                        { value: 'criptos', label: t('finanzas:rates.cryptoTitle'), icon: 'Bitcoin' },
                      ]}
                      placeholder={t('finanzas:modals.newAccount.categoryPlaceholder')}
                    />
                  </div>
                  <div className="tx-field">
                    <label className="tx-label">{t('finanzas:modals.newAccount.currency')}</label>
                    <CustomSelect
                      value={accountForm.currency || 'BS'}
                      onChange={(val) => setAccountForm({ ...accountForm, currency: val as CurrencyCode })}
                      options={
                        accountCategory === 'criptos'
                          ? [
                              { value: 'USDT', label: t('finanzas:currencies.USDT.label'), icon: 'Diamond' },
                              { value: 'SOL', label: t('finanzas:currencies.SOL.label'), icon: 'Sun' },
                              { value: 'BTC', label: t('finanzas:currencies.BTC.label'), icon: 'Circle' },
                              { value: 'USDC', label: t('finanzas:currencies.USDC.label'), icon: 'Gem' },
                            ]
                          : [
                              { value: 'BS', label: t('finanzas:currencies.BS.label'), icon: 'Banknote' },
                              { value: 'USD', label: t('finanzas:currencies.USD.label'), icon: 'DollarSign' },
                              { value: 'EUR', label: t('finanzas:currencies.EUR.label'), icon: 'Euro' },
                              { value: 'COP', label: t('finanzas:currencies.COP.label'), icon: 'Coins' },
                            ]
                      }
                      placeholder={t('finanzas:modals.newAccount.currencyPlaceholder')}
                    />
                  </div>
                </>
              )}
              {isCrypto && (
                <div className="tx-field">
                  <label className="tx-label">{t('finanzas:modals.newAccount.conversionRate')}</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className={`btn btn-sm ${accountForm.rateMode !== 'p2p' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAccountForm({ ...accountForm, rateMode: 'official' })} style={{ flex: 1 }}>
                      {t('finanzas:modals.newAccount.official')}
                    </button>
                    <button type="button" className={`btn btn-sm ${accountForm.rateMode === 'p2p' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAccountForm({ ...accountForm, rateMode: 'p2p' })} style={{ flex: 1 }}>
                      {t('finanzas:modals.newAccount.p2p')}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    {accountForm.rateMode === 'p2p' ? t('finanzas:modals.newAccount.p2pRate') : t('finanzas:modals.newAccount.officialRate')}
                  </span>
                </div>
              )}
              {!editingAccount && (
                <div className="tx-field">
                  <label className="tx-label">{t('finanzas:modals.newAccount.initialBalance')}</label>
                  <div className="tx-input-wrap">
                    <span className="tx-currency">{currencyMap[accountForm.currency || 'BS'].symbol}</span>
                    <input className="tx-input tx-input-amount" type="number" min="0" step={isCrypto ? '0.00000001' : '0.01'} placeholder="0.00" value={accountForm.balance || ''} onChange={(e) => setAccountForm({ ...accountForm, balance: Number(e.target.value) })} />
                  </div>
                </div>
              )}
              <div className="tx-field">
                <label className="tx-label">{t('finanzas:modals.newAccount.color')}</label>
                <div className="color-picker-row">
                  {ACCOUNT_COLORS.map((c) => (
                    <button key={c} className={`color-dot ${accountForm.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setAccountForm({ ...accountForm, color: c })} />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeAccountModal}>{t('common:buttons.cancel')}</button>
              <button className="btn btn-primary" onClick={handleSaveAccount} disabled={!accountForm.name.trim()}>
                {editingAccount ? t('common:buttons.save') : t('finanzas:modals.newAccount.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmText={confirmState.confirmText || t('common:buttons.confirm')}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

      <style>{`
        .contabilidad-content { display: flex; flex-direction: column; gap: 24px; }
        .contabilidad-section { }
        .contabilidad-section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .contabilidad-section-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; }
        .contabilidad-section-desc { font-size: 0.75rem; color: var(--text-tertiary); margin: 0 0 12px 0; }

        .contabilidad-types-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-bottom: 12px; }
        .contabilidad-type-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 10px; border-radius: 10px; border: 1px solid var(--border-default); background: var(--bg-input); text-align: center; }
        .contabilidad-type-card.fixed { border-color: rgba(61,204,142,0.25); }
        .contabilidad-type-card.custom { border-style: dashed; }
        .contabilidad-type-icon { color: var(--text-primary); }
        .contabilidad-type-name { font-size: 0.8rem; font-weight: 700; color: var(--text-primary); }
        .contabilidad-type-badge { font-size: 0.6rem; color: var(--color-prosper-green); background: rgba(61,204,142,0.12); padding: 2px 6px; border-radius: 999px; }
        .contabilidad-type-delete { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%; border: none; background: rgba(239,68,68,0.1); color: var(--color-error); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .contabilidad-type-delete:hover { background: rgba(239,68,68,0.2); }

        .contabilidad-add-type { display: flex; gap: 8px; }
        .contabilidad-add-type .tx-input { flex: 1; }

        .contabilidad-accounts-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
        .contabilidad-account-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border-radius: 12px; border: 1px solid var(--border-default); border-left: 4px solid; background: var(--bg-input); }
        .contabilidad-account-main { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .contabilidad-account-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .contabilidad-account-info { flex: 1; min-width: 0; }
        .contabilidad-account-name { display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .contabilidad-account-meta { display: block; font-size: 0.65rem; color: var(--text-tertiary); text-transform: capitalize; }
        .contabilidad-account-balance { display: block; font-size: 0.875rem; font-weight: 800; }
        .contabilidad-account-actions { display: flex; gap: 6px; flex-shrink: 0; }

        .contabilidad-empty { padding: 24px; text-align: center; color: var(--text-secondary); font-size: 0.85rem; border: 1px dashed var(--border-default); border-radius: 12px; }
        .panel-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px; color: var(--text-secondary); font-size: 0.875rem; }

        .accounting-mini-danger { color: var(--color-error) !important; border-color: rgba(239,68,68,0.3) !important; }
        .accounting-mini-danger:hover { background: rgba(239,68,68,0.1) !important; }

        @media (max-width: 768px) {
          .contabilidad-section-header { flex-direction: column; }
          .contabilidad-accounts-list { grid-template-columns: 1fr; }
          .contabilidad-account-card { flex-direction: column; align-items: flex-start; }
          .contabilidad-account-actions { width: 100%; justify-content: flex-end; }
          .contabilidad-types-grid { grid-template-columns: repeat(2, 1fr); }
          .contabilidad-add-type { flex-direction: column; }
          .accounting-actions { grid-template-columns: 1fr 1fr; }
          .accounting-accounts-list { grid-template-columns: 1fr; }
          .accounting-account-actions { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>
    </div>
  );
}
