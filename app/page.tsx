'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import './landing.css';

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        obs.unobserve(el);
      }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isInView } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`animate-on-scroll ${isInView ? 'animate-visible' : ''} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading) {
    return (
      <div className="landing-loading">
        <div className="landing-spinner" />
        <p>Cargando Prosper Pro...</p>
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* Floating Background */}
      <div className="landing-bg">
        <div className="landing-blob landing-blob-1" />
        <div className="landing-blob landing-blob-2" />
        <div className="landing-blob landing-blob-3" />
        <div className="landing-blob landing-blob-4" />
      </div>

      {/* Header */}
      <header className={`landing-header ${scrollY > 50 ? 'scrolled' : ''}`}>
        <div className="landing-header-inner">
          <div className="landing-logo">
            <img src="/logo-icon.png" alt="Prosper" width={36} height={36} />
            <span className="landing-logo-text">Prosper<span className="landing-logo-dot">.</span></span>
          </div>
          <nav className="landing-nav">
            <a href="#features" className="nav-link">Funciones</a>
            <a href="#how-it-works" className="nav-link">Cómo Funciona</a>
            <button className="btn btn-ghost" onClick={() => router.push(user ? '/dashboard' : '/login')}>{user ? 'Ir al Dashboard' : 'Iniciar Sesión'}</button>
            <button className="btn btn-primary" onClick={() => router.push(user ? '/dashboard' : '/register')}>{user ? 'Ir al Dashboard' : 'Comenzar Gratis'}</button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-hero-content">
            <AnimatedSection>
              <div className="landing-badge">
                <span className="landing-badge-dot" />
                {user ? 'Ya estás registrado' : '100% Gratis · Sin anuncios'}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <h1 className="landing-hero-title">
                Toma el control de tu
                <span className="landing-gradient-text"> futuro financiero</span>
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <p className="landing-hero-subtitle">
                {user
                  ? 'Bienvenido de vuelta. Explora las novedades de Prosper o vuelve a tu dashboard.'
                  : 'Gestiona cuentas, crea planes de ahorro, analiza tus gastos y aprende finanzas personales. Todo en un solo lugar, sin complicaciones.'}
              </p>
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <div className="landing-hero-cta">
                <button className="btn btn-primary btn-xl" onClick={() => router.push(user ? '/dashboard' : '/register')}>
                  {user ? 'Ir al Dashboard' : 'Crear Cuenta Gratis'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
                <button className="btn btn-outline btn-xl" onClick={() => router.push(user ? '/dashboard' : '/login')}>
                  {user ? 'Ir al Dashboard' : 'Ya tengo cuenta'}
                </button>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={400}>
              <div className="landing-hero-stats">
                <div className="hero-stat">
                  <span className="hero-stat-value">Multi-moneda</span>
                  <span className="hero-stat-label">USD y BS</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value">Tiempo real</span>
                  <span className="hero-stat-label">Datos sincronizados</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value">Privado</span>
                  <span className="hero-stat-label">Solo tú lo ves</span>
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* Hero Visual */}
          <AnimatedSection delay={500} className="landing-hero-visual">
            <div className="hero-mockup">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span /><span /><span />
                </div>
                <span className="mockup-title">Prosper Dashboard</span>
              </div>
              <div className="mockup-body">
                <div className="mockup-stat-row">
                  <div className="mockup-stat mockup-stat-green">
                    <span className="mockup-stat-label">Ingresos</span>
                    <span className="mockup-stat-value">$2,450</span>
                  </div>
                  <div className="mockup-stat mockup-stat-red">
                    <span className="mockup-stat-label">Gastos</span>
                    <span className="mockup-stat-value">$1,280</span>
                  </div>
                  <div className="mockup-stat mockup-stat-blue">
                    <span className="mockup-stat-label">Ahorro</span>
                    <span className="mockup-stat-value">$620</span>
                  </div>
                </div>
                <div className="mockup-chart">
                  <div className="mockup-bar" style={{ height: '60%' }} />
                  <div className="mockup-bar" style={{ height: '80%' }} />
                  <div className="mockup-bar" style={{ height: '45%' }} />
                  <div className="mockup-bar" style={{ height: '90%' }} />
                  <div className="mockup-bar" style={{ height: '70%' }} />
                  <div className="mockup-bar" style={{ height: '95%' }} />
                  <div className="mockup-bar" style={{ height: '55%' }} />
                </div>
                <div className="mockup-goals">
                  <div className="mockup-goal">
                    <span>Fondo de Emergencia</span>
                    <div className="mockup-goal-bar"><div className="mockup-goal-fill" style={{ width: '72%' }} /></div>
                  </div>
                  <div className="mockup-goal">
                    <span>Vacaciones</span>
                    <div className="mockup-goal-bar"><div className="mockup-goal-fill" style={{ width: '45%' }} /></div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </section>

        {/* Features Section */}
        <section id="features" className="landing-features-section">
          <AnimatedSection>
            <div className="section-header">
              <span className="section-tag">Funciones</span>
              <h2 className="section-title">Todo lo que necesitas para crecer financieramente</h2>
              <p className="section-desc">Herramientas poderosas diseñadas para simplificar tu vida financiera.</p>
            </div>
          </AnimatedSection>

          <div className="features-grid">
            <AnimatedSection delay={0}>
              <div className="feature-card feature-card-large">
                <div className="feature-card-visual">
                  <div className="feature-visual-accounts">
                    <div className="feature-account-card" style={{ background: 'linear-gradient(135deg, #3DCC8E, #2BA87A)' }}>
                      <span className="feature-account-icon">💰</span>
                      <span className="feature-account-name">Ahorro</span>
                      <span className="feature-account-balance">$1,240</span>
                    </div>
                    <div className="feature-account-card" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                      <span className="feature-account-icon">🏦</span>
                      <span className="feature-account-name">Corriente</span>
                      <span className="feature-account-balance">$3,580</span>
                    </div>
                  </div>
                </div>
                <div className="feature-card-content">
                  <div className="feature-icon-wrapper">
                    <span className="feature-icon">📊</span>
                  </div>
                  <h3>Gestión de Cuentas</h3>
                  <p>Administra múltiples cuentas en USD y BS. Balances en tiempo real, transacciones vinculadas y conversión automática con tasa BCV oficial.</p>
                  <ul className="feature-list">
                    <li>Cuentas multi-moneda independientes</li>
                    <li>Transferencias con conversión automática</li>
                    <li>Historial de transacciones completo</li>
                  </ul>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">🎯</span>
                </div>
                <h3>Planes Financieros</h3>
                <p>Crea planes de ahorro, gastos planificados y pagos recurrentes. Sigue tu progreso visualmente.</p>
                <ul className="feature-list">
                  <li>Metas con fecha límite</li>
                  <li>Pagos recurrentes automáticos</li>
                  <li>Compartir gastos con otros</li>
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">📈</span>
                </div>
                <h3>Análisis Visual</h3>
                <p>Gráficos interactivos que muestran tus ingresos, gastos y ahorro por período.</p>
                <ul className="feature-list">
                  <li>Gráficas por día, semana, mes o año</li>
                  <li>Conversión entre monedas al instante</li>
                  <li>Resumen financiero detallado</li>
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">🎓</span>
                </div>
                <h3>Academia Financiera</h3>
                <p>Cursos prácticos para mejorar tu educación financiera desde cero hasta avanzado.</p>
                <ul className="feature-list">
                  <li>Cursos con progreso guardado</li>
                  <li>Contenido práctico y aplicable</li>
                  <li>Aprende a tu ritmo</li>
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={400}>
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">📅</span>
                </div>
                <h3>Calendario Inteligente</h3>
                <p>Organiza recordatorios, fechas de pago y vencimientos de tus planes financieros.</p>
                <ul className="feature-list">
                  <li>Recordatorios personalizables</li>
                  <li>Integración con transacciones</li>
                  <li>Alertas de vencimiento</li>
                </ul>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="landing-how-section">
          <AnimatedSection>
            <div className="section-header">
              <span className="section-tag">Cómo Funciona</span>
              <h2 className="section-title">Empieza en 3 simples pasos</h2>
              <p className="section-desc">Sin configuraciones complicadas. Regístrate y comienza en segundos.</p>
            </div>
          </AnimatedSection>

          <div className="steps-container">
            <AnimatedSection delay={0}>
              <div className="step-card">
                <div className="step-number">1</div>
                <h3>Crea tu cuenta</h3>
                <p>Regístrate gratis con Google o email. Elige tu moneda preferida (USD o BS).</p>
                <div className="step-visual">
                  <div className="step-icon-step">🚀</div>
                </div>
              </div>
            </AnimatedSection>

            <div className="step-connector" />

            <AnimatedSection delay={200}>
              <div className="step-card">
                <div className="step-number">2</div>
                <h3>Agrega tus cuentas</h3>
                <p>Crea tus cuentas financieras, registra ingresos y gastos. Todo se sincroniza al instante.</p>
                <div className="step-visual">
                  <div className="step-icon-step">💳</div>
                </div>
              </div>
            </AnimatedSection>

            <div className="step-connector" />

            <AnimatedSection delay={400}>
              <div className="step-card">
                <div className="step-number">3</div>
                <h3>Alcanza tus metas</h3>
                <p>Crea planes de ahorro, sigue tu progreso y visualiza tu crecimiento financiero.</p>
                <div className="step-visual">
                  <div className="step-icon-step">🎯</div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* CTA Section */}
        <section className="landing-cta-section">
          <AnimatedSection>
            <div className="cta-card">
              <div className="cta-bg-shapes">
                <div className="cta-shape cta-shape-1" />
                <div className="cta-shape cta-shape-2" />
              </div>
              <div className="cta-content">
                <h2>¿Listo para tomar el control?</h2>
                <p>Únete a Prosper Pro y comienza a construir tu libertad financiera hoy mismo.</p>
                <div className="cta-buttons">
                  <button className="btn btn-white btn-xl" onClick={() => router.push(user ? '/dashboard' : '/register')}>
                    {user ? 'Ir al Dashboard' : 'Comenzar Gratis'}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                </div>
                <p className="cta-note">{user ? 'Ya tienes una cuenta activa' : 'Sin tarjeta de crédito · Sin compromisos · 100% gratis'}</p>
              </div>
            </div>
          </AnimatedSection>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/logo-icon.png" alt="Prosper" width={28} height={28} />
              <span>Prosper<span className="footer-dot">.</span></span>
            </div>
            <p>Tu plataforma de libertad financiera.</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Producto</h4>
              <a href="#features">Funciones</a>
              <a href="#how-it-works">Cómo Funciona</a>
            </div>
            <div className="footer-col">
              <h4>Cuenta</h4>
              <button onClick={() => router.push(user ? '/dashboard' : '/login')}>{user ? 'Dashboard' : 'Iniciar Sesión'}</button>
              <button onClick={() => router.push(user ? '/dashboard' : '/register')}>{user ? 'Dashboard' : 'Registrarse'}</button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Prosper Pro. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
