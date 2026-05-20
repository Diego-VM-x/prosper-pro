'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  onAuthStateChanged,
  User,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile, getUserProfile } from '@/lib/firestore/users';
import { seedUserData } from '@/lib/seed';
import type { CurrencyCode } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, currency?: CurrencyCode) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; needsReauth?: boolean; error?: string }>;
  wipeAllData: () => Promise<{ success: boolean; wiped?: string[]; errors?: string[]; error?: string }>;
  enableNotifications: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
  deleteAccount: async () => ({ success: false, error: 'No disponible' }),
  wipeAllData: async () => ({ success: false, error: 'No disponible' }),
  enableNotifications: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          try {
            const profile = await getUserProfile(firebaseUser.uid);
            if (!profile) {
              await createUserProfile({
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName,
                email: firebaseUser.email,
                photoURL: firebaseUser.photoURL,
                createdAt: Date.now(),
                isSeeded: false,
                currency: 'USD' as CurrencyCode,
              });
              try {
                await seedUserData(firebaseUser.uid);
              } catch (seedErr) {
                console.error('Seed error:', seedErr);
              }
            }
            // Solicitar permiso para notificaciones push
            try {
              const { requestNotificationPermission } = await import('@/lib/firestore/notifications');
              await requestNotificationPermission();
            } catch (notifErr) {
              console.error('Notification permission error:', notifErr);
            }
          } catch (profileErr) {
            console.error('Profile error:', profileErr);
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error('Auth init error:', e);
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth no está disponible. Verifica las variables de entorno.');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error('Firebase Auth no está disponible. Verifica las variables de entorno.');
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name: string, currency?: CurrencyCode) => {
    if (!auth) return;
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName: name });
    // Create profile with selected currency
    await createUserProfile({
      uid: userCredential.user.uid,
      displayName: name,
      email: email,
      photoURL: null,
      createdAt: Date.now(),
      isSeeded: false,
      currency: currency || 'USD',
    });
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  const deleteAccount = async (): Promise<{ success: boolean; needsReauth?: boolean; error?: string }> => {
    if (!auth || !user) return { success: false, error: 'No hay usuario autenticado' };

    try {
      const uid = user.uid;
      console.log('[deleteAccount] Iniciando eliminación para uid:', uid);

      // 1. Eliminar TODOS los datos de Firestore con wipeAllUserData
      const { wipeAllUserData } = await import('@/lib/firestore/accounts');
      console.log('[deleteAccount] Eliminando todos los datos de Firestore...');
      const result = await wipeAllUserData(uid);
      console.log('[deleteAccount] Colecciones eliminadas:', result.wiped);
      if (result.errors.length > 0) {
        console.warn('[deleteAccount] Errores al eliminar:', result.errors);
      }

      // 2. Eliminar usuario de Firebase Auth
      console.log('[deleteAccount] Eliminando usuario de Auth...');
      await deleteUser(user);
      console.log('[deleteAccount] Usuario eliminado exitosamente');
      router.push('/login');
      return { success: true };
    } catch (e: any) {
      console.error('[deleteAccount] Error:', e);
      if (e?.code === 'auth/requires-recent-login') {
        return { success: false, needsReauth: true, error: 'Debes volver a iniciar sesión por seguridad antes de eliminar tu cuenta.' };
      }
      if (e?.code === 'permission-denied') {
        return { success: false, error: 'Error de permisos. Verifica las reglas de Firestore en la consola de Firebase.' };
      }
      return { success: false, error: e?.message || 'Error desconocido al eliminar la cuenta.' };
    }
  };

  const enableNotifications = async (): Promise<boolean> => {
    const { requestNotificationPermission } = await import('@/lib/firestore/notifications');
    return requestNotificationPermission();
  };

  const wipeAllData = async (): Promise<{ success: boolean; wiped?: string[]; errors?: string[]; error?: string }> => {
    if (!auth || !user) return { success: false, error: 'No hay usuario autenticado' };

    try {
      const uid = user.uid;
      console.log('[wipeAllData] Iniciando limpieza para uid:', uid);

      const { wipeAllUserData } = await import('@/lib/firestore/accounts');
      const result = await wipeAllUserData(uid);
      console.log('[wipeAllData] Colecciones eliminadas:', result.wiped);
      if (result.errors.length > 0) {
        console.warn('[wipeAllData] Errores:', result.errors);
      }

      // Recrear cuentas por defecto después de borrar todo
      const { createDefaultAccounts } = await import('@/lib/firestore/accounts');
      await createDefaultAccounts(uid);
      console.log('[wipeAllData] Cuentas por defecto recreadas');

      return { success: true, wiped: result.wiped, errors: result.errors };
    } catch (e: any) {
      console.error('[wipeAllData] Error:', e);
      return { success: false, error: e?.message || 'Error desconocido al borrar datos.' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout, deleteAccount, wipeAllData, enableNotifications }}>
      {children}
    </AuthContext.Provider>
  );
};
