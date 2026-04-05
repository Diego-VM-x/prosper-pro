'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getUserProfile, updateUserProfile, subscribeToUserProfile } from '@/lib/firestore/users';
import { useTheme } from '@/app/components/ThemeProvider';
import type { UserProfile } from '@/types';

export default function ConfiguracionPage() {
  const { user, logout, deleteAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [language, setLanguage] = useState('es');
  const [currency, setCurrency] = useState('USD');
  const [darkModeSync, setDarkModeSync] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [communityMsgs, setCommunityMsgs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Cargar perfil
  useEffect(() => {
    const uid = user?.uid as string;
    if (!uid) return;

    async function loadProfile() {
      try {
        const p = await getUserProfile(uid);
        if (p) {
          setProfile(p);
          setDisplayName(p.displayName || '');
          setBio((p as any).bio || '');
        }
      } catch (e) {
        console.error('Error loading profile:', e);
      }
    }
    loadProfile();

    // Suscribirse a cambios en tiempo real
    const unsub = subscribeToUserProfile(uid, (p) => {
      if (p) {
        setProfile(p);
        setDisplayName(p.displayName || '');
        setBio((p as any).bio || '');
      }
    });

    return () => unsub();
  }, [user?.uid]);

  // Guardar perfil
  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim() || user.email?.split('@')[0] || 'Usuario',
        bio: bio.trim(),
        language,
        currency,
        darkModeSync,
        notifications: {
          priceAlerts,
          budgetAlerts,
          communityMsgs,
        },
      } as any);
      setSuccessMsg('Perfil actualizado correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setErrorMsg('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar cuenta
  const handleDeleteAccount = async () => {
    setErrorMsg('');
    setDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.needsReauth) {
        setErrorMsg('Por seguridad, cierra sesión y vuelve a entrar antes de eliminar tu cuenta.');
      } else if (result.error) {
        setErrorMsg(result.error);
      }
    } catch {
      setErrorMsg('Error al eliminar la cuenta. Intenta de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');
  const userEmail = user?.email || 'sin-email@ejemplo.com';

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="configuracion-page">
          <style jsx>{`
            .configuracion-page {
              padding: 24px;
              max-width: 1100px;
              margin: 0 auto;
            }

            /* Toast messages */
            .toast {
              padding: 12px 16px;
              border-radius: 8px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              gap: 8px;
              animation: fadeInUp 0.3s ease;
              font-size: 0.875rem;
              font-weight: 600;
            }
            .toast-success {
              background: rgba(61,204,142,0.1);
              border: 1px solid rgba(61,204,142,0.2);
              color: var(--color-prosper-green);
            }
            .toast-error {
              background: rgba(239,68,68,0.1);
              border: 1px solid rgba(239,68,68,0.2);
              color: var(--color-error, #EF4444);
            }

            /* Hero */
            .hero {
              margin-bottom: 32px;
            }
            .hero-title {
              font-size: 2rem;
              font-weight: 900;
              color: var(--text-primary);
              letter-spacing: -0.02em;
              margin: 0 0 4px 0;
            }
            .hero-desc {
              font-size: 0.875rem;
              color: var(--text-secondary);
              margin: 0;
            }

            /* Grid */
            .grid-layout {
              display: grid;
              grid-template-columns: 1fr;
              gap: 24px;
            }
            @media (min-width: 1024px) {
              .grid-layout {
                grid-template-columns: 2fr 1fr;
              }
            }

            /* Cards */
            .card {
              background: var(--bg-card);
              border-radius: 12px;
              border: 1px solid var(--border-default);
              overflow: hidden;
            }

            /* Profile Section */
            .profile-section {
              padding: 32px;
            }
            .profile-layout {
              display: flex;
              gap: 32px;
            }
            @media (max-width: 768px) {
              .profile-layout {
                flex-direction: column;
                align-items: center;
              }
            }
            .profile-avatar-wrap {
              position: relative;
              width: 120px;
              height: 120px;
              flex-shrink: 0;
              cursor: pointer;
              border-radius: 50%;
              overflow: hidden;
              border: 3px solid rgba(61,204,142,0.2);
            }
            .profile-avatar {
              width: 100%;
              height: 100%;
              background: var(--bg-input);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 2.5rem;
              font-weight: 700;
              color: var(--color-prosper-green);
            }
            .profile-avatar-overlay {
              position: absolute;
              inset: 0;
              background: rgba(61,204,142,0.2);
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 0;
              transition: opacity 0.2s;
              color: white;
              font-size: 1.25rem;
            }
            .profile-avatar-wrap:hover .profile-avatar-overlay {
              opacity: 1;
            }
            .profile-form {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .form-row {
              display: grid;
              grid-template-columns: 1fr;
              gap: 16px;
            }
            @media (min-width: 640px) {
              .form-row {
                grid-template-columns: 1fr 1fr;
              }
            }
            .form-group {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .form-label {
              font-size: 0.5625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: var(--text-tertiary);
              padding-left: 4px;
            }
            .form-input, .form-textarea, .form-select {
              padding: 10px 14px;
              border-radius: 8px;
              border: none;
              background: var(--bg-input);
              color: var(--text-primary);
              font-size: 0.8125rem;
              outline: none;
              transition: all 0.2s;
              font-family: inherit;
            }
            .form-input:focus, .form-textarea:focus, .form-select:focus {
              box-shadow: 0 0 0 2px var(--color-prosper-green);
            }
            .form-textarea {
              resize: none;
              line-height: 1.5;
            }
            .form-select {
              cursor: pointer;
              appearance: none;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2386948a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
              background-repeat: no-repeat;
              background-position: right 12px center;
              padding-right: 32px;
            }
            .save-btn {
              align-self: flex-end;
              padding: 10px 24px;
              background: var(--color-prosper-green);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 0.6875rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 4px 12px rgba(61,204,142,0.2);
            }
            .save-btn:hover:not(:disabled) {
              opacity: 0.9;
              transform: translateY(-1px);
            }
            .save-btn:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }

            /* Subscription Card */
            .sub-card {
              padding: 24px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: linear-gradient(135deg, var(--bg-card-high), var(--bg-input));
            }
            .sub-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 16px;
            }
            .sub-title {
              font-size: 1.125rem;
              font-weight: 800;
              color: var(--color-prosper-green);
              margin: 0;
            }
            .sub-desc {
              font-size: 0.75rem;
              color: var(--text-secondary);
              margin: 0;
            }
            .sub-badge {
              font-size: 0.5625rem;
              font-weight: 900;
              text-transform: uppercase;
              padding: 2px 10px;
              border-radius: 9999px;
              background: rgba(61,204,142,0.1);
              color: var(--color-prosper-green);
              letter-spacing: 0.05em;
            }
            .sub-details {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .sub-detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid var(--border-default);
              font-size: 0.75rem;
            }
            .sub-detail-label {
              color: var(--text-secondary);
            }
            .sub-detail-value {
              font-weight: 700;
              color: var(--text-primary);
            }
            .sub-btn {
              width: 100%;
              padding: 12px;
              margin-top: 16px;
              background: var(--bg-accent-soft);
              color: var(--text-primary);
              border: 1px solid rgba(61,204,142,0.2);
              border-radius: 8px;
              font-size: 0.6875rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            }
            .sub-btn:hover {
              background: var(--bg-card-hover);
            }

            /* Preferences & Notifications */
            .prefs-section {
              padding: 24px;
            }
            .prefs-title {
              font-size: 1rem;
              font-weight: 800;
              color: var(--text-primary);
              display: flex;
              align-items: center;
              gap: 8px;
              margin: 0 0 20px 0;
            }
            .prefs-list {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .pref-row {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }

            /* Toggle Switch */
            .toggle-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 12px;
              background: var(--bg-input);
              border-radius: 8px;
              transition: background 0.2s;
            }
            .toggle-row:hover {
              background: var(--bg-card-high);
            }
            .toggle-info {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .toggle-icon {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: rgba(61,204,142,0.08);
              display: flex;
              align-items: center;
              justify-content: center;
              color: var(--color-prosper-green);
              font-size: 1rem;
            }
            .toggle-text {
              display: flex;
              flex-direction: column;
            }
            .toggle-label {
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--text-primary);
            }
            .toggle-desc {
              font-size: 0.625rem;
              color: var(--text-secondary);
            }
            .toggle-switch {
              width: 44px;
              height: 22px;
              border-radius: 9999px;
              background: var(--bg-card-high);
              border: none;
              cursor: pointer;
              position: relative;
              transition: background 0.2s;
              flex-shrink: 0;
            }
            .toggle-switch.active {
              background: var(--color-prosper-green);
            }
            .toggle-switch::after {
              content: '';
              position: absolute;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: white;
              top: 3px;
              transition: all 0.2s;
            }
            .toggle-switch.active::after {
              right: 3px;
            }
            .toggle-switch:not(.active)::after {
              left: 3px;
            }

            /* Security Section */
            .security-section {
              padding: 24px;
              border-top: 2px solid rgba(61,204,142,0.2);
            }
            .security-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              flex-wrap: wrap;
              gap: 12px;
            }
            .security-header-left {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .security-title {
              font-size: 1rem;
              font-weight: 800;
              color: var(--text-primary);
              margin: 0;
            }
            .security-desc {
              font-size: 0.625rem;
              color: var(--text-secondary);
              margin: 0;
            }
            .security-actions {
              display: flex;
              gap: 8px;
              align-items: center;
            }
            .change-pass-btn {
              font-size: 0.625rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              border: 1px solid rgba(61,204,142,0.3);
              background: none;
              padding: 6px 12px;
              border-radius: 6px;
              cursor: pointer;
              transition: all 0.2s;
            }
            .change-pass-btn:hover {
              background: rgba(61,204,142,0.05);
            }
            .tfa-badge {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 6px 12px;
              background: rgba(61,204,142,0.1);
              border: 1px solid rgba(61,204,142,0.2);
              border-radius: 6px;
            }
            .tfa-text {
              font-size: 0.5625rem;
              font-weight: 700;
              text-transform: uppercase;
              color: var(--color-prosper-green);
            }

            /* Sessions Table */
            .sessions-table {
              width: 100%;
              overflow-x: auto;
            }
            .sessions-table table {
              width: 100%;
              border-collapse: collapse;
              font-size: 0.75rem;
            }
            .sessions-table th {
              text-align: left;
              padding: 12px 16px;
              font-size: 0.5625rem;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: var(--text-tertiary);
              border-bottom: 1px solid var(--border-default);
            }
            .sessions-table td {
              padding: 14px 16px;
              border-bottom: 1px solid var(--border-default);
              color: var(--text-secondary);
            }
            .sessions-table tr:hover td {
              background: var(--bg-card-high);
            }
            .session-device {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .session-device-icon {
              font-size: 1.125rem;
            }
            .session-device-name {
              font-weight: 700;
              color: var(--text-primary);
            }
            .session-device-browser {
              font-size: 0.5625rem;
            }
            .status-badge {
              font-size: 0.5625rem;
              font-weight: 700;
              text-transform: uppercase;
              padding: 3px 8px;
              border-radius: 4px;
              background: rgba(61,204,142,0.1);
              color: var(--color-prosper-green);
            }
            .revoke-btn {
              font-size: 0.5625rem;
              font-weight: 700;
              text-transform: uppercase;
              color: var(--color-error, #EF4444);
              background: none;
              border: none;
              cursor: pointer;
              padding: 6px 12px;
              border-radius: 4px;
              transition: all 0.2s;
            }
            .revoke-btn:hover {
              background: rgba(239,68,68,0.1);
            }

            /* Danger Zone */
            .danger-zone {
              margin-top: 24px;
              background: rgba(239,68,68,0.05);
              border: 1px solid rgba(239,68,68,0.2);
              border-radius: 12px;
              padding: 24px;
              display: flex;
              gap: 16px;
              align-items: flex-start;
            }
            [data-theme="dark"] .danger-zone {
              background: rgba(127,29,29,0.15);
              border-color: rgba(239,68,68,0.3);
            }
            .danger-icon {
              width: 44px;
              height: 44px;
              border-radius: 8px;
              background: rgba(239,68,68,0.1);
              display: flex;
              align-items: center;
              justify-content: center;
              color: var(--color-error, #EF4444);
              flex-shrink: 0;
            }
            .danger-content {
              flex: 1;
            }
            .danger-title {
              font-size: 0.875rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: var(--color-red-900, #7F1D1D);
              margin: 0 0 6px 0;
            }
            [data-theme="dark"] .danger-title {
              color: var(--color-red-300, #FCA5A5);
            }
            .danger-desc {
              font-size: 0.75rem;
              color: var(--color-red-900, #7F1D1D);
              margin: 0 0 12px 0;
              line-height: 1.5;
            }
            [data-theme="dark"] .danger-desc {
              color: var(--color-red-200, #FECACA);
            }
            .danger-btn {
              width: 100%;
              padding: 10px 16px;
              background: var(--color-error, #EF4444);
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 0.75rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s;
            }
            .danger-btn:hover:not(:disabled) {
              background: #dc2626;
            }
            .danger-btn:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }

            /* Footer */
            .footer {
              margin-top: 32px;
              padding: 16px 0;
              text-align: center;
              font-size: 0.5625rem;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: var(--text-tertiary);
              border-top: 1px solid var(--border-default);
            }

            /* Responsive */
            @media (max-width: 1024px) {
              .grid-layout {
                grid-template-columns: 1fr;
              }
            }
            @media (max-width: 768px) {
              .configuracion-page {
                padding: 16px;
              }
              .hero-title {
                font-size: 1.5rem;
              }
              .hero-desc {
                font-size: 0.8125rem;
              }
              .profile-section {
                padding: 20px;
              }
              .profile-layout {
                flex-direction: column;
                align-items: center;
                text-align: center;
              }
              .profile-avatar-wrap {
                width: 96px;
                height: 96px;
              }
              .profile-avatar {
                font-size: 2rem;
              }
              .profile-form {
                width: 100%;
              }
              .form-row {
                grid-template-columns: 1fr;
              }
              .save-btn {
                width: 100%;
              }
              .security-header {
                flex-direction: column;
                gap: 12px;
              }
              .security-actions {
                width: 100%;
                flex-direction: column;
              }
              .change-pass-btn, .tfa-badge {
                width: 100%;
                justify-content: center;
              }
              .sessions-table {
                font-size: 0.6875rem;
                overflow-x: auto;
              }
              .sessions-table table {
                min-width: 500px;
              }
              .danger-zone {
                flex-direction: column;
                align-items: center;
                text-align: center;
              }
              .prefs-section {
                padding: 16px;
              }
              .sub-card {
                padding: 16px;
              }
            }
            @media (max-width: 480px) {
              .hero-title {
                font-size: 1.25rem;
              }
              .profile-avatar-wrap {
                width: 80px;
                height: 80px;
              }
              .profile-avatar {
                font-size: 1.75rem;
              }
              .form-input, .form-textarea, .form-select {
                padding: 8px 12px;
                font-size: 0.75rem;
              }
              .toggle-row {
                padding: 10px;
              }
              .toggle-icon {
                width: 32px;
                height: 32px;
                font-size: 0.875rem;
              }
              .toggle-label {
                font-size: 0.6875rem;
              }
              .toggle-desc {
                font-size: 0.5625rem;
              }
            }
          `}</style>

          {/* Toast Messages */}
          {successMsg && (
            <div className="toast toast-success">✓ {successMsg}</div>
          )}
          {errorMsg && (
            <div className="toast toast-error">⚠ {errorMsg}</div>
          )}

          {/* Hero */}
          <div className="hero">
            <h1 className="hero-title">Configuración</h1>
            <p className="hero-desc">Gestiona tu perfil, preferencias y seguridad de tu cuenta.</p>
          </div>

          {/* Grid Layout */}
          <div className="grid-layout">
            {/* Main Column */}
            <div>
              {/* Profile Section */}
              <div className="card profile-section">
                <div className="profile-layout">
                  {/* Avatar */}
                  <div className="profile-avatar-wrap">
                    <div className="profile-avatar">{userInitial}</div>
                    <div className="profile-avatar-overlay">📷</div>
                  </div>

                  {/* Form */}
                  <div className="profile-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Nombre Completo</label>
                        <input
                          className="form-input"
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Tu nombre"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                          className="form-input"
                          type="email"
                          value={userEmail}
                          disabled
                          style={{ opacity: 0.6, cursor: 'not-allowed' }}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bio Profesional</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Describe tu perfil financiero..."
                      />
                    </div>
                    <button
                      className="save-btn"
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="card security-section" style={{ marginTop: 24 }}>
                <div className="security-header">
                  <div className="security-header-left">
                    <span style={{ fontSize: '1.25rem' }}>🔒</span>
                    <div>
                      <h3 className="security-title">Protocolos de Seguridad</h3>
                      <p className="security-desc">Gestión de sesiones activas y estado de encriptación</p>
                    </div>
                  </div>
                  <div className="security-actions">
                    <button className="change-pass-btn">Cambiar Contraseña</button>
                    <div className="tfa-badge">
                      <span className="tfa-text">2FA Activo</span>
                      <button className="toggle-switch active" style={{ width: 32, height: 16 }} />
                    </div>
                  </div>
                </div>

                {/* Sessions Table */}
                <div className="sessions-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Dispositivo / Sesión</th>
                        <th>Ubicación</th>
                        <th>Última Actividad</th>
                        <th style={{ textAlign: 'right' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <div className="session-device">
                            <span className="session-device-icon">💻</span>
                            <div>
                              <div className="session-device-name">Este Dispositivo</div>
                              <div className="session-device-browser">Chrome</div>
                            </div>
                          </div>
                        </td>
                        <td>Actual</td>
                        <td>Activo ahora</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="status-badge">Actual</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="danger-zone" style={{ marginTop: 24 }}>
                <div className="danger-icon">⚠️</div>
                <div className="danger-content">
                  <h3 className="danger-title">Zona de Peligro</h3>
                  <p className="danger-desc">
                    Al eliminar tu cuenta, se borrarán permanentemente tus metas, historial de ahorro, mensajes y tu acceso a la plataforma. Esta acción es irreversible.
                  </p>
                  <button
                    className="danger-btn"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? 'Eliminando...' : 'Eliminar mi cuenta permanentemente'}
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              {/* Subscription Card */}
              <div className="card sub-card">
                <div>
                  <div className="sub-header">
                    <div>
                      <h3 className="sub-title">Plan Gratuito</h3>
                      <p className="sub-desc">Acceso completo a Prosper</p>
                    </div>
                    <span className="sub-badge">Free</span>
                  </div>
                  <div className="sub-details">
                    <div className="sub-detail-row">
                      <span className="sub-detail-label">Metas activas</span>
                      <span className="sub-detail-value">Ilimitadas</span>
                    </div>
                    <div className="sub-detail-row">
                      <span className="sub-detail-label">Comunidad</span>
                      <span className="sub-detail-value">Incluida</span>
                    </div>
                  </div>
                </div>
                <button className="sub-btn">
                  Ver Planes Premium →
                </button>
              </div>

              {/* Account Preferences */}
              <div className="card prefs-section" style={{ marginTop: 24 }}>
                <h3 className="prefs-title">⚙️ Preferencias de Cuenta</h3>
                <div className="prefs-list">
                  <div className="pref-row">
                    <label className="form-label">Idioma de Interfaz</label>
                    <select
                      className="form-select"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="es">Español</option>
                      <option value="en">English (US)</option>
                    </select>
                  </div>
                  <div className="pref-row">
                    <label className="form-label">Moneda</label>
                    <select
                      className="form-select"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div className="toggle-row">
                    <div className="toggle-info">
                      <div className="toggle-icon">{theme === 'dark' ? '🌙' : '☀️'}</div>
                      <div className="toggle-text">
                        <span className="toggle-label">Modo Oscuro</span>
                        <span className="toggle-desc">Actual: {theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                      </div>
                    </div>
                    <button
                      className={`toggle-switch ${theme === 'dark' ? 'active' : ''}`}
                      onClick={toggleTheme}
                    />
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="card prefs-section" style={{ marginTop: 24 }}>
                <h3 className="prefs-title">🔔 Notificaciones</h3>
                <div className="prefs-list">
                  <div className="toggle-row">
                    <div className="toggle-info">
                      <div className="toggle-icon">📈</div>
                      <div className="toggle-text">
                        <span className="toggle-label">Alertas de Precio</span>
                        <span className="toggle-desc">Cambios en tiempo real</span>
                      </div>
                    </div>
                    <button
                      className={`toggle-switch ${priceAlerts ? 'active' : ''}`}
                      onClick={() => setPriceAlerts(!priceAlerts)}
                    />
                  </div>
                  <div className="toggle-row">
                    <div className="toggle-info">
                      <div className="toggle-icon">💰</div>
                      <div className="toggle-text">
                        <span className="toggle-label">Alertas de Presupuesto</span>
                        <span className="toggle-desc">Violaciones de límite</span>
                      </div>
                    </div>
                    <button
                      className={`toggle-switch ${budgetAlerts ? 'active' : ''}`}
                      onClick={() => setBudgetAlerts(!budgetAlerts)}
                    />
                  </div>
                  <div className="toggle-row">
                    <div className="toggle-info">
                      <div className="toggle-icon">💬</div>
                      <div className="toggle-text">
                        <span className="toggle-label">Mensajes de Comunidad</span>
                        <span className="toggle-desc">Notificaciones directas</span>
                      </div>
                    </div>
                    <button
                      className={`toggle-switch ${communityMsgs ? 'active' : ''}`}
                      onClick={() => setCommunityMsgs(!communityMsgs)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            Prosper Pro © 2026 — Inteligencia Financiera Encriptada
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
