'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import './auth.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle, loginWithEmail } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      await loginWithGoogle();
      window.location.href = '/';
    } catch {
      setError('Error al conectar con Google.');
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
      window.location.href = '/';
    } catch (err: any) {
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
          setError('Error al iniciar sesión. Inténtalo de nuevo.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-container">
            <img src="/logo-icon.png" alt="Prosper Logo" width={48} height={48} className="auth-logo-img" />
            <span className="auth-logo-text">
              Prosper<span style={{ color: '#3DCC8E' }}>.</span>
            </span>
          </div>
          <p>Tu camino a la libertad financiera comienza aquí.</p>
        </div>

        <div className="auth-content">
          {error && <div className="error-alert">{error}</div>}
          <button onClick={handleGoogleLogin} className="google-btn" disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24">
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
              <input type="email" placeholder="nombre@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          ¿No tienes una cuenta? <Link href="/register">Regístrate</Link>
        </div>
      </div>
    </div>
  );
}
