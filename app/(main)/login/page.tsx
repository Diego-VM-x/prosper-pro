'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { sendBrowserNotification } from '@/lib/firestore/notifications';
import './auth.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle, loginWithEmail, user, loading: authLoading, isGuest, enterGuestMode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (user || isGuest)) {
      router.replace('/');
    }
  }, [user, isGuest, authLoading, router]);

  const sendWelcomeNotification = (userName: string) => {
    const title = '🎉 ¡Bienvenido/a a Prosper!';
    const body = `Hola ${userName}, estamos listos para ayudarte a tomar el control de tu futuro financiero.`;
    console.log('[Login] Sending notification:', title, body);
    sendBrowserNotification(title, body, 'general');
  };

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      await loginWithGoogle();
      console.log('[Login] Google login completed');
      await new Promise(r => setTimeout(r, 800));
      
      // Get user name - use email as primary source since it's available
      const userName = email.split('@')[0] || 'Usuario';
      console.log('[Login] User name:', userName);
      sendWelcomeNotification(userName);
      
      router.replace('/');
    } catch (e: any) {
      setError(e?.message || 'Error al conectar con Google.');
      setLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await loginWithEmail(email, password);
      console.log('[Login] Email login completed');
      await new Promise(r => setTimeout(r, 800));
      
      // Send welcome notification
      const userName = email.split('@')[0] || 'Usuario';
      console.log('[Login] Sending welcome notification to:', userName);
      sendWelcomeNotification(userName);
      
      router.replace('/');
    } catch (err: any) {
      setLoading(false);
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          setError('Credenciales incorrectas. Si creaste tu cuenta con Google, usa el botón superior.');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos fallidos. Inténtalo más tarde.');
          break;
        default:
          setError(err.message || 'Error al iniciar sesión. Inténtalo de nuevo.');
      }
    }
  };

  const handleGuestMode = () => {
    enterGuestMode();
    router.replace('/');
  };

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
            <p className="auth-brand-tagline">Tu camino a la libertad financiera comienza aquí.</p>
          </div>

          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">📊</div>
              <div>
                <h3>Control Financiero</h3>
                <p>Gestiona tus cuentas, ingresos y gastos en un solo lugar.</p>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">🎯</div>
              <div>
                <h3>Planes de Ahorro</h3>
                <p>Crea metas financieras y sigue tu progreso en tiempo real.</p>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">📈</div>
              <div>
                <h3>Análisis Inteligente</h3>
                <p>Visualiza tu rendimiento con gráficos interactivos.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-header">
              <h2>Bienvenido de nuevo</h2>
              <p>Inicia sesión para continuar</p>
            </div>

            <div className="auth-content">
              {!auth && (
                <div className="error-alert" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B' }}>
                  ⚠️ <strong>Servicio no disponible:</strong> Firebase no está configurado en este deploy. Si eres el administrador, verifica las variables de entorno en Vercel Dashboard y haz <strong>Redeploy</strong>.
                </div>
              )}
              {error && <div className="error-alert">{error}</div>}
              <button onClick={handleGoogleLogin} className="google-btn" disabled={loading || !auth}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {loading ? 'Conectando...' : 'Continuar con Google'}
              </button>

              <div className="divider">
                <span>o usar correo</span>
              </div>

              <form className="auth-form" onSubmit={handleManualLogin}>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" placeholder="nombre@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="form-group">
                  <label>Contraseña</label>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                </div>
                <button type="submit" className="login-btn" disabled={loading || !auth}>
                  {loading ? (
                    <span className="login-btn-loading">
                      <span className="spinner" /> Entrando...
                    </span>
                  ) : 'Entrar'}
                </button>
              </form>
            </div>

            <div className="auth-footer">
              ¿No tienes una cuenta? <Link href="/register">Regístrate gratis</Link>
            </div>
            <div className="auth-footer" style={{ marginTop: 8 }}>
              <button
                onClick={handleGuestMode}
                className="home-btn"
                style={{ background: 'none', border: 'none', color: 'var(--color-prosper-green)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
              >
                👤 Entrar como invitado
              </button>
            </div>
            <div className="auth-footer">
              <Link href="/" className="home-btn">Ir al inicio</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
