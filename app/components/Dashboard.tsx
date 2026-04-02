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

          const days = ['D', 'L', 'M', 'Mi', 'J', 'V', 'S'];
          const weekly: WeeklyData[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            weekly.push({ day: days[d.getDay()], income: 0, saving: 0 });
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
          const maxVal = Math.max(...weekly.flatMap((d) => [d.income, d.saving]), 1);
          setWeeklyData(weekly.map((d) => ({
            day: d.day,
            income: Math.round((d.income / maxVal) * 100),
            saving: Math.round((d.saving / maxVal) * 100),
          })));
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
  const circumference = 2 * Math.PI * 54;
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

  return (
    <DashboardLayout>
      <div className="dashboard-container">
        {/* Header compacto */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">Planifica, ahorra y prospera con tus metas financieras.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewGoalModal(true)}>
            <IconPlus width={14} /> Nueva Meta
          </button>
        </div>

        {/* Fila Maestra: 4 indicadores */}
        <div className="stats-row">
          <div className="stat-box featured">
            <div className="stat-box-top">
              <span className="stat-box-label">Metas Activas</span>
              <button className="stat-box-link" onClick={() => router.push('/metas')}><IconArrowUpRight width={14} /></button>
            </div>
            <p className="stat-box-value">{activeGoals.length}</p>
            <span className="stat-box-change positive"><IconTrendUp width={12} />{activeGoals.filter((g) => g.status === 'progress').length} en progreso</span>
          </div>
          <div className="stat-box">
            <div className="stat-box-top">
              <span className="stat-box-label">Completadas</span>
              <button className="stat-box-link" onClick={() => router.push('/metas')}><IconArrowUpRight width={14} /></button>
            </div>
            <p className="stat-box-value">{completedGoals.length}</p>
            <span className="stat-box-change positive"><IconTrendUp width={12} />{totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0}%</span>
          </div>
          <div className="stat-box">
            <div className="stat-box-top">
              <span className="stat-box-label">Ahorro Mensual</span>
              <button className="stat-box-link" onClick={() => router.push('/finanzas')}><IconArrowUpRight width={14} /></button>
            </div>
            <p className="stat-box-value">${(monthlySavings / 1000).toFixed(1)}k</p>
            <span className="stat-box-change positive"><IconTrendUp width={12} />Incrementado</span>
          </div>
          <div className="stat-box">
            <div className="stat-box-top">
              <span className="stat-box-label">Lecciones</span>
              <button className="stat-box-link" onClick={() => router.push('/cursos')}><IconArrowUpRight width={14} /></button>
            </div>
            <p className="stat-box-value">{goals.filter((g) => g.category === 'Educación' && g.status !== 'completed').length}</p>
            <span className="stat-box-change">Pendientes</span>
          </div>
        </div>

        {/* Sección Dual: Gráfico + Fechas */}
        <div className="dual-grid">
          <div className="dual-main">
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-title">Progreso Financiero Semanal</span>
              </div>
              <div className="chart-bars">
                {weeklyData.map((bar, i) => (
                  <div className="chart-bar-wrapper" key={i}>
                    <div className="chart-bar style-stripe" style={{ height: `${Math.max(bar.income, 10)}%` }}><span className="chart-tooltip">{bar.income}%</span></div>
                    <div className="chart-bar style-solid" style={{ height: `${Math.max(bar.saving, 10)}%` }}><span className="chart-tooltip">{bar.saving}%</span></div>
                    <span className="chart-day">{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-title">📅 Próximas Fechas</span>
                <button className="dash-card-action" onClick={() => router.push('/calendario')}>Ver calendario</button>
              </div>
              {(() => {
                const upcoming = goals
                  .filter((g: Goal) => g.status !== 'completed' && g.deadline)
                  .map((g: Goal) => ({ ...g, iso: parseDeadlineToISO(g.deadline) }))
                  .filter((g) => g.iso !== null)
                  .sort((a, b) => (a.iso as string).localeCompare(b.iso as string))
                  .slice(0, 4);
                return upcoming.length > 0 ? (
                  <div className="date-list">
                    {upcoming.map((g) => {
                      const daysLeft = getDaysUntil(g.iso as string);
                      const pct = Math.min((g.current / g.target) * 100, 100);
                      const urgency = daysLeft <= 0 ? 'var(--color-red-500)' : daysLeft <= 7 ? 'var(--color-gold-500)' : 'var(--text-secondary)';
                      return (
                        <div key={g.id} className="date-item" style={{ borderLeft: `3px solid ${g.color}` }}>
                          <span className="date-icon">{g.icon}</span>
                          <div className="date-info">
                            <p className="date-title">{g.title}</p>
                            <div className="date-progress">
                              <div className="date-progress-bar"><div style={{ width: `${pct}%`, height: '100%', background: g.color }} /></div>
                              <span className="date-pct">{Math.round(pct)}%</span>
                            </div>
                          </div>
                          <span className="date-days" style={{ color: urgency }}>{daysLeft <= 0 ? 'Vencida' : daysLeft === 1 ? '1d' : `${daysLeft}d`}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty-msg">No hay metas con fecha límite</p>
                );
              })()}
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Metas Activas</span>
              <button className="dash-card-action" onClick={() => setShowNewGoalModal(true)}><IconPlus width={12} /> Nueva</button>
            </div>
            <div className="goal-list">
              {activeGoals.length > 0 ? activeGoals.slice(0, 5).map((goal: Goal) => {
                const pct = Math.min((goal.current / goal.target) * 100, 100);
                return (
                  <div className="goal-item" key={goal.id}>
                    <div className="goal-dot" style={{ background: goal.color }}>{goal.icon}</div>
                    <div className="goal-info">
                      <p className="goal-name">{goal.title}</p>
                      <div className="goal-bar">
                        <div className="goal-bar-track"><div style={{ width: `${pct}%`, height: '100%', background: goal.color }} /></div>
                        <span className="goal-pct">{Math.round(pct)}%</span>
                      </div>
                      <p className="goal-due">${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}</p>
                    </div>
                  </div>
                );
              }) : (
                <p className="empty-msg">No hay metas activas</p>
              )}
            </div>
            {xp && (
              <div className="xp-mini">
                <div className="xp-mini-header">
                  <span className="xp-mini-label"><IconZap width={10} /> Nivel {xp.level}</span>
                  <span className="xp-mini-value">{xp.currentXP}/{xp.maxXP} XP</span>
                </div>
                <div className="xp-mini-track"><div className="xp-mini-fill" style={{ width: `${(xp.currentXP / xp.maxXP) * 100}%` }} /></div>
              </div>
            )}
          </div>
        </div>

        {/* Fila inferior: Comunidad + Progreso + Logros */}
        <div className="bottom-grid">
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Comunidad</span>
              <span className="dash-card-count">{members.length} miembros</span>
            </div>
            <div className="member-list">
              {members.length > 0 ? members.slice(0, 4).map((member) => (
                <div className="member-item" key={member.uid}>
                  <div className="member-avatar">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (member.displayName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="member-info">
                    <p className="member-name">{member.displayName || 'Usuario'}</p>
                    <p className="member-level">Nivel {member.level}</p>
                  </div>
                </div>
              )) : (
                <p className="empty-msg">Aún no hay miembros</p>
              )}
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header"><span className="dash-card-title">Progreso de Metas</span></div>
            <div className="progress-mini">
              <div className="progress-ring-small">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle className="progress-ring-track" cx="40" cy="40" r="34" />
                  <circle className="progress-ring-fill" cx="40" cy="40" r="34" style={{ strokeDashoffset }} />
                </svg>
                <div className="progress-ring-inner">
                  <span className="progress-ring-pct">{progressPct}%</span>
                </div>
              </div>
              <div className="progress-legend-small">
                <span className="legend-dot" style={{ background: 'var(--color-pine-500)' }} /> Completadas
                <span className="legend-dot" style={{ background: 'var(--color-blue-500)' }} /> Progreso
                <span className="legend-dot" style={{ background: 'var(--color-gold-500)' }} /> Pendientes
              </div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header"><span className="dash-card-title">Logros</span></div>
            <div className="achievement-list">
              {achievements.slice(0, 3).map((ach) => (
                <div className="achievement-item" key={ach.id}>
                  <span className="achievement-icon">{ach.icon}</span>
                  <div>
                    <p className="achievement-title">{ach.title}</p>
                  </div>
                </div>
              ))}
              {achievements.length === 0 && <p className="empty-msg">Sin logros aún</p>}
            </div>
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
        .dashboard-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .dashboard-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; }
        .dashboard-subtitle { font-size: 0.75rem; color: var(--text-secondary); margin: 2px 0 0 0; }
        .btn-sm { padding: 6px 12px; font-size: 0.75rem; }

        /* Fila Maestra */
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
        .stat-box { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 10px; display: flex; flex-direction: column; align-items: center; text-align: center; aspect-ratio: 1/1; justify-content: center; transition: all var(--transition-fast); }
        .stat-box:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
        .stat-box.featured { background: linear-gradient(135deg, var(--color-prosper-navy), var(--color-prosper-green)); border-color: transparent; color: white; }
        .stat-box.featured .stat-box-label { color: rgba(255,255,255,0.8); }
        .stat-box.featured .stat-box-value { color: white; }
        .stat-box.featured .stat-box-change { color: rgba(255,255,255,0.85); }
        .stat-box-top { display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 4px; }
        .stat-box-label { font-size: 0.625rem; font-weight: 500; color: var(--text-secondary); }
        .stat-box-link { background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 0; display: flex; }
        .stat-box-link:hover { color: var(--text-primary); }
        .stat-box-value { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0; line-height: 1; }
        .stat-box-change { display: inline-flex; align-items: center; gap: 2px; font-size: 0.5625rem; color: var(--text-secondary); }
        .stat-box-change.positive { color: var(--color-pine-500); }

        /* Dual Grid */
        .dual-grid { display: grid; grid-template-columns: 1fr 260px; gap: 10px; margin-bottom: 10px; }
        .dual-main { display: flex; flex-direction: column; gap: 10px; }
        .dash-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 10px; }
        .dash-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .dash-card-title { font-size: 0.6875rem; font-weight: 700; color: var(--text-primary); }
        .dash-card-action { background: none; border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 3px 8px; font-size: 0.625rem; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; gap: 3px; }
        .dash-card-action:hover { background: var(--bg-accent-soft); color: var(--color-pine-600); }
        .dash-card-count { font-size: 0.625rem; color: var(--text-secondary); }

        /* Date List */
        .date-list { display: flex; flex-direction: column; gap: 6px; }
        .date-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--bg-input); border-radius: var(--radius-sm); border-left: 3px solid var(--color-pine-500); }
        .date-icon { font-size: 0.875rem; }
        .date-info { flex: 1; min-width: 0; }
        .date-title { font-size: 0.6875rem; font-weight: 600; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .date-progress { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
        .date-progress-bar { flex: 1; height: 3px; background: var(--bg-card); border-radius: var(--radius-full); overflow: hidden; }
        .date-pct { font-size: 0.5rem; font-weight: 600; color: var(--text-secondary); }
        .date-days { font-size: 0.625rem; font-weight: 700; flex-shrink: 0; }

        /* Goal List */
        .goal-list { display: flex; flex-direction: column; gap: 6px; }
        .goal-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border-default); }
        .goal-item:last-child { border-bottom: none; }
        .goal-dot { width: 20px; height: 20px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 0.625rem; flex-shrink: 0; }
        .goal-info { flex: 1; min-width: 0; }
        .goal-name { font-size: 0.6875rem; font-weight: 600; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .goal-bar { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
        .goal-bar-track { flex: 1; height: 3px; background: var(--bg-input); border-radius: var(--radius-full); overflow: hidden; }
        .goal-pct { font-size: 0.5rem; font-weight: 600; color: var(--text-secondary); min-width: 24px; }
        .goal-due { font-size: 0.5625rem; color: var(--text-tertiary); margin: 2px 0 0 0; }

        /* XP Mini */
        .xp-mini { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-default); }
        .xp-mini-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .xp-mini-label { font-size: 0.5625rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 3px; }
        .xp-mini-value { font-size: 0.5625rem; font-weight: 700; color: var(--color-pine-500); }
        .xp-mini-track { width: 100%; height: 4px; background: var(--border-default); border-radius: var(--radius-full); overflow: hidden; }
        .xp-mini-fill { height: 100%; background: linear-gradient(90deg, var(--color-pine-400), var(--color-pine-600)); border-radius: var(--radius-full); }

        /* Bottom Grid */
        .bottom-grid { display: grid; grid-template-columns: 1fr 1fr 200px; gap: 10px; }

        /* Member List */
        .member-list { display: flex; flex-direction: column; gap: 6px; }
        .member-item { display: flex; align-items: center; gap: 8px; }
        .member-avatar { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, var(--color-pine-400), var(--color-pine-600)); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.625rem; font-weight: 700; flex-shrink: 0; overflow: hidden; }
        .member-info { flex: 1; }
        .member-name { font-size: 0.6875rem; font-weight: 600; color: var(--text-primary); margin: 0; }
        .member-level { font-size: 0.5625rem; color: var(--text-secondary); margin: 0; }

        /* Progress Mini */
        .progress-mini { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .progress-ring-small { position: relative; width: 80px; height: 80px; }
        .progress-ring-small svg { transform: rotate(-90deg); }
        .progress-ring-small .progress-ring-track { fill: none; stroke: var(--border-default); stroke-width: 6; }
        .progress-ring-small .progress-ring-fill { fill: none; stroke: var(--color-pine-500); stroke-width: 6; stroke-linecap: round; stroke-dasharray: 213.6; transition: stroke-dashoffset 1s var(--transition-slow); }
        .progress-ring-small .progress-ring-inner { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .progress-ring-small .progress-ring-pct { font-size: 1rem; font-weight: 800; color: var(--text-primary); }
        .progress-legend-small { display: flex; align-items: center; gap: 8px; font-size: 0.5rem; color: var(--text-secondary); flex-wrap: wrap; justify-content: center; }
        .legend-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

        /* Achievement List */
        .achievement-list { display: flex; flex-direction: column; gap: 6px; }
        .achievement-item { display: flex; align-items: center; gap: 8px; }
        .achievement-icon { font-size: 1rem; }
        .achievement-title { font-size: 0.625rem; font-weight: 600; color: var(--text-primary); margin: 0; }

        .empty-msg { padding: 8px 0; color: var(--text-secondary); font-size: 0.6875rem; text-align: center; margin: 0; }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
        .modal-content { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); width: 90%; max-width: 440px; max-height: 85vh; overflow-y: auto; padding: 20px; animation: fadeInUp 0.3s ease; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .modal-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }
        .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; display: flex; }
        .modal-body { display: flex; flex-direction: column; gap: 10px; }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
        .form-label { font-size: 0.6875rem; font-weight: 600; color: var(--text-primary); }
        .form-input { width: 100%; padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.8125rem; outline: none; box-sizing: border-box; }
        .form-input:focus { border-color: var(--color-prosper-green); }
        select.form-input { cursor: pointer; }

        @media (max-width: 1024px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .dual-grid { grid-template-columns: 1fr; }
          .bottom-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .stats-row { grid-template-columns: 1fr 1fr; }
          .dashboard-header { flex-direction: column; align-items: flex-start; gap: 8px; }
        }
      `}</style>
    </DashboardLayout>
  );
}
