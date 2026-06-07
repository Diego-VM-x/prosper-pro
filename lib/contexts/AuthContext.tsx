'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, updateCurrentUser, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { enableOfflinePersistence } from '@/lib/firebase';
import { createUserProfile, getUserProfile } from '@/lib/firestore/users';

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

function createUserObject(response: { localId: string; email?: string; displayName?: string; photoUrl?: string; idToken: string; refreshToken: string }): User {
  return {
    uid: response.localId,
    email: response.email || null,
    displayName: response.displayName || null,
    photoURL: response.photoUrl || null,
    emailVerified: false,
    isAnonymous: false,
    phoneNumber: null,
    tenantId: null,
    providerData: [],
    metadata: {
      createdAt: Date.now().toString(),
      lastLoginAt: Date.now().toString(),
      lastSignInTime: new Date().toISOString(),
      creationTime: new Date().toISOString(),
    },
    providerId: 'firebase',
    toJSON: () => ({ uid: response.localId, email: response.email, stsTokenManager: { accessToken: response.idToken, refreshToken: response.refreshToken } }),
    delete: async () => {},
    getIdToken: async () => response.idToken,
    getIdTokenResult: async () => ({
      token: response.idToken,
      claims: {},
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      signInProvider: null,
      signInSecondFactor: null,
    }),
    reload: async () => {},
  } as unknown as User;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!auth) {
        if (!cancelled) setLoading(false);
        return;
      }
      await enableOfflinePersistence();

      const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (cancelled) return;
        if (firebaseUser) {
          setUser(firebaseUser);
          await onUserReady(firebaseUser);
        } else {
          const tokens = await getStoredTokens();
          if (tokens && tokens.idToken) {
            const userObj = createUserObject({
              localId: tokens.localId,
              email: tokens.email,
              displayName: tokens.displayName,
              photoUrl: tokens.photoUrl,
              idToken: tokens.idToken,
              refreshToken: tokens.refreshToken,
            });
            setUser(userObj);
            if (auth) {
              try { await updateCurrentUser(auth, userObj); } catch {}
            }
            try {
              const { getUserDataRest } = await import('@/lib/firebase-auth-rest');
              const data = await getUserDataRest(tokens.idToken);
              if (data && data.localId) {
                await onUserReady(userObj);
              } else {
                clearStoredTokens();
                setUser(null);
              }
            } catch {
              clearStoredTokens();
              setUser(null);
            }
          }
        }
        if (!cancelled) setLoading(false);
      });
      return () => { cancelled = true; unsub(); };
    }
    init();
    }, []);

    async function onUserReady(u: User) {
      try {
        const profile = await getUserProfile(u.uid);
        if (!profile) {
          await createUserProfile({
            uid: u.uid,
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            createdAt: Date.now(),
            currency: 'USD' as CurrencyCode,
            showProfile: true,
          });
        }

        // Request notification permission
        try {
          const { requestNotificationPermission } = await import('@/lib/firestore/notifications');
          await requestNotificationPermission();
        } catch (error) {
          console.error('Failed to request notification permission:', error);
        }

        // Initialize Capacitor native push notifications (no-op on web).
        try {
          // Native push notifications are not available on web
        } catch (error) {
          console.error('Failed to init native push notifications:', error);
        }
      } catch (error) {
        console.error('Error in onUserReady:', error);
      }
    }

  async function getStoredTokens() {
    try {
      const raw = localStorage.getItem('prosper_auth') || sessionStorage.getItem('prosper_auth');
      if (raw) return JSON.parse(raw);
      return null;
    } catch { return null; }
  }

function storeTokens(tokens: { localId: string; email?: string; displayName?: string; photoUrl?: string; idToken: string; refreshToken: string }) {
  try {
    const json = JSON.stringify(tokens);
    localStorage.setItem('prosper_auth', json);
    sessionStorage.setItem('prosper_auth', json);
  } catch {}
}

function clearStoredTokens() {
  try { localStorage.removeItem('prosper_auth'); } catch {}
  try { sessionStorage.removeItem('prosper_auth'); } catch {}
}

  async function setAppUser(tokens: { localId: string; email?: string; displayName?: string; photoUrl?: string; idToken: string; refreshToken: string }) {
    storeTokens(tokens);
    const userObj = createUserObject({
      localId: tokens.localId,
      email: tokens.email,
      displayName: tokens.displayName,
      photoUrl: tokens.photoUrl,
      idToken: tokens.idToken,
      refreshToken: tokens.refreshToken,
    });
    setUser(userObj);
    if (auth) {
      try { await updateCurrentUser(auth, userObj); } catch {}
    }
    try {
      const profile = await getUserProfile(tokens.localId);
      if (!profile) {
        await createUserProfile({
          uid: tokens.localId,
          displayName: tokens.displayName || null,
          email: tokens.email || null,
          photoURL: tokens.photoUrl || null,
          createdAt: Date.now(),
          currency: 'USD' as CurrencyCode,
          showProfile: true,
        });
      }
    } catch {}
  }

  const loginWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth no está disponible.');
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error('Firebase Auth no está disponible.');
    if (!navigator.onLine) throw { code: 'auth/network-request-failed', message: 'Sin conexión a internet.' };
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCred = await signInWithEmailAndPassword(auth, email, pass);
      storeTokens({
        localId: userCred.user.uid,
        email: userCred.user.email || undefined,
        displayName: userCred.user.displayName || undefined,
        photoUrl: userCred.user.photoURL || undefined,
        idToken: await userCred.user.getIdToken(),
        refreshToken: (userCred.user as any).refreshToken || '',
      });
      setUser(userCred.user);
      await onUserReady(userCred.user);
    } catch (e: any) {
      throw e;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, currency?: CurrencyCode) => {
    if (!auth) return;
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const userCred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCred.user, { displayName: name });
      storeTokens({
        localId: userCred.user.uid,
        email: userCred.user.email || undefined,
        displayName: name,
        photoUrl: userCred.user.photoURL || undefined,
        idToken: await userCred.user.getIdToken(),
        refreshToken: (userCred.user as any).refreshToken || '',
      });
      setUser(userCred.user);
      await createUserProfile({
        uid: userCred.user.uid,
        displayName: name,
        email: email,
        photoURL: null,
        createdAt: Date.now(),
        currency: currency || 'USD',
        showProfile: true,
      });
      await onUserReady(userCred.user);
    } catch (e: any) {
      throw e;
    }
  };

  const logout = async () => {
    clearStoredTokens();
    setUser(null);
    if (auth) try { await signOut(auth); } catch {}
    router.push('/login');
  };

  const deleteAccount = async () => {
    if (!auth || !user) return { success: false, error: 'No hay usuario autenticado' };
    try {
      const { wipeAllUserData } = await import('@/lib/firestore/accounts');
      const result = await wipeAllUserData(user.uid);
      try {
        const { deleteUser } = await import('firebase/auth');
        await deleteUser(user);
      } catch {}
      clearStoredTokens();
      setUser(null);
      router.push('/login');
      return { success: true, wiped: result.wiped };
    } catch (e: any) {
      if (e?.code === 'auth/requires-recent-login') {
        return { success: false, needsReauth: true, error: 'Debes volver a iniciar sesión por seguridad antes de eliminar tu cuenta.' };
      }
      return { success: false, error: e?.message || 'Error desconocido al eliminar la cuenta.' };
    }
  };

  const enableNotifications = async () => {
    const { requestNotificationPermission } = await import('@/lib/firestore/notifications');
    return requestNotificationPermission();
  };

  const wipeAllData = async () => {
    if (!auth || !user) return { success: false, error: 'No hay usuario autenticado' };
    try {
      const { wipeAllUserData } = await import('@/lib/firestore/accounts');
      const result = await wipeAllUserData(user.uid);
      return { success: true, wiped: result.wiped, errors: result.errors };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Error desconocido al borrar datos.' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout, deleteAccount, wipeAllData, enableNotifications }}>
      {children}
    </AuthContext.Provider>
  );
};
