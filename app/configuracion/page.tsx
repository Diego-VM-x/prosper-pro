'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { subscribeToUserProfile, updateUserProfile } from '@/lib/firestore/users';
import { useTheme } from '../components/ThemeProvider';
import { IconX, IconEdit, IconTrash, IconCheck } from '../components/icons';
import type { UserProfile } from '@/types';

export default function ConfiguracionPage() {
  const { user, logout } = useAuth();
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
          <div style={{ padding: '12px 16px', background: 'rgba(61,204,142,0.1)', borderRadius: 'var(--radius-md)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconCheck width={16} style={{ color: 'var(--color-prosper-green)' }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-prosper-green)', fontWeight: 600 }}>{successMsg}</span>
          </div>
        )}

        {/* Perfil */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Perfil</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Foto */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0,
              }}>
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  profile?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'
                )}
              </div>
              <div>
                <button className="btn btn-outline" onClick={handlePhotoURL} style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>
                  Cambiar foto
                </button>
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Nombre</label>
              {editingName ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Tu nombre"
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary" onClick={handleSaveName} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button className="btn btn-outline" onClick={() => { setEditingName(false); setNewName(profile?.displayName || ''); }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {profile?.displayName || 'Sin nombre'}
                  </span>
                  <button className="btn btn-outline" onClick={() => setEditingName(true)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                    <IconEdit width={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Email</label>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{user?.email || 'No disponible'}</span>
            </div>

            {/* UID */}
            <div>
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>ID de Usuario</label>
              <code style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', background: 'var(--bg-input)', padding: '4px 8px', borderRadius: 'var(--radius-md)' }}>
                {user?.uid}
              </code>
            </div>
          </div>
        </div>

        {/* Preferencias */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Preferencias</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Tema */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Tema</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Actual: {theme === 'dark' ? 'Oscuro' : 'Claro'}
                </p>
              </div>
              <button className="btn btn-outline" onClick={toggleTheme} style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>
                Cambiar a {theme === 'dark' ? 'Claro' : 'Oscuro'}
              </button>
            </div>
          </div>
        </div>

        {/* Cuenta */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Cuenta</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Cerrar sesión */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Cerrar Sesión</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Salir de tu cuenta actual</p>
              </div>
              <button className="btn btn-outline" onClick={logout} style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>
                Cerrar Sesión
              </button>
            </div>

            {/* Eliminar cuenta */}
            <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-error)', margin: 0 }}>Eliminar Cuenta</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Esta acción no se puede deshacer</p>
                </div>
                <button
                  className="btn"
                  style={{ padding: '6px 12px', fontSize: '0.8125rem', background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <IconTrash width={14} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal confirmar eliminación */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <h2 className="modal-title" style={{ color: 'var(--color-error)' }}>⚠️ Eliminar Cuenta</h2>
                <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}><IconX width={20} /></button>
              </div>
              <div className="modal-body">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  ¿Estás seguro? Se eliminarán todos tus datos: metas, transacciones, progreso y logros.
                </p>
                <p style={{ color: 'var(--color-error)', fontSize: '0.75rem', fontWeight: 600, marginTop: 8 }}>
                  Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
                <button
                  className="btn"
                  style={{ background: 'var(--color-error)', color: 'white' }}
                  onClick={() => {
                    // TODO: Implementar eliminación real con Firebase Auth
                    alert('Para eliminar tu cuenta, contacta a soporte o elimina manualmente desde la consola de Firebase.');
                    setShowDeleteConfirm(false);
                  }}
                >
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); }
          .form-input { width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.875rem; outline: none; box-sizing: border-box; }
          .form-input:focus { border-color: var(--color-prosper-green); }
          .btn { padding: 10px 20px; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; }
          .btn-primary { background: var(--color-prosper-green); color: white; }
          .btn-outline { background: transparent; border: 1px solid var(--border-default); color: var(--text-primary); }
          .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
          .modal-content { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); width: 90%; max-width: 420px; padding: 24px; }
          .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
          .modal-title { font-size: 1.25rem; font-weight: 700; margin: 0; }
          .modal-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.25rem; }
          .modal-body { display: flex; flex-direction: column; gap: 14px; }
          .modal-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
