'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getCommunityUsers } from '@/lib/firestore/community';
import type { CommunityUser } from '@/lib/firestore/community';

const FORUMS = [
  { id: '1', category: 'Inversión', title: 'Estrategias de Inversión 2026', desc: 'Análisis profundo sobre los mercados emergentes y la rotación de capital en el sector tecnológico.', messages: 142, active: 28, color: 'var(--color-prosper-green)' },
  { id: '2', category: 'Retiro', title: 'Ahorro para Retiro', desc: 'Cómo maximizar los beneficios fiscales en planes de pensiones privadas antes de fin de año.', messages: 89, active: 12, color: 'var(--color-prosper-navy)' },
  { id: '3', category: 'Legal', title: 'Fiscalidad Internacional', desc: 'Dudas sobre residencia fiscal digital y tributación de activos en diferentes jurisdicciones.', messages: 256, active: 45, color: '#F59E0B' },
  { id: '4', category: 'Educación', title: 'Finanzas para Principiantes', desc: 'Guía completa para entender los conceptos básicos de finanzas personales.', messages: 312, active: 67, color: '#3B82F6' },
];

const RESOURCES = [
  { id: '1', title: 'Calculadora de Interés Compuesto', type: 'Excel Template .XLSX', icon: '🧮', color: 'var(--color-prosper-green)' },
  { id: '2', title: 'Plan de Emergencia 50/30/20', type: 'PDF Guide', icon: '📊', color: 'var(--color-prosper-navy)' },
];

const EVENTS = [
  { id: '1', title: 'Webinar: IA en Finanzas Personales', speaker: 'David Cheng, CTO de Prosper', date: 'Mañana, 18:00', isPrimary: true },
  { id: '2', title: 'Café Virtual: Salud Financiera', speaker: 'Sesión abierta de Q&A', date: 'Jueves, 10:00', isPrimary: false },
];

export default function ComunidadPage() {
  const { user } = useAuth();
  const [communityUsers, setCommunityUsers] = useState<CommunityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const users = await getCommunityUsers();
        setCommunityUsers(users);
      } catch (error) {
        console.error('Error loading community data:', error);
        setCommunityUsers([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const topUsers = communityUsers.slice(0, 3);
  const filteredForums = searchQuery 
    ? FORUMS.filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()) || f.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : FORUMS;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="page-content-overflow-fix">
          <style jsx>{`
            .comunidad-container {
              padding: 24px;
              max-width: 1200px;
              margin: 0 auto;
            }
            .hero-section {
              background: linear-gradient(135deg, var(--bg-card), var(--bg-input));
              border-radius: 16px;
              padding: 48px;
              margin-bottom: 32px;
              position: relative;
              overflow: hidden;
              border: 1px solid var(--border-default);
            }
            .hero-section::before {
              content: '';
              position: absolute;
              inset: 0;
              background: radial-gradient(circle at top right, var(--bg-accent-soft), transparent 60%);
              opacity: 0.3;
            }
            .hero-content {
              position: relative;
              z-index: 1;
            }
            .hero-welcome {
              font-size: 0.75rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: var(--color-prosper-green);
              margin: 0 0 8px 0;
            }
            .hero-title {
              font-size: 2rem;
              font-weight: 900;
              color: var(--text-primary);
              letter-spacing: -0.02em;
              margin: 0 0 8px 0;
            }
            .hero-title span {
              background: linear-gradient(90deg, var(--color-prosper-green), var(--color-pine-400));
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .hero-subtitle {
              font-size: 1rem;
              color: var(--text-secondary);
              margin: 0;
            }
            .search-bar {
              position: relative;
              max-width: 400px;
              margin-bottom: 32px;
            }
            .search-icon {
              position: absolute;
              left: 16px;
              top: 50%;
              transform: translateY(-50%);
              color: var(--text-tertiary);
              font-size: 1.25rem;
            }
            .search-input {
              width: 100%;
              padding: 12px 16px 12px 48px;
              background: var(--bg-card);
              border: 1px solid var(--border-default);
              border-radius: 9999px;
              color: var(--text-primary);
              font-size: 0.875rem;
              transition: all 0.2s;
            }
            .search-input:focus {
              outline: none;
              border-color: var(--color-prosper-green);
              box-shadow: 0 0 0 3px var(--bg-accent-soft);
            }
            .search-input::placeholder {
              color: var(--text-tertiary);
            }
            .main-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 24px;
            }
            @media (min-width: 1024px) {
              .main-grid {
                grid-template-columns: 2fr 1fr;
              }
            }
            .main-content {
              display: flex;
              flex-direction: column;
              gap: 24px;
            }
            .section-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
            }
            .section-title {
              font-size: 1.125rem;
              font-weight: 800;
              color: var(--text-primary);
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .section-title-icon {
              color: var(--color-prosper-green);
              font-size: 1.25rem;
            }
            .section-link {
              font-size: 0.875rem;
              font-weight: 600;
              color: var(--color-prosper-green);
              text-decoration: none;
              cursor: pointer;
            }
            .section-link:hover {
              text-decoration: underline;
            }
            .forums-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 16px;
            }
            @media (min-width: 640px) {
              .forums-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            .forum-card {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 20px;
              border: 1px solid var(--border-default);
              transition: all 0.2s;
              cursor: pointer;
            }
            .forum-card:hover {
              border-color: var(--color-prosper-green);
              box-shadow: var(--shadow-md);
            }
            .forum-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 12px;
            }
            .forum-category {
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              background: var(--bg-accent-soft);
              color: var(--color-prosper-green);
            }
            .forum-avatars {
              display: flex;
              margin-left: -8px;
            }
            .forum-avatar {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 2px solid var(--bg-card);
              background: var(--bg-input);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.5rem;
              margin-left: -8px;
            }
            .forum-avatar:first-child {
              margin-left: 0;
            }
            .forum-title {
              font-size: 1rem;
              font-weight: 700;
              color: var(--text-primary);
              margin: 0 0 8px 0;
              transition: color 0.2s;
            }
            .forum-card:hover .forum-title {
              color: var(--color-prosper-green);
            }
            .forum-desc {
              font-size: 0.875rem;
              color: var(--text-secondary);
              margin: 0 0 16px 0;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            .forum-stats {
              display: flex;
              gap: 16px;
              font-size: 0.75rem;
              color: var(--text-secondary);
            }
            .forum-stat {
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .forum-add {
              border: 2px dashed var(--border-default);
              border-radius: 12px;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              cursor: pointer;
              transition: all 0.2s;
              min-height: 180px;
            }
            .forum-add:hover {
              border-color: var(--color-prosper-green);
              background: var(--bg-accent-soft);
            }
            .forum-add-icon {
              font-size: 2rem;
              color: var(--text-tertiary);
              margin-bottom: 8px;
            }
            .forum-add:hover .forum-add-icon {
              color: var(--color-prosper-green);
            }
            .forum-add-title {
              font-size: 0.875rem;
              font-weight: 600;
              color: var(--text-secondary);
            }
            .forum-add:hover .forum-add-title {
              color: var(--text-primary);
            }
            .resources-section {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 24px;
              border: 1px solid var(--border-default);
            }
            .resources-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 16px;
            }
            @media (min-width: 640px) {
              .resources-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            .resource-card {
              background: var(--bg-input);
              border-radius: 8px;
              padding: 16px;
              display: flex;
              align-items: center;
              gap: 16px;
              transition: all 0.2s;
              cursor: pointer;
            }
            .resource-card:hover {
              box-shadow: var(--shadow-md);
            }
            .resource-icon {
              width: 48px;
              height: 48px;
              border-radius: 8px;
              background: var(--bg-accent-soft);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.5rem;
              flex-shrink: 0;
            }
            .resource-info h4 {
              font-size: 0.875rem;
              font-weight: 700;
              color: var(--text-primary);
              margin: 0 0 4px 0;
            }
            .resource-info p {
              font-size: 0.625rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
              margin: 0;
            }
            .sidebar {
              display: flex;
              flex-direction: column;
              gap: 24px;
            }
            .leaderboard-card {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 24px;
              border: 1px solid var(--border-default);
            }
            .leader-item {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 12px;
              background: var(--bg-input);
              border-radius: 8px;
              margin-bottom: 12px;
              transition: all 0.2s;
            }
            .leader-item:first-child {
              background: var(--bg-accent-soft);
              border-left: 4px solid var(--color-prosper-green);
            }
            .leader-item:hover {
              background: var(--bg-card-hover);
            }
            .leader-avatar {
              position: relative;
              flex-shrink: 0;
            }
            .leader-avatar-img {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background: var(--bg-card);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.25rem;
            }
            .leader-rank {
              position: absolute;
              top: -4px;
              right: -4px;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: var(--color-prosper-green);
              color: white;
              font-size: 0.5rem;
              font-weight: 700;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .leader-rank:not(:first-child) {
              background: var(--bg-card);
              color: var(--text-primary);
              border: 1px solid var(--border-default);
            }
            .leader-info {
              flex: 1;
              min-width: 0;
            }
            .leader-name {
              font-size: 0.875rem;
              font-weight: 700;
              color: var(--text-primary);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .leader-stats {
              font-size: 0.625rem;
              color: var(--text-secondary);
              margin: 0;
            }
            .leader-points {
              text-align: right;
              flex-shrink: 0;
            }
            .leader-points-value {
              font-size: 0.75rem;
              font-weight: 900;
              color: var(--color-prosper-green);
              margin: 0;
            }
            .leader-points:first-child .leader-points-value {
              color: var(--text-primary);
            }
            .leader-points-label {
              font-size: 0.5rem;
              font-weight: 700;
              text-transform: uppercase;
              color: var(--text-secondary);
              margin: 0;
            }
            .leaderboard-btn {
              width: 100%;
              padding: 8px;
              border: 1px solid var(--border-default);
              background: transparent;
              color: var(--text-secondary);
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s;
              margin-top: 8px;
            }
            .leaderboard-btn:hover {
              background: var(--bg-card-hover);
              color: var(--text-primary);
            }
            .events-card {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 24px;
              border: 1px solid var(--border-default);
            }
            .event-item {
              position: relative;
              padding-left: 24px;
              padding-bottom: 24px;
              border-left: 2px solid var(--border-default);
            }
            .event-item:last-child {
              padding-bottom: 0;
              border-left-color: transparent;
            }
            .event-item:first-child {
              border-left-color: var(--color-prosper-green);
            }
            .event-dot {
              position: absolute;
              left: -9px;
              top: 4px;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: var(--color-prosper-green);
              border: 4px solid var(--bg-card);
            }
            .event-item:not(:first-child) .event-dot {
              background: var(--text-tertiary);
            }
            .event-date {
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              color: var(--color-prosper-green);
              margin: 0 0 4px 0;
            }
            .event-item:not(:first-child) .event-date {
              color: var(--text-secondary);
            }
            .event-title {
              font-size: 0.875rem;
              font-weight: 700;
              color: var(--text-primary);
              margin: 0 0 4px 0;
            }
            .event-speaker {
              font-size: 0.75rem;
              color: var(--text-secondary);
              margin: 0 0 8px 0;
            }
            .event-link {
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              text-decoration: none;
              display: inline-flex;
              align-items: center;
              gap: 4px;
              cursor: pointer;
            }
            .event-link:hover {
              text-decoration: underline;
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
              <p className="loading-text">Cargando comunidad...</p>
            </div>
          ) : (
            <>
              {/* Hero Section */}
              <div className="hero-section">
                <div className="hero-content">
                  <p className="hero-welcome">Bienvenido de nuevo</p>
                  <h1 className="hero-title">Comunidad Prosper: <span>El Capital del Conocimiento</span></h1>
                  <p className="hero-subtitle">Conéctate, aprende y crece junto a la élite de los arquitectos digitales.</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Buscar en la comunidad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Main Grid */}
              <div className="main-grid">
                {/* Main Content */}
                <div className="main-content">
                  {/* Forums Section */}
                  <div>
                    <div className="section-header">
                      <h2 className="section-title">
                        <span className="section-title-icon">💬</span>
                        Foros de Discusión
                      </h2>
                      <a className="section-link">Ver todos</a>
                    </div>
                    <div className="forums-grid">
                      {filteredForums.map(forum => (
                        <div key={forum.id} className="forum-card">
                          <div className="forum-header">
                            <span className="forum-category" style={{ background: `${forum.color}20`, color: forum.color }}>{forum.category}</span>
                            <div className="forum-avatars">
                              <div className="forum-avatar">👤</div>
                              <div className="forum-avatar">👤</div>
                              <div className="forum-avatar">+{forum.active}</div>
                            </div>
                          </div>
                          <h3 className="forum-title">{forum.title}</h3>
                          <p className="forum-desc">{forum.desc}</p>
                          <div className="forum-stats">
                            <span className="forum-stat">💬 {forum.messages} mensajes</span>
                            <span className="forum-stat">👥 {forum.active} activos</span>
                          </div>
                        </div>
                      ))}
                      <div className="forum-add">
                        <div className="forum-add-icon">➕</div>
                        <h3 className="forum-add-title">Proponer nuevo tema</h3>
                      </div>
                    </div>
                  </div>

                  {/* Resources Section */}
                  <div className="resources-section">
                    <div className="section-header">
                      <h2 className="section-title">
                        <span className="section-title-icon">📥</span>
                        Recursos de la Comunidad
                      </h2>
                    </div>
                    <div className="resources-grid">
                      {RESOURCES.map(resource => (
                        <div key={resource.id} className="resource-card">
                          <div className="resource-icon">{resource.icon}</div>
                          <div className="resource-info">
                            <h4>{resource.title}</h4>
                            <p>{resource.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="sidebar">
                  {/* Leaderboard */}
                  <div className="leaderboard-card">
                    <div className="section-header">
                      <h2 className="section-title">
                        <span className="section-title-icon">🏆</span>
                        Tablero de Líderes
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {topUsers.length > 0 ? topUsers.map((user, index) => (
                        <div key={user.uid} className="leader-item">
                          <div className="leader-avatar">
                            <div className="leader-avatar-img">{user.photoURL ? '👤' : '👤'}</div>
                            <div className="leader-rank">{index + 1}</div>
                          </div>
                          <div className="leader-info">
                            <p className="leader-name">{user.displayName || 'Usuario'}</p>
                            <p className="leader-stats">{user.goalsCount} Metas Cumplidas</p>
                          </div>
                          <div className="leader-points">
                            <p className="leader-points-value">{user.currentXP.toLocaleString()}</p>
                            <p className="leader-points-label">Puntos</p>
                          </div>
                        </div>
                      )) : (
                        <div className="leader-item">
                          <div className="leader-avatar">
                            <div className="leader-avatar-img">👤</div>
                            <div className="leader-rank">1</div>
                          </div>
                          <div className="leader-info">
                            <p className="leader-name">¡Sé el primero!</p>
                            <p className="leader-stats">Completa metas para aparecer aquí</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <button className="leaderboard-btn">Ver Ranking Completo</button>
                  </div>

                  {/* Events */}
                  <div className="events-card">
                    <div className="section-header">
                      <h2 className="section-title">
                        <span className="section-title-icon">📅</span>
                        Próximos Eventos
                      </h2>
                    </div>
                    <div className="space-y-0">
                      {EVENTS.map(event => (
                        <div key={event.id} className="event-item">
                          <div className="event-dot"></div>
                          <p className="event-date">{event.date}</p>
                          <h4 className="event-title">{event.title}</h4>
                          <p className="event-speaker">Por: {event.speaker}</p>
                          {event.isPrimary && (
                            <a className="event-link">
                              Reservar lugar →
                            </a>
                          )}
                        </div>
                      ))}
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
