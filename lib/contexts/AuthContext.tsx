'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CurrencyCode } from '@/types';
import { removeDevice, isDeviceRegistered, updateDeviceLastActive } from '@/lib/firestore/devices';
import { getDeviceInfo, clearDeviceId } from '@/lib/utils/deviceInfo';
import { db } from '@/lib/firebase';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  isGuest: boolean;
  loginWithGoogle: () => Promise<any | null>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, currency?: CurrencyCode) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; needsReauth?: boolean; error?: string }>;
  wipeAllData: () => Promise<{ success: boolean; wiped?: string[]; errors?: string[]; error?: string }>;
  enableNotifications: () => Promise<boolean>;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isGuest: false,
  loginWithGoogle: async () => null,
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
  deleteAccount: async () => ({ success: false, error: 'No disponible' }),
  wipeAllData: async () => ({ success: false, error: 'No disponible' }),
  enableNotifications: async () => false,
  enterGuestMode: () => {},
  exitGuestMode: () => {},
});

export const useAuth = () => useContext(AuthContext);

function getStoredTokens() {
  try {
    const raw = localStorage.getItem('prosper_auth') || sessionStorage.getItem('prosper_auth');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function clearStoredTokens() {
  try { localStorage.removeItem('prosper_auth'); } catch {}
  try { sessionStorage.removeItem('prosper_auth'); } catch {}
}

function createUserObject(response: { localId: string; email?: string; displayName?: string; photoUrl?: string; idToken: string; refreshToken: string }) {
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
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();
  const coreRef = useRef<any>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
    setUser({
      uid: null,
      email: null,
      displayName: 'Invitado',
      photoURL: null,
      isAnonymous: true,
      metadata: {},
      getIdToken: async () => '',
    });
    setLoading(false);
    try { localStorage.setItem('prosper_guest', '1'); } catch {}
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
    setUser(null);
    try { localStorage.removeItem('prosper_guest'); } catch {}
    try { sessionStorage.removeItem('prosper_guest'); } catch {}
  }, []);

  // Fast init: check localStorage synchronously, load Firebase only if needed
  useEffect(() => {
    // Check for guest mode first
    try {
      const guestFlag = localStorage.getItem('prosper_guest');
      if (guestFlag === '1') {
        enterGuestMode();
        return;
      }
    } catch {}

    const tokens = getStoredTokens();
    if (!tokens) {
      setLoading(false);
      return;
    }

    // Show user from tokens immediately (avoids blank screen)
    const userObj = createUserObject({
      localId: tokens.localId,
      email: tokens.email,
      displayName: tokens.displayName,
      photoUrl: tokens.photoUrl,
      idToken: tokens.idToken,
      refreshToken: tokens.refreshToken,
    });
    setUser(userObj);

    // Lazy load Firebase auth core
    let cancelled = false;
    import('./firebase-auth-core').then((core) => {
      coreRef.current = core;
      if (cancelled) return;
      core.initAuth({ setUser, setLoading }).then((unsub) => {
        if (!cancelled) unsubRef.current = unsub;
      });
    });

    return () => {
      cancelled = true;
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const core = coreRef.current || await import('./firebase-auth-core');
    coreRef.current = core;
    const firebaseUser = await core.loginWithGoogleImpl();
    if (firebaseUser) {
      setUser(firebaseUser);
    }
    return firebaseUser;
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string) => {
    const core = coreRef.current || await import('./firebase-auth-core');
    coreRef.current = core;
    const firebaseUser = await core.loginWithEmailImpl(email, pass);
    setUser(firebaseUser);
  }, []);

  const registerWithEmail = useCallback(async (email: string, pass: string, name: string, currency?: CurrencyCode) => {
    const core = coreRef.current || await import('./firebase-auth-core');
    coreRef.current = core;
    const firebaseUser = await core.registerWithEmailImpl(email, pass, name, currency);
    setUser(firebaseUser);
  }, []);

  const logout = useCallback(async () => {
    // Eliminar dispositivo de Firestore antes de limpiar tokens
    if (user?.uid) {
      try {
        const { deviceId } = getDeviceInfo();
        await removeDevice(user.uid, deviceId);
      } catch {}
    }
    // Limpiar caché offline de Firestore para evitar datos stale
    try {
      const { clearIndexedDbPersistence } = await import('firebase/firestore');
      await clearIndexedDbPersistence(db);
    } catch {}
    clearStoredTokens();
    clearDeviceId();
    exitGuestMode();
    setUser(null);
    if (coreRef.current) {
      try { await coreRef.current.logoutImpl(); } catch {}
    }
    router.push('/login');
  }, [router, exitGuestMode, user?.uid]);

  const deleteAccount = useCallback(async () => {
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const core = coreRef.current || await import('./firebase-auth-core');
    coreRef.current = core;
    const result = await core.deleteAccountImpl(user);
    if (result.success) {
      setUser(null);
      router.push('/login');
    }
    return result;
  }, [user, router]);

  const wipeAllData = useCallback(async () => {
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const core = coreRef.current || await import('./firebase-auth-core');
    coreRef.current = core;
    return core.wipeAllDataImpl(user);
  }, [user]);

  const enableNotifications = useCallback(async () => {
    const core = coreRef.current || await import('./firebase-auth-core');
    coreRef.current = core;
    return core.enableNotificationsImpl();
  }, []);

  // Heartbeat: verificar cada 60s si el dispositivo sigue registrado
  // y actualizar lastActive + isOnline
  useEffect(() => {
    if (!user?.uid || isGuest) return;

    const { deviceId } = getDeviceInfo();
    let intervalId: ReturnType<typeof setInterval>;

    const checkDevice = async () => {
      try {
        const stillRegistered = await isDeviceRegistered(user.uid, deviceId);
        if (!stillRegistered) {
          // Sesión cerrada remotamente
          try {
            const { clearIndexedDbPersistence } = await import('firebase/firestore');
            await clearIndexedDbPersistence(db);
          } catch {}
          clearStoredTokens();
          clearDeviceId();
          exitGuestMode();
          setUser(null);
          router.push('/login');
          return;
        }
        // Actualizar actividad (marca como online)
        await updateDeviceLastActive(user.uid, deviceId);
      } catch {
        // Silenciar errores de red
      }
    };

    // Primera ejecución inmediata
    checkDevice();
    intervalId = setInterval(checkDevice, 60000);
    return () => clearInterval(intervalId);
  }, [user?.uid, isGuest, router]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isGuest,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout,
      deleteAccount,
      wipeAllData,
      enableNotifications,
      enterGuestMode,
      exitGuestMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
