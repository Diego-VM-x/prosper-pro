'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { subscribeToUserProfile, updateUserProfile } from '@/lib/firestore/users';
import { useTheme } from '../components/ThemeProvider';
import { IconX, IconEdit, IconTrash, IconCheck, IconSun, IconMoon, IconLogout } from '../components/icons';
import type { UserProfile } from '@/types';

export default function ConfiguracionPage() {
  const { user, logout, deleteAccount } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToUserProfile(user.uid, (p) => {
      setProfile(p);
      if (p?.displayName) setNewName(p.displayName);
    });
    return () => unsub();
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

  const handlePhotoURL = async () => {
    if (!user?.uid) return;
    const url = prompt('URL de la foto de perfil:');
    if (url && url.trim()) {
      setSaving(true);
      try {
        await updateUserProfile(user.uid, { photoURL: url.trim() });
        setSuccessMsg('Foto actualizada correctamente');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (e) {
        console.error(e);
      } finally {
        setSaving(false);
      }
    }
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

              <div className="setting-item setting-item-danger">
                <div className="setting-item-icon">
                  <IconTrash width={18} />
                </div>
                <div className="setting-item-content">
                  <p className="setting-item-title">Eliminar Cuenta</p>
                  <p className="setting-item-desc">Esta acción no se puede deshacer</p>
                </div>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Eliminar
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
                  <span className="modal-danger-icon">⚠️</span> Eliminar Cuenta
                </h2>
                <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}><IconX width={20} /></button>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro? Se eliminarán todos tus datos:</p>
                <ul className="danger-list">
                  <li>🎯 Metas y progreso financiero</li>
                  <li>💰 Transacciones y registros</li>
                  <li>📚 Progreso de cursos</li>
                  <li>🏆 Logros y experiencia</li>
                </ul>
                <p className="danger-warning">Esta acción no se puede deshacer.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    try {
                      await deleteAccount();
                    } catch (e) {
                      console.error('Error al eliminar cuenta:', e);
                      alert('Error al eliminar la cuenta. Intenta de nuevo.');
                    }
                  }}
                >
                  Confirmar Eliminación
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
          .setting-item-danger .setting-item-icon {
            background: rgba(239,68,68,0.1);
            color: var(--color-error);
          }
          .setting-item-danger .setting-item-title {
            color: var(--color-error);
          }

          /* Buttons */
          .btn-sm {
            padding: 6px 12px;
            font-size: 0.8125rem;
          }
          .btn-danger {
            background: var(--color-error);
            color: white;
          }
          .btn-danger:hover {
            background: #dc2626;
            transform: translateY(-1px);
          }

          /* Modal */
          .modal-danger {
            border: 1px solid rgba(239,68,68,0.3);
          }
          .modal-danger .modal-title {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--color-error);
          }
          .modal-danger-icon {
            font-size: 1.25rem;
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
          }
          .danger-warning {
            font-size: 0.75rem;
            color: var(--color-error);
            font-weight: 600;
          }

          @media (max-width: 768px) {
            .settings-layout { max-width: 100%; }
            .profile-header { flex-direction: column; text-align: center; padding: 20px; }
            .edit-name-form { flex-direction: column; }
            .edit-name-form .form-input { width: 100%; }
            .setting-item { padding: 12px 8px; }
            .setting-item-icon { width: 36px; height: 36px; }
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
