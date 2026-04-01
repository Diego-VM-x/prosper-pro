'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  IconPlus,
  IconArrowUpRight,
  IconTrendUp,
  IconVideo,
  IconPause,
  IconStop,
  IconZap,
  IconWallet,
  IconTasks,
  IconX,
} from './icons';
import type { Goal, WeeklyData, Reminder, XPState, CommunityMember, Achievement, GoalCategory } from '@/types';
import { importTransactionsFromCSV } from '@/lib/csvParser';

// Sin datos por defecto - todo viene de Firebase

export function Dashboard() {
  const { user } = useAuth();
  const userId = user?.uid || '';

  const [goals, setGoals] = useState<Goal[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [xp, setXP] = useState<XPState | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [monthlySavings, setMonthlySavings] = useState(0);

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvDelimiter, setCsvDelimiter] = useState(';');
  const [importStatus, setImportStatus] = useState<{ success: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  const [newGoal, setNewGoal] = useState({
    title: '',
    category: 'Ahorro' as GoalCategory,
    current: 0,
    target: 0,
    deadline: '',
    color: '#3DCC8E',
    icon: '🎯',
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer tick
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (timerRunning) {
        setTimerSeconds((prev) => prev + 1);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  // Auto-guardar timer en Firestore cada 30s
  useEffect(() => {
    if (!userId) return;
    saveTimerRef.current = setInterval(() => {
      import('@/lib/firestore/study').then(({ saveStudyTimer }) => {
        saveStudyTimer(userId, timerSeconds, timerRunning);
      });
    }, 30000);
    return () => { if (saveTimerRef.current) clearInterval(saveTimerRef.current); };
  }, [userId]);

  // Guardar timer al desmontar
  useEffect(() => {
    return () => {
      if (userId && timerSeconds > 0) {
        import('@/lib/firestore/study').then(({ saveStudyTimer }) => {
          saveStudyTimer(userId, timerSeconds, timerRunning);
        });
      }
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    try {
      import('@/lib/firestore/goals').then(({ subscribeToGoals }) =>
        subscribeToGoals(userId, (g) => { if (g.length) setGoals(g); })
      );
      import('@/lib/firestore/transactions').then(({ subscribeToWeeklyData, getMonthlySavings }) => {
        subscribeToWeeklyData(userId, (w) => { if (w.length) setWeeklyData(w); });
        getMonthlySavings(userId).then((s) => { if (s > 0) setMonthlySavings(s); });
      });
      import('@/lib/firestore/reminders').then(({ subscribeToReminders }) =>
        subscribeToReminders(userId, (r) => { if (r.length) setReminders(r); })
      );
      import('@/lib/firestore/gamification').then(({ subscribeToXP, subscribeToAchievements }) => {
        subscribeToXP(userId, (x) => { if (x) setXP(x); });
        subscribeToAchievements(userId, (a) => { if (a.length) setAchievements(a); });
      });
      import('@/lib/firestore/community').then(({ subscribeToCommunityMembers }) =>
        subscribeToCommunityMembers((m) => { if (m.length) setMembers(m); })
      );
      import('@/lib/firestore/study').then(({ subscribeToStudySession }) =>
        subscribeToStudySession(userId, (s) => {
          if (s) {
            setTimerSeconds(s.totalSeconds);
            setTimerRunning(s.isRunning);
          }
        })
      );
    } catch (e) {
      console.error('Firestore load error (using local data):', e);
    }
  }, [userId]);

  const formatTime = useCallback((s: number): string => {
    const hrs = String(Math.floor(s / 3600)).padStart(2, '0');
    const min = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${hrs}:${min}:${sec}`;
  }, []);

  const activeGoals = goals.filter((g) => g.status !== 'completed');
  const completedGoals = goals.filter((g) => g.status === 'completed');
  const totalGoals = goals.length;
  const progressPct = totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progressPct / 100);

  const handleCreateGoal = async () => {
    if (!newGoal.title || !newGoal.target) return;
    const goal: Goal = {
      id: 'g' + Date.now(),
      userId: userId || 'local',
      ...newGoal,
      status: newGoal.current >= newGoal.target ? 'completed' : 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      monthlyGrowth: 0,
      streakDays: 0,
    };
    setGoals((prev) => [goal, ...prev]);
    if (userId) {
      try {
        const { createGoal } = await import('@/lib/firestore/goals');
        await createGoal(goal);
      } catch (e) { console.error(e); }
    }
    setShowNewGoalModal(false);
    setNewGoal({ title: '', category: 'Ahorro', current: 0, target: 0, deadline: '', color: '#3DCC8E', icon: '🎯' });
  };

  // Timer handlers con sync a Firestore
  const handleToggleTimer = () => {
    const newState = !timerRunning;
    setTimerRunning(newState);
    if (userId) {
      import('@/lib/firestore/study').then(({ saveStudyTimer }) => {
        saveStudyTimer(userId, timerSeconds, newState);
      });
    }
  };

  const handleStopTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
    if (userId) {
      import('@/lib/firestore/study').then(({ saveStudyTimer }) => {
        saveStudyTimer(userId, 0, false);
      });
    }
  };

  const handleJoinSession = () => {
    alert('Funcionalidad de sesión de mentor: se abriría una ventana de video llamada.');
  };

  const handleInviteMember = () => {
    alert('Funcionalidad de invitación: se abriría un formulario para compartir enlace.');
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
          <button className="btn btn-outline" onClick={() => setShowImportModal(true)}>
            <IconWallet /> Importar Datos
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card animate-fadeInUp featured">
          <div className="stat-card-top">
            <span className="stat-label">Metas Activas</span>
            <button className="stat-icon-link" aria-label="Ver Metas Activas"><IconArrowUpRight /></button>
          </div>
          <p className="stat-value">{activeGoals.length}</p>
          <span className="stat-change positive"><IconTrendUp />{activeGoals.filter((g) => g.status === 'progress').length} en progreso</span>
        </div>
        <div className="stat-card animate-fadeInUp">
          <div className="stat-card-top">
            <span className="stat-label">Metas Completadas</span>
            <button className="stat-icon-link" aria-label="Ver Metas Completadas"><IconArrowUpRight /></button>
          </div>
          <p className="stat-value">{completedGoals.length}</p>
          <span className="stat-change positive"><IconTrendUp />{totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0}% del total</span>
        </div>
        <div className="stat-card animate-fadeInUp">
          <div className="stat-card-top">
            <span className="stat-label">Ahorro Mensual</span>
            <button className="stat-icon-link" aria-label="Ver Ahorro"><IconArrowUpRight /></button>
          </div>
          <p className="stat-value">${(monthlySavings / 1000).toFixed(1)}k</p>
          <span className="stat-change positive"><IconTrendUp />Incrementado</span>
        </div>
        <div className="stat-card animate-fadeInUp">
          <div className="stat-card-top">
            <span className="stat-label">Lecciones Pendientes</span>
            <button className="stat-icon-link" aria-label="Ver Lecciones"><IconArrowUpRight /></button>
          </div>
          <p className="stat-value">{goals.filter((g) => g.category === 'Educación' && g.status !== 'completed').length}</p>
          <span className="stat-change">En progreso</span>
        </div>
      </div>

      <div className="content-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

          {reminders.length > 0 ? (
            <div className="reminder-card animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
              <span className="reminder-title">Recordatorios</span>
              <p className="reminder-event-name" style={{ marginTop: 12 }}>{reminders[0].title}</p>
              <p className="reminder-time">Hora: {reminders[0].startTime} - {reminders[0].endTime}</p>
              <button className="reminder-cta" onClick={handleJoinSession}><IconVideo /> Iniciar Sesión</button>
            </div>
          ) : (
            <div className="card animate-fadeInUp" style={{ animationDelay: '0.25s', padding: 20, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No hay recordatorios pendientes</p>
            </div>
          )}
        </div>

        <div className="card animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <div className="card-header">
            <span className="card-title">Metas Activas</span>
            <button className="card-action" onClick={() => setShowNewGoalModal(true)}><IconPlus /> Nueva</button>
          </div>
          <div className="project-list">
            {activeGoals.length > 0 ? activeGoals.slice(0, 5).map((goal) => (
              <div className="project-list-item" key={goal.id}>
                <div className="project-color-dot" style={{ background: goal.color }}><span style={{ fontSize: '0.875rem' }}>{goal.icon}</span></div>
                <div className="project-info">
                  <p className="project-name">{goal.title}</p>
                  <p className="project-due">Fecha: {goal.deadline}</p>
                </div>
              </div>
            )) : (
              <p style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No hay metas activas. ¡Crea una!</p>
            )}
          </div>

          {xp && (
            <div className="xp-bar-wrapper" style={{ marginTop: 16 }}>
              <div className="xp-bar-header">
                <span className="xp-bar-label"><IconZap style={{ display: 'inline-block', verticalAlign: 'middle', width: 14, height: 14, marginRight: 4 }} />Nivel {xp.level} — {xp.title}</span>
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
            <button className="card-action" onClick={handleInviteMember}><IconPlus /> Invitar</button>
          </div>
          <div className="team-list">
            {members.map((member) => (
              <div className="team-member" key={member.id}>
                <div className="team-avatar">{member.avatarInitials}</div>
                <div className="team-info">
                  <p className="team-name">{member.name}</p>
                  <p className="team-task">{member.task} <span>{member.highlight}</span></p>
                </div>
                <span className={`status-badge status-${member.status}`}>
                  {member.status === 'completed' ? 'Completado' : member.status === 'progress' ? 'En Progreso' : 'Pendiente'}
                </span>
              </div>
            ))}
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

        <div className="animate-fadeInUp" style={{ animationDelay: '0.45s', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="timer-card">
            <p className="timer-title">Rastreador de Estudio</p>
            <p className="timer-display">{formatTime(timerSeconds)}</p>
            <div className="timer-controls">
              <button className="timer-btn timer-btn-pause" onClick={handleToggleTimer} aria-label={timerRunning ? 'Pausar' : 'Reanudar'}><IconPause /></button>
              <button className="timer-btn timer-btn-stop" onClick={handleStopTimer} aria-label="Detener"><IconStop /></button>
            </div>
          </div>

          <div className="card" style={{ flex: 1 }}>
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
              <input className="form-input" type="text" placeholder="Ej: Dic 2026" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} />
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

      {showImportModal && (
        <div className="modal-overlay" onClick={() => { setShowImportModal(false); setCsvFile(null); setImportStatus(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title">Importar Datos CSV</h2>
              <button className="modal-close" onClick={() => { setShowImportModal(false); setCsvFile(null); setImportStatus(null); }}><IconX width={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.8125rem' }}>
                Formato requerido: <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>date,amount,type,category,description</code>
              </p>
              <p style={{ color: 'var(--text-tertiary)', marginBottom: 16, fontSize: '0.75rem' }}>
                Tipos válidos: income, expense, saving. Fecha: YYYY-MM-DD o timestamp.
              </p>

              <label className="form-label">Delimitador</label>
              <select className="form-input" value={csvDelimiter} onChange={(e) => setCsvDelimiter(e.target.value)} style={{ marginBottom: 12 }}>
                <option value=";">Punto y coma (;)</option>
                <option value=",">Coma (,)</option>
                <option value="\t">Tabulación</option>
              </select>

              <label className="form-label">Archivo CSV</label>
              <input
                type="file"
                accept=".csv,.txt"
                className="form-input"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setCsvFile(file);
                  setImportStatus(null);
                }}
              />

              {csvFile && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                  📄 {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                </p>
              )}

              {importStatus && (
                <div style={{ marginTop: 16, padding: 12, borderRadius: 'var(--radius-md)', background: importStatus.errors.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(61,204,142,0.1)' }}>
                  <p style={{ fontWeight: 600, color: importStatus.errors.length > 0 ? 'var(--color-error)' : 'var(--color-prosper-green)', marginBottom: 4 }}>
                    {importStatus.success > 0 ? `✅ ${importStatus.success} transacciones importadas` : '❌ Error al importar'}
                  </p>
                  {importStatus.errors.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {importStatus.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                      {importStatus.errors.length > 5 && <li>...y {importStatus.errors.length - 5} errores más</li>}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setShowImportModal(false); setCsvFile(null); setImportStatus(null); }}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={!csvFile || importing}
                onClick={async () => {
                  if (!csvFile || !userId) return;
                  setImporting(true);
                  try {
                    const text = await csvFile.text();
                    const result = await importTransactionsFromCSV(text, userId, csvDelimiter);
                    setImportStatus(result);
                  } catch (err) {
                    setImportStatus({ success: 0, errors: [`Error: ${(err as Error).message}`] });
                  } finally {
                    setImporting(false);
                  }
                }}
              >
                {importing ? 'Importando...' : 'Importar'}
              </button>
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
