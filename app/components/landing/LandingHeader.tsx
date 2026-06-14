'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { DownloadButton } from './AndroidDownloadButton';

interface LandingHeaderProps {
  user: { uid: string } | null;
}

export function LandingHeader({ user }: LandingHeaderProps) {
  const { t } = useTranslation('landing');
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);


  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <header className={`landing-header ${scrollY > 50 ? 'scrolled' : ''}`}>
        <div className="landing-header-inner">
          <div className="landing-logo">
            <img src="/logo-icon.png" alt="Prosper" width={36} height={36} />
            <span className="landing-logo-text">Prosper<span className="landing-logo-dot">.</span></span>
          </div>

          <nav className="landing-nav">
            <button className="nav-link" onClick={() => scrollTo('features')}>{t('header.nav.features')}</button>
            <button className="nav-link" onClick={() => scrollTo('tutoriales')}>{t('header.nav.tutorials')}</button>
            <button className="nav-link" onClick={() => scrollTo('how-it-works')}>{t('header.nav.howItWorks')}</button>
            <button className="nav-link" onClick={() => scrollTo('faq')}>{t('header.nav.faq')}</button>
          </nav>

          <div className="landing-header-actions">
            <DownloadButton variant="outline" size="sm" className="desktop-only" />
            {user ? (
              <button className="btn btn-primary" onClick={() => router.push('/')}>
                Ir al Dashboard
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            ) : (
              <>
                <button className="btn btn-ghost desktop-only" onClick={() => router.push('/login')}>{t('header.login')}</button>
                <button className="btn btn-primary" onClick={() => router.push('/register')}>{t('header.startFree')}</button>
              </>
            )}

          </div>
        </div>
      </header>


    </>
  );
}
