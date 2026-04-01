'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '@/lib/firestore/users';
import { useTheme } from '../components/ThemeProvider';
import { IconX, IconEdit, IconCheck, IconSun, IconMoon, IconLogout } from '../components/icons';
import type { UserProfile } from '@/types';

// Icono de advertencia inline (evita dependencia externa)
const AlertTriangleIcon = ({ width = 24, className = '' }: { width?: number; className?: string }) => (
  <svg width={width} height={width} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default function ConfiguracionPage() {
  const { user, logout, deleteAccount } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReauthWarning, setShowReauthWarning] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const uid = user?.uid as string;
    if (!uid) return;
    let cancelled = false;
    async function loadProfile() {
      try {
        const p = await getUserProfile(uid);
        if (!cancelled) {
          setProfile(p);
          if (p?.displayName) setNewName(p.displayName);
        }
      } catch (e) { console.error(e); }
    }
    loadProfile();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const handleSaveName = async () => {
    if (!user?.uid || !newName.trim()) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { displayName: newName.trim() });
      setEditingName(false);
      setSuccessMsg('Nombre actualizado correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const reader = new FileReader();

    reader.onload = async (ev) => {
      img.src = ev.target?.result as string;
      img.onload = async () => {
        const MAX_SIZE = 300;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
        else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          setSaving(true);
          try {
            const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
            const storage = getStorage();
            const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}.jpg`);
            await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
            const url = await getDownloadURL(storageRef);
            await updateUserProfile(user.uid, { photoURL: url });
            setProfile((prev) => prev ? { ...prev, photoURL: url } : prev);
            setSuccessMsg('Foto actualizada correctamente');
            setTimeout(() => setSuccessMsg(''), 3000);
          } catch (err) {
            console.error('Error subiendo foto:', err);
          } finally {
            setSaving(false);
          }
        }, 'image/jpeg', 0.7);
      };
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoURL = async () => {
    fileInputRef.current?.click();
  };

  const userInitial = profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : '?');

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Configuración</h1>
            <p className="page-subtitle">Gestiona tu perfil y preferencias.</p>
          </div>
        </div>

        {successMsg && (
          <div className="success-toast">
            <IconCheck width={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="error-toast">
            <AlertTriangleIcon width={16} />
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="error-toast-close">✕</button>
          </div>
        )}

        <div className="settings-layout">
          {/* Panel de perfil */}
          <div className="settings-card profile-card">
            <div className="profile-header">
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="Foto" />
                  ) : (
                    userInitial
                  )}
                </div>
                <button className="profile-avatar-edit" onClick={handlePhotoURL} title="Cambiar foto">
                  📷
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
              </div>
              <div className="profile-info">
                {editingName ? (
                  <div className="edit-name-form">
                    <input
                      className="form-input"
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Tu nombre"
                      autoFocus
                    />
                    <button className="btn btn-sm btn-primary" onClick={handleSaveName} disabled={saving}>
                      {saving ? '...' : <IconCheck width={14} />}
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => { setEditingName(false); setNewName(profile?.displayName || ''); }}>
                      <IconX width={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="profile-name">{profile?.displayName || 'Sin nombre'}</h2>
                    <button className="edit-name-btn" onClick={() => setEditingName(true)}>
                      <IconEdit width={12} /> Editar
                    </button>
                  </>
                )}
                <p className="profile-email">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Preferencias */}
          <div className="settings-card">
            <h3 className="settings-section-title">Preferencias</h3>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-item-icon">
                  {theme === 'dark' ? <IconMoon width={18} /> : <IconSun width={18} />}
                </div>
                <div className="setting-item-content">
                  <p className="setting-item-title">Tema</p>
                  <p className="setting-item-desc">Actual: {theme === 'dark' ? 'Oscuro' : 'Claro'}</p>
                </div>
                <button className="btn btn-sm btn-outline" onClick={toggleTheme}>
                  {theme === 'dark' ? 'Claro' : 'Oscuro'}
                </button>
              </div>
            </div>
          </div>

          {/* Cuenta */}
          <div className="settings-card">
            <h3 className="settings-section-title">Cuenta</h3>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-item-icon">
                  <IconLogout width={18} />
                </div>
                <div className="setting-item-content">
                  <p className="setting-item-title">Cerrar Sesión</p>
                  <p className="setting-item-desc">Salir de tu cuenta actual</p>
                </div>
                <button className="btn btn-sm btn-outline" onClick={logout}>
                  Salir
                </button>
              </div>
            </div>
          </div>

          {/* ZONA DE PELIGRO */}
          <div className="settings-card danger-card">
            <div className="danger-card-content">
              <div className="danger-header">
                <div className="danger-icon-wrapper">
                  <AlertTriangleIcon width={20} />
                </div>
                <div className="danger-text">
                  <h3 className="danger-title">ZONA DE PELIGRO</h3>
                  <p className="danger-desc">
                    Al eliminar tu cuenta, perderás permanentemente todas tus metas, historial financiero y lecciones completadas. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              <div className="danger-action">
                <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                  <AlertTriangleIcon width={16} />
                  Eliminar Mi Cuenta Permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal confirmar eliminación */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-content modal-danger" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  <span className="modal-danger-icon"><AlertTriangleIcon width={20} /></span> Eliminar Cuenta
                </h2>
                <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}><IconX width={20} /></button>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro? Se eliminarán <strong>permanentemente</strong> todos tus datos:</p>
                <ul className="danger-list">
                  <li><span className="danger-x">✕</span> Metas y progreso financiero</li>
                  <li><span className="danger-x">✕</span> Transacciones y registros</li>
                  <li><span className="danger-x">✕</span> Progreso de cursos</li>
                  <li><span className="danger-x">✕</span> Logros y experiencia</li>
                </ul>
                <p className="danger-warning">⚠️ Esta acción no se puede deshacer.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    setErrorMsg('');
                    const result = await deleteAccount();
                    if (result.success) {
                      setShowDeleteConfirm(false);
                    } else if (result.needsReauth) {
                      setShowReauthWarning(true);
                      setShowDeleteConfirm(false);
                    } else {
                      setErrorMsg(result.error || 'Error al eliminar la cuenta.');
                    }
                  }}
                >
                  <AlertTriangleIcon width={14} />
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aviso de re-authentication */}
        {showReauthWarning && (
          <div className="modal-overlay" onClick={() => setShowReauthWarning(false)}>
            <div className="modal-content modal-reauth" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  <span className="modal-reauth-icon"><AlertTriangleIcon width={20} /></span> Verificación Requerida
                </h2>
                <button className="modal-close" onClick={() => setShowReauthWarning(false)}><IconX width={20} /></button>
              </div>
              <div className="modal-body">
                <p>Por seguridad, debes <strong>volver a iniciar sesión</strong> antes de poder eliminar tu cuenta.</p>
                <div className="reauth-notice">
                  🔒 Esto es para confirmar que eres tú quien realiza esta acción sensible.
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowReauthWarning(false)}>Entendido</button>
                <button className="btn btn-primary" onClick={async () => { await logout(); }}>
                  Ir a Iniciar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .success-toast {
            padding: 12px 16px;
            background: rgba(61,204,142,0.1);
            border: 1px solid rgba(61,204,142,0.2);
            border-radius: var(--radius-md);
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: fadeInUp 0.3s ease;
          }
          .success-toast span {
            font-size: 0.875rem;
            color: var(--color-prosper-green);
            font-weight: 600;
          }

          .error-toast {
            padding: 12px 16px;
            background: rgba(239,68,68,0.1);
            border: 1px solid rgba(239,68,68,0.2);
            border-radius: var(--radius-md);
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: fadeInUp 0.3s ease;
          }
          .error-toast span {
            font-size: 0.875rem;
            color: var(--color-error, #EF4444);
            font-weight: 600;
            flex: 1;
          }
          .error-toast-close {
            background: none;
            border: none;
            color: var(--color-error, #EF4444);
            cursor: pointer;
            font-size: 1rem;
            padding: 0;
          }

          .settings-layout {
            display: flex;
            flex-direction: column;
            gap: 20px;
            max-width: 640px;
          }

          .settings-card {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-xl);
            overflow: hidden;
            transition: box-shadow var(--transition-fast);
          }
          .settings-card:hover {
            box-shadow: var(--shadow-md);
          }

          /* Profile card */
          .profile-card {
            background: linear-gradient(135deg, var(--color-prosper-navy), var(--color-prosper-green));
            border: none;
          }
          .profile-header {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 24px;
          }
          .profile-avatar-wrapper {
            position: relative;
            flex-shrink: 0;
          }
          .profile-avatar {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: rgba(255,255,255,0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.75rem;
            font-weight: 700;
            color: white;
            border: 3px solid rgba(255,255,255,0.3);
            overflow: hidden;
          }
          .profile-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .profile-avatar-edit {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: white;
            color: var(--color-prosper-navy);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--color-prosper-green);
            cursor: pointer;
            transition: transform var(--transition-fast);
          }
          .profile-avatar-edit:hover {
            transform: scale(1.1);
          }
          .profile-info {
            flex: 1;
            min-width: 0;
          }
          .profile-name {
            font-size: 1.25rem;
            font-weight: 700;
            color: white;
            margin: 0 0 4px 0;
          }
          .profile-email {
            font-size: 0.8125rem;
            color: rgba(255,255,255,0.75);
            margin: 0;
          }
          .edit-name-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.75rem;
            color: rgba(255,255,255,0.7);
            background: rgba(255,255,255,0.15);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: var(--radius-sm);
            padding: 4px 8px;
            cursor: pointer;
            margin-top: 8px;
            transition: all var(--transition-fast);
          }
          .edit-name-btn:hover {
            background: rgba(255,255,255,0.25);
            color: white;
          }
          .edit-name-form {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .edit-name-form .form-input {
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 8px 12px;
            font-size: 0.875rem;
          }
          .edit-name-form .form-input::placeholder {
            color: rgba(255,255,255,0.5);
          }
          .edit-name-form .form-input:focus {
            border-color: white;
          }

          /* Settings list */
          .settings-section-title {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-tertiary);
            padding: 16px 20px 8px;
            margin: 0;
          }
          .settings-list {
            padding: 0 8px 8px;
          }
          .setting-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 12px;
            border-radius: var(--radius-md);
            transition: background var(--transition-fast);
          }
          .setting-item:hover {
            background: var(--bg-input);
          }
          .setting-item-icon {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-md);
            background: var(--bg-accent-soft);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-prosper-green);
            flex-shrink: 0;
          }
          .setting-item-content {
            flex: 1;
            min-width: 0;
          }
          .setting-item-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
          }
          .setting-item-desc {
            font-size: 0.75rem;
            color: var(--text-secondary);
            margin: 2px 0 0 0;
          }

          /* Danger card */
          .danger-card {
            border-color: rgba(239,68,68,0.3);
          }
          .danger-card:hover {
            box-shadow: 0 4px 12px rgba(239,68,68,0.1);
          }
          .danger-card-content {
            padding: 20px;
          }
          .danger-header {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            margin-bottom: 16px;
          }
          .danger-icon-wrapper {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-md);
            background: rgba(239,68,68,0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-error, #EF4444);
            flex-shrink: 0;
          }
          .danger-text {
            flex: 1;
          }
          .danger-title {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--color-error, #EF4444);
            margin: 0 0 6px 0;
          }
          .danger-desc {
            font-size: 0.8125rem;
            color: var(--text-secondary);
            margin: 0;
            line-height: 1.5;
          }
          .danger-action {
            padding-top: 16px;
            border-top: 1px solid rgba(239,68,68,0.15);
          }

          /* Buttons */
          .btn-sm {
            padding: 6px 12px;
            font-size: 0.8125rem;
          }
          .btn-danger {
            background: var(--color-error, #EF4444);
            color: white !important;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .btn-danger:hover {
            background: #dc2626;
            transform: translateY(-1px);
          }
          .btn-outline {
            color: var(--text-primary) !important;
          }

          /* Modal */
          .modal-danger {
            border: 1px solid rgba(239,68,68,0.3);
          }
          .modal-danger .modal-title {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--color-error, #EF4444);
          }
          .modal-danger-icon {
            display: inline-flex;
          }
          .modal-reauth .modal-title {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--color-gold-500);
          }
          .modal-reauth-icon {
            display: inline-flex;
            color: var(--color-gold-500);
          }
          .danger-list {
            margin: 12px 0;
            padding: 12px 16px;
            background: rgba(239,68,68,0.05);
            border-radius: var(--radius-md);
            list-style: none;
          }
          .danger-list li {
            font-size: 0.8125rem;
            color: var(--text-secondary);
            padding: 4px 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .danger-x {
            color: var(--color-error, #EF4444);
            font-weight: 700;
          }
          .danger-warning {
            font-size: 0.75rem;
            color: var(--color-error, #EF4444);
            font-weight: 600;
          }
          .reauth-notice {
            margin-top: 12px;
            padding: 12px 16px;
            background: rgba(245,158,11,0.08);
            border-radius: var(--radius-md);
            font-size: 0.8125rem;
            color: var(--text-secondary);
          }

          @media (max-width: 768px) {
            .settings-layout { max-width: 100%; }
            .profile-header { flex-direction: column; text-align: center; padding: 20px; }
            .edit-name-form { flex-direction: column; }
            .edit-name-form .form-input { width: 100%; }
            .setting-item { padding: 12px 8px; }
            .setting-item-icon { width: 36px; height: 36px; }
            .danger-header { flex-direction: column; align-items: center; text-align: center; }
            .danger-action .btn { width: 100%; justify-content: center; }
          }
          @media (max-width: 480px) {
            .profile-avatar { width: 64px; height: 64px; font-size: 1.5rem; }
            .profile-name { font-size: 1.125rem; }
            .modal-content { width: 95%; padding: 16px; }
            .modal-footer { flex-direction: column; }
            .modal-footer .btn { width: 100%; justify-content: center; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
