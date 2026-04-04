'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useSearch } from '@/lib/contexts/SearchContext';
import { useGoals } from '@/lib/contexts/GoalsContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/app/components/Toast';
import { ConfirmDialog } from '@/app/components/Toast';
import {
  IconPlus,
  IconTrendUp,
  IconChevronRight,
  IconZap,
  IconWallet,
  IconX,
  IconTrash,
  IconEdit,
  IconArrowForward,
  IconReceipt,
} from '../components/icons';
import { CustomSelect } from '../components/CustomSelect';
import { addCustomCategory, getUserPreferences } from '@/lib/firestore/users';
import { getTransactionsByOwnerId, createTransaction, getMonthlyGrowthForGoal, getStreakDaysForGoal } from '@/lib/firestore/transactions';
import { subscribeToAccounts, updateAccountBalance } from '@/lib/firestore/accounts';
import type { Goal, GoalCategory, GoalStatus, Transaction, FinancialAccount } from '@/types';

const DEFAULT_CATEGORIES: Record<string, string> = { Ahorro: '💰', Inversión: '📈', Educación: '🎓', Otro: '📌' };
const CATEGORY_COLORS: Record<string, string> = { Ahorro: '#3DCC8E', Inversión: '#3B82F6', Educación: '#F59E0B', Otro: '#8B5CF6' };

// Generar sparkline real desde transacciones de ahorro de la meta
function generateRealSparklineData(savings: Transaction[], target: number): string {
  if (savings.length === 0) return '';

  // Agrupar por fecha (últimos 8 períodos)
  const sorted = [...savings].sort((a, b) => a.date - b.date);
  const points = 8;
  const chunkSize = Math.max(1, Math.ceil(sorted.length / points));
  const chunks: Transaction[][] = [];

  for (let i = 0; i < sorted.length; i += chunkSize) {
    chunks.push(sorted.slice(i, i + chunkSize));
  }

  // Calcular acumulado por chunk
  const data: number[] = [];
  let cumulative = 0;
  chunks.forEach((chunk) => {
    const chunkTotal = chunk.reduce((sum, t) => sum + t.amount, 0);
    cumulative += chunkTotal;
    const pct = target > 0 ? (cumulative / target) * 35 + 5 : 10;
    data.push(Math.max(5, Math.min(38, pct)));
  });

  // Rellenar si hay menos de 8 puntos
  while (data.length < points) {
    data.unshift(5);
  }

  const normalized = data.map((v, i) => `${(i / (points - 1)) * 100},${v}`);
  return normalized.join(' ');
}

function getDaysRemaining(deadline: string): string {
  if (!deadline) return 'Sin fecha';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline + 'T12:00:00');
  target.setHours(0, 0, 0, 0);
  const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Vencida';
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `${days} días rest.`;
}

function getEstimatedDate(deadline: string): string {
  if (!deadline) return 'Sin estimar';
  const d = new Date(deadline + 'T12:00:00');
  return d.toLocaleDateString('es', { month: 'short', year: 'numeric' });
}

export default function MetasPage() {
  const { query } = useSearch();
  const { goals, addGoal, updateGoalFn, deleteGoalFn } = useGoals();
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const userId = user?.uid || '';
  const [filter, setFilter] = useState('Todas');
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<Goal | null>(null);
  const [showAddFundsModal, setShowAddFundsModal] = useState<Goal | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<Record<string, string>>({ ...DEFAULT_CATEGORIES });
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; variant: 'danger' | 'warning' | 'info'; confirmText?: string }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' });
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [goalSavings, setGoalSavings] = useState<Record<string, Transaction[]>>({});
  const [goalMonthlyGrowth, setGoalMonthlyGrowth] = useState<Record<string, number>>({});
  const [goalStreakDays, setGoalStreakDays] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    title: '', category: 'Ahorro' as GoalCategory, current: 0, target: 0, deadline: '', color: '#3DCC8E', icon: '🎯',
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function loadPrefs() {
      try {
        const prefs = await getUserPreferences(userId);
        if (!cancelled && prefs.customCategories) {
          setCustomCategories(prefs.customCategories);
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
  }, [userId]);

  // Suscribirse a cuentas
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToAccounts(userId, (accs) => setAccounts(accs));
    return () => unsub();
  }, [userId]);

  // Cargar historial de ahorro para cada meta
  useEffect(() => {
    if (!userId || goals.length === 0) return;
    let cancelled = false;
    async function loadSavings() {
      try {
        const allTx = await getTransactionsByOwnerId(userId);
        if (cancelled) return;

        const savings: Record<string, Transaction[]> = {};
        const growth: Record<string, number> = {};
        const streaks: Record<string, number> = {};

        for (const goal of goals) {
          const goalSavingsTx = allTx.filter(
            (t) => t.type === 'saving' && t.description.toLowerCase().includes(goal.title.toLowerCase())
          );
          savings[goal.id] = goalSavingsTx;

          const monthlyGrowth = await getMonthlyGrowthForGoal(userId, goal.title);
          growth[goal.id] = monthlyGrowth;

          const streak = await getStreakDaysForGoal(userId, goal.title);
          streaks[goal.id] = streak;
        }

        if (!cancelled) {
          setGoalSavings(savings);
          setGoalMonthlyGrowth(growth);
          setGoalStreakDays(streaks);
        }
      } catch (e) { console.error(e); }
    }
    loadSavings();
    return () => { cancelled = true; };
  }, [userId, goals]);

  const filteredGoals = useMemo(() => {
    return (filter === 'Todas'
      ? goals
      : goals.filter((g) => g.category === filter || (filter === 'Completadas' && g.status === 'completed')
    )).filter((g) => !query || g.title.toLowerCase().includes(query.toLowerCase()));
  }, [goals, filter, query]);

  const stats = useMemo(() => {
    const totalSaved = goals.reduce((sum, g) => sum + g.current, 0);
    const totalPending = goals.reduce((sum, g) => sum + Math.max(0, g.target - g.current), 0);
    const completedCount = goals.filter((g) => g.status === 'completed').length;
    const successRate = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;
    return { totalSaved, totalPending, successRate, activeGoals: goals.filter((g) => g.status !== 'completed').length };
  }, [goals]);

  const resetForm = () => {
    setFormData({ title: '', category: 'Ahorro', current: 0, target: 0, deadline: '', color: '#3DCC8E', icon: '🎯' });
    setEditingGoal(null);
  };

  const handleCreateOrUpdateGoal = async () => {
    if (!formData.title || !formData.target) return;
    if (!userId) return;

    if (editingGoal) {
      const newStatus: GoalStatus = formData.current >= formData.target ? 'completed' : editingGoal.status === 'pending' && formData.current > 0 ? 'progress' : editingGoal.status;
      const updated: Partial<Goal> = { ...editingGoal, ...formData, status: newStatus, updatedAt: Date.now() };
      await updateGoalFn(editingGoal.id, updated);
    } else {
      const goalData = {
        ownerId: userId,
        title: formData.title,
        category: formData.category,
        current: formData.current,
        target: formData.target,
        deadline: formData.deadline,
        status: (formData.current >= formData.target ? 'completed' : 'pending') as GoalStatus,
        color: formData.color,
        icon: formData.icon,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      try {
        await addGoal(goalData as any);
      } catch (error: any) {
        console.error('[Metas] Error al crear meta:', error?.message);
      }
    }

    setShowNewGoalModal(false);
    resetForm();
  };

  const handleDeleteGoal = async (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    setConfirmState({
      isOpen: true,
      title: 'Eliminar Meta',
      message: `¿Estás seguro de eliminar "${goal?.title}"? Esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        await deleteGoalFn(goalId);
        success('Meta eliminada');
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleAddFunds = async () => {
    if (!showAddFundsModal || !addAmount) return;
    const amount = Number(addAmount);
    if (amount <= 0) return;

    // Validar fondos de la cuenta seleccionada
    if (selectedAccountId) {
      const selectedAcc = accounts.find((a) => a.id === selectedAccountId);
      if (!selectedAcc || selectedAcc.balance < amount) {
        error(`Fondos insuficientes en "${selectedAcc?.name || 'la cuenta seleccionada'}".`);
        return;
      }
    }

    const newCurrent = Math.min(showAddFundsModal.current + amount, showAddFundsModal.target);
    const newStatus: GoalStatus = newCurrent >= showAddFundsModal.target ? 'completed' : showAddFundsModal.status === 'pending' ? 'progress' : showAddFundsModal.status;
    await updateGoalFn(showAddFundsModal.id, { current: newCurrent, status: newStatus, updatedAt: Date.now() });

    // Crear transacción de ahorro vinculada a la meta
    if (userId) {
      try {
        const txData: any = {
          ownerId: userId,
          amount,
          type: 'saving',
          category: 'Ahorro',
          description: `Ahorro para: ${showAddFundsModal.title}`,
          date: Date.now(),
        };
        if (selectedAccountId) {
          txData.accountId = selectedAccountId;
          // Debitar de la cuenta
          await updateAccountBalance(selectedAccountId, -amount);
        }
        await createTransaction(txData);
      } catch (e) { console.error('Error creando transacción:', e); }
    }

    setShowAddFundsModal(null);
    setAddAmount('');
    setSelectedAccountId('');
    success(`$${amount.toLocaleString()} agregados a "${showAddFundsModal.title}"`);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({ title: goal.title, category: goal.category, current: goal.current, target: goal.target, deadline: goal.deadline, color: goal.color, icon: goal.icon });
    setShowNewGoalModal(true);
  };

  const completedGoal = goals.find((g) => g.status === 'completed');

  return (
    <ProtectedRoute>
    <DashboardLayout>
      <div className="page-header animate-fadeInDown">
        <div className="page-header-left">
          <h1 className="page-title">Mis Metas</h1>
          <p className="page-subtitle">Visualiza y gestiona tu progreso hacia la libertad financiera.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowNewGoalModal(true); }}>
            <IconPlus /> Crear Nueva Meta
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar animate-fadeInUp">
        <div className="stat-card">
          <div className="stat-label">Total Invertido</div>
          <div className="stat-value stat-value-green">${stats.totalSaved.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pendiente</div>
          <div className="stat-value stat-value-default">${stats.totalPending.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tasa de Éxito</div>
          <div className="stat-value stat-value-secondary">{stats.successRate}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Metas Activas</div>
          <div className="stat-value stat-value-default">{stats.activeGoals}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filters-bar animate-fadeInUp">
        {['Todas', 'Ahorro', 'Inversión', 'Educación', ...customCategories, 'Completadas'].map((item) => (
          <button key={item} className={`filter-chip ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>

      {/* Goals List */}
      <div className="goals-list animate-fadeInUp">
        {filteredGoals.length > 0 ? filteredGoals.map((goal, i) => {
          const pct = Math.min(100, (goal.current / goal.target) * 100);
          const remaining = goal.target - goal.current;
          const sparklineData = generateRealSparklineData(goalSavings[goal.id] || [], goal.target);
          const isCompleted = goal.status === 'completed';
          const color = CATEGORY_COLORS[goal.category] || goal.color;

          return (
            <div key={goal.id} className={`goal-card ${isCompleted ? 'goal-card-completed' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
              {/* Icon & Basic Info */}
              <div className="goal-card-header">
                <div className="goal-card-icon" style={{ background: `${color}30`, color }}>
                  <span style={{ fontSize: '1.5rem' }}>{goal.icon}</span>
                </div>
                <div className="goal-card-info">
                  <h3 className="goal-card-title">{goal.title}</h3>
                  <div className="goal-card-tags">
                    <span className="goal-tag" style={{ background: `${color}20`, color }}>{goal.category}</span>
                    {isCompleted && <span className="goal-tag goal-tag-completed">Completada</span>}
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div className="goal-card-progress">
                <div className="goal-card-values">
                  <span className="goal-card-current">${goal.current.toLocaleString()}</span>
                  <span className="goal-card-separator">/</span>
                  <span className="goal-card-target">${goal.target.toLocaleString()}</span>
                  <span className="goal-card-pct" style={{ color }}>{pct.toFixed(0)}%</span>
                </div>
                <div className="goal-progress-track">
                  <div className="goal-progress-fill" style={{ width: `${pct}%`, background: isCompleted ? color : `linear-gradient(to right, ${color}, ${color}cc)` }} />
                </div>
                <div className="goal-card-meta">
                  <span>Iniciado: {goal.createdAt ? new Date(goal.createdAt).toLocaleDateString('es', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
                  <span>{isCompleted ? '$0 restante' : `Restan $${remaining.toLocaleString()}`}</span>
                </div>
              </div>

              {/* Sparkline */}
              <div className="goal-card-sparkline">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                  <polyline
                    points={sparklineData}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.6"
                  />
                  <polygon
                    points={`${sparklineData} 100,40 0,40`}
                    fill={color}
                    opacity="0.05"
                  />
                </svg>
              </div>

              {/* Meta Data */}
              <div className="goal-card-estimated">
                <div className="goal-card-estimated-label">Estimado</div>
                <div className="goal-card-estimated-date">{getEstimatedDate(goal.deadline)}</div>
                <div className="goal-card-estimated-days" style={{ color: isCompleted ? 'var(--text-tertiary)' : color }}>{getDaysRemaining(goal.deadline)}</div>
              </div>

              {/* Quick Actions */}
              <div className="goal-card-actions">
                <button className="goal-action-btn goal-action-btn-add" onClick={() => setShowAddFundsModal(goal)} title="Añadir fondos">
                  <IconWallet width={16} />
                </button>
                <button className="goal-action-btn" onClick={() => openEditModal(goal)} title="Editar">
                  <IconEdit width={16} />
                </button>
                <button className="goal-action-btn goal-action-btn-danger" onClick={() => handleDeleteGoal(goal.id)} title="Eliminar">
                  <IconTrash width={16} />
                </button>
                <button className="goal-action-btn goal-action-btn-arrow" onClick={() => setShowDetailModal(goal)} title="Detalles">
                  <IconArrowForward width={16} />
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="goals-empty-state">
            <p className="goals-empty-icon">🎯</p>
            <p className="goals-empty-text">{goals.length === 0 ? 'No tienes metas aún. ¡Crea tu primera meta!' : 'No hay metas con este filtro.'}</p>
          </div>
        )}
      </div>

      {/* Insight Card */}
      {completedGoal && (
        <div className="insight-card animate-fadeInUp">
          <div className="insight-card-content">
            <h3 className="insight-card-title">¡Increíble progreso este mes!</h3>
            <p className="insight-card-desc">Has completado "{completedGoal.title}". Esto te acerca un paso más a tu objetivo de libertad financiera anual.</p>
            <button className="insight-card-btn" onClick={() => setShowDetailModal(completedGoal)}>Ver Reporte</button>
          </div>
          <div className="insight-card-decoration"></div>
        </div>
      )}

      {/* New Goal / Edit Modal */}
      {showNewGoalModal && (
        <div className="modal-overlay" onClick={() => { setShowNewGoalModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingGoal ? 'Editar Meta' : 'Nueva Meta'}</h2>
              <button className="modal-close" onClick={() => { setShowNewGoalModal(false); resetForm(); }}><IconX width={20} /></button>
            </div>
            <div className="modal-body">
              <label className="form-label">Título</label>
              <input className="form-input" type="text" placeholder="Ej: Fondo de Emergencia" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              <label className="form-label">Categoría</label>
              <CustomSelect
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val as GoalCategory })}
                options={Object.entries(allCategories).map(([key, icon]) => ({ value: key, label: key, icon }))}
                placeholder="Seleccionar categoría..."
                allowCustom
                onAddCustom={async (value, label) => {
                  if (userId) {
                    await addCustomCategory(userId, value);
                    setCustomCategories(prev => [...prev, value]);
                    const customColors = ['#10B981', '#6366F1', '#EC4899', '#F97316', '#14B8A6', '#A855F7', '#06B6D4', '#84CC16'];
                    const newColor = customColors[customCategories.length % customColors.length];
                    setAllCategories(prev => ({ ...prev, [value]: newColor }));
                  }
                }}
                customPlaceholder="Nombre de la categoría..."
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">Monto Actual ($)</label><input className="form-input" type="number" placeholder="0" value={formData.current || ''} onChange={(e) => setFormData({ ...formData, current: Number(e.target.value) })} /></div>
                <div><label className="form-label">Meta ($)</label><input className="form-input" type="number" placeholder="10000" value={formData.target || ''} onChange={(e) => setFormData({ ...formData, target: Number(e.target.value) })} /></div>
              </div>
              <label className="form-label">Fecha Límite</label>
              <input className="form-input" type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['#3DCC8E', '#1E3A6E', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'].map((c) => (
                  <button key={c} onClick={() => setFormData({ ...formData, color: c })} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: formData.color === c ? '3px solid var(--text-primary)' : '3px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
              <label className="form-label">Icono</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['🎯', '🛡️', '📈', '✈️', '🎓', '💻', '🏠', '🚗'].map((icon) => (
                  <button key={icon} onClick={() => setFormData({ ...formData, icon })} style={{ fontSize: '1.5rem', padding: 8, borderRadius: 'var(--radius-md)', background: formData.icon === icon ? 'var(--bg-input)' : 'transparent', border: formData.icon === icon ? '2px solid var(--color-prosper-green)' : '2px solid transparent', cursor: 'pointer' }}>{icon}</button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setShowNewGoalModal(false); resetForm(); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateOrUpdateGoal}>{editingGoal ? 'Guardar' : 'Crear Meta'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{showDetailModal.icon} {showDetailModal.title}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(null)}><IconX width={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div><p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Categoría</p><p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{showDetailModal.category}</p></div>
                <div><p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Estado</p><p style={{ fontSize: '1rem', fontWeight: 600, color: showDetailModal.status === 'completed' ? 'var(--color-prosper-green)' : 'var(--color-blue-500)' }}>{showDetailModal.status === 'completed' ? 'Completada' : showDetailModal.status === 'progress' ? 'En Progreso' : 'Pendiente'}</p></div>
                <div><p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Monto Actual</p><p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>${showDetailModal.current.toLocaleString()}</p></div>
                <div><p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Meta</p><p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>${showDetailModal.target.toLocaleString()}</p></div>
                <div><p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Fecha Límite</p><p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{showDetailModal.deadline}</p></div>
                <div><p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Progreso</p><p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-prosper-green)' }}>{Math.min(100, (showDetailModal.current / showDetailModal.target) * 100).toFixed(1)}%</p></div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="goal-progress-track" style={{ height: 12 }}>
                  <div className="goal-progress-fill" style={{ width: `${Math.min(100, (showDetailModal.current / showDetailModal.target) * 100)}%`, background: showDetailModal.status === 'completed' ? 'var(--color-prosper-green)' : showDetailModal.color, height: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
                <div className="stat"><IconTrendUp width={14} /><span>{goalMonthlyGrowth[showDetailModal.id] ? `+${goalMonthlyGrowth[showDetailModal.id]}% este mes` : 'Sin datos'}</span></div>
                <div className="stat"><IconZap width={14} /><span>{goalStreakDays[showDetailModal.id] ? `Racha de ${goalStreakDays[showDetailModal.id]} días` : 'Sin racha'}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetailModal(null)}>Cerrar</button>
              <button className="btn btn-primary" onClick={() => { setShowDetailModal(null); openEditModal(showDetailModal); }}>Editar Meta</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Funds Modal */}
      {showAddFundsModal && (
        <div className="modal-overlay" onClick={() => { setShowAddFundsModal(null); setAddAmount(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <h2 className="modal-title">Agregar Fondos</h2>
              <button className="modal-close" onClick={() => { setShowAddFundsModal(null); setAddAmount(''); }}><IconX width={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>{showAddFundsModal.title}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Actual: ${showAddFundsModal.current.toLocaleString()} / ${showAddFundsModal.target.toLocaleString()}</p>
              <label className="form-label">Cuenta de origen</label>
              <CustomSelect
                value={selectedAccountId}
                onChange={(val) => setSelectedAccountId(val)}
                options={accounts.map((a) => ({ value: a.id, label: `${a.name} ($${a.balance.toLocaleString()})`, icon: a.icon }))}
                placeholder="Sin cuenta (no descuenta)"
              />
              <label className="form-label">Monto a agregar ($)</label>
              <input className="form-input" type="number" placeholder="100" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setShowAddFundsModal(null); setAddAmount(''); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddFunds}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* === STATS BAR === */
        .stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; }
        .stat-label { font-size: 0.625rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 4px; }
        .stat-value { font-size: 1.5rem; font-weight: 900; }
        .stat-value-green { color: var(--color-prosper-green); }
        .stat-value-secondary { color: var(--color-blue-500); }
        .stat-value-default { color: var(--text-primary); }

        /* === FILTER BAR === */
        .filters-bar { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 24px; scrollbar-width: none; }
        .filters-bar::-webkit-scrollbar { display: none; }
        .filter-chip { padding: 8px 20px; border-radius: var(--radius-full); background: var(--bg-card); border: 1px solid var(--border-default); color: var(--text-secondary); font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); white-space: nowrap; }
        .filter-chip:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
        .filter-chip.active { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); box-shadow: 0 4px 12px rgba(61, 204, 142, 0.2); }

        /* === GOALS LIST === */
        .goals-list { display: flex; flex-direction: column; gap: 16px; }
        .goal-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 24px; display: flex; flex-wrap: wrap; align-items: center; gap: 20px; transition: all var(--transition-base); }
        .goal-card:hover { border-color: var(--color-prosper-green); box-shadow: var(--shadow-md); transform: translateX(2px); }
        .goal-card-completed { opacity: 0.8; border-color: var(--color-prosper-green); }

        .goal-card-header { display: flex; align-items: center; gap: 16px; min-width: 200px; flex: 1; }
        .goal-card-icon { width: 56px; height: 56px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .goal-card-info { flex: 1; min-width: 0; }
        .goal-card-title { font-size: 1.0625rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .goal-card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
        .goal-tag { font-size: 0.625rem; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-sm); text-transform: uppercase; letter-spacing: 0.05em; }
        .goal-tag-completed { background: var(--bg-input); color: var(--text-tertiary); }

        .goal-card-progress { flex: 1; min-width: 200px; }
        .goal-card-values { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
        .goal-card-current { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); }
        .goal-card-separator { color: var(--text-tertiary); font-size: 0.875rem; }
        .goal-card-target { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
        .goal-card-pct { font-size: 0.75rem; font-weight: 700; margin-left: auto; }
        .goal-progress-track { height: 10px; background: var(--bg-input); border-radius: var(--radius-full); overflow: hidden; margin-bottom: 6px; }
        .goal-progress-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
        .goal-card-meta { display: flex; justify-content: space-between; font-size: 0.625rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }

        .goal-card-sparkline { width: 96px; height: 48px; flex-shrink: 0; }

        .goal-card-estimated { width: 100px; text-align: right; flex-shrink: 0; }
        .goal-card-estimated-label { font-size: 0.625rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; }
        .goal-card-estimated-date { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); }
        .goal-card-estimated-days { font-size: 0.625rem; font-weight: 600; }

        .goal-card-actions { display: flex; gap: 8px; margin-left: auto; flex-shrink: 0; }
        .goal-action-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: var(--radius-md); background: var(--bg-input); border: 1px solid var(--border-default); color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
        .goal-action-btn:hover { background: var(--bg-input-hover); border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
        .goal-action-btn-add:hover { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
        .goal-action-btn-danger:hover { border-color: var(--color-red-500); color: var(--color-red-500); }
        .goal-action-btn-arrow { background: transparent; border: none; }
        .goal-action-btn-arrow:hover { color: var(--color-prosper-green); background: transparent; }

        /* === EMPTY STATE === */
        .goals-empty-state { text-align: center; padding: 60px 20px; }
        .goals-empty-icon { font-size: 3rem; margin-bottom: 12px; }
        .goals-empty-text { color: var(--text-secondary); font-size: 1rem; }

        /* === INSIGHT CARD === */
        .insight-card { margin-top: 32px; background: linear-gradient(135deg, var(--bg-card), var(--bg-input)); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 32px; display: flex; align-items: center; justify-content: space-between; overflow: hidden; position: relative; }
        .insight-card-content { position: relative; z-index: 1; max-width: 500px; }
        .insight-card-title { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0 0 8px; }
        .insight-card-desc { color: var(--text-secondary); margin: 0 0 20px; line-height: 1.5; }
        .insight-card-btn { padding: 10px 24px; background: var(--color-prosper-green); color: white; border: none; border-radius: var(--radius-md); font-size: 0.8125rem; font-weight: 700; cursor: pointer; transition: all var(--transition-fast); box-shadow: 0 4px 12px rgba(61, 204, 142, 0.2); }
        .insight-card-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .insight-card-decoration { position: absolute; right: 0; top: 0; height: 100%; width: 30%; opacity: 0.15; background: linear-gradient(135deg, var(--color-prosper-green), transparent); pointer-events: none; }

        /* === MODAL === */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }
        .modal-content { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); width: 90%; max-width: 480px; max-height: 85vh; overflow-y: auto; padding: 24px; animation: fadeInUp 0.3s ease; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .modal-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
        .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); }
        .modal-close:hover { color: var(--text-primary); background: var(--bg-input); }
        .modal-body { display: flex; flex-direction: column; gap: 14px; }
        .modal-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
        .form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin-bottom: -6px; }
        .form-input { width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.875rem; outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
        .form-input:focus { border-color: var(--color-prosper-green); }
        .form-input::placeholder { color: var(--text-tertiary); }
        select.form-input { cursor: pointer; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        /* === RESPONSIVE === */
        @media (max-width: 1024px) {
          .goal-card-sparkline { display: none; }
          .goal-card-estimated { width: 90px; }
        }
        @media (max-width: 768px) {
          .stats-bar { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .stat-card { padding: 12px; }
          .stat-value { font-size: 1.25rem; }
          .goal-card { flex-wrap: wrap; padding: 16px; gap: 12px; }
          .goal-card-header { width: 100%; min-width: auto; }
          .goal-card-progress { width: 100%; min-width: auto; }
          .goal-card-sparkline { display: none; }
          .goal-card-estimated { width: 100%; text-align: left; display: flex; gap: 12px; align-items: baseline; flex-shrink: 0; }
          .goal-card-actions { width: auto; margin-left: auto; }
          .insight-card { flex-direction: column; text-align: center; padding: 24px; }
          .insight-card-decoration { display: none; }
          .modal-content { width: 95%; padding: 16px; }
        }
        @media (max-width: 480px) {
          .stats-bar { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .stat-card { padding: 10px; }
          .stat-label { font-size: 0.5625rem; }
          .stat-value { font-size: 1.125rem; }
          .page-header { flex-direction: column; gap: 12px; }
          .page-header-actions { width: 100%; }
          .page-header-actions .btn { width: 100%; justify-content: center; }
          .goal-card { padding: 14px; }
          .goal-card-icon { width: 44px; height: 44px; }
          .goal-card-title { font-size: 0.9375rem; }
          .goal-card-current { font-size: 1rem; }
          .goal-card-target { font-size: 0.8125rem; }
          .goal-card-actions { gap: 6px; }
          .goal-action-btn { width: 32px; height: 32px; }
          .goal-action-btn svg { width: 14px; height: 14px; }
          .filter-chip { padding: 6px 14px; font-size: 0.75rem; }
          .filters-bar { gap: 6px; }
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
