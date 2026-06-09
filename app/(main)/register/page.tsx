'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/AuthContext';
import { CURRENCY_LIST, CURRENCY_MAP } from '@/lib/currency';
import type { CurrencyCode } from '@/types';
import '../login/auth.css';

interface AuthFeature {
  icon: string;
  title: string;
  desc: string;
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const { loginWithGoogle, registerWithEmail, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('auth');

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      await loginWithGoogle();
    } catch {
      setError(t('register.errors.google'));
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError(t('register.errors.emptyFields'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await registerWithEmail(email, password, name, currency);
    } catch (err: any) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError(t('register.errors.auth/email-already-in-use'));
          break;
        case 'auth/weak-password':
          setError(t('register.errors.auth/weak-password'));
          break;
        case 'auth/invalid-email':
          setError(t('register.errors.auth/invalid-email'));
          break;
        default:
          setError(t('register.errors.generic'));
      }
      setLoading(false);
    }
  };

  const features = t('register.features', { returnObjects: true }) as AuthFeature[];

  return (
    <div className="auth-container">
      <div className="auth-bg-shapes">
        <div className="auth-shape auth-shape-1" />
        <div className="auth-shape auth-shape-2" />
        <div className="auth-shape auth-shape-3" />
        <div className="auth-shape auth-shape-4" />
      </div>

      <div className="auth-layout">
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-logo">
              <img src="/logo-icon.png" alt="Prosper" width={56} height={56} />
            </div>
            <h1 className="auth-brand-title">
              Prosper<span className="auth-brand-dot">.</span>
            </h1>
            <p className="auth-brand-tagline">{t('register.brandTagline')}</p>
          </div>

          <div className="auth-features">
            {features.map((f, i) => (
              <div className="auth-feature" key={i}>
                <div className="auth-feature-icon">{f.icon}</div>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card auth-card-register">
            <div className="auth-header">
              <h2>{t('register.title')}</h2>
              <p>{t('register.subtitle')}</p>
            </div>

            <div className="auth-content">
              {error && <div className="error-alert">{error}</div>}
              <button onClick={handleGoogleLogin} className="google-btn" disabled={loading}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {loading ? t('register.googleBtn.loading') : t('register.googleBtn.default')}
              </button>

              <div className="divider">
                <span>{t('register.divider')}</span>
              </div>

              <form className="auth-form" onSubmit={handleRegister}>
                <div className="form-group">
                  <label>{t('register.nameLabel')}</label>
                  <input type="text" placeholder={t('register.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} disabled={loading} autoComplete="name" />
                </div>
                <div className="form-group">
                  <label>{t('register.emailLabel')}</label>
                  <input type="email" placeholder={t('register.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} autoComplete="email" />
                </div>
                <div className="form-group">
                  <label>{t('register.passwordLabel')}</label>
                  <input type="password" placeholder={t('register.passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} autoComplete="new-password" />
                </div>
                <div className="form-group">
                  <label>{t('register.currencyLabel')}</label>
                  <div className="currency-selector">
                    {CURRENCY_LIST.map((code) => {
                      const cfg = CURRENCY_MAP[code];
                      return (
                        <button
                          key={code}
                          type="button"
                          className={`currency-option ${currency === code ? 'active' : ''}`}
                          onClick={() => setCurrency(code)}
                          disabled={loading}
                        >
                          <span className="currency-flag">{cfg.flag}</span>
                          <span className="currency-name">{cfg.symbol} {cfg.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? (
                    <span className="login-btn-loading">
                      <span className="spinner" /> {t('register.submitBtn.loading')}
                    </span>
                  ) : t('register.submitBtn.default')}
                </button>
              </form>
            </div>

            <div className="auth-footer">
              {t('register.footer.haveAccount')} <Link href="/login">{t('register.footer.login')}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
