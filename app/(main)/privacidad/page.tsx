'use client';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function PrivacidadPage() {
  const { t } = useTranslation('legal');

  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <Link href="/" className="legal-back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            <span>{t('backToHome')}</span>
          </Link>
          <h1>{t('privacy.title')}</h1>
          <p className="legal-date">{t('privacy.lastUpdated')}</p>
        </div>

        <div className="legal-content">
          <section>
            <h2>{t('privacy.sections.1.title')}</h2>
            <p>{t('privacy.sections.1.text')}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.2.title')}</h2>
            <p>{t('privacy.sections.2.text')}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.3.title')}</h2>
            <p>{t('privacy.sections.3.text')}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.4.title')}</h2>
            <p>{t('privacy.sections.4.text')}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.5.title')}</h2>
            <p>{t('privacy.sections.5.text')}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.6.title')}</h2>
            <p>{t('privacy.sections.6.text')}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.7.title')}</h2>
            <p>{t('privacy.sections.7.text')}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.8.title')}</h2>
            <p>{t('privacy.sections.8.text')}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.9.title')}</h2>
            <p>{t('privacy.sections.9.text')}</p>
          </section>

          <section>
            <h2>{t('privacy.sections.10.title')}</h2>
            <p>{t('privacy.sections.10.text')} <a href="mailto:soporte@prosperpro.com">soporte@prosperpro.com</a></p>
          </section>
        </div>

        <div className="legal-footer">
          <p>© 2026 Prosper Pro. {t('footer.rights')}</p>
        </div>
      </div>

      <style>{`
        .legal-page { min-height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif; }
        .legal-container { max-width: 800px; margin: 0 auto; padding: 48px 24px; }
        .legal-header { margin-bottom: 40px; }
        .legal-back { display: inline-flex; align-items: center; gap: 8px; color: #3DCC8E; font-weight: 600; font-size: 0.875rem; text-decoration: none; margin-bottom: 24px; transition: color 0.2s; }
        .legal-back:hover { color: #2BA876; }
        .legal-header h1 { font-size: 2rem; font-weight: 800; color: #1E3A6E; margin: 16px 0 8px; letter-spacing: -0.5px; }
        .legal-date { font-size: 0.875rem; color: #64748b; margin: 0; }
        .legal-content { background: white; border-radius: 20px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
        .legal-content section { margin-bottom: 32px; }
        .legal-content section:last-child { margin-bottom: 0; }
        .legal-content h2 { font-size: 1.125rem; font-weight: 700; color: #1E3A6E; margin: 0 0 12px; }
        .legal-content p { font-size: 0.9375rem; color: #475569; line-height: 1.7; margin: 0; }
        .legal-content a { color: #3DCC8E; font-weight: 600; text-decoration: none; }
        .legal-content a:hover { text-decoration: underline; }
        .legal-footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
        .legal-footer p { font-size: 0.875rem; color: #94a3b8; margin: 0; }
        @media (max-width: 640px) {
          .legal-container { padding: 24px 16px; }
          .legal-content { padding: 24px 20px; border-radius: 16px; }
          .legal-header h1 { font-size: 1.5rem; }
          .legal-content h2 { font-size: 1rem; }
          .legal-content p { font-size: 0.875rem; }
        }
      `}</style>
    </div>
  );
}
