'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { subscribeToAppNotifications } from '@/lib/firestore/notifications';

export function NewsletterForm() {
  const { t } = useTranslation('landing');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      await subscribeToAppNotifications(email);
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 4000);
  };

  return (
    <form onSubmit={handleSubmit} className="footer-newsletter-form">
      <input
        type="email"
        placeholder={t('newsletter.placeholder')}
        className="footer-input"
        value={email}
        disabled={status === 'loading'}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === 'error') setStatus('idle');
        }}
      />
      <button type="submit" className="btn btn-primary" disabled={status === 'loading'}>
        {status === 'loading' ? '...' : t('newsletter.subscribe')}
      </button>
      {status === 'success' && <span className="newsletter-status success">{t('newsletter.success')}</span>}
      {status === 'error' && <span className="newsletter-status error">{t('newsletter.error')}</span>}
    </form>
  );
}
