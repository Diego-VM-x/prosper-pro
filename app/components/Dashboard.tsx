'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from './DashboardLayout';
import { useSearch } from '@/lib/contexts/SearchContext';
import { useGoals } from '@/lib/contexts/GoalsContext';
import {
  IconPlus,
  IconArrowUpRight,
  IconTrendUp,
  IconZap,
  IconX,
} from './icons';
import type { Goal, WeeklyData, XPState, CommunityMember, Achievement, GoalCategory } from '@/types';

const CATEGORY_COLORS: Record<string, string> = { Ahorro: '#3DCC8E', Inversión: '#3B82F6', Educación: '#F59E0B', Otro: '#8B5CF6' };

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

export function Dashboard() {
  const router = useRouter();
  const { query } = useSearch();
  const { goals, reminders, goalsToday, remindersToday, userId, addGoal } = useGoals();

  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [xp, setXP] = useState<XPState | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [monthlySavings, setMonthlySavings] = useState(0);

  const [showNewGoalModal, setShowNewGoalModal] = useState(false);

  const [newGoal, setNewGoal] = useState({
    title: '',
    category: 'Ahorro' as GoalCategory,
    current: 0,
    target: 0,
    deadline: '',
    color: '#3DCC8E',
    icon: '🎯',
  });

  useEffect(() => {
    const uid = userId as string;
    if (!uid) return;
    let cancelled = false;

    async function loadData() {
      try {
        const [
          { getTransactionsByOwnerId },
          { getXPByOwnerId, getAchievementsByOwnerId },
          { getCommunityUsers },
        ] = await Promise.all([
          import('@/lib/firestore/transactions'),
          import('@/lib/firestore/gamification'),
          import('@/lib/firestore/community'),
        ]);

        if (cancelled) return;

        const [transactionsData, xpData, achievementsData, membersData] = await Promise.all([
          getTransactionsByOwnerId(uid),
          getXPByOwnerId(uid),
          getAchievementsByOwnerId(uid),
          getCommunityUsers(),
        ]);

        if (cancelled) return;

        if (xpData) setXP(xpData);
        if (achievementsData.length) setAchievements(achievementsData);
        if (membersData.length) setMembers(membersData);

        if (transactionsData.length) {
          const savings = transactionsData.filter((t) => t.type === 'saving');
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          const monthSavings = savings.filter((t) => t.date >= startOfMonth).reduce((sum, t) => sum + t.amount, 0);
          if (monthSavings > 0) setMonthlySavings(monthSavings);

          const days = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
          const weekly: WeeklyData[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            weekly.push({ day: days[d.getDay() === 0 ? 6 : d.getDay() - 1], income: 0, saving: 0 });
          }
          transactionsData.forEach((t) => {
            const tDate = new Date(t.date);
            const diff = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diff >= 0 && diff < 7) {
              const idx = 6 - diff;
              if (t.type === 'income') weekly[idx].income += t.amount;
              if (t.type === 'saving') weekly[idx].saving += t.amount;
            }
          });
          setWeeklyData(weekly);
        }
      } catch (e) {
        console.error('Firestore load error:', e);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [userId]);

  const activeGoals = goals.filter((g) => g.status !== 'completed' && (!query || g.title.toLowerCase().includes(query.toLowerCase())));
  const completedGoals = goals.filter((g) => g.status === 'completed' && (!query || g.title.toLowerCase().includes(query.toLowerCase())));
  const totalGoals = goals.length;
  const progressPct = totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius; // 339.292
  const strokeDashoffset = circumference * (1 - progressPct / 100);

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
    setNewGoal({ title: '', category: 'Ahorro', current: 0, target: 0, deadline: '', color: '#3DCC8E', icon: '🎯' });
  };

  // Calcular puntos para el gráfico de línea
  const linePoints = weeklyData.length > 0 ? weeklyData.map((d, i) => {
    const maxVal = Math.max(...weeklyData.flatMap((w) => [w.income, w.saving]), 1);
    const x = (i / (weeklyData.length - 1)) * 100;
    const y = 100 - ((d.saving / maxVal) * 80 + 10);
    return `${x},${y}`;
  }).join(' ') : '';

  const areaPoints = linePoints ? `0,100 ${linePoints} 100,100` : '';

  return (
    <DashboardLayout>
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">Planifica, ahorra y prospera con tus metas financieras.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewGoalModal(true)}>
            <IconPlus width={14} /> Nueva Meta
          </button>
        </div>

        {/* 4 Stat Cards Superiores */}
        <div className="stats-row">
          <div className="stat-card stat-card-clickable" onClick={() => router.push('/metas')}>
            <div className="stat-card-icon">
              <span className="stat-icon-bg">🎯</span>
              <span className="stat-badge">+12%</span>
            </div>
            <p className="stat-card-label">METAS ACTIVAS</p>
            <p className="stat-card-value">{activeGoals.length}</p>
          </div>
          <div className="stat-card stat-card-clickable" onClick={() => router.push('/metas')}>
            <div className="stat-card-icon">
              <span className="stat-icon-bg">✓</span>
            </div>
            <p className="stat-card-label">COMPLETADAS</p>
            <p className="stat-card-value">{completedGoals.length}</p>
          </div>
          <div className="stat-card featured stat-card-clickable" onClick={() => router.push('/finanzas')}>
            <div className="stat-card-icon">
              <span className="stat-icon-bg">💰</span>
            </div>
            <p className="stat-card-label">AHORRO MENSUAL</p>
            <p className="stat-card-value stat-value-green">${monthlySavings.toLocaleString()}</p>
          </div>
          <div className="stat-card stat-card-clickable" onClick={() => router.push('/cursos')}>
            <div className="stat-card-icon">
              <span className="stat-icon-bg">📖</span>
            </div>
            <p className="stat-card-label">LECCIONES</p>
            <p className="stat-card-value">{goals.filter((g) => g.category === 'Educación' && g.status !== 'completed').length}</p>
          </div>
        </div>

        {/* Sección Principal: Gráfico + Metas Activas */}
        <div className="main-grid">
          {/* Gráfico de Línea */}
          <div className="dash-card chart-card">
            <div className="dash-card-header">
              <div>
                <h3 className="dash-card-title">Progreso Financiero Semanal</h3>
                <p className="dash-card-subtitle">Comparación entre el objetivo y el crecimiento real</p>
              </div>
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot legend-real"></span> REAL</span>
                <span className="legend-item"><span className="legend-dot legend-objetivo"></span> OBJETIVO</span>
              </div>
            </div>
            <div className="line-chart-container">
              <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-prosper-green)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--color-prosper-green)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[20, 40, 60, 80].map((y) => (
                  <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--border-default)" strokeWidth="0.3" strokeDasharray="2,2" />
                ))}
                {/* Area fill */}
                {areaPoints && <polygon points={areaPoints} fill="url(#lineGradient)" />}
                {/* Line */}
                {linePoints && <polyline points={linePoints} fill="none" stroke="var(--color-prosper-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
                {/* Annotation */}
                {weeklyData.length > 3 && (
                  <g>
                    <rect x="35" y="35" width="30" height="10" rx="2" fill="var(--color-prosper-green)" />
                    <text x="50" y="42" textAnchor="middle" fill="white" fontSize="5" fontWeight="600">MAYOR RENDIMIENTO</text>
                  </g>
                )}
              </svg>
              <div className="chart-x-axis">
                {weeklyData.map((d, i) => (
                  <span key={i} className={`chart-day-label ${i === 3 ? 'active' : ''}`}>{d.day}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Panel Lateral: Metas Activas */}
          <div className="dash-card goals-panel">
            <div className="dash-card-header">
              <h3 className="dash-card-title">Metas Activas</h3>
              <button className="dash-card-action" onClick={() => router.push('/metas')}>VER TODO</button>
            </div>
            <div className="goals-list">
              {activeGoals.slice(0, 4).map((goal: Goal) => {
                const pct = Math.min((goal.current / goal.target) * 100, 100);
                const goalColor = pct >= 75 ? 'var(--color-prosper-green)' : pct >= 50 ? 'var(--color-prosper-green)' : 'var(--color-red-500)';
                return (
                  <div className="goal-card" key={goal.id}>
                    <div className="goal-card-header">
                      <span className="goal-card-title">{goal.title}</span>
                    </div>
                    <div className="goal-progress-bar">
                      <div className="goal-progress-fill" style={{ width: `${pct}%`, background: goalColor }} />
                    </div>
                  </div>
                );
              })}
              {activeGoals.length === 0 && <p className="empty-msg">No hay metas activas</p>}
            </div>
            <button className="btn-add-goal" onClick={() => router.push('/metas')}>
              + Añadir Nuevo Objetivo
            </button>
          </div>
        </div>

        {/* Fila Inferior: 3 Cards */}
        <div className="bottom-grid">
          {/* Flujo de Actividad */}
          <div className="dash-card activity-card">
            <div className="dash-card-header">
              <h3 className="dash-card-title">FLUJO DE ACTIVIDAD</h3>
            </div>
            <div className="activity-item">
              <div className="activity-icon">🚀</div>
              <div className="activity-info">
                <p className="activity-text">Has alcanzado el estatus de <strong>Arquitecto Nivel 2</strong>.</p>
                <span className="activity-time">Hace 2 horas</span>
              </div>
            </div>
            {achievements.slice(0, 2).map((ach) => (
              <div className="activity-item" key={ach.id}>
                <div className="activity-icon">{ach.icon}</div>
                <div className="activity-info">
                  <p className="activity-text">{ach.title}</p>
                  <span className="activity-time">Reciente</span>
                </div>
              </div>
            ))}
          </div>

          {/* Progreso Circular */}
          <div className="dash-card progress-card">
            <div className="progress-ring-container">
              <svg className="progress-ring" viewBox="0 0 120 120">
                <circle className="progress-ring-track" cx="60" cy="60" r="54" />
                <circle className="progress-ring-fill" cx="60" cy="60" r="54" style={{ strokeDashoffset }} />
              </svg>
              <div className="progress-ring-center">
                <span className="progress-pct">{progressPct}%</span>
                <span className="progress-label">Completado</span>
              </div>
            </div>
          </div>

          {/* Próximos Hitos */}
          <div className="dash-card milestones-card">
            <div className="dash-card-header">
              <h3 className="dash-card-title">PRÓXIMOS HITOS</h3>
            </div>
            {(() => {
              const upcoming = goals
                .filter((g: Goal) => g.status !== 'completed' && g.deadline)
                .map((g: Goal) => ({ ...g, iso: parseDeadlineToISO(g.deadline) }))
                .filter((g) => g.iso !== null)
                .sort((a, b) => (a.iso as string).localeCompare(b.iso as string))
                .slice(0, 2);
              return upcoming.length > 0 ? (
                <div className="milestones-list">
                  {upcoming.map((g) => {
                    const daysLeft = getDaysUntil(g.iso as string);
                    const urgency = daysLeft <= 0 ? 'var(--color-red-500)' : daysLeft <= 7 ? 'var(--color-gold-500)' : 'var(--text-secondary)';
                    return (
                      <div className="milestone-item milestone-item-clickable" key={g.id} onClick={() => router.push('/metas')}>
                        <div className="milestone-date">
                          <span className="milestone-month">OCT</span>
                          <span className="milestone-day">{daysLeft <= 0 ? '!' : daysLeft}</span>
                        </div>
                        <div className="milestone-info">
                          <p className="milestone-title">{g.title}</p>
                          <p className="milestone-desc">${g.current.toLocaleString()} / ${g.target.toLocaleString()}</p>
                        </div>
                        <span className="milestone-arrow" style={{ color: urgency }}>›</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-msg">No hay hitos próximos</p>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showNewGoalModal && (
        <div className="modal-overlay" onClick={() => setShowNewGoalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva Meta</h2>
              <button className="modal-close" onClick={() => setShowNewGoalModal(false)}><IconX width={20} /></button>
            </div>
            <div className="modal-body">
              <label className="form-label">Título</label>
              <input className="form-input" type="text" placeholder="Ej: Fondo de Emergencia" value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} />
              <label className="form-label">Categoría</label>
              <select className="form-input" value={newGoal.category} onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as GoalCategory })}>
                <option value="Ahorro">Ahorro</option>
                <option value="Inversión">Inversión</option>
                <option value="Educación">Educación</option>
                <option value="Otro">Otro</option>
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">Monto Actual ($)</label><input className="form-input" type="number" placeholder="0" value={newGoal.current || ''} onChange={(e) => setNewGoal({ ...newGoal, current: Number(e.target.value) })} /></div>
                <div><label className="form-label">Meta ($)</label><input className="form-input" type="number" placeholder="10000" value={newGoal.target || ''} onChange={(e) => setNewGoal({ ...newGoal, target: Number(e.target.value) })} /></div>
              </div>
              <label className="form-label">Fecha Límite</label>
              <input className="form-input" type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} />
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['#3DCC8E', '#1E3A6E', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'].map((c) => (
                  <button key={c} onClick={() => setNewGoal({ ...newGoal, color: c })} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: newGoal.color === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
              <label className="form-label">Icono</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['🎯', '🛡️', '📈', '✈️', '🎓', '', '🏠', '🚗'].map((icon) => (
                  <button key={icon} onClick={() => setNewGoal({ ...newGoal, icon })} style={{ fontSize: '1.25rem', padding: 6, borderRadius: 'var(--radius-md)', background: newGoal.icon === icon ? 'var(--bg-input)' : 'transparent', border: newGoal.icon === icon ? '2px solid var(--color-prosper-green)' : '2px solid transparent', cursor: 'pointer' }}>{icon}</button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setShowNewGoalModal(false)}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreateGoal}>Crear Meta</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dashboard-container { padding: 0; }
        .dashboard-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .dashboard-title { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0; }
        .dashboard-subtitle { font-size: 0.875rem; color: var(--text-secondary); margin: 4px 0 0 0; }
        .btn-sm { padding: 8px 16px; font-size: 0.875rem; }

        /* Stat Cards */
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 20px; position: relative; transition: all var(--transition-fast); }
        .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .stat-card-clickable { cursor: pointer; transition: all var(--transition-fast); }
        .stat-card.featured { border-color: var(--color-prosper-green); background: linear-gradient(135deg, rgba(61,204,142,0.1), transparent); }
        .stat-card-icon { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .stat-icon-bg { width: 40px; height: 40px; border-radius: var(--radius-sm); background: rgba(61,204,142,0.15); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
        .stat-badge { font-size: 0.75rem; font-weight: 600; color: var(--color-prosper-green); background: rgba(61,204,142,0.15); padding: 2px 8px; border-radius: var(--radius-full); }
        .stat-card-label { font-size: 0.6875rem; font-weight: 600; color: var(--text-secondary); margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-card-value { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin: 0; line-height: 1.1; word-break: break-word; overflow-wrap: break-word; }
        .stat-value-green { color: var(--color-prosper-green) !important; }

        /* Main Grid */
        .main-grid { display: grid; grid-template-columns: 1fr 300px; gap: 20px; margin-bottom: 24px; }
        .dash-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 24px; }
        .dash-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
        .dash-card-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }
        .dash-card-subtitle { font-size: 0.875rem; color: var(--text-secondary); margin: 4px 0 0 0; }
        .dash-card-action { background: none; border: none; font-size: 0.75rem; font-weight: 600; color: var(--color-prosper-green); cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; }
        .dash-card-action:hover { opacity: 0.8; }

        /* Line Chart */
        .chart-card { min-height: 320px; }
        .chart-legend { display: flex; gap: 16px; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
        .legend-real { background: var(--color-prosper-green); }
        .legend-objetivo { background: var(--color-stone-600); }
        .line-chart-container { position: relative; height: 240px; }
        .line-chart { width: 100%; height: 200px; }
        .chart-x-axis { display: flex; justify-content: space-between; margin-top: 12px; padding: 0 0; }
        .chart-day-label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
        .chart-day-label.active { color: var(--color-prosper-green); }

        /* Goals Panel */
        .goals-panel { display: flex; flex-direction: column; }
        .goals-list { flex: 1; display: flex; flex-direction: column; gap: 12px; }
        .goal-card { background: var(--bg-input); border-radius: var(--radius-sm); padding: 12px 16px; }
        .goal-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .goal-card-title { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); margin: 0; }
        .goal-card-pct { font-size: 0.875rem; font-weight: 700; }
        .goal-progress-bar { width: 100%; height: 6px; background: var(--border-default); border-radius: var(--radius-full); overflow: hidden; }
        .goal-progress-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.5s ease; }
        .btn-add-goal { width: 100%; padding: 12px; margin-top: 16px; background: transparent; border: 1px dashed var(--border-default); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 0.875rem; cursor: pointer; transition: all var(--transition-fast); }
        .btn-add-goal:hover { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }

        /* Bottom Grid */
        .bottom-grid { display: grid; grid-template-columns: 1fr 200px 1fr; gap: 20px; }

        /* Activity Card */
        .activity-card { }
        .activity-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-default); }
        .activity-item:last-child { border-bottom: none; }
        .activity-icon { width: 32px; height: 32px; border-radius: 50%; background: rgba(61,204,142,0.15); display: flex; align-items: center; justify-content: center; font-size: 0.875rem; flex-shrink: 0; }
        .activity-info { flex: 1; }
        .activity-text { font-size: 0.875rem; color: var(--text-primary); margin: 0; line-height: 1.4; }
        .activity-time { font-size: 0.75rem; color: var(--text-tertiary); }

        /* Progress Card */
        .progress-card { display: flex; align-items: center; justify-content: center; min-height: 200px; }
        .progress-ring-container { position: relative; width: 140px; height: 140px; }
        .progress-ring { transform: rotate(-90deg); width: 100%; height: 100%; }
        .progress-ring .progress-ring-track { fill: none; stroke: var(--border-default); stroke-width: 8; }
        .progress-ring .progress-ring-fill { fill: none; stroke: var(--color-prosper-green); stroke-width: 8; stroke-linecap: round; stroke-dasharray: 339.292; transition: stroke-dashoffset 1s ease; }
        .progress-ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .progress-pct { font-size: 1.75rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
        .progress-label { font-size: 0.6875rem; color: var(--text-secondary); margin-top: 2px; }

        /* Milestones Card */
        .milestones-list { display: flex; flex-direction: column; gap: 12px; }
        .milestone-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-input); border-radius: var(--radius-sm); }
        .milestone-item-clickable { cursor: pointer; transition: all var(--transition-fast); }
        .milestone-item-clickable:hover { background: var(--bg-card); box-shadow: var(--shadow-sm); }
        .milestone-date { width: 40px; height: 48px; background: var(--bg-card); border-radius: var(--radius-sm); display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
        .milestone-month { font-size: 0.625rem; font-weight: 700; color: var(--color-prosper-green); text-transform: uppercase; }
        .milestone-day { font-size: 1.125rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
        .milestone-info { flex: 1; min-width: 0; }
        .milestone-title { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .milestone-desc { font-size: 0.75rem; color: var(--text-secondary); margin: 2px 0 0 0; }
        .milestone-arrow { font-size: 1.25rem; font-weight: 700; flex-shrink: 0; }

        .empty-msg { padding: 16px 0; color: var(--text-secondary); font-size: 0.875rem; text-align: center; margin: 0; }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
        .modal-content { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); width: 90%; max-width: 440px; max-height: 85vh; overflow-y: auto; padding: 24px; animation: fadeInUp 0.3s ease; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .modal-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; }
        .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; display: flex; }
        .modal-body { display: flex; flex-direction: column; gap: 12px; }
        .modal-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
        .form-label { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .form-input { width: 100%; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.875rem; outline: none; box-sizing: border-box; }
        .form-input:focus { border-color: var(--color-prosper-green); }
        select.form-input { cursor: pointer; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1024px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .main-grid { grid-template-columns: 1fr; gap: 16px; }
          .bottom-grid { grid-template-columns: 1fr; gap: 16px; }
          .progress-ring-container { width: 120px; height: 120px; }
          .progress-pct { font-size: 1.5rem; }
        }
        @media (max-width: 640px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .stat-card { padding: 14px; }
          .stat-card-value { font-size: 1.25rem; }
          .stat-card-label { font-size: 0.625rem; }
          .stat-icon-bg { width: 32px; height: 32px; font-size: 1rem; }
          .dashboard-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .main-grid { gap: 12px; }
          .bottom-grid { gap: 12px; }
          .dash-card { padding: 16px; }
          .progress-ring-container { width: 100px; height: 100px; }
          .progress-pct { font-size: 1.25rem; }
          .progress-label { font-size: 0.625rem; }
          .progress-card { min-height: 140px; }
        }
        @media (max-width: 480px) {
          .stats-row { grid-template-columns: 1fr 1fr; gap: 6px; }
          .stat-card { padding: 10px; }
          .stat-card-value { font-size: 1.125rem; }
          .stat-card-label { font-size: 0.5625rem; margin-bottom: 4px; }
          .stat-icon-bg { width: 28px; height: 28px; font-size: 0.875rem; }
          .stat-badge { font-size: 0.625rem; padding: 1px 6px; }
          .dashboard-title { font-size: 1.25rem; }
          .dashboard-subtitle { font-size: 0.75rem; }
          .btn-sm { padding: 6px 12px; font-size: 0.8125rem; }
          .progress-ring-container { width: 90px; height: 90px; }
          .progress-pct { font-size: 1.125rem; }
          .progress-label { font-size: 0.5625rem; }
          .progress-card { min-height: 120px; }
          .dash-card-title { font-size: 1rem; }
          .dash-card-subtitle { font-size: 0.75rem; }
          .goal-card { padding: 10px 12px; }
          .goal-card-title { font-size: 0.8125rem; }
          .milestone-item { padding: 10px; }
          .milestone-date { width: 36px; height: 42px; }
          .milestone-day { font-size: 1rem; }
          .activity-icon { width: 28px; height: 28px; font-size: 0.75rem; }
          .activity-text { font-size: 0.8125rem; }
        }
      `}</style>
    </DashboardLayout>
  );
}
