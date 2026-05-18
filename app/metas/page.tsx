'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useGoals } from '@/lib/contexts/GoalsContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/app/components/Toast';
import { ConfirmDialog } from '@/app/components/Toast';
import { CustomSelect } from '../components/CustomSelect';
import { subscribeToAccounts, updateAccountBalance } from '@/lib/firestore/accounts';
import { createTransaction } from '@/lib/firestore/transactions';
import { sendExpenseRequest, searchUserByEmail, getReceivedRequests, respondToRequest } from '@/lib/firestore/requests';
import { IconPlus, IconX, IconTrash, IconEdit, IconUsers, IconClock, IconCheck, IconArrowForward } from '../components/icons';
import type { FinancialPlan, PlanType, PlanCategory, PlanStatus, RecurringFrequency, Transaction, FinancialAccount, ExpenseRequest } from '@/types';

const PLAN_TYPES: { value: PlanType; label: string; icon: string; color: string; desc: string }[] = [
  { value: 'savings', label: 'Plan de Ahorro', icon: '💰', color: '#3DCC8E', desc: 'Ahorra para una meta' },
  { value: 'expense', label: 'Gasto Planificado', icon: '🛒', color: '#EF4444', desc: 'Planifica un gasto grande' },
  { value: 'recurring', label: 'Gasto Recurrente', icon: '🔄', color: '#F59E0B', desc: 'Suscripciones, alquileres' },
];

const PLAN_CATEGORIES: { value: PlanCategory; icon: string }[] = [
  { value: 'Ahorro', icon: '💰' },
  { value: 'Inversión', icon: '📈' },
  { value: 'Educación', icon: '🎓' },
  { value: 'Comida', icon: '🍔' },
  { value: 'Tecnología', icon: '📱' },
  { value: 'Vivienda', icon: '🏠' },
  { value: 'Transporte', icon: '🚗' },
  { value: 'Salud', icon: '💊' },
  { value: 'Entretenimiento', icon: '🎬' },
  { value: 'Suscripción', icon: '📺' },
  { value: 'Alquiler', icon: '🏢' },
  { value: 'Servicios', icon: '⚡' },
  { value: 'Otro', icon: '📌' },
];

const RECURRENCES: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
];

const STATUS_COLORS: Record<PlanStatus, string> = {
  pending: '#A8A29E',
  progress: '#3DCC8E',
  completed: '#22C55E',
  cancelled: '#EF4444',
};

const STATUS_LABELS: Record<PlanStatus, string> = {
  pending: 'Pendiente',
  progress: 'En Progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
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

function formatCurrency(n: number): string {
  return `$${n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getDaysRemaining(deadline: string): string {
  if (!deadline) return 'Sin fecha';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline + 'T12:00:00');
  target.setHours(0, 0, 0, 0);
  const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return `Vencido hace ${Math.abs(days)} días`;
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `${days} días`;
}

export default function MetasPage() {
  const { plans, addPlan, updatePlanFn, deletePlanFn, refresh } = useGoals();
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const uid = user?.uid || '';

  const [filter, setFilter] = useState<PlanType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FinancialPlan | null>(null);
  const [showAddFundsModal, setShowAddFundsModal] = useState<FinancialPlan | null>(null);
  const [showShareModal, setShowShareModal] = useState<FinancialPlan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<FinancialPlan | null>(null);
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

  const filteredPlans = plans.filter(p => {
    if (filter !== 'all' && p.type !== filter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: plans.filter(p => p.status !== 'cancelled').length,
    savings: plans.filter(p => p.type === 'savings' && p.status !== 'cancelled'),
    expenses: plans.filter(p => p.type === 'expense' && p.status !== 'cancelled'),
    recurring: plans.filter(p => p.type === 'recurring' && p.status !== 'cancelled'),
    active: plans.filter(p => p.status === 'progress').length,
    completed: plans.filter(p => p.status === 'completed').length,
  };

  const totalSavingsTarget = stats.savings.reduce((s, p) => s + p.target, 0);
  const totalSavingsCurrent = stats.savings.reduce((s, p) => s + p.current, 0);
  const totalExpenseTarget = stats.expenses.reduce((s, p) => s + p.target, 0);
  const totalExpenseCurrent = stats.expenses.reduce((s, p) => s + p.current, 0);
  const totalRecurringMonthly = stats.recurring.reduce((s, p) => s + p.target, 0);

  const resetForm = () => {
    setFormType('savings');
    setFormTitle('');
    setFormDesc('');
    setFormCategory('Ahorro');
    setFormTarget('');
    setFormDeadline(todayISO());
    setFormFrequency('monthly');
    setFormAccountId('');
    setFormSharedEmail('');
    setFormShareAmount('');
    setFormShareMessage('');
  };

  const handleCreatePlan = async () => {
    if (!formTitle || !formTarget || !uid) {
      warning('Completa título y monto.');
      return;
    }
    const target = Number(formTarget);
    if (isNaN(target) || target <= 0) {
      warning('Monto inválido.');
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
        icon: PLAN_CATEGORIES.find(c => c.value === formCategory)?.icon || '📌',
        sharedWith: [],
        shareAmount: formShareAmount ? Number(formShareAmount) : 0,
        frequency: formType === 'recurring' ? formFrequency : undefined,
        nextDueDate: formType === 'recurring' ? formDeadline : undefined,
        totalPaid: 0,
        accountId: formAccountId || undefined,
      };

      await addPlan(planData);
      success(`"${formTitle}" creado`);
      setShowNewModal(false);
      resetForm();
    } catch (e: any) {
      error(`Error: ${e?.message || 'Error desconocido'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditPlan = async () => {
    if (!editingPlan || !formTitle || !formTarget) return;
    const target = Number(formTarget);
    if (isNaN(target) || target <= 0) {
      warning('Monto inválido.');
      return;
    }

    setFormLoading(true);
    try {
      await updatePlanFn(editingPlan.id, {
        title: formTitle,
        description: formDesc,
        category: formCategory,
        target,
        deadline: formDeadline,
        frequency: formType === 'recurring' ? formFrequency : editingPlan.frequency,
        nextDueDate: formType === 'recurring' ? formDeadline : editingPlan.nextDueDate,
        accountId: formAccountId || undefined,
      });
      success(`"${formTitle}" actualizado`);
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
      title: 'Eliminar Plan',
      message: `¿Eliminar "${plan.title}"? Esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await deletePlanFn(plan.id);
          success('Plan eliminado');
        } catch (e: any) {
          error(`Error: ${e?.message}`);
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleAddFunds = async (plan: FinancialPlan) => {
    const amount = Number(addAmount);
    if (isNaN(amount) || amount <= 0) {
      warning('Monto inválido.');
      return;
    }

    setFormLoading(true);
    try {
      // Actualizar plan
      const newCurrent = Math.min(plan.current + amount, plan.target);
      const newStatus: PlanStatus = newCurrent >= plan.target ? 'completed' : 'progress';
      await updatePlanFn(plan.id, { current: newCurrent, status: newStatus });

      // Crear transacción si hay cuenta
      if (addAccountId && uid) {
        await createTransaction({
          ownerId: uid,
          amount,
          type: 'saving',
          category: plan.category,
          description: `Ahorro para: ${plan.title}`,
          date: Date.now(),
          accountId: addAccountId,
        });
        await updateAccountBalance(addAccountId, -amount);
      }

      success(`$${amount.toLocaleString()} añadido a "${plan.title}"`);
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
      warning('Monto inválido.');
      return;
    }

    setFormLoading(true);
    try {
      const newCurrent = plan.current + amount;
      const totalPaid = (plan.totalPaid || 0) + amount;

      // Calcular next due date
      let nextDue = plan.nextDueDate || todayISO();
      const d = new Date(nextDue + 'T12:00:00');
      switch (plan.frequency) {
        case 'weekly': d.setDate(d.getDate() + 7); break;
        case 'biweekly': d.setDate(d.getDate() + 14); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
        case 'quarterly': d.setMonth(d.getMonth() + 3); break;
        case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
      }
      const nextDueStr = d.toISOString().split('T')[0];

      await updatePlanFn(plan.id, {
        current: newCurrent,
        totalPaid,
        lastPaidDate: todayISO(),
        nextDueDate: nextDueStr,
      });

      // Crear transacción
      if (payAccountId && uid) {
        await createTransaction({
          ownerId: uid,
          amount,
          type: 'expense',
          category: plan.category,
          description: `Pago: ${plan.title}`,
          date: Date.now(),
          accountId: payAccountId,
        });
        await updateAccountBalance(payAccountId, -amount);
      }

      success(`Pago de $${amount.toLocaleString()} registrado`);
      setShowRecordPaymentModal(null);
      setPayAmount('');
      setPayAccountId('');
    } catch (e: any) {
      error(`Error: ${e?.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSharePlan = async (plan: FinancialPlan) => {
    if (!shareEmail || !shareAmount || !uid) {
      warning('Completa email y monto.');
      return;
    }
    const amount = Number(shareAmount);
    if (isNaN(amount) || amount <= 0) {
      warning('Monto inválido.');
      return;
    }

    setShareLoading(true);
    try {
      // Buscar usuario
      const userFound = await searchUserByEmail(shareEmail);
      if (!userFound) {
        error('Usuario no encontrado.');
        setShareLoading(false);
        return;
      }
      if (userFound.uid === uid) {
        error('No puedes enviarte una solicitud a ti mismo.');
        setShareLoading(false);
        return;
      }

      await sendExpenseRequest({
        planId: plan.id,
        fromOwnerId: uid,
        toOwnerId: userFound.uid,
        amount,
        status: 'pending',
        message: shareMessage || `Te invito a dividir "${plan.title}"`,
      });

      // Actualizar plan con sharedWith
      const updatedShared = [...(plan.sharedWith || []), userFound.uid];
      await updatePlanFn(plan.id, { sharedWith: updatedShared });

      success(`Solicitud enviada a ${shareEmail}`);
      setShowShareModal(null);
      setShareEmail('');
      setShareAmount('');
      setShareMessage('');
    } catch (e: any) {
      error(`Error: ${e?.message}`);
    } finally {
      setShareLoading(false);
    }
  };

  const handleRespondRequest = async (request: ExpenseRequest, response: 'accepted' | 'rejected') => {
    try {
      await respondToRequest(request.id, response);
      setReceivedRequests(prev => prev.filter(r => r.id !== request.id));
      success(response === 'accepted' ? 'Solicitud aceptada' : 'Solicitud rechazada');
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
    setFormDeadline(plan.deadline);
    setFormFrequency(plan.frequency || 'monthly');
    setFormAccountId(plan.accountId || '');
    setShowNewModal(true);
  };

  const openNewModal = (type?: PlanType) => {
    if (type) setFormType(type);
    setShowNewModal(true);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="plans-page">
          {/* Header */}
          <div className="page-header">
            <div className="page-header-left">
              <h1 className="page-title">Planes Financieros</h1>
              <p className="page-subtitle">Organiza ahorros, gastos y pagos recurrentes</p>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-primary" onClick={() => openNewModal()}>
                <IconPlus width={14} /> Nuevo Plan
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="plans-stats-grid">
            <div className="plans-stat-card plans-stat-savings">
              <span className="plans-stat-icon">💰</span>
              <div className="plans-stat-info">
                <span className="plans-stat-label">Planes de Ahorro</span>
                <span className="plans-stat-value">{formatCurrency(totalSavingsCurrent)} <small>/ {formatCurrency(totalSavingsTarget)}</small></span>
                <span className="plans-stat-count">{stats.savings.length} planes</span>
              </div>
              {totalSavingsTarget > 0 && (
                <div className="plans-stat-bar">
                  <div className="plans-stat-bar-fill" style={{ width: `${Math.min(100, (totalSavingsCurrent / totalSavingsTarget) * 100)}%` }} />
                </div>
              )}
            </div>
            <div className="plans-stat-card plans-stat-expense">
              <span className="plans-stat-icon">🛒</span>
              <div className="plans-stat-info">
                <span className="plans-stat-label">Gastos Planificados</span>
                <span className="plans-stat-value">{formatCurrency(totalExpenseCurrent)} <small>/ {formatCurrency(totalExpenseTarget)}</small></span>
                <span className="plans-stat-count">{stats.expenses.length} planes</span>
              </div>
              {totalExpenseTarget > 0 && (
                <div className="plans-stat-bar">
                  <div className="plans-stat-bar-fill" style={{ width: `${Math.min(100, (totalExpenseCurrent / totalExpenseTarget) * 100)}%` }} />
                </div>
              )}
            </div>
            <div className="plans-stat-card plans-stat-recurring">
              <span className="plans-stat-icon">🔄</span>
              <div className="plans-stat-info">
                <span className="plans-stat-label">Gastos Recurrentes</span>
                <span className="plans-stat-value">{formatCurrency(totalRecurringMonthly)}<small>/mes</small></span>
                <span className="plans-stat-count">{stats.recurring.length} planes</span>
              </div>
            </div>
            <div className="plans-stat-card plans-stat-active">
              <span className="plans-stat-icon">📊</span>
              <div className="plans-stat-info">
                <span className="plans-stat-label">Estado General</span>
                <span className="plans-stat-value">{stats.active} activos</span>
                <span className="plans-stat-count">{stats.completed} completados</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="plans-filters">
            <div className="plans-filter-group">
              <span className="plans-filter-label">Tipo:</span>
              {(['all', 'savings', 'expense', 'recurring'] as const).map(t => (
                <button key={t} className={`plans-filter-btn ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
                  {t === 'all' ? 'Todos' : PLAN_TYPES.find(pt => pt.value === t)?.icon} {t === 'all' ? '' : PLAN_TYPES.find(pt => pt.value === t)?.label}
                </button>
              ))}
            </div>
            <div className="plans-filter-group">
              <span className="plans-filter-label">Estado:</span>
              {(['all', 'pending', 'progress', 'completed', 'cancelled'] as const).map(s => (
                <button key={s} className={`plans-filter-btn plans-filter-status ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                  {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Received Requests */}
          {receivedRequests.filter(r => r.status === 'pending').length > 0 && (
            <div className="plans-requests-section">
              <h3 className="plans-section-title">📬 Solicitudes Recibidas</h3>
              <div className="plans-requests-list">
                {receivedRequests.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} className="plans-request-card">
                    <div className="plans-request-info">
                      <span className="plans-request-amount">{formatCurrency(req.amount)}</span>
                      <span className="plans-request-msg">{req.message}</span>
                    </div>
                    <div className="plans-request-actions">
                      <button className="plans-req-btn plans-req-accept" onClick={() => handleRespondRequest(req, 'accepted')}>✓ Aceptar</button>
                      <button className="plans-req-btn plans-req-reject" onClick={() => handleRespondRequest(req, 'rejected')}>✕ Rechazar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plans Grid */}
          {filteredPlans.length > 0 ? (
            <div className="plans-grid">
              {filteredPlans.map(plan => {
                const pct = plan.target > 0 ? Math.min(100, Math.round((plan.current / plan.target) * 100)) : 0;
                const typeInfo = PLAN_TYPES.find(t => t.value === plan.type);
                const catInfo = PLAN_CATEGORIES.find(c => c.value === plan.category);

                return (
                  <div key={plan.id} className="plan-card" style={{ borderLeftColor: typeInfo?.color }}>
                    <div className="plan-card-header">
                      <div className="plan-card-icon" style={{ background: `${typeInfo?.color}20` }}>
                        {catInfo?.icon || '📌'}
                      </div>
                      <div className="plan-card-info">
                        <h3 className="plan-card-title">{plan.title}</h3>
                        <span className="plan-card-type" style={{ color: typeInfo?.color }}>{typeInfo?.label}</span>
                      </div>
                      <div className="plan-card-status" style={{ background: `${STATUS_COLORS[plan.status]}20`, color: STATUS_COLORS[plan.status] }}>
                        {STATUS_LABELS[plan.status]}
                      </div>
                    </div>

                    <div className="plan-card-body">
                      {plan.description && <p className="plan-card-desc">{plan.description}</p>}

                      <div className="plan-card-amounts">
                        <span className="plan-card-current">{formatCurrency(plan.current)}</span>
                        <span className="plan-card-separator">/</span>
                        <span className="plan-card-target">{formatCurrency(plan.target)}</span>
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
                        {plan.sharedWith && plan.sharedWith.length > 0 && (
                          <span className="plan-card-meta-item">
                            <IconUsers width={12} /> {plan.sharedWith.length} invitado{plan.sharedWith.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {plan.deadline && plan.type !== 'recurring' && (
                          <span className="plan-card-meta-item">
                            📅 {getDaysRemaining(plan.deadline)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="plan-card-actions">
                      {plan.type === 'savings' && plan.status !== 'completed' && (
                        <button className="plan-action-btn plan-action-primary" onClick={() => { setShowAddFundsModal(plan); setAddAmount(''); setAddAccountId(''); }}>
                          + Añadir
                        </button>
                      )}
                      {plan.type === 'recurring' && plan.status !== 'completed' && (
                        <button className="plan-action-btn plan-action-primary" onClick={() => { setShowRecordPaymentModal(plan); setPayAmount(''); setPayAccountId(''); }}>
                          💳 Pagar
                        </button>
                      )}
                      {plan.type === 'expense' && plan.status !== 'completed' && (
                        <button className="plan-action-btn plan-action-primary" onClick={() => { setShowAddFundsModal(plan); setAddAmount(''); setAddAccountId(''); }}>
                          + Abonar
                        </button>
                      )}
                      <button className="plan-action-btn" onClick={() => setShowShareModal(plan)}>
                        <IconUsers width={14} />
                      </button>
                      <button className="plan-action-btn" onClick={() => openEditModal(plan)}>
                        <IconEdit width={14} />
                      </button>
                      <button className="plan-action-btn plan-action-danger" onClick={() => handleDeletePlan(plan)}>
                        <IconTrash width={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="plans-empty">
              <span className="plans-empty-icon">📋</span>
              <h3>No hay planes</h3>
              <p>Crea tu primer plan de ahorro, gasto planificado o recurrente</p>
              <button className="btn btn-primary" onClick={() => openNewModal()}>
                <IconPlus width={14} /> Crear Plan
              </button>
            </div>
          )}

          {/* Modal Nuevo/Editar Plan */}
          {showNewModal && (
            <div className="modal-overlay" onClick={() => { setShowNewModal(false); setEditingPlan(null); resetForm(); }}>
              <div className="modal-content modal-plan" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">{editingPlan ? 'Editar Plan' : 'Nuevo Plan'}</h2>
                    <p className="modal-subtitle">{editingPlan ? 'Modifica los datos del plan' : 'Elige el tipo de plan financiero'}</p>
                  </div>
                  <button className="modal-close" onClick={() => { setShowNewModal(false); setEditingPlan(null); resetForm(); }}>✕</button>
                </div>
                <div className="modal-body">
                  {/* Type selector */}
                  <div className="plan-type-selector">
                    {PLAN_TYPES.map(t => (
                      <button key={t.value} className={`plan-type-btn ${formType === t.value ? 'active' : ''}`} style={formType === t.value ? { borderColor: t.color, background: t.color + '12' } : {}} onClick={() => setFormType(t.value)}>
                        <span className="plan-type-icon">{t.icon}</span>
                        <span className="plan-type-label">{t.label}</span>
                        <span className="plan-type-desc">{t.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="plan-field">
                    <label className="plan-label">Título *</label>
                    <input className="plan-input" type="text" placeholder="Ej: Comprar celular, Alquiler mensual" value={formTitle} onChange={e => setFormTitle(e.target.value)} autoFocus />
                  </div>

                  <div className="plan-field">
                    <label className="plan-label">Descripción</label>
                    <input className="plan-input" type="text" placeholder="Descripción opcional" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
                  </div>

                  <div className="plan-field-row">
                    <div className="plan-field">
                      <label className="plan-label">Categoría</label>
                      <CustomSelect value={formCategory} onChange={v => setFormCategory(v as PlanCategory)} options={PLAN_CATEGORIES.map(c => ({ value: c.value, label: `${c.icon} ${c.value}`, icon: c.icon }))} placeholder="Seleccionar..." />
                    </div>
                    <div className="plan-field">
                      <label className="plan-label">Monto *</label>
                      <div className="plan-input-wrap">
                        <span className="plan-currency">$</span>
                        <input className="plan-input plan-input-amount" type="number" min="0" step="0.01" placeholder="0.00" value={formTarget} onChange={e => setFormTarget(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {formType !== 'recurring' && (
                    <div className="plan-field">
                      <label className="plan-label">Fecha límite</label>
                      <input className="plan-input plan-input-date" type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} />
                    </div>
                  )}

                  {formType === 'recurring' && (
                    <div className="plan-field-row">
                      <div className="plan-field">
                        <label className="plan-label">Frecuencia</label>
                        <CustomSelect value={formFrequency} onChange={v => setFormFrequency(v as RecurringFrequency)} options={RECURRENCES.map(r => ({ value: r.value, label: r.label }))} placeholder="Seleccionar..." />
                      </div>
                      <div className="plan-field">
                        <label className="plan-label">Próximo pago</label>
                        <input className="plan-input plan-input-date" type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} />
                      </div>
                    </div>
                  )}

                  <div className="plan-field">
                    <label className="plan-label">Cuenta vinculada</label>
                    <CustomSelect value={formAccountId} onChange={v => setFormAccountId(v)} options={[{ value: '', label: 'Sin cuenta', icon: '—' }, ...accounts.map(a => ({ value: a.id, label: `${a.icon} ${a.name}`, icon: a.icon }))]} placeholder="Seleccionar..." />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => { setShowNewModal(false); setEditingPlan(null); resetForm(); }}>Cancelar</button>
                  <button className="btn btn-primary" onClick={editingPlan ? handleEditPlan : handleCreatePlan} disabled={formLoading || !formTitle || !formTarget}>
                    {formLoading ? 'Guardando...' : editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
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
                    <h2 className="modal-title">Añadir a "{showAddFundsModal.title}"</h2>
                    <p className="modal-subtitle">Actual: {formatCurrency(showAddFundsModal.current)} / {formatCurrency(showAddFundsModal.target)}</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowAddFundsModal(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="plan-field">
                    <label className="plan-label">Monto</label>
                    <div className="plan-input-wrap">
                      <span className="plan-currency">$</span>
                      <input className="plan-input plan-input-amount" type="number" min="0" step="0.01" placeholder="0.00" value={addAmount} onChange={e => setAddAmount(e.target.value)} autoFocus />
                    </div>
                  </div>
                  <div className="plan-field">
                    <label className="plan-label">Cuenta (opcional)</label>
                    <CustomSelect value={addAccountId} onChange={v => setAddAccountId(v)} options={[{ value: '', label: 'Sin cuenta', icon: '—' }, ...accounts.map(a => ({ value: a.id, label: `${a.icon} ${a.name}`, icon: a.icon }))]} placeholder="Seleccionar..." />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowAddFundsModal(null)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={() => handleAddFunds(showAddFundsModal)} disabled={formLoading || !addAmount}>
                    {formLoading ? 'Guardando...' : 'Añadir'}
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
                    <h2 className="modal-title">Registrar Pago</h2>
                    <p className="modal-subtitle">{showRecordPaymentModal.title} · {formatCurrency(showRecordPaymentModal.target)}/{RECURRENCES.find(r => r.value === showRecordPaymentModal.frequency)?.label}</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowRecordPaymentModal(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="plan-field">
                    <label className="plan-label">Monto del pago</label>
                    <div className="plan-input-wrap">
                      <span className="plan-currency">$</span>
                      <input className="plan-input plan-input-amount" type="number" min="0" step="0.01" placeholder={String(showRecordPaymentModal.target)} value={payAmount} onChange={e => setPayAmount(e.target.value)} autoFocus />
                    </div>
                  </div>
                  <div className="plan-field">
                    <label className="plan-label">Cuenta</label>
                    <CustomSelect value={payAccountId} onChange={v => setPayAccountId(v)} options={[{ value: '', label: 'Sin cuenta', icon: '—' }, ...accounts.map(a => ({ value: a.id, label: `${a.icon} ${a.name}`, icon: a.icon }))]} placeholder="Seleccionar..." />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowRecordPaymentModal(null)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={() => handleRecordPayment(showRecordPaymentModal)} disabled={formLoading || !payAmount}>
                    {formLoading ? 'Guardando...' : 'Registrar Pago'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Compartir */}
          {showShareModal && (
            <div className="modal-overlay" onClick={() => setShowShareModal(null)}>
              <div className="modal-content modal-plan-small" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">Compartir Gasto</h2>
                    <p className="modal-subtitle">Invita a alguien a dividir "{showShareModal.title}"</p>
                  </div>
                  <button className="modal-close" onClick={() => setShowShareModal(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="plan-field">
                    <label className="plan-label">Email del usuario</label>
                    <input className="plan-input" type="email" placeholder="usuario@email.com" value={shareEmail} onChange={e => setShareEmail(e.target.value)} autoFocus />
                  </div>
                  <div className="plan-field">
                    <label className="plan-label">Monto a pagar</label>
                    <div className="plan-input-wrap">
                      <span className="plan-currency">$</span>
                      <input className="plan-input plan-input-amount" type="number" min="0" step="0.01" placeholder="0.00" value={shareAmount} onChange={e => setShareAmount(e.target.value)} />
                    </div>
                  </div>
                  <div className="plan-field">
                    <label className="plan-label">Mensaje (opcional)</label>
                    <input className="plan-input" type="text" placeholder="Te invito a dividir este gasto" value={shareMessage} onChange={e => setShareMessage(e.target.value)} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowShareModal(null)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={() => handleSharePlan(showShareModal)} disabled={shareLoading || !shareEmail || !shareAmount}>
                    {shareLoading ? 'Enviando...' : 'Enviar Solicitud'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} variant={confirmState.variant} confirmText={confirmState.confirmText || 'Confirmar'} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} />
        </div>

        <style>{`
          .plans-page { padding: 0; }

          /* Stats */
          .plans-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .plans-stat-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px; position: relative; overflow: hidden; }
          .plans-stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
          .plans-stat-savings::before { background: #3DCC8E; }
          .plans-stat-expense::before { background: #EF4444; }
          .plans-stat-recurring::before { background: #F59E0B; }
          .plans-stat-active::before { background: #3B82F6; }
          .plans-stat-icon { font-size: 1.5rem; display: block; margin-bottom: 8px; }
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
          .plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
          .plan-card { background: var(--bg-card); border: 1px solid var(--border-default); border-left: 4px solid; border-radius: var(--radius-md); overflow: hidden; transition: all 0.2s; }
          .plan-card:hover { box-shadow: var(--shadow-sm); transform: translateY(-2px); }
          .plan-card-header { display: flex; align-items: center; gap: 10px; padding: 14px 14px 10px; }
          .plan-card-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.125rem; flex-shrink: 0; }
          .plan-card-info { flex: 1; min-width: 0; }
          .plan-card-title { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .plan-card-type { font-size: 0.6875rem; font-weight: 600; }
          .plan-card-status { padding: 3px 8px; border-radius: var(--radius-full); font-size: 0.625rem; font-weight: 700; flex-shrink: 0; }
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
          .plan-action-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-secondary); font-size: 0.6875rem; font-weight: 600; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 4px; }
          .plan-action-btn:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .plan-action-primary { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .plan-action-primary:hover { filter: brightness(1.1); }
          .plan-action-danger:hover { border-color: var(--color-error); color: var(--color-error); background: rgba(239,68,68,0.1); }

          /* Empty */
          .plans-empty { text-align: center; padding: 48px 24px; color: var(--text-secondary); }
          .plans-empty-icon { font-size: 3rem; display: block; margin-bottom: 12px; }
          .plans-empty h3 { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px 0; }
          .plans-empty p { font-size: 0.875rem; margin: 0 0 20px 0; }

          /* Modal */
          .modal-plan { max-width: 520px; }
          .modal-plan-small { max-width: 420px; }

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
            .plans-grid { grid-template-columns: 1fr; }
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
}
