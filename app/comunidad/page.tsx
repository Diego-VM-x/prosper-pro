'use client';

import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

const FORUMS = [
  {
    id: 'inversion',
    title: 'Estrategias de Inversión 2026',
    description: 'Análisis profundo sobre los mercados emergentes y la rotación de capital en el sector tecnológico.',
    tag: 'Inversión',
    tagColor: 'var(--color-prosper-green)',
    members: 14,
    messages: 142,
    avatars: 3,
  },
  {
    id: 'retiro',
    title: 'Ahorro para Retiro',
    description: 'Cómo maximizar los beneficios fiscales en planes de pensiones privadas antes de fin de año.',
    tag: 'Retiro',
    tagColor: 'var(--color-prosper-navy)',
    members: 7,
    messages: 89,
    avatars: 2,
  },
  {
    id: 'fiscalidad',
    title: 'Fiscalidad Internacional',
    description: 'Dudas sobre residencia fiscal digital y tributación de activos en diferentes jurisdicciones.',
    tag: 'Legal',
    tagColor: 'var(--color-prosper-green)',
    members: 22,
    messages: 256,
    avatars: 1,
  },
];

const RESOURCES = [
  {
    id: 'calc',
    title: 'Calculadora de Interés Compuesto',
    type: 'Excel Template .XLSX',
    icon: '📊',
    color: 'var(--color-prosper-green)',
  },
  {
    id: 'plan',
    title: 'Plan de Emergencia 50/30/20',
    type: 'PDF Guide',
    icon: '📈',
    color: 'var(--color-prosper-navy)',
  },
];

const LEADERS = [
  { name: 'Marc Soler', goals: 42, points: 8450, rank: 1 },
  { name: 'Elena Vargas', goals: 38, points: 7920, rank: 2 },
  { name: 'Julian Arcas', goals: 35, points: 7100, rank: 3 },
];

const EVENTS = [
  {
    id: 1,
    title: 'Webinar: IA en Finanzas Personales',
    date: 'Mañana, 18:00',
    speaker: 'Por: David Cheng, CTO de Prosper',
    active: true,
  },
  {
    id: 2,
    title: 'Café Virtual: Salud Financiera',
    date: 'Jueves, 10:00',
    speaker: 'Sesión abierta de Q&A',
    active: false,
  },
];

export default function ComunidadPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="comunidad-page">
          <style jsx>{`
            .comunidad-page {
              padding: 24px;
              max-width: 1200px;
              margin: 0 auto;
            }

            /* Hero Section */
            .hero {
              position: relative;
              margin-bottom: 32px;
              border-radius: 16px;
              overflow: hidden;
              height: 200px;
              display: flex;
              align-items: center;
              padding: 0 48px;
              background: linear-gradient(135deg, var(--bg-card), var(--bg-input));
            }
            .hero::before {
              content: '';
              position: absolute;
              inset: 0;
              background: radial-gradient(circle at 80% 50%, var(--color-prosper-green) 0%, transparent 60%);
              opacity: 0.1;
            }
            .hero-content {
              position: relative;
              z-index: 1;
              max-width: 600px;
            }
            .hero-welcome {
              font-size: 0.625rem;
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
              line-height: 1.1;
            }
            .hero-title span {
              background: linear-gradient(90deg, var(--color-prosper-green), var(--color-pine-400));
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .hero-desc {
              font-size: 0.875rem;
              color: var(--text-secondary);
              margin: 0;
            }

            /* Grid Layout */
            .grid-layout {
              display: grid;
              grid-template-columns: 1fr;
              gap: 24px;
            }
            @media (min-width: 1024px) {
              .grid-layout {
                grid-template-columns: 2fr 1fr;
              }
            }

            /* Main Column */
            .main-column {
              display: flex;
              flex-direction: column;
              gap: 24px;
            }

            /* Foros Section */
            .foros-card {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 24px;
              border: 1px solid var(--border-default);
            }
            .foros-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
            }
            .foros-title {
              font-size: 1.125rem;
              font-weight: 800;
              color: var(--text-primary);
              display: flex;
              align-items: center;
              gap: 8px;
              margin: 0;
            }
            .foros-title-icon {
              color: var(--color-prosper-green);
            }
            .foros-link {
              font-size: 0.75rem;
              font-weight: 600;
              color: var(--color-prosper-green);
              text-decoration: none;
              cursor: pointer;
            }
            .foros-link:hover {
              text-decoration: underline;
            }
            .foros-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 12px;
            }
            @media (min-width: 640px) {
              .foros-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            .foro-card {
              background: var(--bg-input);
              border-radius: 8px;
              padding: 16px;
              transition: all 0.2s;
              cursor: pointer;
            }
            .foro-card:hover {
              background: var(--bg-card-high);
            }
            .foro-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 12px;
            }
            .foro-tag {
              font-size: 0.5625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              padding: 2px 8px;
              border-radius: 9999px;
              background: rgba(61, 204, 142, 0.1);
              color: var(--color-prosper-green);
            }
            .foro-avatars {
              display: flex;
              align-items: center;
            }
            .foro-avatar {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: var(--bg-accent-soft);
              border: 2px solid var(--bg-input);
              margin-left: -6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.4375rem;
              font-weight: 700;
              color: var(--text-secondary);
            }
            .foro-avatar:first-child {
              margin-left: 0;
            }
            .foro-name {
              font-size: 0.875rem;
              font-weight: 700;
              color: var(--text-primary);
              margin: 0 0 4px 0;
              transition: color 0.2s;
            }
            .foro-card:hover .foro-name {
              color: var(--color-prosper-green);
            }
            .foro-desc {
              font-size: 0.75rem;
              color: var(--text-secondary);
              margin: 0 0 12px 0;
              line-height: 1.4;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            .foro-stats {
              display: flex;
              gap: 12px;
              font-size: 0.625rem;
              color: var(--text-tertiary);
            }
            .foro-stat {
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .foro-add {
              border: 2px dashed var(--border-default);
              border-radius: 8px;
              padding: 16px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              cursor: pointer;
              transition: all 0.2s;
              min-height: 140px;
            }
            .foro-add:hover {
              border-color: var(--color-prosper-green);
            }
            .foro-add-icon {
              font-size: 1.5rem;
              color: var(--text-tertiary);
              margin-bottom: 8px;
            }
            .foro-add:hover .foro-add-icon {
              color: var(--color-prosper-green);
            }
            .foro-add-text {
              font-size: 0.6875rem;
              font-weight: 700;
              color: var(--text-secondary);
            }

            /* Recursos Section */
            .recursos-card {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 24px;
              border: 1px solid var(--border-default);
            }
            .recursos-title {
              font-size: 1.125rem;
              font-weight: 800;
              color: var(--text-primary);
              display: flex;
              align-items: center;
              gap: 8px;
              margin: 0 0 20px 0;
            }
            .recursos-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 12px;
            }
            @media (min-width: 640px) {
              .recursos-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            .recurso-item {
              background: var(--bg-input);
              border-radius: 8px;
              padding: 12px;
              display: flex;
              align-items: center;
              gap: 12px;
              transition: all 0.2s;
              cursor: pointer;
            }
            .recurso-item:hover {
              box-shadow: var(--shadow-md);
            }
            .recurso-icon {
              width: 40px;
              height: 40px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1rem;
              flex-shrink: 0;
            }
            .recurso-info {
              flex: 1;
              min-width: 0;
            }
            .recurso-name {
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--text-primary);
              margin: 0;
            }
            .recurso-type {
              font-size: 0.5rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
              margin: 0;
            }
            .recurso-download {
              background: none;
              border: none;
              color: var(--text-tertiary);
              cursor: pointer;
              font-size: 1rem;
              padding: 4px;
              transition: color 0.2s;
            }
            .recurso-download:hover {
              color: var(--color-prosper-green);
            }

            /* Sidebar */
            .sidebar {
              display: flex;
              flex-direction: column;
              gap: 24px;
            }

            /* Leaderboard */
            .leaderboard-card {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 20px;
              border: 1px solid var(--border-default);
            }
            .leaderboard-title {
              font-size: 0.875rem;
              font-weight: 800;
              color: var(--text-primary);
              display: flex;
              align-items: center;
              gap: 8px;
              margin: 0 0 16px 0;
            }
            .leader-item {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px;
              border-radius: 8px;
              margin-bottom: 8px;
              transition: background 0.2s;
            }
            .leader-item:hover {
              background: var(--bg-input);
            }
            .leader-item:first-child {
              border-left: 3px solid var(--color-prosper-green);
              background: var(--bg-accent-soft);
            }
            .leader-avatar-wrap {
              position: relative;
              flex-shrink: 0;
            }
            .leader-avatar {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: linear-gradient(135deg, var(--color-prosper-green), var(--color-prosper-navy));
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 0.75rem;
              font-weight: 700;
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
            .leader-item:not(:first-child) .leader-rank {
              background: var(--bg-card-high);
              color: var(--text-primary);
            }
            .leader-info {
              flex: 1;
              min-width: 0;
            }
            .leader-name {
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--text-primary);
              margin: 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .leader-goals {
              font-size: 0.5625rem;
              color: var(--text-tertiary);
              margin: 0;
            }
            .leader-points {
              text-align: right;
              flex-shrink: 0;
            }
            .leader-points-value {
              font-size: 0.6875rem;
              font-weight: 900;
              color: var(--color-prosper-green);
              margin: 0;
            }
            .leader-item:not(:first-child) .leader-points-value {
              color: var(--text-primary);
            }
            .leader-points-label {
              font-size: 0.4375rem;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              font-weight: 700;
              color: var(--text-tertiary);
              margin: 0;
            }
            .leaderboard-btn {
              width: 100%;
              padding: 8px;
              border: 1px solid var(--border-default);
              background: none;
              border-radius: 8px;
              font-size: 0.5625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-secondary);
              cursor: pointer;
              transition: all 0.2s;
              margin-top: 8px;
            }
            .leaderboard-btn:hover {
              background: var(--bg-card-high);
            }

            /* Events */
            .events-card {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 20px;
              border: 1px solid var(--border-default);
            }
            .events-title {
              font-size: 0.875rem;
              font-weight: 800;
              color: var(--text-primary);
              display: flex;
              align-items: center;
              gap: 8px;
              margin: 0 0 16px 0;
            }
            .event-item {
              position: relative;
              padding-left: 20px;
              border-left: 2px solid var(--border-default);
              padding-bottom: 16px;
            }
            .event-item:last-child {
              padding-bottom: 0;
            }
            .event-item.active {
              border-left-color: var(--color-prosper-green);
            }
            .event-dot {
              position: absolute;
              left: -7px;
              top: 4px;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: var(--border-default);
            }
            .event-item.active .event-dot {
              background: var(--color-prosper-green);
            }
            .event-date {
              font-size: 0.5625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: var(--text-tertiary);
              margin: 0 0 4px 0;
            }
            .event-item.active .event-date {
              color: var(--color-prosper-green);
            }
            .event-name {
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--text-primary);
              margin: 0 0 2px 0;
            }
            .event-speaker {
              font-size: 0.625rem;
              color: var(--text-secondary);
              margin: 0;
            }
            .event-rsvp {
              margin-top: 6px;
              background: none;
              border: none;
              font-size: 0.625rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 4px;
              padding: 0;
            }
            .event-rsvp:hover {
              opacity: 0.8;
            }

            /* Responsive */
            @media (max-width: 1024px) {
              .grid-layout {
                grid-template-columns: 1fr;
              }
            }
            @media (max-width: 768px) {
              .comunidad-page {
                padding: 16px;
              }
              .hero {
                height: auto;
                padding: 24px;
              }
              .hero-title {
                font-size: 1.5rem;
              }
              .hero-desc {
                font-size: 0.8125rem;
              }
              .foros-grid {
                grid-template-columns: 1fr;
              }
              .recursos-grid {
                grid-template-columns: 1fr;
              }
              .leaderboard-card {
                padding: 16px;
              }
              .events-card {
                padding: 16px;
              }
            }
            @media (max-width: 480px) {
              .comunidad-page {
                padding: 12px;
              }
              .hero {
                padding: 16px;
                border-radius: 12px;
              }
              .hero-title {
                font-size: 1.25rem;
              }
              .hero-welcome {
                font-size: 0.5625rem;
              }
              .foros-card, .recursos-card {
                padding: 16px;
              }
              .foro-card {
                padding: 12px;
              }
              .foro-name {
                font-size: 0.8125rem;
              }
              .foro-desc {
                font-size: 0.6875rem;
              }
              .leader-item {
                padding: 8px;
                gap: 8px;
              }
              .leader-avatar {
                width: 32px;
                height: 32px;
                font-size: 0.6875rem;
              }
              .leader-name {
                font-size: 0.6875rem;
              }
              .leader-goals {
                font-size: 0.5rem;
              }
              .leader-points-value {
                font-size: 0.625rem;
              }
            }
          `}</style>

          {/* Hero Section */}
          <div className="hero">
            <div className="hero-content">
              <p className="hero-welcome">Bienvenido de nuevo</p>
              <h1 className="hero-title">
                Comunidad Prosper: <span>El Capital del Conocimiento</span>
              </h1>
              <p className="hero-desc">Conéctate, aprende y crece junto a la élite de los arquitectos digitales.</p>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid-layout">
            {/* Main Column */}
            <div className="main-column">
              {/* Foros de Discusión */}
              <div className="foros-card">
                <div className="foros-header">
                  <h2 className="foros-title">
                    <span className="foros-title-icon">💬</span>
                    Foros de Discusión
                  </h2>
                  <a className="foros-link">Ver todos</a>
                </div>
                <div className="foros-grid">
                  {FORUMS.map((foro) => (
                    <div key={foro.id} className="foro-card">
                      <div className="foro-top">
                        <span className="foro-tag" style={{ background: `${foro.tagColor}20`, color: foro.tagColor }}>
                          {foro.tag}
                        </span>
                        <div className="foro-avatars">
                          {Array.from({ length: Math.min(foro.avatars, 2) }).map((_, i) => (
                            <div key={i} className="foro-avatar">{String.fromCharCode(65 + i)}</div>
                          ))}
                          {foro.avatars > 2 && (
                            <div className="foro-avatar">+{foro.avatars - 2}</div>
                          )}
                        </div>
                      </div>
                      <h3 className="foro-name">{foro.title}</h3>
                      <p className="foro-desc">{foro.description}</p>
                      <div className="foro-stats">
                        <span className="foro-stat">💬 {foro.messages} mensajes</span>
                        <span className="foro-stat">👥 {foro.members} activos</span>
                      </div>
                    </div>
                  ))}
                  <div className="foro-add">
                    <div className="foro-add-icon">➕</div>
                    <p className="foro-add-text">Proponer nuevo tema</p>
                  </div>
                </div>
              </div>

              {/* Recursos de la Comunidad */}
              <div className="recursos-card">
                <h2 className="recursos-title">📥 Recursos de la Comunidad</h2>
                <div className="recursos-grid">
                  {RESOURCES.map((recurso) => (
                    <div key={recurso.id} className="recurso-item">
                      <div className="recurso-icon" style={{ background: `${recurso.color}20` }}>
                        {recurso.icon}
                      </div>
                      <div className="recurso-info">
                        <p className="recurso-name">{recurso.title}</p>
                        <p className="recurso-type">{recurso.type}</p>
                      </div>
                      <button className="recurso-download" title="Descargar">⬇️</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="sidebar">
              {/* Tablero de Líderes */}
              <div className="leaderboard-card">
                <h2 className="leaderboard-title">🏆 Tablero de Líderes</h2>
                {LEADERS.map((leader) => (
                  <div key={leader.rank} className="leader-item">
                    <div className="leader-avatar-wrap">
                      <div className="leader-avatar">{leader.name.charAt(0)}</div>
                      <div className="leader-rank">{leader.rank}</div>
                    </div>
                    <div className="leader-info">
                      <p className="leader-name">{leader.name}</p>
                      <p className="leader-goals">{leader.goals} Metas Cumplidas</p>
                    </div>
                    <div className="leader-points">
                      <p className="leader-points-value">{leader.points.toLocaleString()}</p>
                      <p className="leader-points-label">Puntos</p>
                    </div>
                  </div>
                ))}
                <button className="leaderboard-btn">Ver Ranking Completo</button>
              </div>

              {/* Próximos Eventos */}
              <div className="events-card">
                <h2 className="events-title">📅 Próximos Eventos</h2>
                {EVENTS.map((event) => (
                  <div key={event.id} className={`event-item ${event.active ? 'active' : ''}`}>
                    <div className="event-dot" />
                    <p className="event-date">{event.date}</p>
                    <h4 className="event-name">{event.title}</h4>
                    <p className="event-speaker">{event.speaker}</p>
                    {event.active && (
                      <button className="event-rsvp">
                        Reservar lugar →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
