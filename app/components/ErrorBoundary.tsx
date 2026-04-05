'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

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
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0' }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #666)', margin: '0 0 24px 0', maxWidth: '400px' }}>
            Esta página no pudo cargar correctamente. Intenta recargar la página.
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
              Recargar página
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
              Ir al inicio
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '24px', textAlign: 'left', maxWidth: '500px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                Detalles del error (solo desarrollo)
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
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
