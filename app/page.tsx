'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      }
      // Si no hay usuario, se queda en la landing page
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="landing-loading">
        <div className="landing-spinner" />
        <p>Cargando Prosper Pro...</p>
      </div>
    );
  }

  // Landing page para usuarios no autenticados
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-logo">
          <span className="landing-logo-text">Prosper<span className="landing-logo-dot">.</span></span>
        </div>
        <nav className="landing-nav">
          <button className="btn btn-ghost" onClick={() => router.push('/login')}>Iniciar Sesión</button>
          <button className="btn btn-primary" onClick={() => router.push('/register')}>Comenzar Gratis</button>
        </nav>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <h1 className="landing-hero-title">
            Tu Camino a la <span className="landing-highlight">Libertad Financiera</span>
          </h1>
          <p className="landing-hero-subtitle">
            Gestiona tus metas de ahorro, inversión y aprendizaje financiero en un solo lugar.
          </p>
          <div className="landing-cta">
            <button className="btn btn-primary btn-lg" onClick={() => router.push('/register')}>
              Comienza Ahora — Es Gratis
            </button>
          </div>
        </section>

        <section className="landing-features">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🎯</div>
            <h3>Planes Financieros</h3>
            <p>Crea y sigue tus metas de ahorro, gastos y pagos recurrentes.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">📊</div>
            <h3>Gestión Contable</h3>
            <p>Controla tus cuentas, transacciones y balances en tiempo real.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">📚</div>
            <h3>Academia Financiera</h3>
            <p>Aprende con cursos diseñados para mejorar tu educación financiera.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">📅</div>
            <h3>Calendario Inteligente</h3>
            <p>Organiza tus recordatorios y fechas límite de pago.</p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>© 2026 Prosper Pro. Todos los derechos reservados.</p>
      </footer>

      <style>{`
        .landing-loading {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: var(--bg-primary);
        }
        .landing-spinner {
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
        .landing-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
        }
        .landing-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          border-bottom: 1px solid var(--border-default);
        }
        .landing-logo-text {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
        }
        .landing-logo-dot {
          color: var(--color-prosper-green);
        }
        .landing-nav {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .btn-ghost {
          background: transparent;
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .btn-ghost:hover {
          border-color: var(--color-prosper-green);
          color: var(--color-prosper-green);
        }
        .landing-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 40px;
          text-align: center;
        }
        .landing-hero {
          max-width: 800px;
          margin-bottom: 80px;
        }
        .landing-hero-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 24px 0;
          line-height: 1.2;
        }
        .landing-highlight {
          background: linear-gradient(135deg, var(--color-prosper-green), #2BA87A);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .landing-hero-subtitle {
          font-size: clamp(1rem, 2vw, 1.25rem);
          color: var(--text-secondary);
          margin: 0 0 40px 0;
          line-height: 1.6;
        }
        .landing-cta {
          display: flex;
          justify-content: center;
        }
        .btn-lg {
          padding: 16px 32px;
          font-size: 1.125rem;
        }
        .landing-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
          max-width: 1200px;
          width: 100%;
        }
        .landing-feature-card {
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 32px 24px;
          text-align: center;
          transition: all var(--transition-fast);
        }
        .landing-feature-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-prosper-green);
        }
        .landing-feature-icon {
          font-size: 2.5rem;
          margin-bottom: 16px;
        }
        .landing-feature-card h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }
        .landing-feature-card p {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }
        .landing-footer {
          padding: 24px 40px;
          text-align: center;
          border-top: 1px solid var(--border-default);
          color: var(--text-tertiary);
          font-size: 0.875rem;
        }
        @media (max-width: 768px) {
          .landing-header {
            padding: 16px 20px;
            flex-direction: column;
            gap: 16px;
          }
          .landing-main {
            padding: 40px 20px;
          }
          .landing-hero {
            margin-bottom: 40px;
          }
          .landing-features {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 480px) {
          .landing-nav {
            width: 100%;
            flex-direction: column;
          }
          .landing-nav .btn {
            width: 100%;
          }
          .btn-lg {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
