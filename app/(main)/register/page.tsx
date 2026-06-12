'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/AuthContext';
import { CURRENCY_LIST, CURRENCY_MAP } from '@/lib/currency';
import type { CurrencyCode } from '@/types';
import '../login/auth.css';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';
import { CurrencyFlag } from '@/app/components/CryptoIcons';
import { useTheme } from '@/app/components/ThemeProvider';
import i18n from '@/lib/i18n/client';

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
  const [language, setLanguage] = useState('es');
  const [theme, setThemeState] = useState<'light' | 'dark' | 'amoled'>('dark');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { loginWithGoogle, registerWithEmail, user, loading: authLoading } = useAuth();
  const { setTheme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation('auth');

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  const handleGoogleLogin = async () => {
    if (!acceptedTerms) {
      setError(t('register.errors.termsRequired'));
      return;
    }
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
    if (password.length < 8) {
      setError(t('register.errors.passwordTooShort', { defaultValue: 'La contraseña debe tener al menos 8 caracteres' }));
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError(t('register.errors.passwordNoUppercase', { defaultValue: 'La contraseña debe tener al menos una mayúscula' }));
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError(t('register.errors.passwordNoLowercase', { defaultValue: 'La contraseña debe tener al menos una minúscula' }));
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError(t('register.errors.passwordNoNumber', { defaultValue: 'La contraseña debe tener al menos un número' }));
      return;
    }
    if (!acceptedTerms) {
      setError(t('register.errors.termsRequired'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Apply selected theme and language immediately
      setTheme(theme);
      i18n.changeLanguage(language);
      await registerWithEmail(email, password, name, currency, language, theme);
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
                <div className="auth-feature-icon"><InlineIcon icon={f.icon} size={20} /></div>
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
              <button onClick={handleGoogleLogin} className="google-btn" disabled={loading || !acceptedTerms}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {loading ? t('register.googleBtn.loading') : !acceptedTerms ? t('register.googleBtn.termsRequired', { defaultValue: 'Acepta los términos para continuar' }) : t('register.googleBtn.default')}
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
                  <div className="password-hints">
                    <span className={`password-hint ${password.length >= 8 ? 'valid' : ''}`}>
                      {password.length >= 8 ? '✓' : '•'} {t('register.passwordHints.minLength', { defaultValue: 'Mínimo 8 caracteres' })}
                    </span>
                    <span className={`password-hint ${/[A-Z]/.test(password) ? 'valid' : ''}`}>
                      {/[A-Z]/.test(password) ? '✓' : '•'} {t('register.passwordHints.uppercase', { defaultValue: 'Una mayúscula' })}
                    </span>
                    <span className={`password-hint ${/[a-z]/.test(password) ? 'valid' : ''}`}>
                      {/[a-z]/.test(password) ? '✓' : '•'} {t('register.passwordHints.lowercase', { defaultValue: 'Una minúscula' })}
                    </span>
                    <span className={`password-hint ${/[0-9]/.test(password) ? 'valid' : ''}`}>
                      {/[0-9]/.test(password) ? '✓' : '•'} {t('register.passwordHints.number', { defaultValue: 'Un número' })}
                    </span>
                  </div>
                </div>

                {/* Language Selector */}
                <div className="form-group">
                  <label>{t('register.languageLabel', { defaultValue: 'Idioma' })}</label>
                  <div className="option-selector">
                    {[
                      { value: 'es', label: 'Español', flag: '🇪🇸' },
                      { value: 'en', label: 'English', flag: '🇺🇸' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`option-btn ${language === opt.value ? 'active' : ''}`}
                        onClick={() => setLanguage(opt.value)}
                        disabled={loading}
                      >
                        <span className="option-flag">{opt.flag}</span>
                        <span className="option-text">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="form-group">
                  <label>{t('register.themeLabel', { defaultValue: 'Tema' })}</label>
                  <div className="theme-selector-register">
                    {[
                      { value: 'light' as const, label: t('register.themes.light', { defaultValue: 'Claro' }) },
                      { value: 'dark' as const, label: t('register.themes.dark', { defaultValue: 'Oscuro' }) },
                      { value: 'amoled' as const, label: t('register.themes.amoled', { defaultValue: 'AMOLED' }) },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`theme-option-register ${theme === opt.value ? 'active' : ''}`}
                        onClick={() => setThemeState(opt.value)}
                        disabled={loading}
                      >
                        <div className={`theme-preview-register theme-preview-register-${opt.value}`}>
                          <div className="theme-preview-bar-register" />
                          <div className="theme-preview-blocks-register">
                            <div className="theme-preview-block-register" />
                            <div className="theme-preview-block-register" />
                          </div>
                        </div>
                        <span className="theme-label-register">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Currency Selector */}
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
                          <CurrencyFlag code={code} size={20} className="currency-flag" />
                          <span className="currency-name">{cfg.symbol} {cfg.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="terms-group">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    disabled={loading}
                  />
                  <label htmlFor="terms">
                    {t('register.termsLabel')}
                    <a href="/terminos" target="_blank" rel="noopener noreferrer">{t('register.termsLink')}</a>
                    {t('register.termsAnd')}
                    <a href="/privacidad" target="_blank" rel="noopener noreferrer">{t('register.privacyLink')}</a>
                    {t('register.termsSuffix')}
                  </label>
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
