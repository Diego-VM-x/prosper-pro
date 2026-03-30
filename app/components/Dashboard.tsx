'use client';

/**
 * @file Dashboard.tsx
 * @description Vista principal del Dashboard Prosper-Pro.
 * Contiene las tarjetas de estadísticas, analíticas financieras,
 * recordatorios, lista de proyectos/metas, equipo y progreso.
 * Temática: Libertad financiera y educación gamificada.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import {
  IconPlus,
  IconArrowUpRight,
  IconTrendUp,
  IconVideo,
  IconPause,
  IconStop,
  IconZap,
  IconWallet,
  IconBook,
  IconTrophy,
  IconTasks,
} from './icons';

/* ============================================================
   DATA / MOCK
   ============================================================ */

/** Datos de las tarjetas estadísticas principales */
const STATS = [
  { label: 'Metas Activas', value: '24', change: '+3 este mes', positive: true, featured: true },
  { label: 'Metas Completadas', value: '10', change: '+2 este mes', positive: true, featured: false },
  { label: 'Ahorro Mensual', value: '$1.2k', change: 'Incrementado', positive: true, featured: false },
  { label: 'Lecciones Pendientes', value: '2', change: 'En progreso', positive: false, featured: false },
];

/** Datos del gráfico de barras de analíticas semanales */
const CHART_DATA = [
  { day: 'L', h1: 40, h2: 55 },
  { day: 'M', h1: 65, h2: 80 },
  { day: 'Mi', h1: 50, h2: 90 },
  { day: 'J', h1: 70, h2: 60 },
  { day: 'V', h1: 55, h2: 75 },
  { day: 'S', h1: 30, h2: 45 },
  { day: 'D', h1: 25, h2: 35 },
];

/** Lista de metas / proyectos financieros activos */
const PROJECTS = [
  { name: 'Fondo de Emergencia', date: '15 Abr, 2026', color: '#2B8560', icon: '🛡️' },
  { name: 'Invertir en ETFs', date: '20 Abr, 2026', color: '#3B82F6', icon: '📈' },
  { name: 'Curso de Trading', date: '28 Abr, 2026', color: '#F59E0B', icon: '📚' },
  { name: 'Ahorro Viaje', date: '10 May, 2026', color: '#8B5CF6', icon: '✈️' },
  { name: 'Certificación Finanzas', date: '31 May, 2026', color: '#EF4444', icon: '🎓' },
];

/** Lista de miembros del equipo / comunidad Prosper */
const TEAM_MEMBERS = [
  { name: 'Alexandra Deff', task: 'Completó', highlight: 'Módulo de Presupuesto Básico', status: 'completed' },
  { name: 'Edwin Adenike', task: 'En progreso', highlight: 'Reto de Ahorro 30 Días', status: 'progress' },
  { name: 'Isaac Oluwatem.', task: 'Buscando', highlight: 'Mentor de Inversiones', status: 'pending' },
  { name: 'David Oshodi', task: 'En progreso', highlight: 'Simulador de Portafolio', status: 'progress' },
];

/* ============================================================
   COMPONENT: Dashboard
   ============================================================ */

/**
 * Componente principal del Dashboard.
 * Orquesta el layout del sidebar, topbar y toda la zona de contenido
 * con widgets interactivos.
 */
export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(5048);
  const [timerRunning, setTimerRunning] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Marcar como montado para evitar mismatch de hidratación
  useEffect(() => { setMounted(true); }, []);

  // Timer de estudio / tracking
  useEffect(() => {
    if (!timerRunning || !mounted) return;
    const interval = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, mounted]);

  /**
   * Formatea segundos a formato HH:MM:SS.
   * @param s - Cantidad de segundos.
   * @returns String formateado.
   */
  const formatTime = useCallback((s: number): string => {
    const hrs = String(Math.floor(s / 3600)).padStart(2, '0');
    const min = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${hrs}:${min}:${sec}`;
  }, []);

  return (
    <ThemeProvider>
      <div className="app-shell">
        {/* === SIDEBAR === */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* === MAIN === */}
        <main className="main-content">
          {/* Topbar */}
          <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          {/* Page Content */}
          <div className="page-content">
            {/* Header */}
            <div className="page-header">
              <div className="page-header-left">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">
                  Planifica, ahorra y prospera con tus metas financieras.
                </p>
              </div>
              <div className="page-header-actions">
                <button className="btn btn-primary" id="btn-add-goal">
                  <IconPlus /> Nueva Meta
                </button>
                <button className="btn btn-outline" id="btn-import">
                  <IconWallet /> Importar Datos
                </button>
              </div>
            </div>

            {/* === STAT CARDS === */}
            <div className="stats-grid">
              {STATS.map((stat, i) => (
                <div
                  key={i}
                  className={`stat-card animate-fadeInUp${stat.featured ? ' featured' : ''}`}
                  id={`stat-card-${i}`}
                >
                  <div className="stat-card-top">
                    <span className="stat-label">{stat.label}</span>
                    <button className="stat-icon-link" aria-label={`Ver ${stat.label}`}>
                      <IconArrowUpRight />
                    </button>
                  </div>
                  <p className="stat-value">{stat.value}</p>
                  <span className={`stat-change ${stat.positive ? 'positive' : ''}`}>
                    {stat.positive && <IconTrendUp />}
                    {stat.change}
                  </span>
                </div>
              ))}
            </div>

            {/* === GRID CENTRAL === */}
            <div className="content-grid">
              {/* Columna Izquierda: Analíticas + Recordatorios */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Analíticas semanales */}
                <div className="card animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                  <div className="card-header">
                    <span className="card-title">Progreso Financiero Semanal</span>
                  </div>
                  <div className="chart-bars">
                    {CHART_DATA.map((bar, i) => (
                      <div className="chart-bar-wrapper" key={i}>
                        <div
                          className="chart-bar style-stripe"
                          style={{ height: `${bar.h1}%` }}
                        >
                          <span className="chart-tooltip">{bar.h1}%</span>
                        </div>
                        <div
                          className="chart-bar style-solid"
                          style={{ height: `${bar.h2}%` }}
                        >
                          <span className="chart-tooltip">{bar.h2}%</span>
                        </div>
                        <span className="chart-day">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recordatorio */}
                <div className="reminder-card animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
                  <span className="reminder-title">Recordatorios</span>
                  <p className="reminder-event-name" style={{ marginTop: 12 }}>
                    Sesión con Mentor Financiero
                  </p>
                  <p className="reminder-time">Hora: 02:00 pm - 04:00 pm</p>
                  <button className="reminder-cta" id="btn-start-session">
                    <IconVideo /> Iniciar Sesión
                  </button>
                </div>
              </div>

              {/* Columna Derecha: Proyectos / Metas */}
              <div className="card animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                <div className="card-header">
                  <span className="card-title">Metas Activas</span>
                  <button className="card-action" id="btn-new-project">
                    <IconPlus /> Nueva
                  </button>
                </div>
                <div className="project-list">
                  {PROJECTS.map((project, i) => (
                    <div className="project-list-item" key={i} id={`project-${i}`}>
                      <div
                        className="project-color-dot"
                        style={{ background: project.color }}
                      >
                        <span style={{ fontSize: '0.875rem' }}>{project.icon}</span>
                      </div>
                      <div className="project-info">
                        <p className="project-name">{project.name}</p>
                        <p className="project-due">Fecha: {project.date}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* XP / Gamification Bar */}
                <div className="xp-bar-wrapper" style={{ marginTop: 16 }}>
                  <div className="xp-bar-header">
                    <span className="xp-bar-label">
                      <IconZap
                        style={{
                          display: 'inline-block',
                          verticalAlign: 'middle',
                          width: 14,
                          height: 14,
                          marginRight: 4,
                        }}
                      />
                      Nivel 7 — Inversionista
                    </span>
                    <span className="xp-bar-value">2,450 / 3,000 XP</span>
                  </div>
                  <div className="xp-bar-track">
                    <div className="xp-bar-fill" style={{ width: '81.6%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* === GRID INFERIOR === */}
            <div className="content-grid-full" style={{ marginTop: 4 }}>
              {/* Equipo / Comunidad */}
              <div className="card animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
                <div className="card-header">
                  <span className="card-title">Comunidad Prosper</span>
                  <button className="card-action" id="btn-add-member">
                    <IconPlus /> Invitar
                  </button>
                </div>
                <div className="team-list">
                  {TEAM_MEMBERS.map((member, i) => (
                    <div className="team-member" key={i} id={`team-member-${i}`}>
                      <div className="team-avatar">
                        {member.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className="team-info">
                        <p className="team-name">{member.name}</p>
                        <p className="team-task">
                          {member.task} <span>{member.highlight}</span>
                        </p>
                      </div>
                      <span className={`status-badge status-${member.status}`}>
                        {member.status === 'completed'
                          ? 'Completado'
                          : member.status === 'progress'
                          ? 'En Progreso'
                          : 'Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progreso General */}
              <div className="card animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
                <div className="card-header">
                  <span className="card-title">Progreso de Metas</span>
                </div>
                <div className="progress-ring-wrapper">
                  <div className="progress-ring">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle
                        className="progress-ring-track"
                        cx="60"
                        cy="60"
                        r="54"
                      />
                      <circle
                        className="progress-ring-fill"
                        cx="60"
                        cy="60"
                        r="54"
                        style={{ strokeDashoffset: 339.29 * (1 - 0.41) }}
                      />
                    </svg>
                    <div className="progress-ring-inner">
                      <span className="progress-ring-pct">41%</span>
                      <span className="progress-ring-label">Metas<br />Logradas</span>
                    </div>
                  </div>
                  <div className="progress-legend">
                    <div className="legend-item">
                      <span className="legend-dot" style={{ background: 'var(--color-pine-500)' }} />
                      Completadas
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot" style={{ background: 'var(--color-blue-500)' }} />
                      En Progreso
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot" style={{ background: 'var(--color-gold-500)' }} />
                      Pendientes
                    </div>
                  </div>
                </div>
              </div>

              {/* Timer / Tracker de Estudio */}
              <div className="animate-fadeInUp" style={{ animationDelay: '0.45s', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="timer-card">
                  <p className="timer-title">Rastreador de Estudio</p>
                  <p className="timer-display" id="study-timer">{formatTime(timerSeconds)}</p>
                  <div className="timer-controls">
                    <button
                      className="timer-btn timer-btn-pause"
                      onClick={() => setTimerRunning(!timerRunning)}
                      aria-label={timerRunning ? 'Pausar' : 'Reanudar'}
                      id="btn-timer-pause"
                    >
                      <IconPause />
                    </button>
                    <button
                      className="timer-btn timer-btn-stop"
                      onClick={() => {
                        setTimerRunning(false);
                        setTimerSeconds(0);
                      }}
                      aria-label="Detener"
                      id="btn-timer-stop"
                    >
                      <IconStop />
                    </button>
                  </div>
                </div>

                {/* Logros Recientes Compact */}
                <div className="card" style={{ flex: 1 }}>
                  <div className="card-header">
                    <span className="card-title">Logros Recientes</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.25rem' }}>🏅</span>
                      <div>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Primer Ahorro
                        </p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                          Completaste tu primera meta de ahorro
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.25rem' }}>🔥</span>
                      <div>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Racha de 7 Días
                        </p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                          7 días consecutivos de lecciones
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.25rem' }}>💎</span>
                      <div>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Nivel Inversionista
                        </p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                          Alcanzaste el Nivel 7
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
