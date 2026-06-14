'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AndroidDownloadButton } from './AndroidDownloadButton';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user: { uid: string } | null;
  onLogin: () => void;
  onRegister: () => void;
  onDashboard: () => void;
}

export function MobileNav({ isOpen, onClose, user, onLogin, onRegister, onDashboard }: MobileNavProps) {
  const { t } = useTranslation('landing');
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNav = (id: string) => {
    onClose();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="mobile-nav-overlay" onClick={onClose}>
      <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-nav-header">
          <span className="mobile-nav-title">{t('mobileNav.title')}</span>
          <button className="mobile-nav-close" onClick={onClose} aria-label={t('mobileNav.close')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="mobile-nav-links">
          <button onClick={() => handleNav('features')}>{t('mobileNav.nav.features')}</button>
          <button onClick={() => handleNav('tutoriales')}>{t('mobileNav.nav.tutorials')}</button>
          <button onClick={() => handleNav('how-it-works')}>{t('mobileNav.nav.howItWorks')}</button>
          <button onClick={() => handleNav('faq')}>{t('mobileNav.nav.faq')}</button>
        </nav>
        <div className="mobile-nav-actions">
          <AndroidDownloadButton variant="primary" size="md" />
          {user ? (
            <button className="btn btn-primary" onClick={onDashboard}>
              {t('mobileNav.goToDashboard')}
            </button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={onLogin}>{t('mobileNav.login')}</button>
              <button className="btn btn-primary" onClick={onRegister}>{t('mobileNav.startFree')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
