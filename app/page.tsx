'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { UpdateModal } from '@/app/components/UpdateModal';
import { Dashboard } from '@/app/components/Dashboard';
import './landing.css';

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={`lp-reveal ${visible ? 'visible' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading) {
    return (
      <div className="lp-loading">
        <div className="lp-spinner" />
        <p>Cargando Prosper Pro...</p>
      </div>
    );
  }

  if (user) {
    return (
      <>
        <UpdateModal />
        <Dashboard />
      </>
    );
  }

  return (
    <div className="lp-page">
      <div className="lp-bg-glow" aria-hidden="true">
        <div className="lp-glow lp-glow-1" />
        <div className="lp-glow lp-glow-2" />
        <div className="lp-glow lp-glow-3" />
      </div>

      <header className={`lp-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-header-inner">
          <a href="/" className="lp-logo">
            <img src="/logo-icon.png" alt="Prosper" width={36} height={36} />
            <span className="lp-logo-text">Prosper<span className="lp-logo-dot">.</span></span>
          </a>
          <nav className="lp-nav">
            <a href="#features" className="lp-nav-link">Funciones</a>
            <a href="#como-funciona" className="lp-nav-link">Cómo Funciona</a>
            <button className="lp-btn lp-btn-ghost" onClick={() => router.push('/login')}>Iniciar Sesión</button>
            <button className="lp-btn lp-btn-primary" onClick={() => router.push('/register')}>Comenzar Gratis</button>
          </nav>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-content">
            <Reveal>
              <div className="lp-badge">
                <span className="lp-badge-dot" />
                100% Gratis · Sin anuncios
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="lp-hero-title">
                Toma el control de tu<span className="lp-gradient-text"> futuro financiero</span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="lp-hero-subtitle">
                Gestiona cuentas, crea planes de ahorro, analiza tus gastos y aprende finanzas personales. Todo en un solo lugar, sin complicaciones.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="lp-hero-cta">
                <button className="lp-btn lp-btn-primary lp-btn-xl" onClick={() => router.push('/register')}>
                  Crear Cuenta Gratis →
                </button>
                <button className="lp-btn lp-btn-outline lp-btn-xl" onClick={() => router.push('/login')}>
                  Ya tengo cuenta
                </button>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <div className="lp-hero-stats">
                <div className="lp-stat">
                  <span className="lp-stat-value">Multi-moneda</span>
                  <span className="lp-stat-label">USD y BS</span>
                </div>
                <div className="lp-stat-divider" />
                <div className="lp-stat">
                  <span className="lp-stat-value">Tiempo real</span>
                  <span className="lp-stat-label">Datos sincronizados</span>
                </div>
                <div className="lp-stat-divider" />
                <div className="lp-stat">
                  <span className="lp-stat-value">Privado</span>
                  <span className="lp-stat-label">Solo tú lo ves</span>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={500} className="lp-hero-visual">
            <div className="lp-mockup">
              <div className="lp-mockup-header">
                <div className="lp-mockup-dots"><span /><span /><span /></div>
                <span className="lp-mockup-title">Prosper Dashboard</span>
              </div>
              <div className="lp-mockup-body">
                <div className="lp-mockup-stats">
                  <div className="lp-mockup-stat green">
                    <span className="lp-mockup-stat-label">Ingresos</span>
                    <span className="lp-mockup-stat-value">$2,450</span>
                  </div>
                  <div className="lp-mockup-stat red">
                    <span className="lp-mockup-stat-label">Gastos</span>
                    <span className="lp-mockup-stat-value">$1,280</span>
                  </div>
                  <div className="lp-mockup-stat blue">
                    <span className="lp-mockup-stat-label">Ahorro</span>
                    <span className="lp-mockup-stat-value">$620</span>
                  </div>
                </div>
                <div className="lp-mockup-chart">
                  <div className="lp-mockup-bar" style={{ height: '60%' }} />
                  <div className="lp-mockup-bar" style={{ height: '80%' }} />
                  <div className="lp-mockup-bar" style={{ height: '45%' }} />
                  <div className="lp-mockup-bar" style={{ height: '90%' }} />
                  <div className="lp-mockup-bar" style={{ height: '70%' }} />
                  <div className="lp-mockup-bar" style={{ height: '95%' }} />
                  <div className="lp-mockup-bar" style={{ height: '55%' }} />
                </div>
                <div className="lp-mockup-goals">
                  <div className="lp-mockup-goal">
                    <span>Fondo de Emergencia</span>
                    <div className="lp-mockup-goal-bar"><div className="lp-mockup-goal-fill" style={{ width: '72%' }} /></div>
                  </div>
                  <div className="lp-mockup-goal">
                    <span>Vacaciones</span>
                    <div className="lp-mockup-goal-bar"><div className="lp-mockup-goal-fill" style={{ width: '45%' }} /></div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="features" className="lp-section">
          <Reveal>
            <div className="lp-section-header">
              <span className="lp-section-tag">Funciones</span>
              <h2 className="lp-section-title">Todo lo que necesitas para crecer financieramente</h2>
              <p className="lp-section-desc">Herramientas poderosas diseñadas para simplificar tu vida financiera.</p>
            </div>
          </Reveal>

          <div className="lp-features-grid">
            <Reveal delay={0}>
              <div className="lp-feature-card large">
                <div className="lp-feature-visual">
                  <div className="lp-feature-account" style={{ background: 'linear-gradient(135deg, #3DCC8E, #2BA87A)' }}>
                    <span className="lp-feature-account-icon">💰</span>
                    <span className="lp-feature-account-name">Ahorro</span>
                    <span className="lp-feature-account-balance">$1,240</span>
                  </div>
                  <div className="lp-feature-account" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                    <span className="lp-feature-account-icon">🏦</span>
                    <span className="lp-feature-account-name">Corriente</span>
                    <span className="lp-feature-account-balance">$3,580</span>
                  </div>
                </div>
                <div>
                  <div className="lp-feature-icon-wrap"><span className="lp-feature-icon">📊</span></div>
                  <h3>Gestión de Cuentas</h3>
                  <p>Administra múltiples cuentas en USD y BS. Balances en tiempo real, transacciones vinculadas y conversión automática con tasa BCV oficial.</p>
                  <ul className="lp-feature-list">
                    <li>Cuentas multi-moneda independientes</li>
                    <li>Transferencias con conversión automática</li>
                    <li>Historial de transacciones completo</li>
                  </ul>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="lp-feature-card">
                <div className="lp-feature-icon-wrap"><span className="lp-feature-icon">🎯</span></div>
                <h3>Planes Financieros</h3>
                <p>Crea planes de ahorro, gastos planificados y pagos recurrentes. Sigue tu progreso visualmente.</p>
                <ul className="lp-feature-list">
                  <li>Metas con fecha límite</li>
                  <li>Pagos recurrentes automáticos</li>
                  <li>Compartir gastos con otros</li>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="lp-feature-card">
                <div className="lp-feature-icon-wrap"><span className="lp-feature-icon">📈</span></div>
                <h3>Análisis Visual</h3>
                <p>Gráficos interactivos que muestran tus ingresos, gastos y ahorro por período.</p>
                <ul className="lp-feature-list">
                  <li>Gráficas por día, semana, mes o año</li>
                  <li>Conversión entre monedas al instante</li>
                  <li>Resumen financiero detallado</li>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div className="lp-feature-card">
                <div className="lp-feature-icon-wrap"><span className="lp-feature-icon">🎓</span></div>
                <h3>Academia Financiera</h3>
                <p>Cursos prácticos para mejorar tu educación financiera desde cero hasta avanzado.</p>
                <ul className="lp-feature-list">
                  <li>Cursos con progreso guardado</li>
                  <li>Contenido práctico y aplicable</li>
                  <li>Aprende a tu ritmo</li>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <div className="lp-feature-card">
                <div className="lp-feature-icon-wrap"><span className="lp-feature-icon">📅</span></div>
                <h3>Calendario Inteligente</h3>
                <p>Organiza recordatorios, fechas de pago y vencimientos de tus planes financieros.</p>
                <ul className="lp-feature-list">
                  <li>Recordatorios personalizables</li>
                  <li>Integración con transacciones</li>
                  <li>Alertas de vencimiento</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="como-funciona" className="lp-section">
          <Reveal>
            <div className="lp-section-header">
              <span className="lp-section-tag">Cómo Funciona</span>
              <h2 className="lp-section-title">Empieza en 3 simples pasos</h2>
              <p className="lp-section-desc">Sin configuraciones complicadas. Regístrate y comienza en segundos.</p>
            </div>
          </Reveal>

          <div className="lp-steps">
            <Reveal delay={0}>
              <div className="lp-step">
                <div className="lp-step-num">1</div>
                <h3>Crea tu cuenta</h3>
                <p>Regístrate gratis con Google o email. Elige tu moneda preferida (USD o BS).</p>
                <span className="lp-step-icon">🚀</span>
              </div>
            </Reveal>
            <div className="lp-step-connector" />
            <Reveal delay={200}>
              <div className="lp-step">
                <div className="lp-step-num">2</div>
                <h3>Agrega tus cuentas</h3>
                <p>Crea tus cuentas financieras, registra ingresos y gastos. Todo se sincroniza al instante.</p>
                <span className="lp-step-icon">💳</span>
              </div>
            </Reveal>
            <div className="lp-step-connector" />
            <Reveal delay={400}>
              <div className="lp-step">
                <div className="lp-step-num">3</div>
                <h3>Alcanza tus metas</h3>
                <p>Crea planes de ahorro, sigue tu progreso y visualiza tu crecimiento financiero.</p>
                <span className="lp-step-icon">🎯</span>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="lp-cta-section">
          <Reveal>
            <div className="lp-cta-card">
              <div className="lp-cta-shapes" aria-hidden="true">
                <div className="lp-cta-shape lp-cta-shape-1" />
                <div className="lp-cta-shape lp-cta-shape-2" />
              </div>
              <div className="lp-cta-content">
                <h2>¿Listo para tomar el control?</h2>
                <p>Únete a Prosper Pro y comienza a construir tu libertad financiera hoy mismo.</p>
                <div className="lp-cta-buttons">
                  <button className="lp-btn lp-btn-xl" style={{ background: 'white', color: '#0a1628' }} onClick={() => router.push('/register')}>
                    Comenzar Gratis →
                  </button>
                </div>
                <p className="lp-cta-note">Sin tarjeta de crédito · Sin compromisos · 100% gratis</p>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-footer-logo">
              <img src="/logo-icon.png" alt="Prosper" width={28} height={28} />
              <span>Prosper<span className="lp-footer-dot">.</span></span>
            </div>
            <p>Tu plataforma de libertad financiera.</p>
          </div>
          <div className="lp-footer-links">
            <div className="lp-footer-col">
              <h4>Producto</h4>
              <a href="#features">Funciones</a>
              <a href="#como-funciona">Cómo Funciona</a>
            </div>
            <div className="lp-footer-col">
              <h4>Cuenta</h4>
              <button onClick={() => router.push('/login')}>Iniciar Sesión</button>
              <button onClick={() => router.push('/register')}>Registrarse</button>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>© 2026 Prosper Pro. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
