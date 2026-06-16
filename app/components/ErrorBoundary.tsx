'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineIcon } from '@/app/components/IconMap';

interface ErrorFallbackProps {
  error: Error | null;
}

function ErrorFallback({ error }: ErrorFallbackProps) {
  const { t } = useTranslation('common');
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg-card, #ffffff)',
      color: 'var(--text-primary, #1a1a1a)',
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px', color: 'var(--text-primary)' }}><InlineIcon icon="AlertTriangle" size={48} /></div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0' }}>
        {t('topbar.errorBoundary.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #666)', margin: '0 0 24px 0', maxWidth: '400px' }}>
        {t('topbar.errorBoundary.message')}
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: 'var(--color-prosper-green, #3DCC8E)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          {t('topbar.errorBoundary.reload')}
        </button>
        <button
          onClick={() => { window.location.href = '/'; }}
          style={{
            padding: '10px 20px',
            background: 'var(--bg-input, #f3f4f6)',
            color: 'var(--text-primary, #1a1a1a)',
            border: '1px solid var(--border-default, #e5e7eb)',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          {t('topbar.goHome')}
        </button>
      </div>
      {error && (
        <details style={{ marginTop: '24px', textAlign: 'left', maxWidth: '500px' }} open>
          <summary style={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
            {t('topbar.errorBoundary.details')}
          </summary>
          <pre style={{
            fontSize: '0.6875rem',
            background: 'var(--bg-input, #f3f4f6)',
            padding: '12px',
            borderRadius: '8px',
            overflow: 'auto',
            marginTop: '8px',
            color: 'var(--color-error, #EF4444)',
          }}>
            {error.message}
            {'\n\nStack:\n'}
            {error.stack || t('topbar.errorBoundary.notAvailable')}
          </pre>
        </details>
      )}
    </div>
  );
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error);
    console.error('[ErrorBoundary] Componente:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
