'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/AuthContext';

import { AnimatedSection } from '../AnimatedSection';
import { LandingHeader } from './LandingHeader';
import { HeroMockup } from './HeroMockup';
import { TrustBar } from './TrustBar';
import { FeatureCard } from './FeatureCard';
import { ProductDemo } from './ProductDemo';
import { TutorialTabs } from './TutorialTabs';
import { InteractiveSteps } from './InteractiveSteps';
import { TestimonialCarousel } from './TestimonialCarousel';
import { SecuritySection } from './SecuritySection';
import { FaqAccordion } from './FaqAccordion';
import { Footer } from './Footer';

const FEATURE_VISUALS = [
  (
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
  (
    <div className="feature-visual-goals">
      <div className="feature-goal-mini">
        <span>🚗 Auto</span>
        <div className="feature-goal-bar"><div className="feature-goal-fill" style={{ width: '65%' }} /></div>
      </div>
      <div className="feature-goal-mini">
        <span>🏖️ Vacaciones</span>
        <div className="feature-goal-bar"><div className="feature-goal-fill blue" style={{ width: '42%' }} /></div>
      </div>
    </div>
  ),
  (
    <div className="feature-visual-chart">
      {[35, 55, 40, 70, 50, 85, 60].map((h, i) => (
        <div key={i} className="feature-chart-bar" style={{ height: `${h}%` }} />
      ))}
    </div>
  ),
  (
    <div className="feature-visual-rates">
      <div className="feature-rate-pill"><span>USD/BS</span><span>45.20</span></div>
      <div className="feature-rate-pill active"><span>USDT/BS</span><span>46.80</span></div>
      <div className="feature-rate-pill"><span>EUR/BS</span><span>49.10</span></div>
    </div>
  ),
  (
    <div className="feature-visual-calendar">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className={`feature-cal-day ${[2, 7, 10].includes(i) ? 'event' : ''}`}>{i + 1}</div>
      ))}
    </div>
  ),
  (
    <div className="feature-visual-courses">
      <div className="feature-course-mini">
        <span>📘 Presupuesto</span>
        <div className="feature-course-progress"><div className="feature-course-fill" style={{ width: '75%' }} /></div>
      </div>
      <div className="feature-course-mini">
        <span>📗 Ahorro</span>
        <div className="feature-course-progress"><div className="feature-course-fill" style={{ width: '30%' }} /></div>
      </div>
    </div>
  ),
  (
    <div className="feature-visual-ocr">
      <div className="feature-ocr-receipt">
        <div className="feature-ocr-row"><span>Banco</span><span>Banesco</span></div>
        <div className="feature-ocr-row"><span>Monto</span><span>$120.00</span></div>
        <div className="feature-ocr-row"><span>Ref.</span><span>00992344</span></div>
        <div className="feature-ocr-status">✓ Verificado</div>
      </div>
    </div>
  ),
  (
    <div className="feature-visual-share">
      <div className="feature-share-avatars">
        <span className="feature-share-avatar">M</span>
        <span className="feature-share-avatar">C</span>
        <span className="feature-share-avatar">A</span>
        <span className="feature-share-avatar">+2</span>
      </div>
      <div className="feature-share-pill">$450 / 5 personas</div>
    </div>
  ),
];

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  features: string[];
}

export function LandingPage() {
  const router = useRouter();
  const { t } = useTranslation('landing');
  const { user } = useAuth();

  const FEATURES_DATA = t('features.items', { returnObjects: true }) as FeatureItem[];
  const FEATURES = FEATURES_DATA.map((f, i) => ({
    ...f,
    visual: FEATURE_VISUALS[i],
    large: i === 0,
    delay: i * 100,
  }));

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
                {user ? t('hero.badge.registered') : t('hero.badge.free')}
              </div>
            </AnimatedSection>

            <AnimatedSection animationType="fade-up" delay={100}>
              <h1 className="landing-hero-title">
                {t('hero.title')}
                <span className="landing-gradient-text">{t('hero.titleHighlight')}</span>
              </h1>
            </AnimatedSection>

            <AnimatedSection animationType="fade-up" delay={200}>
              <p className="landing-hero-subtitle">
                {user
                  ? t('hero.subtitle.registered')
                  : t('hero.subtitle.guest')}
              </p>
            </AnimatedSection>

            <AnimatedSection animationType="fade-up" delay={300}>
              <div className="landing-hero-cta">
                {user ? (
                  <button className="btn btn-primary btn-xl" onClick={() => router.push('/')}>
                    {t('hero.cta.goToDashboard')}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                ) : (
                  <>
                    <button className="btn btn-primary btn-xl" onClick={() => router.push('/register')}>
                      {t('hero.cta.createAccount')}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                    <button className="btn btn-outline btn-xl" onClick={() => router.push('/login')}>
                      {t('hero.cta.haveAccount')}
                    </button>
                  </>
                )}
              </div>
            </AnimatedSection>

            <AnimatedSection animationType="fade-up" delay={400}>
              <div className="landing-hero-stats">
                <div className="hero-stat">
                  <span className="hero-stat-value">{t('hero.stats.multiCurrency.label')}</span>
                  <span className="hero-stat-label">{t('hero.stats.multiCurrency.value')}</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value">{t('hero.stats.realTime.label')}</span>
                  <span className="hero-stat-label">{t('hero.stats.realTime.value')}</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value">{t('hero.stats.private.label')}</span>
                  <span className="hero-stat-label">{t('hero.stats.private.value')}</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value">{t('hero.stats.secure.label')}</span>
                  <span className="hero-stat-label">{t('hero.stats.secure.value')}</span>
                </div>
              </div>
            </AnimatedSection>
          </div>

          <AnimatedSection animationType="fade-up" delay={500} className="landing-hero-visual">
            <HeroMockup />
          </AnimatedSection>
        </section>

        {/* Trust Bar */}
        <section className="lp-section">
          <div className="lp-container">
            <TrustBar />
          </div>
        </section>

        {/* Product Demo - Interactive */}
        <ProductDemo />

        {/* Features Section */}
        <section id="features" className="landing-features-section lp-section">
          <div className="lp-container">
            <AnimatedSection animationType="fade-up" delay={0}>
              <div className="section-header">
                <span className="section-tag">{t('features.sectionTag')}</span>
                <h2 className="section-title">{t('features.sectionTitle')}</h2>
                <p className="section-desc">{t('features.sectionDesc')}</p>
              </div>
            </AnimatedSection>

            <div className="features-grid features-grid-3">
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* Tutorials */}
        <TutorialTabs />

        {/* How It Works - Interactive */}
        <InteractiveSteps />

        {/* Testimonials Carousel */}
        <TestimonialCarousel />

        {/* Security Section */}
        <SecuritySection />

        {/* FAQ */}
        <FaqAccordion />

        {/* CTA Section */}
        <section className="landing-cta-section lp-section">
          <AnimatedSection animationType="fade-up" delay={0}>
            <div className="cta-card">
              <div className="cta-bg-shapes">
                <div className="cta-shape cta-shape-1" />
                <div className="cta-shape cta-shape-2" />
              </div>
              <div className="cta-content">
                <h2>{t('cta.title')}</h2>
                <p>{t('cta.description')}</p>
                <div className="cta-buttons">
                  {user ? (
                    <button className="btn btn-white btn-xl" onClick={() => router.push('/')}>
                      {t('cta.goToDashboard')}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                  ) : (
                    <button className="btn btn-white btn-xl" onClick={() => router.push('/register')}>
                      {t('cta.startFree')}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                  )}
                </div>
                <p className="cta-note">{user ? t('cta.note.registered') : t('cta.note.guest')}</p>
              </div>
            </div>
          </AnimatedSection>
        </section>
      </main>

      <Footer user={user} />
    </div>
  );
}
