'use client';

import React, { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useGoals } from '@/lib/contexts/GoalsContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useToast } from '@/app/components/Toast';
import { ConfirmDialog } from '@/app/components/Toast';
import { CustomSelect } from '@/app/components/CustomSelect';
import { subscribeToAccounts, updateAccountBalance } from '@/lib/firestore/accounts';
import { createTransaction } from '@/lib/firestore/transactions';
import { db, getDoc, doc, updateDoc } from '@/lib/firebase';
import { sendExpenseRequest, searchUserByEmail, searchUsersByName, getReceivedRequests, respondToRequest } from '@/lib/firestore/requests';
import { calculateNextDueDate, convertRecurringToMonthly } from '@/lib/firestore/recurring';
import { addSubPlan, updateSubPlan, deleteSubPlan, recordSubPlanPayment } from '@/lib/firestore/plans';
import { addNotification } from '@/lib/firestore/notifications';
import type { FoundUser } from '@/lib/firestore/requests';
import { IconPlus, IconX, IconTrash, IconEdit, IconUsers, IconClock } from '@/app/components/icons';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';
import { Check, X } from 'lucide-react';
import { CURRENCY_LIST } from '@/lib/currency';
import type { FinancialPlan, PlanType, PlanCategory, PlanStatus, RecurringFrequency, Transaction, FinancialAccount, ExpenseRequest, CurrencyCode, SubPlan } from '@/types';


const STATUS_COLORS: Record<PlanStatus, string> = {
  pending: '#A8A29E',
  progress: '#3DCC8E',
  completed: '#22C55E',
  cancelled: '#EF4444',
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nextMonthISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sortPlansByDueDate(plans: FinancialPlan[]): FinancialPlan[] {
  return [...plans].sort((a, b) => {
    const dateA = a.deadline || a.nextDueDate;
    const dateB = b.deadline || b.nextDueDate;
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
}

const MetasPage = memo(function MetasPage() {
  const { plans, addPlan, updatePlanFn, deletePlanFn, refresh } = useGoals();
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const { formatAmount, currencyMap, displayCurrency, formatInCurrency, convertBetween, baseCurrency, rates } = useCurrency();
  const uid = user?.uid || '';
  const { t } = useTranslation(['metas', 'common']);

  const PLAN_TYPES: { value: PlanType; label: string; icon: string; color: string; desc: string }[] = [
    { value: 'savings', label: t('metas:planTypes.savings'), icon: 'Wallet', color: '#3DCC8E', desc: t('metas:planTypeDescriptions.savings') },
    { value: 'expense', label: t('metas:planTypes.expense'), icon: 'ShoppingCart', color: '#EF4444', desc: t('metas:planTypeDescriptions.expense') },
    { value: 'recurring', label: t('metas:planTypes.recurring'), icon: 'RefreshCw', color: '#F59E0B', desc: t('metas:planTypeDescriptions.recurring') },
  ];

  const PLAN_CATEGORIES: { value: PlanCategory; icon: string }[] = [
    { value: 'Ahorro', icon: 'Wallet' },
    { value: 'Inversión', icon: 'TrendingUp' },
    { value: 'Educación', icon: 'GraduationCap' },
    { value: 'Comida', icon: 'Utensils' },
    { value: 'Tecnología', icon: 'Smartphone' },
    { value: 'Vivienda', icon: 'Home' },
    { value: 'Transporte', icon: 'Car' },
    { value: 'Salud', icon: 'Pill' },
    { value: 'Entretenimiento', icon: 'Video' },
    { value: 'Suscripción', icon: 'Tv' },
    { value: 'Alquiler', icon: 'Building2' },
    { value: 'Servicios', icon: 'Zap' },
    { value: 'Otro', icon: 'Pin' },
  ];

  const RECURRENCES: { value: RecurringFrequency; label: string }[] = [
    { value: 'daily', label: t('metas:recurrences.daily') },
    { value: 'weekly', label: t('metas:recurrences.weekly') },
    { value: 'biweekly', label: t('metas:recurrences.biweekly') },
    { value: 'monthly', label: t('metas:recurrences.monthly') },
    { value: 'quarterly', label: t('metas:recurrences.quarterly') },
    { value: 'yearly', label: t('metas:recurrences.yearly') },
  ];

  const STATUS_LABELS: Record<PlanStatus, string> = {
    pending: t('metas:status.pending'),
    progress: t('metas:status.progress'),
    completed: t('metas:status.completed'),
    cancelled: t('metas:status.cancelled'),
  };

  function getDaysRemaining(deadline: string): string {
    if (!deadline) return t('metas:planCard.daysRemaining.noDate');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deadline + 'T12:00:00');
    target.setHours(0, 0, 0, 0);
    const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return t('metas:planCard.daysRemaining.overdue', { days: Math.abs(days) });
    if (days === 0) return t('metas:planCard.daysRemaining.today');
    if (days === 1) return t('metas:planCard.daysRemaining.tomorrow');
    return t('metas:planCard.daysRemaining.days', { days });
  }

  const [filter, setFilter] = useState<PlanType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FinancialPlan | null>(null);
  const [showAddFundsModal, setShowAddFundsModal] = useState<FinancialPlan | null>(null);
  const [showShareModal, setShowShareModal] = useState<FinancialPlan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<FinancialPlan | null>(null);
  const [showSubPlansModal, setShowSubPlansModal] = useState<FinancialPlan | null>(null);
  const [subPlanForm, setSubPlanForm] = useState({ title: '', target: '', currency: displayCurrency as CurrencyCode, deadline: '' });
  const [editingSubPlanId, setEditingSubPlanId] = useState<string | null>(null);
  const [subPlanPayId, setSubPlanPayId] = useState<string | null>(null);
  const [formSubPlans, setFormSubPlans] = useState<SubPlan[]>([]);
  const [editingFormSubPlanId, setEditingFormSubPlanId] = useState<string | null>(null);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState<FinancialPlan | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; variant: 'danger' | 'warning' | 'info'; confirmText?: string }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' });

  // Form states
  const [formType, setFormType] = useState<PlanType>('savings');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<PlanCategory>('Ahorro');
  const [formTarget, setFormTarget] = useState('');
  const [formDeadline, setFormDeadline] = useState(todayISO());
  const [formFrequency, setFormFrequency] = useState<RecurringFrequency>('monthly');
  const [formAccountId, setFormAccountId] = useState('');
  const [formCurrency, setFormCurrency] = useState<CurrencyCode>(displayCurrency);
  const [formSharedEmail, setFormSharedEmail] = useState('');
  const [formShareAmount, setFormShareAmount] = useState('');
  const [formShareMessage, setFormShareMessage] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Add funds state
  const [addAmount, setAddAmount] = useState('');
  const [addAccountId, setAddAccountId] = useState('');

  // Record payment state
  const [payAmount, setPayAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');

  // Share state
  const [shareEmail, setShareEmail] = useState('');
  const [shareAmount, setShareAmount] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareFoundUser, setShareFoundUser] = useState<FoundUser | null>(null);
  const [shareSearchResults, setShareSearchResults] = useState<FoundUser[]>([]);
  const [shareSearching, setShareSearching] = useState(false);

  // Received requests
  const [receivedRequests, setReceivedRequests] = useState<ExpenseRequest[]>([]);

  // Load accounts
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToAccounts(uid, (accs) => setAccounts(accs));
    return () => unsub();
  }, [uid]);

  // Load received requests
  useEffect(() => {
    if (!uid) return;
    getReceivedRequests(uid).then(setReceivedRequests);
  }, [uid]);

  // Auto-calculate expense target from temporary sub-plans
  useEffect(() => {
    if (formType === 'expense' && formSubPlans.length > 0) {
      const total = formSubPlans.reduce((sum, sub) => sum + convertBetween(sub.target || 0, sub.currency, formCurrency), 0);
      setFormTarget(String(Number(total.toFixed(8))));
    }
  }, [formSubPlans, formCurrency, formType]);

  // Sub-planes only apply to expense plans
  useEffect(() => {
    if (formType !== 'expense') {
      setFormSubPlans([]);
    }
  }, [formType]);

  // Auto-open modal from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add-plan') {
      openNewModal();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const filteredPlans = plans.filter(p => {
    if (filter !== 'all' && p.type !== filter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });
  const sortedPlans = sortPlansByDueDate(filteredPlans);

  const stats = {
    total: plans.filter(p => p.status !== 'cancelled').length,
    savings: plans.filter(p => p.type === 'savings' && p.status !== 'cancelled'),
    expenses: plans.filter(p => p.type === 'expense' && p.status !== 'cancelled'),
    recurring: plans.filter(p => p.type === 'recurring' && p.status !== 'cancelled'),
    active: plans.filter(p => p.status === 'progress').length,
    completed: plans.filter(p => p.status === 'completed').length,
  };

  const toBase = (amount: number, currency?: CurrencyCode) =>
    convertBetween(amount, currency || baseCurrency, baseCurrency);

  const totalSavingsTarget = stats.savings.reduce((s, p) => s + toBase(p.target, p.currency), 0);
  const totalSavingsCurrent = stats.savings.reduce((s, p) => s + toBase(p.current, p.currency), 0);
  const totalExpenseTarget = stats.expenses.reduce((s, p) => {
    if (p.subPlans?.length) {
      return s + p.subPlans.reduce((ss, sub) => ss + toBase(sub.target, sub.currency), 0);
    }
    return s + toBase(p.target, p.currency);
  }, 0);
  const totalExpenseCurrent = stats.expenses.reduce((s, p) => {
    if (p.subPlans?.length) {
      return s + p.subPlans.reduce((ss, sub) => ss + toBase(sub.current, sub.currency), 0);
    }
    return s + toBase(p.current, p.currency);
  }, 0);
  const totalRecurringMonthly = stats.recurring.reduce(
    (s, p) => s + convertRecurringToMonthly(toBase(p.target, p.currency), p.frequency || 'monthly'),
    0
  );

  const resetForm = () => {
    setFormType('savings');
    setFormTitle('');
    setFormDesc('');
    setFormCategory('Ahorro');
    setFormTarget('');
    setFormDeadline(todayISO());
    setFormFrequency('monthly');
    setFormAccountId('');
    setFormCurrency(displayCurrency);
    setFormSharedEmail('');
    setFormShareAmount('');
    setFormShareMessage('');
    setFormSubPlans([]);
    resetFormSubPlan();
  };

  const resetSubPlanForm = () => {
    setSubPlanForm({ title: '', target: '', currency: displayCurrency as CurrencyCode, deadline: '' });
    setEditingSubPlanId(null);
    setSubPlanPayId(null);
  };

  const resetFormSubPlan = () => {
    setSubPlanForm({ title: '', target: '', currency: displayCurrency as CurrencyCode, deadline: '' });
    setEditingFormSubPlanId(null);
  };

  const addFormSubPlan = () => {
    const target = Number(subPlanForm.target);
    if (!subPlanForm.title || isNaN(target) || target <= 0) {
      warning(t('metas:validation.completeTitleAndAmount'));
      return;
    }
    const now = Date.now();
    if (editingFormSubPlanId) {
      setFormSubPlans(prev => prev.map(s => (s.id === editingFormSubPlanId ? { ...s, title: subPlanForm.title, target, currency: subPlanForm.currency, deadline: subPlanForm.deadline || undefined, updatedAt: now } : s)));
    } else {
      const sub: SubPlan = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: subPlanForm.title,
        target,
        current: 0,
        currency: subPlanForm.currency,
        deadline: subPlanForm.deadline || undefined,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      setFormSubPlans(prev => [...prev, sub]);
    }
    resetFormSubPlan();
  };

  const editFormSubPlan = (id: string) => {
    const sub = formSubPlans.find(s => s.id === id);
    if (!sub) return;
    setSubPlanForm({ title: sub.title, target: String(sub.target), currency: sub.currency, deadline: sub.deadline || '' });
    setEditingFormSubPlanId(id);
  };

  const deleteFormSubPlan = (id: string) => {
    setFormSubPlans(prev => prev.filter(s => s.id !== id));
    if (editingFormSubPlanId === id) resetFormSubPlan();
  };

  // Firestore no acepta undefined; limpiar sub-planes antes de guardar
  const serializeSubPlans = (subs: SubPlan[]) => subs.map(sub => {
    const { deadline, ...rest } = sub;
    return deadline ? { ...rest, deadline } : rest;
  });

  const handleCreatePlan = async () => {
    if (!formTitle || !uid) {
      warning(t('metas:validation.completeTitleAndAmount'));
      return;
    }
    const isExpenseWithSubs = formType === 'expense' && formSubPlans.length > 0;
    if (!isExpenseWithSubs && !formTarget) {
      warning(t('metas:validation.completeTitleAndAmount'));
      return;
    }
    let target = Number(formTarget);
    if (isExpenseWithSubs) {
      target = formSubPlans.reduce((sum, sub) => sum + convertBetween(Number(sub.target) || 0, sub.currency, formCurrency), 0);
    }
    if (isNaN(target) || target <= 0) {
      warning(t('metas:validation.invalidAmount'));
      return;
    }

    setFormLoading(true);
    try {
      const planData: Omit<FinancialPlan, 'id' | 'createdAt' | 'updatedAt'> = {
        ownerId: uid,
        title: formTitle,
        description: formDesc,
        type: formType,
        category: formCategory,
        target,
        current: 0,
        deadline: formDeadline,
        status: 'pending',
        color: PLAN_TYPES.find(t => t.value === formType)?.color || '#3DCC8E',
        icon: PLAN_CATEGORIES.find(c => c.value === formCategory)?.icon || 'Pin',
        sharedWith: [],
        shareAmount: formShareAmount ? Number(formShareAmount) : 0,
        totalPaid: 0,
        currency: formCurrency,
      };

      // Solo agregar campos opcionales si tienen valor
      if (formType === 'recurring') {
        planData.frequency = formFrequency;
        planData.nextDueDate = formDeadline;
      }
      if (formAccountId) {
        planData.accountId = formAccountId;
      }
      if (isExpenseWithSubs) {
        planData.subPlans = serializeSubPlans(formSubPlans);
      }

      await addPlan(planData, rates?.rates || {});
      success(t('metas:toasts.planCreated', { title: formTitle }));
      setShowNewModal(false);
      resetForm();
    } catch (e: any) {
      error(`${t('common:toast.error')}: ${e?.message || t('metas:toasts.unknownError')}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditPlan = async () => {
    if (!editingPlan || !formTitle) return;
    const isExpenseWithSubs = formType === 'expense' && formSubPlans.length > 0;
    if (!isExpenseWithSubs && !formTarget) return;
    let target = Number(formTarget);
    if (isExpenseWithSubs) {
      target = formSubPlans.reduce((sum, sub) => sum + convertBetween(sub.target || 0, sub.currency, formCurrency), 0);
    }
    if (isNaN(target) || target <= 0) {
      warning(t('metas:validation.invalidAmount'));
      return;
    }

    setFormLoading(true);
    try {
      const updates: Partial<FinancialPlan> = {
        title: formTitle,
        description: formDesc,
        category: formCategory,
        target,
        deadline: formDeadline,
        frequency: formType === 'recurring' ? formFrequency : editingPlan.frequency,
        nextDueDate: formType === 'recurring' ? formDeadline : editingPlan.nextDueDate,
        accountId: formAccountId || undefined,
        currency: formCurrency,
      };
      if (formType === 'expense') {
        updates.subPlans = serializeSubPlans(formSubPlans);
      } else {
        updates.subPlans = [];
      }
      await updatePlanFn(editingPlan.id, updates);
      success(t('metas:toasts.planUpdated', { title: formTitle }));
      setEditingPlan(null);
      resetForm();
    } catch (e: any) {
      error(`Error: ${e?.message || 'Error desconocido'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePlan = (plan: FinancialPlan) => {
    setConfirmState({
      isOpen: true,
      title: t('metas:toasts.deletePlanTitle'),
      message: t('metas:toasts.deletePlanMessage', { title: plan.title }),
      variant: 'danger',
      confirmText: t('metas:toasts.deleteConfirm'),
      onConfirm: async () => {
        try {
          await deletePlanFn(plan.id);
          success(t('metas:toasts.planDeleted'));
        } catch (e: any) {
          error(`${t('common:toast.error')}: ${e?.message}`);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleAddFunds = async (plan: FinancialPlan) => {
    const amount = Number(addAmount);
    if (isNaN(amount) || amount <= 0) {
      warning(t('metas:validation.invalidAmount'));
      return;
    }

    if (addAccountId) {
      const acc = accounts.find(a => a.id === addAccountId);
      if (acc && acc.balance < amount) {
        warning(t('metas:validation.insufficientBalance', { balance: formatAmount(acc.balance) }));
        return;
      }
    }

    setFormLoading(true);
    try {
      // Actualizar plan
      const newCurrent = Math.min(plan.current + amount, plan.target);
      const newStatus: PlanStatus = newCurrent >= plan.target ? 'completed' : 'progress';
      const contributions = { ...(plan.contributions || {}), [uid || 'unknown']: (plan.contributions?.[uid || 'unknown'] || 0) + amount };
      await updatePlanFn(plan.id, { current: newCurrent, status: newStatus, contributions });

      // Crear transacción si hay cuenta
      if (addAccountId && uid) {
        const acc = accounts.find(a => a.id === addAccountId);
        await createTransaction({
          ownerId: uid,
          amount,
          type: 'saving',
          category: plan.category,
          description: t('metas:toasts.savingTransaction', { title: plan.title }),
          date: Date.now(),
          accountId: addAccountId,
          currency: acc?.currency || 'USD',
        });
        await updateAccountBalance(addAccountId, -amount);
      }

      success(t('metas:toasts.fundsAdded', { amount: formatAmount(amount), title: plan.title }));
      setShowAddFundsModal(null);
      setAddAmount('');
      setAddAccountId('');
    } catch (e: any) {
      error(`Error: ${e?.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleRecordPayment = async (plan: FinancialPlan) => {
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) {
      warning(t('metas:validation.invalidAmount'));
      return;
    }

    if (payAccountId) {
      const acc = accounts.find(a => a.id === payAccountId);
      if (acc && acc.balance < amount) {
        warning(t('metas:validation.insufficientBalance', { balance: formatAmount(acc.balance) }));
        return;
      }
    }

    setFormLoading(true);
    try {
      const newCurrent = plan.current + amount;
      const totalPaid = (plan.totalPaid || 0) + amount;

      // Calcular next due date
      const nextDueStr = calculateNextDueDate(plan.nextDueDate || todayISO(), plan.frequency || 'monthly');

      await updatePlanFn(plan.id, {
        current: newCurrent,
        totalPaid,
        lastPaidDate: todayISO(),
        nextDueDate: nextDueStr,
      });

      // Crear transacción
      if (payAccountId && uid) {
        const acc = accounts.find(a => a.id === payAccountId);
        await createTransaction({
          ownerId: uid,
          amount,
          type: 'expense',
          category: plan.category,
          description: t('metas:toasts.paymentTransaction', { title: plan.title }),
          date: Date.now(),
          accountId: payAccountId,
          currency: acc?.currency || 'USD',
        });
        await updateAccountBalance(payAccountId, -amount);
      }

      success(t('metas:toasts.paymentRecorded', { amount: formatAmount(amount) }));
      setShowRecordPaymentModal(null);
      setPayAmount('');
      setPayAccountId('');
    } catch (e: any) {
      error(`Error: ${e?.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Sub-planes handlers ───
  const openSubPlansModal = (plan: FinancialPlan) => {
    setShowSubPlansModal(plan);
    resetSubPlanForm();
  };

  const handleSaveSubPlan = async (plan: FinancialPlan) => {
    const target = Number(subPlanForm.target);
    if (!subPlanForm.title || isNaN(target) || target <= 0) {
      warning(t('metas:validation.completeTitleAndAmount'));
      return;
    }
    setFormLoading(true);
    try {
      const data = {
        title: subPlanForm.title,
        target,
        currency: subPlanForm.currency,
        deadline: subPlanForm.deadline || undefined,
      };
      if (editingSubPlanId) {
        await updateSubPlan(plan.id, editingSubPlanId, data, rates?.rates || {});
        success(t('metas:subPlans.updated'));
      } else {
        await addSubPlan(plan.id, data, rates?.rates || {});
        success(t('metas:subPlans.added'));
      }
      resetSubPlanForm();
    } catch (e: any) {
      error(`Error: ${e?.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteSubPlan = async (plan: FinancialPlan, subPlanId: string) => {
    setConfirmState({
      isOpen: true,
      title: t('metas:subPlans.deleteTitle'),
      message: t('metas:subPlans.deleteMessage'),
      variant: 'danger',
      confirmText: t('metas:toasts.deleteConfirm'),
      onConfirm: async () => {
        try {
          await deleteSubPlan(plan.id, subPlanId, rates?.rates || {});
          success(t('metas:subPlans.deleted'));
        } catch (e: any) {
          error(`Error: ${e?.message}`);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handlePaySubPlan = async (plan: FinancialPlan) => {
    if (!subPlanPayId) return;
    const amount = Number(addAmount);
    if (isNaN(amount) || amount <= 0) {
      warning(t('metas:validation.invalidAmount'));
      return;
    }
    setFormLoading(true);
    try {
      await recordSubPlanPayment(plan.id, subPlanPayId, amount, rates?.rates || {});
      success(t('metas:subPlans.paymentRecorded', { amount: formatAmount(amount) }));
      setSubPlanPayId(null);
      setAddAmount('');
    } catch (e: any) {
      error(`Error: ${e?.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSharePlan = async (plan: FinancialPlan) => {
    if (!shareEmail || !shareAmount || !uid) {
      warning(t('metas:validation.completeEmailAndAmount'));
      return;
    }
    const amount = Number(shareAmount);
    if (isNaN(amount) || amount <= 0) {
      warning(t('metas:validation.invalidAmount'));
      return;
    }
    if (!shareFoundUser) {
      warning(t('metas:validation.userNotFound'));
      return;
    }

    setShareLoading(true);
    try {
      if (shareFoundUser.uid === uid) {
        error(t('metas:validation.cannotInviteSelf'));
        setShareLoading(false);
        return;
      }

      await sendExpenseRequest({
        planId: plan.id,
        fromOwnerId: uid,
        toOwnerId: shareFoundUser.uid,
        amount,
        status: 'pending',
        message: shareMessage || t('metas:toasts.shareMessageDefault', { title: plan.title }),
      });

      // Actualizar plan con sharedWith
      const updatedShared = [...(plan.sharedWith || []), shareFoundUser.uid];
      await updatePlanFn(plan.id, { sharedWith: updatedShared });

      success(t('metas:toasts.requestSent', { name: shareFoundUser.displayName || shareFoundUser.email }));
      setShowShareModal(null);
      setShareEmail('');
      setShareAmount('');
      setShareMessage('');
      setShareFoundUser(null);
    } catch (e: any) {
      error(`Error: ${e?.message}`);
    } finally {
      setShareLoading(false);
    }
  };

  const handleSearchShareUser = async (query: string) => {
    setShareEmail(query);
    setShareFoundUser(null);
    setShareSearchResults([]);
    if (!query || query.length < 2) return;
    setShareSearching(true);
    try {
      if (query.includes('@')) {
        const userFound = await searchUserByEmail(query);
        if (userFound && userFound.uid !== uid) setShareFoundUser(userFound);
      } else {
        const results = await searchUsersByName(query);
        setShareSearchResults(results.filter(u => u.uid !== uid));
      }
    } catch (e) {
      console.error('Error searching user:', e);
    } finally {
      setShareSearching(false);
    }
  };

  const selectShareUser = (user: FoundUser) => {
    setShareFoundUser(user);
    setShareSearchResults([]);
    setShareEmail(user.email || '');
  };

  const handleRespondRequest = async (request: ExpenseRequest, response: 'accepted' | 'rejected') => {
    try {
      await respondToRequest(request.id, response);
      setReceivedRequests(prev => prev.filter(r => r.id !== request.id));
      if (response === 'rejected' && request.planId) {
        const planDoc = await getDoc(doc(db, 'plans', request.planId));
        if (planDoc.exists()) {
          const data = planDoc.data();
          const sharedWith = data.sharedWith || [];
          const filtered = sharedWith.filter((suid: string) => suid !== uid);
          if (filtered.length !== sharedWith.length) {
            await updateDoc(doc(db, 'plans', request.planId), { sharedWith: filtered });
          }
          // Notificar al creador que rechazó
          await addNotification({
            ownerId: request.fromOwnerId,
            type: 'plan_rejected',
            title: t('metas:toasts.rejectionTitle'),
            message: t('metas:toasts.rejectionMessage', { name: user?.displayName || user?.email || 'Alguien', title: data.title }),
            read: false,
            meta: { planId: request.planId, requestId: request.id },
          });
        }
      }
      refresh();
      success(response === 'accepted' ? t('metas:toasts.requestAccepted') : t('metas:toasts.requestRejected'));
    } catch (e: any) {
      error(`Error: ${e?.message}`);
    }
  };

  const openEditModal = (plan: FinancialPlan) => {
    setEditingPlan(plan);
    setFormType(plan.type);
    setFormTitle(plan.title);
    setFormDesc(plan.description || '');
    setFormCategory(plan.category);
    setFormTarget(String(plan.target));
    setFormDeadline(plan.deadline || todayISO());
    setFormFrequency(plan.frequency || 'monthly');
    setFormAccountId(plan.accountId || '');
    setFormCurrency(plan.currency || displayCurrency);
    if (plan.type === 'expense' && plan.subPlans && plan.subPlans.length > 0) {
      setFormSubPlans(plan.subPlans);
    } else {
      setFormSubPlans([]);
    }
    setShowNewModal(true);
  };

  const openNewModal = (type?: PlanType) => {
    if (type) setFormType(type);
    setShowNewModal(true);
  };

  const renderPlanCard = (plan: FinancialPlan, index: number) => {
    const typeInfo = PLAN_TYPES.find(t => t.value === plan.type);
    const catInfo = PLAN_CATEGORIES.find(c => c.value === plan.category);
    const planCurrency = plan.currency || displayCurrency;
    const hasSubPlans = plan.type === 'expense' && plan.subPlans && plan.subPlans.length > 0;
    const planTarget = hasSubPlans
      ? plan.subPlans!.reduce((sum, sub) => sum + convertBetween(sub.target, sub.currency, planCurrency), 0)
      : plan.target;
    const planCurrent = hasSubPlans
      ? plan.subPlans!.reduce((sum, sub) => sum + convertBetween(sub.current, sub.currency, planCurrency), 0)
      : plan.current;
    const pct = planTarget > 0 ? Math.min(100, Math.round((planCurrent / planTarget) * 100)) : 0;

    return (
      <div key={plan.id} className="plan-card stagger-item" style={{ borderLeftColor: typeInfo?.color, animationDelay: `${index * 0.05}s` }}>
        <div className="plan-card-header">
          <div className="plan-card-icon" style={{ background: `${typeInfo?.color}20` }}>
            <InlineIcon icon={catInfo?.icon || 'Pin'} size={16} />
          </div>
          <div className="plan-card-info">
            <h3 className="plan-card-title">{plan.title}</h3>
            <span className="plan-card-type" style={{ color: typeInfo?.color }}>{typeInfo?.label}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
            {plan.sharedWith && plan.sharedWith.length > 0 && (
              <span className="plan-card-badge plan-card-badge-shared">{t('metas:planCard.shared')}</span>
            )}
            {plan.ownerId !== uid && (
              <span className="plan-card-badge plan-card-badge-invited">{t('metas:planCard.invited')}</span>
            )}
            <div className="plan-card-status" style={{ background: `${STATUS_COLORS[plan.status]}20`, color: STATUS_COLORS[plan.status] }}>
              {STATUS_LABELS[plan.status]}
            </div>
          </div>
        </div>

        <div className="plan-card-body">
          {plan.description && <p className="plan-card-desc">{plan.description}</p>}

          <div className="plan-card-amounts">
            <span className="plan-card-current">{formatInCurrency(planCurrent, planCurrency)}</span>
            <span className="plan-card-separator">/</span>
            <span className="plan-card-target">{formatInCurrency(planTarget, planCurrency)}</span>
          </div>

          <div className="plan-card-progress">
            <div className="plan-card-progress-bar">
              <div className="plan-card-progress-fill" style={{ width: `${pct}%`, background: typeInfo?.color }} />
            </div>
            <span className="plan-card-pct">{pct}%</span>
          </div>

          <div className="plan-card-meta">
            {plan.type === 'recurring' && plan.frequency && (
              <span className="plan-card-meta-item">
                <IconClock width={12} /> {RECURRENCES.find(r => r.value === plan.frequency)?.label} · {plan.nextDueDate ? getDaysRemaining(plan.nextDueDate) : ''}
              </span>
            )}
            {hasSubPlans && (
              <span className="plan-card-meta-item">
                <InlineIcon icon="List" size={12} /> {plan.subPlans!.filter(sp => sp.status === 'completed').length}/{plan.subPlans!.length} {t('metas:subPlans.completedShort')}
              </span>
            )}
            {plan.sharedWith && plan.sharedWith.length > 0 && (
              <span className="plan-card-meta-item">
                <IconUsers width={12} /> {plan.sharedWith.length} {t('metas:planCard.guest', { count: plan.sharedWith.length })}
              </span>
            )}
            {plan.deadline && plan.type !== 'recurring' && (
              <span className="plan-card-meta-item">
                <InlineIcon icon="CalendarDays" size={12} /> {getDaysRemaining(plan.deadline)}
              </span>
            )}
          </div>
          {plan.contributions && Object.keys(plan.contributions).length > 0 && (
            <div className="plan-card-contributions">
              {Object.entries(plan.contributions).map(([contribUid, contribAmount]) => (
                <span key={contribUid} className="plan-card-meta-item plan-card-contrib-item">
                  {contribUid === uid ? t('metas:planCard.yourContribution') : t('metas:planCard.otherUser')}: {formatInCurrency(contribAmount, plan.currency || displayCurrency)}
                </span>
              ))}
            </div>
          )}

          {hasSubPlans && (
            <div className="plan-card-subplans">
              <p className="plan-card-subplans-label">{t('metas:subPlans.inlineTitle', { defaultValue: 'Sub-planes' })}</p>
              <div className="plan-card-subplans-list">
                {plan.subPlans!.map((sub) => {
                  const subPct = sub.target > 0 ? Math.min(100, Math.round((sub.current / sub.target) * 100)) : 0;
                  return (
                    <div key={sub.id} className={`plan-card-subplan ${sub.status === 'completed' ? 'plan-card-subplan-completed' : ''}`}>
                      <div className="plan-card-subplan-header">
                        <span className="plan-card-subplan-title">{sub.title}</span>
                        <span className="plan-card-subplan-amount">-{formatInCurrency(sub.target - sub.current, sub.currency)}</span>
                      </div>
                      <div className="plan-card-progress" style={{ marginBottom: 0 }}>
                        <div className="plan-card-progress-bar">
                          <div className="plan-card-progress-fill" style={{ width: `${subPct}%`, background: sub.status === 'completed' ? '#22C55E' : '#EF4444' }} />
                        </div>
                        <span className="plan-card-pct">{subPct}%</span>
                      </div>
                      {sub.deadline && <span className="plan-card-meta-item" style={{ marginTop: '4px' }}><InlineIcon icon="CalendarDays" size={12} /> {getDaysRemaining(sub.deadline)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="plan-card-actions">
          {plan.type === 'savings' && plan.status !== 'completed' && (
            <button className="plan-action-btn plan-action-primary" onClick={() => { setShowAddFundsModal(plan); setAddAmount(''); setAddAccountId(''); }}>
              + {t('metas:planCard.add')}
            </button>
          )}
          {plan.type === 'recurring' && plan.status !== 'completed' && (
            <button className="plan-action-btn plan-action-primary" onClick={() => { setShowRecordPaymentModal(plan); setPayAmount(''); setPayAccountId(''); }}>
              <InlineIcon icon="CreditCard" size={14} /> {t('metas:planCard.pay')}
            </button>
          )}
          {plan.type === 'expense' && plan.status !== 'completed' && (
            <>
              <button
                className="plan-action-btn plan-action-primary"
                onClick={() => { hasSubPlans ? openSubPlansModal(plan) : setShowAddFundsModal(plan); setAddAmount(''); setAddAccountId(''); }}
              >
                {hasSubPlans ? t('metas:subPlans.manage') : `+ ${t('metas:planCard.deposit')}`}
              </button>
              <button
                className="plan-action-btn"
                onClick={() => openSubPlansModal(plan)}
                title={t('metas:subPlans.title')}
              >
                <InlineIcon icon="ClipboardList" size={14} />
              </button>
            </>
          )}
          {plan.ownerId === uid && (
            <button className="plan-action-btn" onClick={() => setShowShareModal(plan)}>
              <IconUsers width={14} />
            </button>
          )}
          {plan.ownerId === uid && (
            <button className="plan-action-btn" onClick={() => openEditModal(plan)}>
              <IconEdit width={14} />
            </button>
          )}
          {plan.ownerId === uid && (
            <button className="plan-action-btn plan-action-danger" onClick={() => handleDeletePlan(plan)}>
              <IconTrash width={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="plans-page">
          {/* Header */}
          <div className="page-header">
            <div className="page-header-left">
              <h1 className="page-title">{t('metas:page.title')}</h1>
              <p className="page-subtitle">{t('metas:page.subtitle')}</p>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => openNewModal()}>
                <IconPlus width={14} /> {t('metas:page.newPlan')}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="plans-stats-grid">
            <div className="plans-stat-card plans-stat-savings">
              <span className="plans-stat-icon"><InlineIcon icon="Wallet" size={20} /></span>
              <div className="plans-stat-info">
                <span className="plans-stat-label">{t('metas:stats.savings')}</span>
                <span className="plans-stat-value">{formatAmount(totalSavingsCurrent)} <small>/ {formatAmount(totalSavingsTarget)}</small></span>
                <span className="plans-stat-count">{stats.savings.length} {t('metas:stats.plans')}</span>
              </div>
              {totalSavingsTarget > 0 && (
                <div className="plans-stat-bar">
                  <div className="plans-stat-bar-fill" style={{ width: `${Math.min(100, (totalSavingsCurrent / totalSavingsTarget) * 100)}%` }} />
                </div>
              )}
            </div>
            <div className="plans-stat-card plans-stat-expense">
              <span className="plans-stat-icon"><InlineIcon icon="ShoppingCart" size={20} /></span>
              <div className="plans-stat-info">
                <span className="plans-stat-label">{t('metas:stats.expenses')}</span>
                <span className="plans-stat-value">{formatAmount(totalExpenseCurrent)} <small>/ {formatAmount(totalExpenseTarget)}</small></span>
                <span className="plans-stat-count">{stats.expenses.length} {t('metas:stats.plans')}</span>
              </div>
              {totalExpenseTarget > 0 && (
                <div className="plans-stat-bar">
                  <div className="plans-stat-bar-fill" style={{ width: `${Math.min(100, (totalExpenseCurrent / totalExpenseTarget) * 100)}%` }} />
                </div>
              )}
            </div>
            <div className="plans-stat-card plans-stat-recurring">
              <span className="plans-stat-icon"><InlineIcon icon="RefreshCw" size={20} /></span>
              <div className="plans-stat-info">
                <span className="plans-stat-label">{t('metas:stats.recurring')}</span>
                <span className="plans-stat-value">{formatAmount(totalRecurringMonthly)}<small>{t('metas:stats.perMonth')}</small></span>
                <span className="plans-stat-count">{stats.recurring.length} {t('metas:stats.plans')}</span>
              </div>
            </div>
            <div className="plans-stat-card plans-stat-active">
              <span className="plans-stat-icon"><InlineIcon icon="BarChart3" size={20} /></span>
              <div className="plans-stat-info">
                <span className="plans-stat-label">{t('metas:stats.statusGeneral')}</span>
                <span className="plans-stat-value">{stats.active} {t('metas:stats.active')}</span>
                <span className="plans-stat-count">{stats.completed} {t('metas:stats.completed')}</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="plans-filters">
            <div className="plans-filter-group">
              <span className="plans-filter-label">{t('metas:filters.type')}</span>
              {(['all', 'savings', 'expense', 'recurring'] as const).map(ft => (
                <button key={ft} className={`plans-filter-btn ${filter === ft ? 'active' : ''}`} onClick={() => setFilter(ft)}>
                  {ft === 'all' ? t('metas:filters.all') : <><InlineIcon icon={PLAN_TYPES.find(pt => pt.value === ft)?.icon || 'Pin'} size={14} /> {PLAN_TYPES.find(pt => pt.value === ft)?.label}</>}
                </button>
              ))}
            </div>
            <div className="plans-filter-group">
              <span className="plans-filter-label">{t('metas:filters.status')}</span>
              {(['all', 'pending', 'progress', 'completed', 'cancelled'] as const).map(s => (
                <button key={s} className={`plans-filter-btn plans-filter-status ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                  {s === 'all' ? t('metas:filters.all') : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Received Requests */}
          {receivedRequests.filter(r => r.status === 'pending').length > 0 && (
            <div className="plans-requests-section">
              <h3 className="plans-section-title"><InlineIcon icon="MailOpen" size={16} /> {t('metas:requests.title')}</h3>
              <div className="plans-requests-list">
                {receivedRequests.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} className="plans-request-card">
                    <div className="plans-request-info">
                      <span className="plans-request-amount">{formatAmount(req.amount)}</span>
                      <span className="plans-request-msg">{req.message}</span>
                    </div>
                    <div className="plans-request-actions">
                      <button className="plans-req-btn plans-req-accept" onClick={() => handleRespondRequest(req, 'accepted')}><Check size={14} /> {t('metas:requests.accept')}</button>
                      <button className="plans-req-btn plans-req-reject" onClick={() => handleRespondRequest(req, 'rejected')}><X size={14} /> {t('metas:requests.reject')}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plans Grid */}
          {sortedPlans.length > 0 ? (
            <>
              {/* Desktop: 3 columns by type */}
              <div className="plans-columns">
                {PLAN_TYPES.filter(typeInfo => filter === 'all' || typeInfo.value === filter).map(typeInfo => {
                  const columnPlans = sortedPlans.filter(p => p.type === typeInfo.value);
                  return (
                    <div key={typeInfo.value} className="plans-column">
                      <div className="plans-column-header" style={{ color: typeInfo.color }}>
                        <InlineIcon icon={typeInfo.icon} size={18} />
                        <span>{typeInfo.label}</span>
                      </div>
                      {columnPlans.map((plan, idx) => renderPlanCard(plan, idx))}
                    </div>
                  );
                })}
              </div>

              {/* Mobile: single sorted list */}
              <div className="plans-grid-mobile">
                {sortedPlans.map((plan, index) => renderPlanCard(plan, index))}
              </div>
            </>
          ) : (
            <div className="plans-empty">
              <span className="plans-empty-icon"><InlineIcon icon="ClipboardList" size={28} /></span>
              <h3>{t('metas:empty.title')}</h3>
              <p>{t('metas:empty.description')}</p>
              <button className="btn btn-primary" onClick={() => openNewModal()}>
                <IconPlus width={14} /> {t('metas:page.createPlan')}
              </button>
            </div>
          )}

          {/* Modal Nuevo/Editar Plan */}
          {showNewModal && (
            <div className="modal-overlay" onClick={() => { setShowNewModal(false); setEditingPlan(null); resetForm(); }}>
              <div className="modal-content modal-plan" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">{editingPlan ? t('metas:modals.editPlan.title') : t('metas:modals.newPlan.title')}</h2>
                    <p className="modal-subtitle">{editingPlan ? t('metas:modals.editPlan.subtitle') : t('metas:modals.newPlan.subtitle')}</p>
                  </div>
                  <button className="modal-close" onClick={() => { setShowNewModal(false); setEditingPlan(null); resetForm(); }}><X size={18} /></button>
                </div>
                <div className="modal-body">
                  {/* Type selector */}
                  <div className="plan-type-selector">
                    {PLAN_TYPES.map(t => (
                      <button key={t.value} className={`plan-type-btn ${formType === t.value ? 'active' : ''}`} style={formType === t.value ? { borderColor: t.color, background: t.color + '12' } : {}} onClick={() => setFormType(t.value)}>
                        <span className="plan-type-icon"><InlineIcon icon={t.icon} size={18} /></span>
                        <span className="plan-type-label">{t.label}</span>
                        <span className="plan-type-desc">{t.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="plan-field">
                    <label className="plan-label">{t('metas:modals.fields.title')}</label>
                    <input className="plan-input" type="text" placeholder={t('metas:modals.fields.titlePlaceholder')} value={formTitle} onChange={e => setFormTitle(e.target.value)} autoFocus />
                  </div>

                  <div className="plan-field">
                    <label className="plan-label">{t('metas:modals.fields.description')}</label>
                    <input className="plan-input" type="text" placeholder={t('metas:modals.fields.descriptionPlaceholder')} value={formDesc} onChange={e => setFormDesc(e.target.value)} />
                  </div>

                  <div className="plan-field-row">
                    <div className="plan-field">
                      <label className="plan-label">{t('metas:modals.fields.category')}</label>
                      <div className="plan-category-group">
                        {PLAN_CATEGORIES.map(category => (
                          <button
                            key={category.value}
                            className={`plan-category-btn ${formCategory === category.value ? 'active' : ''}`}
                            onClick={() => setFormCategory(category.value)}
                          >
                            <InlineIcon icon={category.icon} size={14} /> {t('metas:categories.' + category.value)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="plan-field">
                      <label className="plan-label">{t('metas:modals.fields.currency')}</label>
                      <CustomSelect
                        value={formCurrency}
                        onChange={v => setFormCurrency(v as CurrencyCode)}
                        options={CURRENCY_LIST.map(c => ({ value: c, label: c, icon: currencyMap[c].flag }))}
                        placeholder={t('metas:modals.fields.selectPlaceholder')}
                      />
                    </div>
                  </div>

                  {formType !== 'expense' && (
                    <div className="plan-field">
                      <label className="plan-label">{t('metas:modals.fields.amount')}</label>
                      <div className="plan-input-wrap">
                        <span className="plan-currency">{currencyMap[formCurrency].symbol}</span>
                        <input
                          className="plan-input plan-input-amount"
                          type="number"
                          min="0"
                          step={(['BTC','ETH','SOL','USDT','USDC'] as CurrencyCode[]).includes(formCurrency) ? '0.00000001' : '0.01'}
                          placeholder={t('metas:modals.fields.amountPlaceholder')}
                          value={formTarget}
                          onChange={e => setFormTarget(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {formType !== 'recurring' && (
                    <div className="plan-field">
                      <label className="plan-label">{t('metas:modals.fields.deadline')}</label>
                      <input className="plan-input plan-input-date" type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} />
                    </div>
                  )}

                  {formType === 'recurring' && (
                    <div className="plan-field-row">
                      <div className="plan-field">
                        <label className="plan-label">{t('metas:modals.fields.frequency')}</label>
                        <CustomSelect value={formFrequency} onChange={v => setFormFrequency(v as RecurringFrequency)} options={RECURRENCES.map(r => ({ value: r.value, label: r.label }))} placeholder={t('metas:modals.fields.selectPlaceholder')} />
                      </div>
                      <div className="plan-field">
                        <label className="plan-label">{t('metas:modals.fields.nextPayment')}</label>
                        <input className="plan-input plan-input-date" type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {formType === 'expense' && (
                    <div className="form-subplans-section">
                      <h4 className="form-subplans-title">{t('metas:subPlans.inlineTitle')}</h4>
                      <div className="plan-field">
                        <label className="plan-label">{t('metas:modals.fields.title')}</label>
                        <input className="plan-input" type="text" placeholder={t('metas:modals.fields.titlePlaceholder')} value={subPlanForm.title} onChange={e => setSubPlanForm(prev => ({ ...prev, title: e.target.value }))} />
                      </div>
                      <div className="plan-field-row">
                        <div className="plan-field">
                          <label className="plan-label">{t('metas:modals.fields.amount')}</label>
                          <div className="plan-input-wrap">
                            <span className="plan-currency">{currencyMap[subPlanForm.currency].symbol}</span>
                            <input className="plan-input plan-input-amount" type="number" min="0" step={(['BTC','ETH','SOL','USDT','USDC'] as CurrencyCode[]).includes(subPlanForm.currency) ? '0.00000001' : '0.01'} placeholder={t('metas:modals.fields.amountPlaceholder')} value={subPlanForm.target} onChange={e => setSubPlanForm(prev => ({ ...prev, target: e.target.value }))} />
                          </div>
                        </div>
                        <div className="plan-field">
                          <label className="plan-label">{t('metas:modals.fields.currency')}</label>
                          <CustomSelect value={subPlanForm.currency} onChange={v => setSubPlanForm(prev => ({ ...prev, currency: v as CurrencyCode }))} options={CURRENCY_LIST.map(c => ({ value: c, label: c, icon: currencyMap[c].flag }))} placeholder={t('metas:modals.fields.selectPlaceholder')} />
                        </div>
                      </div>
                      <div className="plan-field">
                        <label className="plan-label">{t('metas:modals.fields.deadline')}</label>
                        <input className="plan-input plan-input-date" type="date" value={subPlanForm.deadline} onChange={e => setSubPlanForm(prev => ({ ...prev, deadline: e.target.value }))} />
                      </div>
                      <button className="btn btn-outline" onClick={addFormSubPlan} disabled={!subPlanForm.title || !subPlanForm.target}>
                        {editingFormSubPlanId ? t('metas:modals.buttons.saveChanges') : t('metas:subPlans.add')}
                      </button>

                      {formSubPlans.length > 0 && (
                        <div className="form-subplans-list">
                          {formSubPlans.map(sub => (
                            <div key={sub.id} className="form-subplan-card">
                              <div className="form-subplan-header">
                                <span className="form-subplan-title">{sub.title}</span>
                                <span className="form-subplan-amount">{formatInCurrency(Number(sub.target), sub.currency)}</span>
                              </div>
                              {sub.deadline && <span className="plan-card-meta-item"><InlineIcon icon="CalendarDays" size={12} /> {getDaysRemaining(sub.deadline)}</span>}
                              <div className="form-subplan-actions">
                                <button className="plan-action-btn" onClick={() => editFormSubPlan(sub.id!)}><IconEdit width={14} /></button>
                                <button className="plan-action-btn plan-action-danger" onClick={() => deleteFormSubPlan(sub.id!)}><IconTrash width={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="plan-field">
                    <label className="plan-label">{t('metas:modals.fields.linkedAccount')}</label>
                    <CustomSelect value={formAccountId} onChange={v => setFormAccountId(v)} options={[{ value: '', label: t('metas:modals.fields.noAccount') }, ...accounts.map(a => ({ value: a.id, label: a.name, icon: a.icon }))]} placeholder={t('metas:modals.fields.selectPlaceholder')} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => { setShowNewModal(false); setEditingPlan(null); resetForm(); }}>{t('metas:modals.buttons.cancel')}</button>
                  <button className="btn btn-primary" onClick={editingPlan ? handleEditPlan : handleCreatePlan} disabled={formLoading || !formTitle || (formType === 'expense' ? (formSubPlans.length === 0 && !formTarget) : !formTarget)}>
                    {formLoading ? t('metas:modals.buttons.saving') : editingPlan ? t('metas:modals.buttons.saveChanges') : t('metas:modals.buttons.create')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Añadir Fondos */}
          {showAddFundsModal && (
            <div className="modal-overlay" onClick={() => setShowAddFundsModal(null)}>
              <div className="modal-content modal-plan-small" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">{t('metas:modals.addFunds.title', { title: showAddFundsModal.title })}</h2>
                    <p className="modal-subtitle">{t('metas:modals.addFunds.subtitle', { current: formatAmount(showAddFundsModal.current), target: formatAmount(showAddFundsModal.target) })}</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowAddFundsModal(null)}><X size={18} /></button>
                </div>
                <div className="modal-body">
                  <div className="plan-field">
                    <label className="plan-label">{t('metas:modals.fields.amount')}</label>
                    <div className="plan-input-wrap">
                      <span className="plan-currency">{currencyMap[displayCurrency].symbol}</span>
                      <input className="plan-input plan-input-amount" type="number" min="0" step={(['BTC','ETH','SOL','USDT','USDC'] as CurrencyCode[]).includes(showAddFundsModal?.currency || displayCurrency) ? '0.00000001' : '0.01'} placeholder={t('metas:modals.fields.amountPlaceholder')} value={addAmount} onChange={e => setAddAmount(e.target.value)} autoFocus />
                    </div>
                  </div>
                  <div className="plan-field">
                    <label className="plan-label">{t('metas:modals.fields.accountOptional')}</label>
                    <CustomSelect value={addAccountId} onChange={v => setAddAccountId(v)} options={[{ value: '', label: t('metas:modals.fields.noAccount') }, ...accounts.map(a => ({ value: a.id, label: a.name, icon: a.icon }))]} placeholder={t('metas:modals.fields.selectPlaceholder')} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowAddFundsModal(null)}>{t('metas:modals.buttons.cancel')}</button>
                  <button className="btn btn-primary" onClick={() => handleAddFunds(showAddFundsModal)} disabled={formLoading || !addAmount}>
                    {formLoading ? t('metas:modals.buttons.saving') : t('metas:modals.buttons.add')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Registrar Pago */}
          {showRecordPaymentModal && (
            <div className="modal-overlay" onClick={() => setShowRecordPaymentModal(null)}>
              <div className="modal-content modal-plan-small" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">{t('metas:modals.recordPayment.title')}</h2>
                    <p className="modal-subtitle">{t('metas:modals.recordPayment.subtitle', { title: showRecordPaymentModal.title, target: formatAmount(showRecordPaymentModal.target), frequency: RECURRENCES.find(r => r.value === showRecordPaymentModal.frequency)?.label || '' })}</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowRecordPaymentModal(null)}><X size={18} /></button>
                </div>
                <div className="modal-body">
                  <div className="plan-field">
                    <label className="plan-label">{t('metas:modals.fields.amount')}</label>
                    <div className="plan-input-wrap">
                      <span className="plan-currency">$</span>
                      <input className="plan-input plan-input-amount" type="number" min="0" step="0.01" placeholder={String(showRecordPaymentModal.target)} value={payAmount} onChange={e => setPayAmount(e.target.value)} autoFocus />
                    </div>
                  </div>
                  <div className="plan-field">
                    <label className="plan-label">{t('metas:modals.fields.linkedAccount')}</label>
                    <CustomSelect value={payAccountId} onChange={v => setPayAccountId(v)} options={[{ value: '', label: t('metas:modals.fields.noAccount') }, ...accounts.map(a => ({ value: a.id, label: a.name, icon: a.icon }))]} placeholder={t('metas:modals.fields.selectPlaceholder')} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowRecordPaymentModal(null)}>{t('metas:modals.buttons.cancel')}</button>
                  <button className="btn btn-primary" onClick={() => handleRecordPayment(showRecordPaymentModal)} disabled={formLoading || !payAmount}>
                    {formLoading ? t('metas:modals.buttons.saving') : t('metas:modals.buttons.record')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Compartir */}
          {showShareModal && (
            <div className="modal-overlay" onClick={() => { setShowShareModal(null); setShareFoundUser(null); }}>
              <div className="modal-content modal-plan-small" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">{t('metas:modals.share.title')}</h2>
                    <p className="modal-subtitle">{t('metas:modals.share.subtitle', { title: showShareModal.title })}</p>
                  </div>
                  <button className="modal-close" onClick={() => { setShowShareModal(null); setShareFoundUser(null); }}><X size={18} /></button>
                </div>
                <div className="modal-body">
                  <div className="plan-field">
                    <label className="plan-label">{t('metas:modals.share.userLabel')}</label>
                    <input className="plan-input" type="text" placeholder={t('metas:modals.share.userPlaceholder')} value={shareEmail} onChange={e => handleSearchShareUser(e.target.value)} autoFocus />
                    {shareSearching && <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>{t('metas:modals.share.searching')}</span>}
                  </div>

                  {/* Search Results (multiple users) */}
                  {shareSearchResults.length > 0 && !shareFoundUser && (
                    <div className="share-search-results">
                      {shareSearchResults.map(user => (
                        <div key={user.uid} className="share-user-card share-user-selectable" onClick={() => selectShareUser(user)}>
                          <div className="share-user-avatar">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt="" loading="lazy" />
                            ) : (
                              <span>{(user.displayName || user.email || '?')[0].toUpperCase()}</span>
                            )}
                          </div>
                          <div className="share-user-info">
                            <span className="share-user-name">{user.displayName || t('metas:modals.share.userDefault')}</span>
                            <span className="share-user-email">{user.email}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {shareSearchResults.length === 0 && shareEmail.length >= 2 && !shareEmail.includes('@') && !shareSearching && !shareFoundUser && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>{t('metas:modals.share.noResults')}</p>
                  )}

                  {/* Selected User Profile Card */}
                  {shareFoundUser && (
                    <div className="share-user-card">
                      <div className="share-user-avatar">
                        {shareFoundUser.photoURL ? (
                          <img src={shareFoundUser.photoURL} alt="" loading="lazy" />
                        ) : (
                          <span>{(shareFoundUser.displayName || shareFoundUser.email || '?')[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div className="share-user-info">
                        <span className="share-user-name">{shareFoundUser.displayName || t('metas:modals.share.userDefault')}</span>
                        <span className="share-user-email">{shareFoundUser.email}</span>
                      </div>
                      <span className="share-user-check"><Check size={16} /></span>
                      <button className="share-user-change" onClick={() => { setShareFoundUser(null); setShareEmail(''); setShareSearchResults([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.75rem', padding: '4px' }}><X size={14} /></button>
                    </div>
                  )}

                  <div className="plan-field">
                    <label className="plan-label">{t('metas:modals.share.amountLabel')}</label>
                    <div className="plan-input-wrap">
                      <span className="plan-currency">$</span>
                      <input className="plan-input plan-input-amount" type="number" min="0" step="0.01" placeholder={t('metas:modals.fields.amountPlaceholder')} value={shareAmount} onChange={e => setShareAmount(e.target.value)} />
                    </div>
                  </div>
                  <div className="plan-field">
                    <label className="plan-label">{t('metas:modals.share.messageLabel')}</label>
                    <input className="plan-input" type="text" placeholder={t('metas:modals.share.messagePlaceholder')} value={shareMessage} onChange={e => setShareMessage(e.target.value)} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => { setShowShareModal(null); setShareFoundUser(null); }}>{t('metas:modals.buttons.cancel')}</button>
                  <button className="btn btn-primary" onClick={() => handleSharePlan(showShareModal)} disabled={shareLoading || !shareEmail || !shareAmount || !shareFoundUser}>
                    {shareLoading ? t('metas:modals.buttons.sending') : t('metas:modals.share.sendRequest')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Sub-planes */}
          {showSubPlansModal && (
            <div className="modal-overlay" onClick={() => { setShowSubPlansModal(null); resetSubPlanForm(); }}>
              <div className="modal-content modal-plan" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">{t('metas:subPlans.title', { title: showSubPlansModal.title })}</h2>
                    <p className="modal-subtitle">{t('metas:subPlans.subtitle')}</p>
                  </div>
                  <button className="modal-close" onClick={() => { setShowSubPlansModal(null); resetSubPlanForm(); }}><X size={18} /></button>
                </div>
                <div className="modal-body">
                  <div className="plan-field">
                    <label className="plan-label">{t('metas:modals.fields.title')}</label>
                    <input className="plan-input" type="text" placeholder={t('metas:modals.fields.titlePlaceholder')} value={subPlanForm.title} onChange={e => setSubPlanForm(prev => ({ ...prev, title: e.target.value }))} />
                  </div>
                  <div className="plan-field-row">
                    <div className="plan-field">
                      <label className="plan-label">{t('metas:modals.fields.amount')}</label>
                      <div className="plan-input-wrap">
                        <span className="plan-currency">{currencyMap[subPlanForm.currency].symbol}</span>
                        <input className="plan-input plan-input-amount" type="number" min="0" step={(['BTC','ETH','SOL','USDT','USDC'] as CurrencyCode[]).includes(subPlanForm.currency) ? '0.00000001' : '0.01'} placeholder={t('metas:modals.fields.amountPlaceholder')} value={subPlanForm.target} onChange={e => setSubPlanForm(prev => ({ ...prev, target: e.target.value }))} />
                      </div>
                    </div>
                    <div className="plan-field">
                      <label className="plan-label">{t('metas:modals.fields.currency')}</label>
                      <CustomSelect value={subPlanForm.currency} onChange={v => setSubPlanForm(prev => ({ ...prev, currency: v as CurrencyCode }))} options={CURRENCY_LIST.map(c => ({ value: c, label: c, icon: currencyMap[c].flag }))} placeholder={t('metas:modals.fields.selectPlaceholder')} />
                    </div>
                  </div>
                  <div className="plan-field">
                    <label className="plan-label">{t('metas:modals.fields.deadline')}</label>
                    <input className="plan-input plan-input-date" type="date" value={subPlanForm.deadline} onChange={e => setSubPlanForm(prev => ({ ...prev, deadline: e.target.value }))} />
                  </div>
                  {subPlanPayId && (
                    <div className="plan-field">
                      <label className="plan-label">{t('metas:subPlans.paymentAmount')}</label>
                      <div className="plan-input-wrap">
                        <span className="plan-currency">{currencyMap[(showSubPlansModal.subPlans?.find(sp => sp.id === subPlanPayId)?.currency) || displayCurrency].symbol}</span>
                        <input className="plan-input plan-input-amount" type="number" min="0" step={(['BTC','ETH','SOL','USDT','USDC'] as CurrencyCode[]).includes((showSubPlansModal.subPlans?.find(sp => sp.id === subPlanPayId)?.currency) || displayCurrency) ? '0.00000001' : '0.01'} placeholder={t('metas:modals.fields.amountPlaceholder')} value={addAmount} onChange={e => setAddAmount(e.target.value)} autoFocus />
                      </div>
                    </div>
                  )}
                  <button className="btn btn-primary" onClick={() => subPlanPayId ? handlePaySubPlan(showSubPlansModal) : handleSaveSubPlan(showSubPlansModal)} disabled={formLoading || !subPlanForm.title || !subPlanForm.target || (subPlanPayId ? !addAmount : false)}>
                    {formLoading ? t('metas:modals.buttons.saving') : subPlanPayId ? t('metas:subPlans.pay') : editingSubPlanId ? t('metas:modals.buttons.saveChanges') : t('metas:subPlans.add')}
                  </button>

                  <div className="subplans-list">
                    {showSubPlansModal.subPlans && showSubPlansModal.subPlans.length > 0 ? (
                      showSubPlansModal.subPlans.map((sub) => {
                        const subPct = sub.target > 0 ? Math.min(100, Math.round((sub.current / sub.target) * 100)) : 0;
                        const subStatusKey = sub.status === 'completed' ? 'completed' : sub.status === 'progress' ? 'progress' : 'pending';
                        return (
                          <div key={sub.id} className={`subplan-card ${sub.status === 'completed' ? 'subplan-completed' : ''}`}>
                            <div className="subplan-header">
                              <span className="subplan-title">{sub.title}</span>
                              <span className="subplan-status" style={{ color: sub.status === 'completed' ? '#22C55E' : sub.status === 'progress' ? '#3DCC8E' : '#A8A29E' }}>{STATUS_LABELS[subStatusKey]}</span>
                            </div>
                            <div className="subplan-amounts">
                              <span>{formatInCurrency(sub.current, sub.currency)}</span>
                              <span>/</span>
                              <span>{formatInCurrency(sub.target, sub.currency)}</span>
                            </div>
                            <div className="plan-card-progress">
                              <div className="plan-card-progress-bar">
                                <div className="plan-card-progress-fill" style={{ width: `${subPct}%`, background: '#EF4444' }} />
                              </div>
                              <span className="plan-card-pct">{subPct}%</span>
                            </div>
                            {sub.deadline && <span className="plan-card-meta-item"><InlineIcon icon="CalendarDays" size={12} /> {getDaysRemaining(sub.deadline)}</span>}
                            <div className="subplan-actions">
                              <button className="plan-action-btn plan-action-primary" onClick={() => { setSubPlanPayId(sub.id); setAddAmount(''); }}>{t('metas:subPlans.pay')}</button>
                              <button className="plan-action-btn" onClick={() => { setEditingSubPlanId(sub.id); setSubPlanForm({ title: sub.title, target: String(sub.target), currency: sub.currency, deadline: sub.deadline || '' }); }}><IconEdit width={14} /></button>
                              <button className="plan-action-btn plan-action-danger" onClick={() => handleDeleteSubPlan(showSubPlansModal, sub.id)}><IconTrash width={14} /></button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="plan-card-meta-item" style={{ marginTop: '8px' }}>{t('metas:subPlans.noSubPlans')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} variant={confirmState.variant} confirmText={confirmState.confirmText || t('common:buttons.confirm')} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} />
        </div>

        <style>{`
          .plans-page { padding: 0; }

          /* Modal */
          .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center !important; justify-content: center; z-index: 10000; backdrop-filter: blur(4px); -webkit-tap-highlight-color: transparent; overflow-y: auto; padding-top: 64px; }
          .modal-content { background: #ffffff; border: 1px solid var(--border-default); border-radius: var(--radius-xl); width: 92%; max-width: 520px; max-height: 85vh; padding: 24px; display: flex; flex-direction: column; animation: modalIn 0.25s ease; position: relative; }
          [data-theme="dark"] .modal-content { background: #0a1628; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6); }
          [data-theme="amoled"] .modal-content { background: #0a0a0a; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9); }
          .modal-plan { max-width: 520px; }
          .modal-plan-small { max-width: 420px; }
          @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: none; } }
          .modal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
          .modal-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }
          .modal-subtitle { font-size: 0.75rem; color: var(--text-tertiary); margin: 2px 0 0 0; }
          .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.25rem; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; padding: 8px; border-radius: 8px; transition: background 0.15s; position: absolute; top: 16px; right: 16px; }
          .modal-close:hover { background: var(--bg-input); }
          .modal-body { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; padding-right: 4px; }
          .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

          /* Stats */
          .plans-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .plans-stat-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px; position: relative; overflow: hidden; }
          .plans-stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
          .plans-stat-savings::before { background: #3DCC8E; }
          .plans-stat-expense::before { background: #EF4444; }
          .plans-stat-recurring::before { background: #F59E0B; }
          .plans-stat-active::before { background: #3B82F6; }
          .plans-stat-icon { font-size: 1.5rem; display: block; margin-bottom: 8px; color: var(--text-primary); }
          .plans-stat-info { display: flex; flex-direction: column; gap: 2px; }
          .plans-stat-label { font-size: 0.6875rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; }
          .plans-stat-value { font-size: 1.125rem; font-weight: 800; color: var(--text-primary); }
          .plans-stat-value small { font-size: 0.75rem; font-weight: 500; color: var(--text-tertiary); }
          .plans-stat-count { font-size: 0.6875rem; color: var(--text-tertiary); }
          .plans-stat-bar { margin-top: 8px; height: 4px; background: var(--border-default); border-radius: 2px; overflow: hidden; }
          .plans-stat-bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
          .plans-stat-savings .plans-stat-bar-fill { background: #3DCC8E; }
          .plans-stat-expense .plans-stat-bar-fill { background: #EF4444; }

          /* Filters */
          .plans-filters { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
          .plans-filter-group { display: flex; gap: 6px; align-items: center; }
          .plans-filter-label { font-size: 0.6875rem; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; margin-right: 4px; }
          .plans-filter-btn { padding: 6px 12px; border-radius: var(--radius-full); border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
          .plans-filter-btn:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .plans-filter-btn.active { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .plans-filter-status.active { background: var(--color-pine-500); border-color: var(--color-pine-500); }

          /* Requests */
          .plans-requests-section { margin-bottom: 20px; }
          .plans-section-title { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin: 0 0 10px 0; }
          .plans-requests-list { display: flex; flex-direction: column; gap: 8px; }
          .plans-request-card { display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 12px 14px; }
          .plans-request-info { display: flex; flex-direction: column; gap: 2px; }
          .plans-request-amount { font-size: 0.9375rem; font-weight: 800; color: var(--color-prosper-green); }
          .plans-request-msg { font-size: 0.75rem; color: var(--text-secondary); }
          .plans-request-actions { display: flex; gap: 6px; }
          .plans-req-btn { padding: 6px 12px; border-radius: 6px; border: none; font-size: 0.6875rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
          .plans-req-accept { background: rgba(61,204,142,0.15); color: var(--color-prosper-green); }
          .plans-req-accept:hover { background: var(--color-prosper-green); color: white; }
          .plans-req-reject { background: rgba(239,68,68,0.1); color: var(--color-error); }
          .plans-req-reject:hover { background: var(--color-error); color: white; }

           /* Plans Grid */
           .plans-columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: start; }
           .plans-column { display: flex; flex-direction: column; gap: 12px; }
           .plans-column-header { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 700; padding: 10px 12px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); }
           .plans-column-header svg { flex-shrink: 0; }
           .plans-grid-mobile { display: none; }
           
           /* Category Buttons */
           .plan-category-group {
             display: flex;
             flex-wrap: wrap;
             gap: 6px;
             margin-top: 4px;
           }
           
           .plan-category-btn {
             padding: 6px 10px;
             border-radius: var(--radius-sm);
             border: 1px solid var(--border-default);
             background: var(--bg-input);
             color: var(--text-primary);
             font-size: 0.75rem;
             cursor: pointer;
             transition: all 0.15s ease;
             display: flex;
             align-items: center;
             gap: 4px;
             white-space: nowrap;
           }
           
           .plan-category-btn:hover {
             border-color: var(--color-prosper-green);
             color: var(--color-prosper-green);
             background: var(--bg-input);
           }
           
           .plan-category-btn.active {
             background: var(--color-prosper-green);
             color: white;
             border-color: var(--color-prosper-green);
           }
          .plan-card { background: var(--bg-card); border: 1px solid var(--border-default); border-left: 4px solid; border-radius: var(--radius-md); overflow: hidden; transition: all 0.2s; }
          .plan-card:hover { box-shadow: var(--shadow-sm); transform: translateY(-2px); }
          .plan-card-header { display: flex; align-items: center; gap: 10px; padding: 14px 14px 10px; }
          .plan-card-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.125rem; flex-shrink: 0; }
          .plan-card-info { flex: 1; min-width: 0; }
          .plan-card-title { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .plan-card-type { font-size: 0.6875rem; font-weight: 600; }
           .plan-card-status { padding: 3px 8px; border-radius: var(--radius-full); font-size: 0.625rem; font-weight: 700; flex-shrink: 0; }
           .plan-card-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: 0.5625rem; font-weight: 700; }
           .plan-card-badge-shared { background: rgba(59,130,246,0.15); color: #3b82f6; }
           .plan-card-badge-invited { background: rgba(245,158,11,0.15); color: #f59e0b; }
           .plan-card-contributions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border-default); }
           .plan-card-contrib-item { font-weight: 600; color: var(--text-secondary); }
           .plan-card-body { padding: 0 14px 10px; }
          .plan-card-desc { font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 8px 0; }
          .plan-card-amounts { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
          .plan-card-current { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); }
          .plan-card-separator { font-size: 0.875rem; color: var(--text-tertiary); }
          .plan-card-target { font-size: 0.875rem; color: var(--text-tertiary); }
          .plan-card-progress { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
          .plan-card-progress-bar { flex: 1; height: 6px; background: var(--border-default); border-radius: 3px; overflow: hidden; }
          .plan-card-progress-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
          .plan-card-pct { font-size: 0.6875rem; font-weight: 700; color: var(--text-secondary); min-width: 32px; text-align: right; }
          .plan-card-meta { display: flex; flex-wrap: wrap; gap: 8px; }
          .plan-card-meta-item { display: inline-flex; align-items: center; gap: 4px; font-size: 0.625rem; color: var(--text-tertiary); }
          .plan-card-meta-item svg { flex-shrink: 0; }
          .plan-card-actions { display: flex; gap: 4px; padding: 10px 14px; border-top: 1px solid var(--border-default); }
          .plan-action-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-secondary); font-size: 0.6875rem; font-weight: 600; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 4px; flex: 1; justify-content: center; }
          .plan-action-btn:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .plan-action-primary { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .plan-action-primary:hover { filter: brightness(1.1); }
          .plan-action-danger:hover { border-color: var(--color-error); color: var(--color-error); background: rgba(239,68,68,0.1); }

          /* Share User Card */
          .share-user-card { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; background: var(--bg-input); border: 1px solid var(--color-prosper-green); margin-bottom: 12px; }
          .share-user-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--color-pine-500), var(--color-pine-700)); display: flex; align-items: center; justify-content: center; color: white; font-size: 1rem; font-weight: 700; flex-shrink: 0; overflow: hidden; }
          .share-user-avatar img { width: 100%; height: 100%; object-fit: cover; }
          .share-user-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
          .share-user-name { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .share-user-email { font-size: 0.6875rem; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .share-user-check { font-size: 1.25rem; color: var(--color-prosper-green); flex-shrink: 0; }
          .share-user-selectable { cursor: pointer; border-color: var(--border-default); transition: border-color 0.15s, background 0.15s; }
          .share-user-selectable:hover { border-color: var(--color-prosper-green); background: rgba(61,204,142,0.06); }
          .share-search-results { display: flex; flex-direction: column; gap: 0; max-height: 240px; overflow-y: auto; }
          .share-search-results .share-user-card { margin-bottom: 0; border-radius: 0; border-bottom: none; }
          .share-search-results .share-user-card:first-child { border-radius: 10px 10px 0 0; }
          .share-search-results .share-user-card:last-child { border-radius: 0 0 10px 10px; border-bottom: 1px solid var(--border-default); }

          /* Empty */
          .plans-empty { text-align: center; padding: 48px 24px; color: var(--text-secondary); }
          .plans-empty-icon { font-size: 3rem; display: block; margin-bottom: 12px; }
          .plans-empty h3 { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px 0; }
          .plans-empty p { font-size: 0.875rem; margin: 0 0 20px 0; }

          /* Type selector */
          .plan-type-selector { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
          .plan-type-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; border-radius: 10px; border: 2px solid var(--border-default); background: var(--bg-input); cursor: pointer; transition: all 0.2s; }
          .plan-type-btn:hover { border-color: var(--color-prosper-green); }
          .plan-type-btn.active { font-weight: 600; }
          .plan-type-icon { font-size: 1.25rem; }
          .plan-type-label { font-size: 0.6875rem; color: var(--text-primary); font-weight: 600; }
          .plan-type-desc { font-size: 0.5625rem; color: var(--text-tertiary); }

          /* Fields */
          .plan-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
          .plan-field:last-child { margin-bottom: 0; }
          .plan-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .plan-label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary); }
          .plan-input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.875rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit; box-sizing: border-box; }
          .plan-input:focus { border-color: var(--color-prosper-green); box-shadow: 0 0 0 3px rgba(61,204,142,0.12); }
          .plan-input-amount { font-size: 1.125rem; font-weight: 700; padding-left: 28px; }
          .plan-input-date { cursor: pointer; }
          .plan-input-wrap { position: relative; }
          .plan-currency { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 0.875rem; font-weight: 600; color: var(--text-tertiary); pointer-events: none; }

          /* Sub-planes */
          .subplans-list { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-default); }
          .subplan-card { background: var(--bg-input); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 12px; }
          .subplan-completed { border-color: rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.08); }
          .subplan-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
          .subplan-title { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); }
          .subplan-status { font-size: 0.625rem; font-weight: 700; }
          .subplan-amounts { display: flex; align-items: baseline; gap: 4px; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px; }
          .subplan-actions { display: flex; gap: 4px; margin-top: 10px; }

          /* Inline sub-plans in plan card */
          .plan-card-subplans { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-default); }
          .plan-card-subplans-label { font-size: 0.625rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px 0; }
          .plan-card-subplans-list { display: flex; flex-direction: column; gap: 8px; }
          .plan-card-subplan { background: var(--bg-input); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 10px; }
          .plan-card-subplan-completed { border-color: rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.08); }
          .plan-card-subplan-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
          .plan-card-subplan-title { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); }
          .plan-card-subplan-amount { font-size: 0.75rem; font-weight: 700; color: var(--color-error); }

          /* Form sub-planes */
          .plan-input-readonly input { background: var(--bg-secondary); color: var(--text-tertiary); cursor: not-allowed; }
          .plan-input-hint { font-size: 0.625rem; color: var(--text-tertiary); margin-top: -2px; }
          .form-subplans-section { border: 1px dashed var(--border-default); border-radius: var(--radius-md); padding: 14px; background: var(--bg-secondary); }
          .form-subplans-title { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px 0; }
          .form-subplans-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
          .form-subplan-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 10px; }
          .form-subplan-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
          .form-subplan-title { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); }
          .form-subplan-amount { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); }
          .form-subplan-actions { display: flex; gap: 4px; margin-top: 8px; }

          /* Responsive */
          @media (max-width: 1024px) {
            .plans-stats-grid { grid-template-columns: repeat(2, 1fr); }
          }
          @media (max-width: 768px) {
            .page-header { flex-direction: column; align-items: stretch; gap: 12px; }
            .page-header-left { text-align: center; }
            .plans-stats-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
            .plans-stat-card { padding: 10px; }
            .plans-stat-value { font-size: 1rem; }
            .plans-filters { flex-direction: column; align-items: stretch; gap: 10px; }
            .plans-filter-group { flex-wrap: wrap; }
            .plans-columns { display: none; }
            .plans-grid-mobile { display: grid; grid-template-columns: 1fr; gap: 12px; align-items: start; }
            .plan-type-selector { grid-template-columns: 1fr; }
            .plan-field-row { grid-template-columns: 1fr; }
            .modal-plan, .modal-plan-small { max-width: none; width: 96%; }
            .modal-footer { flex-direction: column-reverse; gap: 8px; }
            .modal-footer .btn { width: 100%; justify-content: center; }
            .plans-request-card { flex-direction: column; gap: 10px; align-items: stretch; }
            .plans-request-actions { justify-content: flex-end; }
          }
          @media (max-width: 480px) {
            .plans-stats-grid { grid-template-columns: 1fr 1fr; gap: 6px; }
            .plans-stat-card { padding: 8px; }
            .plans-stat-icon { font-size: 1.25rem; margin-bottom: 4px; }
            .plans-stat-label { font-size: 0.5625rem; }
            .plans-stat-value { font-size: 0.875rem; }
            .plans-stat-count { font-size: 0.5625rem; }
            .plan-card-header { padding: 10px 10px 8px; }
            .plan-card-body { padding: 0 10px 8px; }
            .plan-card-actions { padding: 8px 10px; }
            .plan-card-current { font-size: 1rem; }
            .plan-action-btn { padding: 5px 8px; font-size: 0.625rem; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
});
export default MetasPage;
