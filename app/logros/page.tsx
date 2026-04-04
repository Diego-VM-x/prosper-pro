'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getXPByOwnerId, getAchievementsByOwnerId } from '@/lib/firestore/gamification';
import type { XPState, Achievement } from '@/types';

const ACHIEVEMENT_CATEGORIES = [
  { id: 'savings', title: 'Ahorro', icon: '💰', color: 'var(--color-prosper-green)' },
  { id: 'investments', title: 'Inversiones', icon: '📈', color: 'var(--color-prosper-navy)' },
  { id: 'discipline', title: 'Disciplina', icon: '🎯', color: '#F59E0B' },
  { id: 'education', title: 'Educación', icon: '📚', color: '#3B82F6' },
  { id: 'community', title: 'Comunidad', icon: '👥', color: '#8B5CF6' },
  { id: 'milestones', title: 'Hitos', icon: '🏆', color: '#EC4899' },
];

const SAMPLE_ACHIEVEMENTS: Achievement[] = [
  { id: '1', ownerId: '', title: 'Fondo de Emergencia', description: 'Completa tu primer hito de reserva para 3 meses de gastos.', icon: '🛡️', unlockedAt: Date.now() - 86400000 * 2 },
  { id: '2', ownerId: '', title: 'Primeras Acciones', description: 'Realiza tu primera inversión en el mercado de valores.', icon: '📊', unlockedAt: Date.now() - 86400000 * 5 },
  { id: '3', ownerId: '', title: 'Racha de 10 Días', description: 'Mantén 10 días consecutivos sin gastos extra.', icon: '🔥', unlockedAt: Date.now() - 86400000 * 7 },
  { id: '4', ownerId: '', title: 'Arquitecto de Ahorro', description: 'Alcanza un ahorro del 20% de tus ingresos durante 3 meses.', icon: '🏗️', unlockedAt: Date.now() - 86400000 * 15 },
  { id: '5', ownerId: '', title: 'Explorador Global', description: 'Invierte en 5 mercados internacionales diferentes.', icon: '🌍', unlockedAt: Date.now() - 86400000 * 20 },
  { id: '6', ownerId: '', title: 'Presupuesto Maestro', description: 'Mantén tus gastos variables bajo control por 4 semanas.', icon: '📋', unlockedAt: Date.now() - 86400000 * 30 },
];

const LOCKED_ACHIEVEMENTS = [
  { id: 'l1', title: 'Inversionista Experto', description: 'Completa 20 inversiones exitosas.', icon: '💎', category: 'investments', progress: 12, total: 20 },
  { id: 'l2', title: 'Ahorro Consistente', description: 'Ahorra el 15% de tus ingresos por 6 meses.', icon: '🏦', category: 'savings', progress: 4, total: 6 },
  { id: 'l3', title: 'Estudiante Dedicado', description: 'Completa 10 cursos de la academia.', icon: '🎓', category: 'education', progress: 3, total: 10 },
  { id: 'l4', title: 'Líder Comunitario', description: 'Ayuda a 50 miembros de la comunidad.', icon: '🤝', category: 'community', progress: 15, total: 50 },
  { id: 'l5', title: 'Racha de 30 Días', description: 'Mantén 30 días consecutivos sin gastos extra.', icon: '⚡', category: 'discipline', progress: 27, total: 30 },
  { id: 'l6', title: 'Millonario Virtual', description: 'Alcanza un balance total de $10,000.', icon: '💵', category: 'milestones', progress: 6500, total: 10000 },
];

export default function LogrosPage() {
  const { user } = useAuth();
  const [xpState, setXPState] = useState<XPState | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [xp, ach] = await Promise.all([
          getXPByOwnerId(user.uid),
          getAchievementsByOwnerId(user.uid),
        ]);
        setXPState(xp);
        setAchievements(ach.length > 0 ? ach : SAMPLE_ACHIEVEMENTS);
      } catch (error) {
        console.error('Error loading gamification data:', error);
        setAchievements(SAMPLE_ACHIEVEMENTS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const xpProgress = xpState ? Math.round((xpState.currentXP / xpState.maxXP) * 100) : 0;
  const totalPoints = xpState ? (xpState.level * 1000 + xpState.currentXP) : 0;

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => {
        const cat = ACHIEVEMENT_CATEGORIES.find(c => a.title.toLowerCase().includes(c.id));
        return cat?.id === selectedCategory;
      });

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="page-content-overflow-fix">
          <style jsx>{`
            .logros-container {
              padding: 24px;
              max-width: 1200px;
              margin: 0 auto;
            }
            .hero-section {
              display: flex;
              flex-direction: column;
              md:flex-row;
              justify-content: space-between;
              align-items: flex-end;
              gap: 24px;
              margin-bottom: 32px;
            }
            .hero-title {
              font-size: 2rem;
              font-weight: 800;
              color: var(--text-primary);
              letter-spacing: -0.02em;
              margin: 0 0 8px 0;
            }
            .hero-subtitle {
              font-size: 1rem;
              color: var(--text-secondary);
              margin: 0;
            }
            .xp-card {
              background: var(--bg-card);
              border-radius: 16px;
              padding: 20px 24px;
              display: flex;
              align-items: center;
              gap: 16px;
              box-shadow: var(--shadow-md);
              border: 1px solid var(--border-default);
            }
            .xp-points {
              text-align: right;
            }
            .xp-label {
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
              margin: 0;
            }
            .xp-value {
              font-size: 1.5rem;
              font-weight: 900;
              color: var(--color-prosper-green);
              margin: 0;
            }
            .xp-icon-container {
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background: linear-gradient(135deg, var(--color-prosper-green), var(--color-pine-400));
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.5rem;
            }
            .bento-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 24px;
              margin-bottom: 32px;
            }
            @media (min-width: 768px) {
              .bento-grid {
                grid-template-columns: 2fr 1fr;
              }
            }
            .progress-card {
              background: var(--bg-card);
              border-radius: 16px;
              padding: 32px;
              position: relative;
              overflow: hidden;
              border: 1px solid var(--border-default);
            }
            .progress-card::after {
              content: '';
              position: absolute;
              right: -64px;
              bottom: -64px;
              width: 256px;
              height: 256px;
              background: var(--bg-accent-soft);
              border-radius: 50%;
              opacity: 0.5;
            }
            .progress-badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 4px 12px;
              background: var(--bg-accent-soft);
              border-radius: 9999px;
              border: 1px solid var(--color-prosper-green);
              margin-bottom: 24px;
            }
            .progress-badge-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: var(--color-prosper-green);
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            .progress-badge-text {
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--color-prosper-green);
            }
            .progress-title {
              font-size: 1.5rem;
              font-weight: 800;
              color: var(--text-primary);
              margin: 0 0 16px 0;
              max-width: 400px;
            }
            .progress-description {
              font-size: 0.875rem;
              color: var(--text-secondary);
              margin: 0 0 32px 0;
              max-width: 320px;
            }
            .progress-bars {
              display: flex;
              flex-direction: column;
              gap: 24px;
              position: relative;
              z-index: 1;
            }
            .progress-bar-item {
              flex: 1;
            }
            .progress-bar-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .progress-bar-label {
              font-size: 0.6875rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
            }
            .progress-bar-value {
              font-size: 0.6875rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--color-prosper-green);
            }
            .progress-bar-track {
              height: 8px;
              background: var(--bg-input);
              border-radius: 9999px;
              overflow: hidden;
            }
            .progress-bar-fill {
              height: 100%;
              border-radius: 9999px;
              background: linear-gradient(90deg, var(--color-prosper-green), var(--color-pine-400));
              transition: width 0.5s ease;
            }
            .milestone-card {
              background: var(--bg-card);
              border-radius: 16px;
              padding: 32px;
              display: flex;
              flex-direction: column;
              border: 1px solid var(--border-default);
            }
            .milestone-label {
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
              margin: 0 0 24px 0;
            }
            .milestone-image {
              width: 100%;
              height: 128px;
              background: linear-gradient(135deg, var(--bg-accent-soft), var(--bg-input));
              border-radius: 8px;
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 3rem;
            }
            .milestone-title {
              font-size: 1.25rem;
              font-weight: 800;
              color: var(--text-primary);
              margin: 0 0 8px 0;
            }
            .milestone-desc {
              font-size: 0.875rem;
              color: var(--text-secondary);
              margin: 0 0 24px 0;
            }
            .milestone-reward {
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
            }
            .milestone-reward-label {
              font-size: 0.625rem;
              font-weight: 700;
              color: var(--color-prosper-green);
            }
            .milestone-reward-value {
              font-size: 0.625rem;
              font-weight: 700;
              color: var(--text-primary);
            }
            .milestone-btn {
              width: 100%;
              padding: 12px;
              border: 1px solid var(--color-prosper-green);
              background: transparent;
              color: var(--color-prosper-green);
              font-size: 0.75rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s;
            }
            .milestone-btn:hover {
              background: var(--bg-accent-soft);
            }
            .category-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
            }
            .category-title {
              font-size: 1.125rem;
              font-weight: 800;
              color: var(--text-primary);
              padding-left: 16px;
              border-left: 4px solid var(--color-prosper-green);
            }
            .category-filters {
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
            }
            .category-filter-btn {
              padding: 6px 12px;
              border: 1px solid var(--border-default);
              background: var(--bg-card);
              color: var(--text-secondary);
              font-size: 0.75rem;
              font-weight: 600;
              border-radius: 9999px;
              cursor: pointer;
              transition: all 0.2s;
            }
            .category-filter-btn:hover,
            .category-filter-btn.active {
              border-color: var(--color-prosper-green);
              color: var(--color-prosper-green);
              background: var(--bg-accent-soft);
            }
            .achievements-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 24px;
            }
            @media (min-width: 640px) {
              .achievements-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            @media (min-width: 1024px) {
              .achievements-grid {
                grid-template-columns: repeat(3, 1fr);
              }
            }
            .achievement-card {
              background: var(--bg-card);
              border-radius: 12px;
              overflow: hidden;
              border: 1px solid var(--border-default);
              transition: all 0.2s;
            }
            .achievement-card:hover {
              border-color: var(--color-prosper-green);
              box-shadow: var(--shadow-md);
            }
            .achievement-content {
              padding: 24px;
            }
            .achievement-header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 16px;
            }
            .achievement-icon {
              width: 40px;
              height: 40px;
              border-radius: 8px;
              background: var(--bg-accent-soft);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.25rem;
            }
            .achievement-category {
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
            }
            .achievement-title {
              font-size: 1.125rem;
              font-weight: 800;
              color: var(--text-primary);
              margin: 0 0 8px 0;
            }
            .achievement-desc {
              font-size: 0.875rem;
              color: var(--text-secondary);
              margin: 0 0 16px 0;
            }
            .achievement-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-top: 16px;
              border-top: 1px solid var(--border-default);
            }
            .achievement-badges {
              display: flex;
              gap: -8px;
            }
            .achievement-badge {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 2px solid var(--bg-card);
              background: var(--bg-input);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.625rem;
            }
            .achievement-status {
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--color-prosper-green);
            }
            .achievement-progress-bar {
              height: 6px;
              background: var(--bg-input);
              border-radius: 9999px;
              overflow: hidden;
              margin-top: 16px;
            }
            .achievement-progress-fill {
              height: 100%;
              background: var(--color-prosper-green);
              border-radius: 9999px;
              transition: width 0.5s ease;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 24px;
              margin-top: 32px;
            }
            @media (min-width: 768px) {
              .stats-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            .stat-card {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 24px;
              border: 1px solid var(--border-default);
            }
            .stat-title {
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
              margin: 0 0 16px 0;
            }
            .stat-value {
              font-size: 2rem;
              font-weight: 900;
              color: var(--text-primary);
              margin: 0 0 4px 0;
            }
            .stat-subtitle {
              font-size: 0.875rem;
              color: var(--color-prosper-green);
              font-weight: 700;
              margin: 0;
            }
            .level-card {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 24px;
              border: 1px solid var(--border-default);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .level-value {
              font-size: 3rem;
              font-weight: 900;
              color: var(--text-primary);
              margin: 0;
              line-height: 1;
            }
            .level-subtitle {
              font-size: 1rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              margin: 0 0 32px 0;
            }
            .level-progress-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .level-progress-label {
              font-size: 0.6875rem;
              font-weight: 700;
              text-transform: uppercase;
              color: var(--text-secondary);
            }
            .level-progress-value {
              font-size: 0.6875rem;
              font-weight: 700;
              color: var(--text-primary);
            }
            .level-progress-track {
              height: 12px;
              background: var(--bg-input);
              border-radius: 9999px;
              overflow: hidden;
            }
            .level-progress-fill {
              height: 100%;
              background: linear-gradient(90deg, var(--color-prosper-green), var(--color-pine-400));
              border-radius: 9999px;
              transition: width 0.5s ease;
            }
            .loading-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              gap: 16px;
            }
            .loading-spinner {
              width: 48px;
              height: 48px;
              border: 4px solid var(--border-default);
              border-top-color: var(--color-prosper-green);
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .loading-text {
              font-size: 0.875rem;
              color: var(--text-secondary);
            }
          `}</style>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Cargando tus logros...</p>
            </div>
          ) : (
            <>
              {/* Hero Section */}
              <div className="hero-section">
                <div>
                  <h1 className="hero-title">Logros y Recompensas</h1>
                  <p className="hero-subtitle">Tu arquitectura financiera en crecimiento constante.</p>
                </div>
                <div className="xp-card">
                  <div className="xp-points">
                    <p className="xp-label">Total de Puntos</p>
                    <p className="xp-value">{totalPoints.toLocaleString()}</p>
                  </div>
                  <div className="xp-icon-container">🏆</div>
                </div>
              </div>

              {/* Bento Grid */}
              <div className="bento-grid">
                {/* Progress Card */}
                <div className="progress-card">
                  <div className="progress-badge">
                    <div className="progress-badge-dot"></div>
                    <span className="progress-badge-text">Análisis de Progreso Inteligente</span>
                  </div>
                  <h3 className="progress-title">
                    Estás a solo {30 - (xpState?.currentXP || 0)} XP de tu Nivel {xpState ? xpState.level + 1 : 2}.
                  </h3>
                  <p className="progress-description">
                    Basado en tu historial financiero, tu salud financiera ha mejorado un 12% este mes.
                  </p>
                  <div className="progress-bars">
                    <div className="progress-bar-item">
                      <div className="progress-bar-header">
                        <span className="progress-bar-label">Nivel Actual</span>
                        <span className="progress-bar-value">{xpState?.currentXP || 0} / {xpState?.maxXP || 1000} XP</span>
                      </div>
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${xpProgress}%` }}></div>
                      </div>
                    </div>
                    <div className="progress-bar-item">
                      <div className="progress-bar-header">
                        <span className="progress-bar-label">Logros Desbloqueados</span>
                        <span className="progress-bar-value">{achievements.length} / 12</span>
                      </div>
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${(achievements.length / 12) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Milestone Card */}
                <div className="milestone-card">
                  <p className="milestone-label">Próximo Hito</p>
                  <div className="milestone-image">🏗️</div>
                  <h4 className="milestone-title">Arquitecto de Ahorro</h4>
                  <p className="milestone-desc">Alcanza un ahorro del 20% de tus ingresos durante 3 meses consecutivos.</p>
                  <div className="milestone-reward">
                    <span className="milestone-reward-label">RECOMPENSA</span>
                    <span className="milestone-reward-value">2,500 Pts</span>
                  </div>
                  <button className="milestone-btn">Ver Detalles</button>
                </div>
              </div>

              {/* Category Header */}
              <div className="category-header">
                <h3 className="category-title">Tus Logros Categorizados</h3>
                <div className="category-filters">
                  <button 
                    className={`category-filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('all')}
                  >
                    Todos
                  </button>
                  {ACHIEVEMENT_CATEGORIES.map(cat => (
                    <button 
                      key={cat.id}
                      className={`category-filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.icon} {cat.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Achievements Grid */}
              <div className="achievements-grid">
                {filteredAchievements.map(achievement => (
                  <div key={achievement.id} className="achievement-card">
                    <div className="achievement-content">
                      <div className="achievement-header">
                        <div className="achievement-icon">{achievement.icon}</div>
                        <span className="achievement-category">Desbloqueado</span>
                      </div>
                      <h4 className="achievement-title">{achievement.title}</h4>
                      <p className="achievement-desc">{achievement.description}</p>
                      <div className="achievement-footer">
                        <div className="achievement-badges">
                          <div className="achievement-badge">🏆</div>
                          <div className="achievement-badge">⭐</div>
                        </div>
                        <span className="achievement-status">Completado</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Locked Achievements */}
                {LOCKED_ACHIEVEMENTS.filter(a => selectedCategory === 'all' || a.category === selectedCategory).map(achievement => {
                  const cat = ACHIEVEMENT_CATEGORIES.find(c => c.id === achievement.category);
                  const progressPercent = Math.round((achievement.progress / achievement.total) * 100);
                  return (
                    <div key={achievement.id} className="achievement-card">
                      <div className="achievement-content">
                        <div className="achievement-header">
                          <div className="achievement-icon">{achievement.icon}</div>
                          <span className="achievement-category" style={{ color: cat?.color }}>{cat?.title}</span>
                        </div>
                        <h4 className="achievement-title">{achievement.title}</h4>
                        <p className="achievement-desc">{achievement.description}</p>
                        <div className="achievement-progress-bar">
                          <div className="achievement-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <div className="achievement-footer">
                          <span className="progress-bar-label">{achievement.progress} / {achievement.total}</span>
                          <span className="achievement-status" style={{ color: cat?.color }}>{progressPercent}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stats Grid */}
              <div className="stats-grid">
                {/* Activity Card */}
                <div className="stat-card">
                  <h4 className="stat-title">Actividad Reciente</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-accent-soft)] flex items-center justify-center">📝</div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">Hito: Primeras Acciones</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">Hace 2 días</p>
                        </div>
                      </div>
                      <span className="text-[var(--color-prosper-green)] font-bold text-sm">+500 pts</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-accent-soft)] flex items-center justify-center">⚡</div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">Racha: 10 Días Sin Gastos Extra</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">Hace 5 días</p>
                        </div>
                      </div>
                      <span className="text-[var(--color-prosper-green)] font-bold text-sm">+200 pts</span>
                    </div>
                  </div>
                </div>

                {/* Level Card */}
                <div className="level-card">
                  <div>
                    <h4 className="stat-title">Tu Nivel de Arquitecto</h4>
                    <p className="level-value">NV. {xpState?.level || 1}</p>
                    <p className="level-subtitle">{xpState?.title || 'Novato'}</p>
                  </div>
                  <div>
                    <div className="level-progress-header">
                      <span className="level-progress-label">Próximo Nivel</span>
                      <span className="level-progress-value">{(xpState?.maxXP || 1000) - (xpState?.currentXP || 0)} XP para subir</span>
                    </div>
                    <div className="level-progress-track">
                      <div className="level-progress-fill" style={{ width: `${xpProgress}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
