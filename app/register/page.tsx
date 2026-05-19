'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { CURRENCY_LIST, CURRENCY_MAP } from '@/lib/currency';
import type { CurrencyCode } from '@/types';
import '../login/auth.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const { loginWithGoogle, registerWithEmail } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      await loginWithGoogle();
    } catch {
      setError('Error al conectar con Google.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await registerWithEmail(email, password, name, currency);
    } catch (err: any) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('Este correo ya está registrado.');
          break;
        case 'auth/weak-password':
          setError('La contraseña debe tener al menos 6 caracteres.');
          break;
        case 'auth/invalid-email':
          setError('El correo no es válido.');
          break;
        default:
          setError('Error al crear la cuenta. Inténtalo de nuevo.');
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
          <p>Únete a la élite financiera de Prosper Pro.</p>
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
            {loading ? 'Conectando...' : 'Registrarse con Google'}
          </button>

          <div className="divider">
            <span>o usar correo</span>
          </div>

          <form className="auth-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label>Nombre Completo</label>
              <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="nombre@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label>Moneda Base</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {CURRENCY_LIST.map((code) => {
                  const cfg = CURRENCY_MAP[code];
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setCurrency(code)}
                      disabled={loading}
                      style={{
                        flex: '1 1 calc(50% - 3px)',
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: currency === code ? '2px solid #3DCC8E' : '1px solid var(--border-default, #e5e7eb)',
                        background: currency === code ? 'rgba(61,204,142,0.08)' : 'var(--bg-input, #f9fafb)',
                        color: currency === code ? '#3DCC8E' : 'var(--text-secondary, #666)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: currency === code ? 700 : 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span>{cfg.flag}</span>
                      <span>{cfg.symbol} {cfg.name}</span>
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary, #999)', margin: '4px 0 0', lineHeight: 1.4 }}>
                Esta será tu moneda principal. Podrás cambiarla después.
              </p>
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Cuenta'}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          ¿Ya tienes una cuenta? <Link href="/login">Inicia Sesión</Link>
        </div>
      </div>
    </div>
  );
}
