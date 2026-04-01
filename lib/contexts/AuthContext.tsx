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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; needsReauth?: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
  deleteAccount: async () => ({ success: false, error: 'No disponible' }),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) return;
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
            });
            try {
              await seedUserData(firebaseUser.uid);
            } catch (seedErr) {
              console.error('Seed error:', seedErr);
            }
          }
        } catch (profileErr) {
          console.error('Profile error:', profileErr);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (!auth) return;
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    if (!auth) return;
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName: name });
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

      // 1. Eliminar datos de Firestore
      const { deleteGoal } = await import('@/lib/firestore/goals');
      const { deleteTransaction } = await import('@/lib/firestore/transactions');
      const { deleteReminder } = await import('@/lib/firestore/reminders');
      const { deleteDoc: fsDeleteDoc, collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      // Eliminar metas
      console.log('[deleteAccount] Eliminando metas...');
      const goalsQ = query(collection(db, 'goals'), where('userId', '==', uid));
      const goalsSnap = await getDocs(goalsQ);
      console.log('[deleteAccount] Metas encontradas:', goalsSnap.size);
      if (goalsSnap.size > 0) {
        await Promise.all(goalsSnap.docs.map((d) => deleteGoal(d.id)));
      }

      // Eliminar transacciones
      console.log('[deleteAccount] Eliminando transacciones...');
      const txQ = query(collection(db, 'transactions'), where('userId', '==', uid));
      const txSnap = await getDocs(txQ);
      console.log('[deleteAccount] Transacciones encontradas:', txSnap.size);
      if (txSnap.size > 0) {
        await Promise.all(txSnap.docs.map((d) => deleteTransaction(d.id)));
      }

      // Eliminar recordatorios
      console.log('[deleteAccount] Eliminando recordatorios...');
      const remQ = query(collection(db, 'reminders'), where('userId', '==', uid));
      const remSnap = await getDocs(remQ);
      console.log('[deleteAccount] Recordatorios encontrados:', remSnap.size);
      if (remSnap.size > 0) {
        await Promise.all(remSnap.docs.map((d) => deleteReminder(d.id)));
      }

      // Eliminar colecciones adicionales
      const collectionsToDelete = ['notifications', 'xp_states', 'achievements', 'study_sessions', 'user_profiles', 'user_course_progress'];
      for (const col of collectionsToDelete) {
        try {
          console.log('[deleteAccount] Eliminando colección:', col);
          const q = query(collection(db, col), where('userId', '==', uid));
          const snap = await getDocs(q);
          if (snap.size > 0) {
            await Promise.all(snap.docs.map((d) => fsDeleteDoc(d.ref)));
          }
        } catch (err) {
          console.log('[deleteAccount] Colección no existe o error en', col, ':', err);
        }
      }

      // 2. Eliminar usuario de Firebase Auth (Storage se omite por problemas de CORS)
      console.log('[deleteAccount] Eliminando usuario de Auth...');
      await deleteUser(user);
      console.log('[deleteAccount] Usuario eliminado exitosamente');
      router.push('/login');
      return { success: true };
    } catch (e: any) {
      console.error('[deleteAccount] Error:', e);
      // Detectar error de re-authentication
      if (e?.code === 'auth/requires-recent-login') {
        return { success: false, needsReauth: true, error: 'Debes volver a iniciar sesión por seguridad antes de eliminar tu cuenta.' };
      }
      // Detectar error de permisos
      if (e?.code === 'permission-denied') {
        return { success: false, error: 'Error de permisos. Verifica las reglas de Firestore en la consola de Firebase.' };
      }
      return { success: false, error: e?.message || 'Error desconocido al eliminar la cuenta.' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};
