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

  // Carga de datos estáticos (transacciones, XP, comunidad)
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

        // Calcular weekly data y monthly savings desde transacciones
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
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Planifica, ahorra y prospera con tus metas financieras.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowNewGoalModal(true)}>
            <IconPlus /> Nueva Meta
          </button>
        </div>
      </div>

      {/* Avisos Recientes - Metas y recordatorios que vencen hoy */}
      {(goalsToday.length > 0 || remindersToday.length > 0) && (
        <div className="card animate-fadeInUp" style={{ marginBottom: 20, borderLeft: '4px solid var(--color-gold-500)' }}>
          <div className="card-header">
            <span className="card-title">🔔 Avisos Recientes - Hoy</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {goalsToday.map((g) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)' }}>
                <span>{g.icon}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{g.title}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-gold-500)', marginLeft: 'auto' }}>Fecha límite hoy</span>
              </div>
            ))}
            {remindersToday.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)' }}>
                <span>🔔</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-blue-500)', marginLeft: 'auto' }}>{r.startTime}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card animate-fadeInUp featured">
          <div className="stat-card-top">
            <span className="stat-label">Metas Activas</span>
            <button className="stat-icon-link" aria-label="Ver Metas Activas" onClick={() => router.push('/metas')}><IconArrowUpRight /></button>
          </div>
          <p className="stat-value">{activeGoals.length}</p>
          <span className="stat-change positive"><IconTrendUp />{activeGoals.filter((g) => g.status === 'progress').length} en progreso</span>
        </div>
        <div className="stat-card animate-fadeInUp">
          <div className="stat-card-top">
            <span className="stat-label">Metas Completadas</span>
            <button className="stat-icon-link" aria-label="Ver Metas Completadas" onClick={() => router.push('/metas')}><IconArrowUpRight /></button>
          </div>
          <p className="stat-value">{completedGoals.length}</p>
          <span className="stat-change positive"><IconTrendUp />{totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0}% del total</span>
        </div>
        <div className="stat-card animate-fadeInUp">
          <div className="stat-card-top">
            <span className="stat-label">Ahorro Mensual</span>
            <button className="stat-icon-link" aria-label="Ver Ahorro" onClick={() => router.push('/finanzas')}><IconArrowUpRight /></button>
          </div>
          <p className="stat-value">${(monthlySavings / 1000).toFixed(1)}k</p>
          <span className="stat-change positive"><IconTrendUp />Incrementado</span>
        </div>
        <div className="stat-card animate-fadeInUp">
          <div className="stat-card-top">
            <span className="stat-label">Lecciones Pendientes</span>
            <button className="stat-icon-link" aria-label="Ver Lecciones" onClick={() => router.push('/cursos')}><IconArrowUpRight /></button>
          </div>
          <p className="stat-value">{goals.filter((g) => g.category === 'Educación' && g.status !== 'completed').length}</p>
          <span className="stat-change">En progreso</span>
        </div>
      </div>

      <div className="content-grid">
        {/* Columna izquierda: Gráfico + Fechas */}
        <div className="content-grid-left">
          <div className="card animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <div className="card-header"><span className="card-title">Progreso Financiero Semanal</span></div>
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

          {/* Próximas Fechas Límite */}
          <div className="card animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
            <div className="card-header">
              <span className="card-title">📅 Próximas Fechas</span>
              <button className="card-action" onClick={() => router.push('/calendario')}>Ver calendario</button>
            </div>
            {(() => {
              const upcoming = goals
                .filter((g: Goal) => g.status !== 'completed' && g.deadline)
                .map((g: Goal) => ({ ...g, iso: parseDeadlineToISO(g.deadline) }))
                .filter((g) => g.iso !== null)
                .sort((a, b) => (a.iso as string).localeCompare(b.iso as string))
                .slice(0, 4);
              return upcoming.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {upcoming.map((g) => {
                    const daysLeft = getDaysUntil(g.iso as string);
                    const pct = Math.min((g.current / g.target) * 100, 100);
                    const urgency = daysLeft <= 0 ? 'var(--color-red-500)' : daysLeft <= 7 ? 'var(--color-gold-500)' : 'var(--text-secondary)';
                    return (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${g.color}` }}>
                        <span style={{ fontSize: '0.875rem' }}>{g.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <div style={{ flex: 1, height: 3, background: 'var(--bg-card)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: g.color, borderRadius: 'var(--radius-full)' }} />
                            </div>
                            <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{Math.round(pct)}%</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: urgency }}>{daysLeft <= 0 ? 'Vencida' : daysLeft === 1 ? '1d' : `${daysLeft}d`}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ padding: '10px 0', color: 'var(--text-secondary)', fontSize: '0.75rem', textAlign: 'center' }}>No hay metas con fecha límite</p>
              );
            })()}
          </div>
        </div>

        {/* Columna derecha: Metas Activas + XP */}
        <div className="card animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <div className="card-header">
            <span className="card-title">Metas Activas</span>
            <button className="card-action" onClick={() => setShowNewGoalModal(true)}><IconPlus /> Nueva</button>
          </div>
          <div className="project-list">
            {activeGoals.length > 0 ? activeGoals.slice(0, 5).map((goal: Goal) => {
              const pct = Math.min((goal.current / goal.target) * 100, 100);
              return (
                <div className="project-list-item" key={goal.id}>
                  <div className="project-color-dot" style={{ background: goal.color }}><span style={{ fontSize: '0.75rem' }}>{goal.icon}</span></div>
                  <div className="project-info" style={{ flex: 1 }}>
                    <p className="project-name">{goal.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <div style={{ flex: 1, height: 3, background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: goal.color, borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: 24 }}>{Math.round(pct)}%</span>
                    </div>
                    <p className="project-due" style={{ marginTop: 2 }}>${goal.current.toLocaleString()} / ${goal.target.toLocaleString()} &middot; {goal.deadline}</p>
                  </div>
                </div>
              );
            }) : (
              <p style={{ padding: '10px 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>No hay metas activas. ¡Crea una!</p>
            )}
          </div>

          {xp && (
            <div className="xp-bar-wrapper" style={{ marginTop: 10 }}>
              <div className="xp-bar-header">
                <span className="xp-bar-label"><IconZap style={{ display: 'inline-block', verticalAlign: 'middle', width: 12, height: 12, marginRight: 3 }} />Nivel {xp.level}</span>
                <span className="xp-bar-value">{xp.currentXP.toLocaleString()} / {xp.maxXP.toLocaleString()} XP</span>
              </div>
              <div className="xp-bar-track"><div className="xp-bar-fill" style={{ width: `${(xp.currentXP / xp.maxXP) * 100}%` }} /></div>
            </div>
          )}
        </div>
      </div>

      <div className="content-grid-full" style={{ marginTop: 4 }}>
        <div className="card animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
          <div className="card-header">
            <span className="card-title">Comunidad Prosper</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{members.length} miembros</span>
          </div>
          <div className="team-list">
            {members.length > 0 ? members.map((member) => (
              <div className="team-member" key={member.uid}>
                <div className="team-avatar" style={{ overflow: 'hidden' }}>
                  {member.photoURL ? (
                    <img src={member.photoURL} alt={member.displayName || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (member.displayName || member.email || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="team-info">
                  <p className="team-name">{member.displayName || 'Usuario'}</p>
                  <p className="team-task">Nivel {member.level} — {member.title} <span>{member.currentXP}/{member.maxXP} XP</span></p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                  <div>🏆 {member.achievementsCount}</div>
                  <div>🎯 {member.goalsCount}</div>
                </div>
              </div>
            )) : (
              <p style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Aún no hay miembros. ¡Comparte Prosper!</p>
            )}
          </div>
        </div>

        <div className="card animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
          <div className="card-header"><span className="card-title">Progreso de Metas</span></div>
          <div className="progress-ring-wrapper">
            <div className="progress-ring">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle className="progress-ring-track" cx="60" cy="60" r="54" />
                <circle className="progress-ring-fill" cx="60" cy="60" r="54" style={{ strokeDashoffset }} />
              </svg>
              <div className="progress-ring-inner">
                <span className="progress-ring-pct">{progressPct}%</span>
                <span className="progress-ring-label">Metas<br />Logradas</span>
              </div>
            </div>
            <div className="progress-legend">
              <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--color-pine-500)' }} />Completadas</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--color-blue-500)' }} />En Progreso</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--color-gold-500)' }} />Pendientes</div>
            </div>
          </div>
        </div>

        <div className="animate-fadeInUp" style={{ animationDelay: '0.45s' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Logros Recientes</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {achievements.slice(0, 3).map((ach) => (
                <div key={ach.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.25rem' }}>{ach.icon}</span>
                  <div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ach.title}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{ach.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
                  <button key={c} onClick={() => setNewGoal({ ...newGoal, color: c })} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: newGoal.color === c ? '3px solid var(--text-primary)' : '3px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
              <label className="form-label">Icono</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['🎯', '🛡️', '📈', '✈️', '🎓', '💻', '🏠', '🚗'].map((icon) => (
                  <button key={icon} onClick={() => setNewGoal({ ...newGoal, icon })} style={{ fontSize: '1.5rem', padding: 8, borderRadius: 'var(--radius-md)', background: newGoal.icon === icon ? 'var(--bg-input)' : 'transparent', border: newGoal.icon === icon ? '2px solid var(--color-prosper-green)' : '2px solid transparent', cursor: 'pointer' }}>{icon}</button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowNewGoalModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateGoal}>Crear Meta</button>
            </div>
          </div>
        </div>
      )}


      <style>{`
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
      `}</style>
    </DashboardLayout>
  );
}
