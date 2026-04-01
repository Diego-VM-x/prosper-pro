'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useSearch } from '@/lib/contexts/SearchContext';
import { useGoals } from '@/lib/contexts/GoalsContext';
import {
  IconPlus,
  IconTrendUp,
  IconChevronRight,
  IconZap,
  IconWallet,
  IconX,
  IconTrash,
  IconEdit,
} from '../components/icons';
import type { Goal, GoalCategory, GoalStatus } from '@/types';

export default function MetasPage() {
  const { query } = useSearch();
  const { goals, userId, addGoal, updateGoalFn, deleteGoalFn } = useGoals();
  const [filter, setFilter] = useState('Todas');
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<Goal | null>(null);
  const [showAddFundsModal, setShowAddFundsModal] = useState<Goal | null>(null);
  const [addAmount, setAddAmount] = useState('');

  const [formData, setFormData] = useState({
    title: '', category: 'Ahorro' as GoalCategory, current: 0, target: 0, deadline: '', color: '#3DCC8E', icon: '🎯',
  });

  const filteredGoals = (filter === 'Todas'
    ? goals
    : goals.filter((g) => g.category === filter || (filter === 'Completadas' && g.status === 'completed')
  )).filter((g) => !query || g.title.toLowerCase().includes(query.toLowerCase()));

  const resetForm = () => {
    setFormData({ title: '', category: 'Ahorro', current: 0, target: 0, deadline: '', color: '#3DCC8E', icon: '🎯' });
    setEditingGoal(null);
  };

  const handleCreateOrUpdateGoal = async () => {
    if (!formData.title || !formData.target) return;

    if (editingGoal) {
      const newStatus: GoalStatus = formData.current >= formData.target ? 'completed' : editingGoal.status === 'pending' && formData.current > 0 ? 'progress' : editingGoal.status;
      const updated: Partial<Goal> = { ...editingGoal, ...formData, status: newStatus, updatedAt: Date.now() };
      await updateGoalFn(editingGoal.id, updated);
    } else {
      await addGoal({
        userId: userId || 'local',
        title: formData.title,
        category: formData.category,
        current: formData.current,
        target: formData.target,
        deadline: formData.deadline,
        status: formData.current >= formData.target ? 'completed' : 'pending',
        color: formData.color,
        icon: formData.icon,
      });
    }

    setShowNewGoalModal(false);
    resetForm();
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm('¿Estás seguro de eliminar esta meta?')) {
      await deleteGoalFn(goalId);
    }
  };

  const handleAddFunds = async () => {
    if (!showAddFundsModal || !addAmount) return;
    const amount = Number(addAmount);
    if (amount <= 0) return;
    const newCurrent = Math.min(showAddFundsModal.current + amount, showAddFundsModal.target);
    const newStatus: GoalStatus = newCurrent >= showAddFundsModal.target ? 'completed' : showAddFundsModal.status === 'pending' ? 'progress' : showAddFundsModal.status;
    await updateGoalFn(showAddFundsModal.id, { current: newCurrent, status: newStatus, updatedAt: Date.now() });
    setShowAddFundsModal(null);
    setAddAmount('');
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({ title: goal.title, category: goal.category, current: goal.current, target: goal.target, deadline: goal.deadline, color: goal.color, icon: goal.icon });
    setShowNewGoalModal(true);
  };

  return (
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

      <div className="filters-bar animate-fadeInUp" style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
        {['Todas', 'Ahorro', 'Inversión', 'Educación', 'Completadas'].map((item) => (
          <button key={item} className={`filter-chip ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>

      <div className="metas-grid animate-fadeInUp">
        {filteredGoals.length > 0 ? filteredGoals.map((goal, i) => {
          const pct = Math.min(100, (goal.current / goal.target) * 100);
          return (
            <div key={goal.id} className="goal-wide-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="goal-header">
                <div className="goal-icon-wrapper" style={{ background: `${goal.color}20`, color: goal.color }}>
                  <span style={{ fontSize: '1.25rem' }}>{goal.icon}</span>
                </div>
                <div className="goal-main-info">
                  <h3 className="goal-title">{goal.title}</h3>
                  <span className="goal-category">{goal.category}</span>
                </div>
                <div className="goal-status-group">
                  <div className="goal-values">
                    <span className="current">${goal.current.toLocaleString()}</span>
                    <span className="separator">/</span>
                    <span className="target">${goal.target.toLocaleString()}</span>
                  </div>
                  <span className="goal-deadline">{goal.deadline}</span>
                </div>
              </div>
              <div className="goal-progress-section">
                <div className="progress-info">
                  <span className="pct-label">{pct.toFixed(1)}% completado</span>
                  <span className="remaining-label">${(goal.target - goal.current).toLocaleString()} restante</span>
                </div>
                <div className="goal-progress-track">
                  <div className="goal-progress-fill" style={{ width: `${pct}%`, background: goal.status === 'completed' ? 'var(--color-prosper-green)' : goal.color }} />
                </div>
              </div>
              <div className="goal-footer">
                <div className="goal-stats">
                  <div className="stat"><IconTrendUp width={14} /><span>{goal.monthlyGrowth ? `+${goal.monthlyGrowth}% este mes` : 'Sin datos'}</span></div>
                  <div className="stat"><IconZap width={14} /><span>{goal.streakDays ? `Racha de ${goal.streakDays} días` : 'Sin racha'}</span></div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="goal-action-btn" onClick={() => setShowAddFundsModal(goal)} title="Agregar fondos"><IconWallet width={14} /></button>
                  <button className="goal-action-btn" onClick={() => openEditModal(goal)} title="Editar"><IconEdit width={14} /></button>
                  <button className="goal-action-btn goal-action-btn-danger" onClick={() => handleDeleteGoal(goal.id)} title="Eliminar"><IconTrash width={14} /></button>
                  <button className="goal-detail-btn" onClick={() => setShowDetailModal(goal)}>Detalles <IconChevronRight width={14} /></button>
                </div>
              </div>
            </div>
          );
        }) : (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '3rem', marginBottom: 12 }}>🎯</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>{goals.length === 0 ? 'No tienes metas aún. ¡Crea tu primera meta!' : 'No hay metas con este filtro.'}</p>
          </div>
        )}
      </div>

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
              <select className="form-input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as GoalCategory })}>
                <option value="Ahorro">Ahorro</option>
                <option value="Inversión">Inversión</option>
                <option value="Educación">Educación</option>
                <option value="Otro">Otro</option>
              </select>
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
                <div className="stat"><IconTrendUp width={14} /><span>{showDetailModal.monthlyGrowth ? `+${showDetailModal.monthlyGrowth}% este mes` : 'Sin datos'}</span></div>
                <div className="stat"><IconZap width={14} /><span>{showDetailModal.streakDays ? `Racha de ${showDetailModal.streakDays} días` : 'Sin racha'}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetailModal(null)}>Cerrar</button>
              <button className="btn btn-primary" onClick={() => { setShowDetailModal(null); openEditModal(showDetailModal); }}>Editar Meta</button>
            </div>
          </div>
        </div>
      )}

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
        .btn-danger { background: var(--color-error); color: white !important; }
        .btn-danger:hover { background: #dc2626; }
        .filter-chip { padding: 8px 16px; border-radius: var(--radius-full); background: var(--bg-card); border: 1px solid var(--border-default); color: var(--text-secondary); font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); }
        .filter-chip:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
        .filter-chip.active { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); box-shadow: 0 4px 12px rgba(61, 204, 142, 0.2); }
        .metas-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .goal-wide-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px; transition: all var(--transition-base); }
        .goal-wide-card:hover { transform: translateX(4px); border-color: var(--color-prosper-green); box-shadow: var(--shadow-md); }
        .goal-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .goal-icon-wrapper { width: 48px; height: 48px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .goal-main-info { flex: 1; }
        .goal-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; }
        .goal-category { font-size: 0.75rem; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; }
        .goal-status-group { text-align: right; }
        .goal-values { display: flex; align-items: baseline; gap: 4px; margin-bottom: 2px; }
        .current { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); }
        .separator { color: var(--text-tertiary); font-size: 0.875rem; }
        .target { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
        .goal-deadline { font-size: 0.75rem; color: var(--text-tertiary); font-weight: 500; }
        .goal-progress-section { margin-bottom: 20px; }
        .progress-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.8125rem; font-weight: 600; }
        .pct-label { color: var(--color-prosper-green); }
        .remaining-label { color: var(--text-secondary); }
        .goal-progress-track { height: 8px; background: var(--bg-input); border-radius: var(--radius-full); overflow: hidden; }
        .goal-progress-fill { height: 100%; border-radius: var(--radius-full); transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }
        .goal-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 16px; border-top: 1px solid var(--border-default); }
        .goal-stats { display: flex; gap: 16px; }
        .stat { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-secondary); font-weight: 500; }
        .stat span { color: var(--text-primary); font-weight: 600; }
        .goal-detail-btn { display: flex; align-items: center; gap: 4px; font-size: 0.8125rem; font-weight: 700; color: var(--color-prosper-navy); cursor: pointer; transition: color var(--transition-fast); background: none; border: none; padding: 0; }
        [data-theme="dark"] .goal-detail-btn { color: var(--color-prosper-green); }
        .goal-detail-btn:hover { opacity: 0.8; }
        .goal-action-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: var(--radius-md); background: var(--bg-input); border: 1px solid var(--border-default); color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
        .goal-action-btn:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
        .goal-action-btn-danger:hover { border-color: var(--color-red-500); color: var(--color-red-500); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
        .modal-content { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); width: 90%; max-width: 480px; max-height: 85vh; overflow-y: auto; padding: 24px; animation: fadeInUp 0.3s ease; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .modal-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
        .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { color: var(--text-primary); }
        .modal-body { display: flex; flex-direction: column; gap: 14px; }
        .modal-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
        .form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin-bottom: -6px; }
        .form-input { width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.875rem; outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
        .form-input:focus { border-color: var(--color-prosper-green); }
        .form-input::placeholder { color: var(--text-tertiary); }
        select.form-input { cursor: pointer; }

        @media (max-width: 768px) {
          .goal-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .goal-status-group { text-align: left; }
          .goal-footer { flex-direction: column; align-items: stretch; }
          .goal-stats { justify-content: space-between; }
          .goal-footer > div:last-child { display: flex; gap: 8px; justify-content: center; }
          .filters-bar { flex-wrap: wrap; }
          .modal-content { width: 95%; padding: 16px; }
        }
        @media (max-width: 480px) {
          .goal-wide-card { padding: 16px; }
          .goal-icon-wrapper { width: 40px; height: 40px; }
          .goal-title { font-size: 1rem; }
          .current { font-size: 1.125rem; }
          .goal-action-btn { width: 28px; height: 28px; }
          .goal-action-btn svg { width: 12px; height: 12px; }
          .filter-chip { padding: 6px 12px; font-size: 0.75rem; }
        }
      `}</style>
    </DashboardLayout>
  );
}
