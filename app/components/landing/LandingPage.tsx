'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AnimatedSection } from '../AnimatedSection';
import { LandingHeader } from './LandingHeader';
import { HeroMockup } from './HeroMockup';
import { TrustBar } from './TrustBar';
import { FeatureCard } from './FeatureCard';
import { TutorialTabs } from './TutorialTabs';
import { Testimonials } from './TestimonialCard';
import { FaqAccordion } from './FaqAccordion';
import { Footer } from './Footer';

const FEATURES = [
  {
    icon: '📊',
    title: 'Gestión de Cuentas Multi-moneda',
    description: 'Administra todas tus cuentas en un solo lugar. Soporta monedas fiduciarias y criptomonedas con conversión automática.',
    features: ['Cuentas multi-moneda independientes', 'Transferencias con conversión automática', 'Historial completo de transacciones'],
    visual: (
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
        <div className="feature-account-card" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
          <span className="feature-account-icon">💎</span>
          <span className="feature-account-name">USDT</span>
          <span className="feature-account-balance">₮850</span>
        </div>
      </div>
    ),
    large: true,
    delay: 0,
  },
  {
    icon: '🎯',
    title: 'Planes Financieros',
    description: 'Crea planes de ahorro, gastos planificados y pagos recurrentes. Sigue tu progreso visualmente.',
    features: ['Metas con fecha límite', 'Pagos recurrentes automáticos', 'Compartir gastos con otros'],
    delay: 100,
  },
  {
    icon: '📈',
    title: 'Análisis Visual',
    description: 'Gráficos interactivos que muestran tus ingresos, gastos y ahorro por período.',
    features: ['Gráficas por día, semana, mes o año', 'Conversión entre monedas al instante', 'Resumen financiero detallado'],
    delay: 200,
  },
  {
    icon: '⚡',
    title: 'Tasas en Tiempo Real',
    description: 'Tasas BCV oficial para monedas fiduciarias y P2P Binance para criptomonedas.',
    features: ['BCV, EUR, COP actualizados', 'P2P para USDT, SOL, BTC, USDC', 'Modo oficial vs P2P por cuenta'],
    delay: 300,
  },
  {
    icon: '📅',
    title: 'Calendario Inteligente',
    description: 'Organiza recordatorios, fechas de pago y vencimientos de tus planes financieros.',
    features: ['Recordatorios personalizables', 'Integración con transacciones', 'Alertas de vencimiento'],
    delay: 400,
  },
  {
    icon: '🎓',
    title: 'Academia Financiera',
    description: 'Cursos prácticos para mejorar tu educación financiera desde cero hasta avanzado.',
    features: ['Cursos con progreso guardado', 'Contenido práctico y aplicable', 'Aprende a tu ritmo'],
    delay: 500,
  },
  {
    icon: '📸',
    title: 'VEPay OCR',
    description: 'Captura comprobantes bancarios venezolanos y extrae datos automáticamente.',
    features: ['20+ bancos soportados', 'Extracción de monto, ref. y fecha', 'Procesamiento en lote'],
    delay: 600,
  },
  {
    icon: '🤝',
    title: 'Compartir Gastos',
    description: 'Divide gastos con amigos, familia o compañeros de trabajo directamente en la app.',
    features: ['Invitaciones por email', 'Solicitudes de pago', 'Notificaciones en tiempo real'],
    delay: 700,
  },
];

export function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="landing-page">
      {/* Floating Background */}
      <div className="landing-bg">
        <div className="landing-blob landing-blob-1" />
        <div className="landing-blob landing-blob-2" />
        <div className="landing-blob landing-blob-3" />
        <div className="landing-blob landing-blob-4" />
      </div>

      <LandingHeader user={user} />

      <main>
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-hero-content">
            <AnimatedSection animationType="fade-up" delay={0}>
              <div className="landing-badge">
                <span className="landing-badge-dot" />
                {user ? 'Ya estás registrado' : '100% Gratis · Sin anuncios · Multi-moneda'}
              </div>
            </AnimatedSection>

            <AnimatedSection animationType="fade-up" delay={100}>
              <h1 className="landing-hero-title">
                Toma el control de tu
                <span className="landing-gradient-text"> futuro financiero</span>
              </h1>
            </AnimatedSection>

            <AnimatedSection animationType="fade-up" delay={200}>
              <p className="landing-hero-subtitle">
                {user
                  ? 'Bienvenido de vuelta. Explora las novedades de Prosper o vuelve a tu dashboard.'
                  : 'Gestiona cuentas en múltiples monedas, crea planes de ahorro, analiza tus gastos, importa comprobantes con OCR y aprende finanzas personales. Todo en un solo lugar.'}
              </p>
            </AnimatedSection>

            <AnimatedSection animationType="fade-up" delay={300}>
              <div className="landing-hero-cta">
                {user ? (
                  <button className="btn btn-primary btn-xl" onClick={() => router.push('/')}>
                    Ir al Dashboard
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                ) : (
                  <>
                    <button className="btn btn-primary btn-xl" onClick={() => router.push('/register')}>
                      Crear Cuenta Gratis
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                    <button className="btn btn-outline btn-xl" onClick={() => router.push('/login')}>
                      Ya tengo cuenta
                    </button>
                  </>
                )}
              </div>
            </AnimatedSection>

            <AnimatedSection animationType="fade-up" delay={400}>
              <div className="landing-hero-stats">
                <div className="hero-stat">
                  <span className="hero-stat-value">Multi-moneda</span>
                  <span className="hero-stat-label">8 monedas</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value">Tiempo real</span>
                  <span className="hero-stat-label">Tasas actualizadas</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value">Privado</span>
                  <span className="hero-stat-label">Solo tú lo ves</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value">Seguro</span>
                  <span className="hero-stat-label">Auth por Firebase</span>
                </div>
              </div>
            </AnimatedSection>
          </div>

          <AnimatedSection animationType="fade-up" delay={500} className="landing-hero-visual">
            <HeroMockup />
          </AnimatedSection>
        </section>

        {/* Trust Bar */}
        <TrustBar />

        {/* Features Section */}
        <section id="features" className="landing-features-section">
          <AnimatedSection animationType="fade-up" delay={0}>
            <div className="section-header">
              <span className="section-tag">Funciones</span>
              <h2 className="section-title">Todo lo que necesitas para crecer financieramente</h2>
              <p className="section-desc">Herramientas poderosas diseñadas para simplificar tu vida financiera.</p>
            </div>
          </AnimatedSection>

          <div className="features-grid features-grid-3">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* Tutorials */}
        <TutorialTabs />

        {/* How It Works */}
        <section id="how-it-works" className="landing-how-section">
          <AnimatedSection animationType="fade-up" delay={0}>
            <div className="section-header">
              <span className="section-tag">Cómo Funciona</span>
              <h2 className="section-title">Empieza en 3 simples pasos</h2>
              <p className="section-desc">Sin configuraciones complicadas. Regístrate y comienza en segundos.</p>
            </div>
          </AnimatedSection>

          <div className="steps-container">
            <AnimatedSection animationType="fade-up" delay={0}>
              <div className="step-card">
                <div className="step-number">1</div>
                <h3>Crea tu cuenta</h3>
                <p>Regístrate gratis con Google o email. Elige tu moneda preferida.</p>
                <div className="step-visual">
                  <div className="step-icon-step">🚀</div>
                </div>
              </div>
            </AnimatedSection>

            <div className="step-connector" />

            <AnimatedSection animationType="fade-up" delay={200}>
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

            <AnimatedSection animationType="fade-up" delay={400}>
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

        {/* Testimonials */}
        <Testimonials />

        {/* FAQ */}
        <FaqAccordion />

        {/* CTA Section */}
        <section className="landing-cta-section">
          <AnimatedSection animationType="fade-up" delay={0}>
            <div className="cta-card">
              <div className="cta-bg-shapes">
                <div className="cta-shape cta-shape-1" />
                <div className="cta-shape cta-shape-2" />
              </div>
              <div className="cta-content">
                <h2>¿Listo para tomar el control?</h2>
                <p>Únete a Prosper Pro y comienza a construir tu libertad financiera hoy mismo.</p>
                <div className="cta-buttons">
                  {user ? (
                    <button className="btn btn-white btn-xl" onClick={() => router.push('/')}>
                      Ir al Dashboard
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                  ) : (
                    <button className="btn btn-white btn-xl" onClick={() => router.push('/register')}>
                      Comenzar Gratis
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                  )}
                </div>
                <p className="cta-note">{user ? 'Ya tienes una cuenta activa' : 'Sin tarjeta de crédito · Sin compromisos · 100% gratis'}</p>
              </div>
            </div>
          </AnimatedSection>
        </section>
      </main>

      <Footer user={user} />
    </div>
  );
}
