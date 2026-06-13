'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { NewsletterForm } from './NewsletterForm';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';

interface FooterProps {
  user: { uid: string } | null;
}

export function Footer({ user }: FooterProps) {
  const { t } = useTranslation('landing');
  const router = useRouter();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <img src="/logo-icon.png" alt="Prosper" width={28} height={28} />
            <span>Prosper<span className="footer-dot">.</span></span>
          </div>
          <p>{t('footer.description')}</p>
          <div className="footer-socials">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label={t('footer.socials.twitter')} className="footer-social"><InlineIcon icon="X" size={16} /></a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label={t('footer.socials.instagram')} className="footer-social"><InlineIcon icon="Camera" size={16} /></a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label={t('footer.socials.linkedin')} className="footer-social"><InlineIcon icon="Briefcase" size={16} /></a>
          </div>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>{t('footer.columns.product.title')}</h4>
            <button onClick={() => scrollTo('features')}>{t('footer.columns.product.features')}</button>
            <button onClick={() => scrollTo('demo')}>{t('footer.columns.product.demo')}</button>
            <button onClick={() => scrollTo('tutoriales')}>{t('footer.columns.product.tutorials')}</button>
            <button onClick={() => scrollTo('how-it-works')}>{t('footer.columns.product.howItWorks')}</button>
          </div>
          <div className="footer-col">
            <h4>{t('footer.columns.resources.title')}</h4>
            <button onClick={() => scrollTo('faq')}>{t('footer.columns.resources.faq')}</button>
            <button onClick={() => scrollTo('seguridad')}>{t('footer.columns.resources.security')}</button>
            <button onClick={() => router.push('/ayuda')}>{t('footer.columns.resources.helpCenter')}</button>
            <button onClick={() => router.push('/ayuda/notas-version')}>{t('footer.columns.resources.releaseNotes')}</button>
          </div>
          <div className="footer-col">
            <h4>{t('footer.columns.account.title')}</h4>
            {user ? (
              <button onClick={() => router.push('/')}>{t('footer.columns.account.dashboard')}</button>
            ) : (
              <>
                <button onClick={() => router.push('/login')}>{t('footer.columns.account.login')}</button>
                <button onClick={() => router.push('/register')}>{t('footer.columns.account.register')}</button>
              </>
            )}
          </div>
          <div className="footer-col">
            <h4>{t('footer.columns.legal.title')}</h4>
            <button onClick={() => router.push('/terminos')}>{t('footer.columns.legal.terms')}</button>
            <button onClick={() => router.push('/privacidad')}>{t('footer.columns.legal.privacy')}</button>
          </div>
        </div>

        <div className="footer-newsletter">
          <h4>{t('footer.newsletter.title')}</h4>
          <p>{t('footer.newsletter.description')}</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="footer-bottom">
        <p>{t('footer.copyright')}</p>
      </div>
    </footer>
  );
}
