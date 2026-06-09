'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function NewsletterForm() {
  const { t } = useTranslation('landing');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      return;
    }
    // Simulamos el envío; en producción aquí iría la integración real
    setStatus('success');
    setEmail('');
    setTimeout(() => setStatus('idle'), 4000);
  };

  return (
    <form onSubmit={handleSubmit} className="footer-newsletter-form">
      <input
        type="email"
        placeholder={t('newsletter.placeholder')}
        className="footer-input"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === 'error') setStatus('idle');
        }}
      />
      <button type="submit" className="btn btn-primary">
        {t('newsletter.subscribe')}
      </button>
      {status === 'success' && <span className="newsletter-status success">{t('newsletter.success')}</span>}
      {status === 'error' && <span className="newsletter-status error">{t('newsletter.error')}</span>}
    </form>
  );
}
