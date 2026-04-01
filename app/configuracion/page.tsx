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

    // Compresión con Canvas API nativa
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const reader = new FileReader();

    reader.onload = async (ev) => {
      img.src = ev.target?.result as string;
      img.onload = async () => {
        // Redimensionar a máximo 300px
        const MAX_SIZE = 300;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
        else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);

        // Convertir a blob con calidad 0.7
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Gestiona tu perfil y preferencias.</p>
        </div>

        {successMsg && (
          <div className="mb-5 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 animate-fade-in">
            <IconCheck width={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-300">{successMsg}</span>
          </div>
        )}

        <div className="flex flex-col gap-5 max-w-2xl">
          {/* Panel de perfil */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-800 dark:to-gray-900 rounded-xl overflow-hidden shadow-lg">
            <div className="flex items-center gap-5 p-6">
              <div className="relative flex-shrink-0">
                <div className="w-[72px] h-[72px] rounded-full bg-white/15 flex items-center justify-center text-2xl font-bold text-white border-3 border-white/30 overflow-hidden">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    userInitial
                  )}
                </div>
                <button
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white text-gray-900 flex items-center justify-center border-2 border-green-500 cursor-pointer hover:scale-110 transition-transform"
                  onClick={handlePhotoURL}
                  title="Cambiar foto"
                >
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
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex gap-2 items-center">
                    <input
                      className="flex-1 px-3 py-2 text-sm bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:border-white focus:outline-none"
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Tu nombre"
                      autoFocus
                    />
                    <button
                      className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
                      onClick={handleSaveName}
                      disabled={saving}
                    >
                      {saving ? '...' : <IconCheck width={14} />}
                    </button>
                    <button
                      className="px-3 py-1.5 text-xs bg-white/15 text-white border border-white/20 rounded-md hover:bg-white/25 transition-colors"
                      onClick={() => { setEditingName(false); setNewName(profile?.displayName || ''); }}
                    >
                      <IconX width={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-white m-0">{profile?.displayName || 'Sin nombre'}</h2>
                    <button
                      className="inline-flex items-center gap-1 text-xs text-white/70 bg-white/15 border border-white/20 rounded-md px-2 py-1 mt-2 hover:bg-white/25 hover:text-white transition-colors"
                      onClick={() => setEditingName(true)}
                    >
                      <IconEdit width={12} /> Editar
                    </button>
                  </>
                )}
                <p className="text-sm text-white/75 m-0 mt-1">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Preferencias */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-5 pt-4 pb-2 m-0">Preferencias</h3>
            <div className="px-2 pb-2">
              <div className="flex items-center gap-3.5 p-3.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
                  {theme === 'dark' ? <IconMoon width={18} /> : <IconSun width={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white m-0">Tema</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 m-0 mt-0.5">Actual: {theme === 'dark' ? 'Oscuro' : 'Claro'}</p>
                </div>
                <button
                  className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? 'Claro' : 'Oscuro'}
                </button>
              </div>
            </div>
          </div>

          {/* Cuenta */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-5 pt-4 pb-2 m-0">Cuenta</h3>
            <div className="px-2 pb-2">
              <div className="flex items-center gap-3.5 p-3.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0">
                  <IconLogout width={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white m-0">Cerrar Sesión</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 m-0 mt-0.5">Salir de tu cuenta actual</p>
                </div>
                <button
                  className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={logout}
                >
                  Salir
                </button>
              </div>
            </div>
          </div>

          {/* ZONA DE PELIGRO - Rediseñada */}
          <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangleIcon width={20} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400 m-0">ZONA DE PELIGRO</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 m-0 mt-1">
                    Al eliminar tu cuenta, perderás permanentemente todas tus metas, historial financiero y lecciones completadas. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-red-100 dark:border-red-900/30">
                <button
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <AlertTriangleIcon width={16} />
                  Eliminar Mi Cuenta Permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal confirmar eliminación - Rediseñado */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                    <AlertTriangleIcon width={20} className="text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Eliminar Cuenta</h2>
                </div>
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  <IconX width={18} />
                </button>
              </div>

              {/* Cuerpo del modal */}
              <div className="p-5">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  ¿Estás seguro? Se eliminarán <strong>permanentemente</strong> todos tus datos:
                </p>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-red-500">✕</span> Metas y progreso financiero
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-red-500">✕</span> Transacciones y registros
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-red-500">✕</span> Progreso de cursos
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-red-500">✕</span> Logros y experiencia
                  </li>
                </ul>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 m-0">
                    ⚠️ Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>

              {/* Footer del modal */}
              <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowReauthWarning(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                    <AlertTriangleIcon width={20} className="text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Verificación Requerida</h2>
                </div>
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => setShowReauthWarning(false)}>
                  <IconX width={18} />
                </button>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Por seguridad, debes <strong>volver a iniciar sesión</strong> antes de poder eliminar tu cuenta.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 m-0">
                    🔒 Esto es para confirmar que eres tú quien realiza esta acción sensible.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setShowReauthWarning(false)}
                >
                  Entendido
                </button>
                <button
                  className="flex-1 px-4 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors"
                  onClick={async () => {
                    await logout();
                  }}
                >
                  Ir a Iniciar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {errorMsg && (
          <div className="fixed bottom-4 right-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 animate-fade-in z-50 max-w-sm">
            <AlertTriangleIcon width={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300">{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="ml-2 text-red-400 hover:text-red-600 dark:hover:text-red-200">✕</button>
          </div>
        )}

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.25s ease-out;
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
