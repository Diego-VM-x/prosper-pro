'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  IconPlus, 
  IconTrendUp, 
  IconFilter, 
  IconChevronRight,
  IconZap,
  IconWallet,
  IconAnalytics
} from '../components/icons';

/* ============================================================
   DATA / MOCK
   ============================================================ */

const GOALS = [
  {
    id: 1,
    title: 'Fondo de Emergencia',
    category: 'Ahorro',
    current: 4500,
    target: 10000,
    deadline: 'Dic 2026',
    status: 'progress',
    color: '#3DCC8E',
    icon: '🛡️',
  },
  {
    id: 2,
    title: 'Inversión en ETFs (S&P 500)',
    category: 'Inversión',
    current: 12000,
    target: 50000,
    deadline: 'Jun 2028',
    status: 'progress',
    color: '#1E3A6E',
    icon: '📈',
  },
  {
    id: 3,
    title: 'Viaje a Japón 2027',
    category: 'Ahorro',
    current: 2500,
    target: 8000,
    deadline: 'Mar 2027',
    status: 'progress',
    color: '#F59E0B',
    icon: '✈️',
  },
  {
    id: 4,
    title: 'Curso de Blockchain Pro',
    category: 'Educación',
    current: 500,
    target: 500,
    deadline: 'Completado',
    status: 'completed',
    color: '#3DCC8E',
    icon: '🎓',
  },
  {
    id: 5,
    title: 'Compra de MacBook Pro',
    category: 'Ahorro',
    current: 1200,
    target: 2500,
    deadline: 'Oct 2026',
    status: 'progress',
    color: '#EF4444',
    icon: '💻',
  }
];

/* ============================================================
   COMPONENT: MetasPage
   ============================================================ */

export default function MetasPage() {
  const [filter, setFilter] = useState('Todas');

  const filteredGoals = filter === 'Todas' 
    ? GOALS 
    : GOALS.filter(g => g.category === filter || (filter === 'Completadas' && g.status === 'completed'));

  return (
    <DashboardLayout>
      <div className="page-header animate-fadeInDown">
        <div className="page-header-left">
          <h1 className="page-title">Mis Metas</h1>
          <p className="page-subtitle">Visualiza y gestiona tu progreso hacia la libertad financiera.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary">
            <IconPlus /> Crear Nueva Meta
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-bar animate-fadeInUp" style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
        {['Todas', 'Ahorro', 'Inversión', 'Educación', 'Completadas'].map((item) => (
          <button 
            key={item}
            className={`filter-chip ${filter === item ? 'active' : ''}`}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Grid de Metas */}
      <div className="metas-grid animate-fadeInUp">
        {filteredGoals.map((goal, i) => {
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
                  <div 
                    className="goal-progress-fill" 
                    style={{ 
                      width: `${pct}%`,
                      background: goal.status === 'completed' ? 'var(--color-prosper-green)' : goal.color
                    }} 
                  />
                </div>
              </div>

              <div className="goal-footer">
                <div className="goal-stats">
                  <div className="stat">
                    <IconTrendUp width={14} />
                    <span>+12% este mes</span>
                  </div>
                  <div className="stat">
                    <IconZap width={14} />
                    <span>Racha de 5 días</span>
                  </div>
                </div>
                <button className="goal-detail-btn">
                  Detalles <IconChevronRight width={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Estilos adicionales específicos para esta página */}
      <style jsx>{`
        .filter-chip {
          padding: 8px 16px;
          border-radius: var(--radius-full);
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .filter-chip:hover {
          border-color: var(--color-prosper-green);
          color: var(--color-prosper-green);
        }

        .filter-chip.active {
          background: var(--color-prosper-green);
          color: white;
          border-color: var(--color-prosper-green);
          box-shadow: 0 4px 12px rgba(61, 204, 142, 0.2);
        }

        .metas-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .goal-wide-card {
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 20px;
          transition: all var(--transition-base);
        }

        .goal-wide-card:hover {
          transform: translateX(4px);
          border-color: var(--color-prosper-green);
          box-shadow: var(--shadow-md);
        }

        .goal-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .goal-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .goal-main-info {
          flex: 1;
        }

        .goal-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .goal-category {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .goal-status-group {
          text-align: right;
        }

        .goal-values {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 2px;
        }

        .current {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .separator {
          color: var(--text-tertiary);
          font-size: 0.875rem;
        }

        .target {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .goal-deadline {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .goal-progress-section {
          margin-bottom: 20px;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .pct-label {
          color: var(--color-prosper-green);
        }

        .remaining-label {
          color: var(--text-secondary);
        }

        .goal-progress-track {
          height: 8px;
          background: var(--bg-input);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .goal-progress-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .goal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          border-top: 1px solid var(--border-default);
        }

        .goal-stats {
          display: flex;
          gap: 16px;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .stat span {
          color: var(--text-primary);
          font-weight: 600;
        }

        .goal-detail-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--color-prosper-navy);
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        [data-theme="dark"] .goal-detail-btn {
          color: var(--color-prosper-green);
        }

        .goal-detail-btn:hover {
          opacity: 0.8;
        }
      `}</style>
    </DashboardLayout>
  );
}
