'use client';

import { useMemo, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';
import { IconArrowForward } from '@/app/components/icons';

interface TutorialFeature {
  name: string;
  desc: string;
}

interface TutorialSection {
  key: string;
  icon: string;
  route?: string;
}

export default function TutorialPage() {
  const { t } = useTranslation('tutorial');

  const sections: TutorialSection[] = useMemo(() => [
    { key: 'dashboard', icon: 'LayoutGrid', route: '/' },
    { key: 'finances', icon: 'Wallet', route: '/finanzas' },
    { key: 'plans', icon: 'Target', route: '/metas' },
    { key: 'calendar', icon: 'CalendarDays', route: '/calendario' },
    { key: 'settings', icon: 'Settings', route: '/configuracion' },
    { key: 'help', icon: 'HelpCircle', route: '/ayuda' },
  ], []);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const scrollTo = (key: string) => {
    const el = sectionRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderFeatures = (key: string) => {
    const items = t(`${key}.features`, { returnObjects: true }) as TutorialFeature[];
    if (!Array.isArray(items)) return null;
    return (
      <div className="tutorial-features">
        {items.map((feature, idx) => (
          <div className="tutorial-feature-card" key={idx} style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className="tutorial-feature-dot" />
            <div>
              <h4 className="tutorial-feature-name">{feature.name}</h4>
              <p className="tutorial-feature-desc">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="tutorial-page">
          <div className="tutorial-hero">
            <div className="tutorial-hero-content">
              <span className="tutorial-hero-badge">{t('meta.title')}</span>
              <h1 className="tutorial-hero-title">{t('hero.title')}</h1>
              <p className="tutorial-hero-subtitle">{t('hero.subtitle')}</p>
              <Link href="/" className="tutorial-hero-back">
                <InlineIcon icon="ArrowLeft" size={16} />
                {t('hero.backToDashboard')}
              </Link>
            </div>
          </div>

          <nav className="tutorial-nav">
            {sections.map((s) => (
              <button
                key={s.key}
                className="tutorial-nav-btn"
                onClick={() => scrollTo(s.key)}
                title={t(`${s.key}.title`)}
              >
                <InlineIcon icon={s.icon} size={16} />
                <span>{t(`${s.key}.title`)}</span>
              </button>
            ))}
          </nav>

          <div className="tutorial-sections">
            {sections.map((s) => (
              <section
                key={s.key}
                ref={(el) => { sectionRefs.current[s.key] = el; }}
                className="tutorial-section"
              >
                <div className="tutorial-section-header">
                  <IconBadge icon={s.icon} size={18} />
                  <h2 className="tutorial-section-title">{t(`${s.key}.title`)}</h2>
                </div>
                <p className="tutorial-section-intro">{t(`${s.key}.intro`)}</p>
                {renderFeatures(s.key)}
                {s.route && (
                  <Link href={s.route} className="tutorial-section-link">
                    {t('nav.goTo', { defaultValue: 'Ir a' })} {t(`${s.key}.title`)}
                    <IconArrowForward width={16} />
                  </Link>
                )}
              </section>
            ))}
          </div>
        </div>

        <style>{`
          .tutorial-page { padding: 24px; max-width: 1000px; margin: 0 auto; }
          .tutorial-hero { background: linear-gradient(135deg, var(--color-prosper-navy, #1E3A6E), var(--color-prosper-green, #3DCC8E)); border-radius: var(--radius-xl, 20px); padding: 40px 32px; margin-bottom: 24px; color: white; position: relative; overflow: hidden; }
          .tutorial-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at top right, rgba(255,255,255,0.15), transparent 50%); pointer-events: none; }
          .tutorial-hero-content { position: relative; z-index: 1; }
          .tutorial-hero-badge { display: inline-block; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: var(--radius-full, 9999px); margin-bottom: 12px; }
          .tutorial-hero-title { font-size: 1.75rem; font-weight: 800; margin: 0 0 10px; }
          .tutorial-hero-subtitle { font-size: 0.9375rem; opacity: 0.92; margin: 0 0 18px; max-width: 600px; line-height: 1.5; }
          .tutorial-hero-back { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8125rem; font-weight: 600; color: white; text-decoration: none; background: rgba(255,255,255,0.15); padding: 8px 14px; border-radius: var(--radius-md, 10px); transition: background 0.2s ease; }
          .tutorial-hero-back:hover { background: rgba(255,255,255,0.25); }

          .tutorial-nav { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; padding: 12px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-default, rgba(0,0,0,0.08)); border-radius: var(--radius-lg, 14px); position: sticky; top: 12px; z-index: 10; backdrop-filter: blur(8px); }
          [data-theme="dark"] .tutorial-nav { background: rgba(10,22,40,0.85); }
          [data-theme="amoled"] .tutorial-nav { background: rgba(10,10,10,0.9); }
          .tutorial-nav-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: var(--radius-md, 10px); border: 1px solid var(--border-default, rgba(0,0,0,0.08)); background: var(--bg-input, #f8fafc); color: var(--text-secondary, #64748b); font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
          .tutorial-nav-btn:hover { border-color: var(--color-prosper-green, #3DCC8E); color: var(--color-prosper-green, #3DCC8E); }

          .tutorial-sections { display: flex; flex-direction: column; gap: 20px; }
          .tutorial-section { background: var(--bg-card, #ffffff); border: 1px solid var(--border-default, rgba(0,0,0,0.08)); border-radius: var(--radius-lg, 14px); padding: 24px; scroll-margin-top: 90px; }
          .tutorial-section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
          .tutorial-section-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary, #0f172a); margin: 0; }
          .tutorial-section-intro { font-size: 0.875rem; color: var(--text-secondary, #475569); margin: 0 0 18px; line-height: 1.6; }
          .tutorial-section-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; font-size: 0.8125rem; font-weight: 600; color: var(--color-prosper-green, #3DCC8E); text-decoration: none; }
          .tutorial-section-link:hover { text-decoration: underline; }

          .tutorial-features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .tutorial-feature-card { display: flex; gap: 12px; padding: 14px; background: var(--bg-input, #f8fafc); border: 1px solid var(--border-default, rgba(0,0,0,0.06)); border-radius: var(--radius-md, 10px); transition: transform 0.2s ease, box-shadow 0.2s ease; }
          .tutorial-feature-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.04)); }
          .tutorial-feature-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-prosper-green, #3DCC8E); margin-top: 6px; flex-shrink: 0; }
          .tutorial-feature-name { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary, #0f172a); margin: 0 0 4px; }
          .tutorial-feature-desc { font-size: 0.75rem; color: var(--text-secondary, #475569); margin: 0; line-height: 1.5; }

          @media (max-width: 768px) {
            .tutorial-page { padding: 16px 12px; }
            .tutorial-hero { padding: 28px 20px; }
            .tutorial-hero-title { font-size: 1.375rem; }
            .tutorial-features { grid-template-columns: 1fr; }
            .tutorial-nav { top: 8px; }
          }
          @media (max-width: 480px) {
            .tutorial-hero { padding: 22px 16px; }
            .tutorial-hero-title { font-size: 1.25rem; }
            .tutorial-section { padding: 18px; }
            .tutorial-nav-btn span { display: none; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
