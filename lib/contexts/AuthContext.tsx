'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CurrencyCode } from '@/types';
import { removeDevice, updateDeviceLastActive, getUserDevices } from '@/lib/firestore/devices';
import { getDeviceInfoForHeartbeat, clearDeviceId, getSessionToken, clearSessionToken } from '@/lib/utils/deviceInfo';
import { db } from '@/lib/firebase';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  isGuest: boolean;
  loginWithGoogle: () => Promise<any | null>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, currency?: CurrencyCode, language?: string, theme?: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; needsReauth?: boolean; error?: string }>;
  wipeAllData: () => Promise<{ success: boolean; wiped?: string[]; errors?: string[]; error?: string }>;
  sendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  reloadUser: () => Promise<{ success: boolean; emailVerified?: boolean; error?: string }>;
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
  changePassword: async () => ({ success: false, error: 'No disponible' }),
  deleteAccount: async () => ({ success: false, error: 'No disponible' }),
  wipeAllData: async () => ({ success: false, error: 'No disponible' }),
  sendVerificationEmail: async () => ({ success: false, error: 'No disponible' }),
  reloadUser: async () => ({ success: false, error: 'No disponible' }),
  enableNotifications: async () => false,
  enterGuestMode: () => {},
  exitGuestMode: () => {},
});

export const useAuth = () => useContext(AuthContext);

function clearStoredTokens() {
  try { localStorage.removeItem('prosper_auth'); } catch {}
  try { sessionStorage.removeItem('prosper_auth'); } catch {}
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

  // Initialize auth state: rely solely on Firebase Auth's onAuthStateChanged
  useEffect(() => {
    // Check for guest mode first
    try {
      const guestFlag = localStorage.getItem('prosper_guest');
      if (guestFlag === '1') {
        enterGuestMode();
        return;
      }
    } catch {}

    // Load Firebase auth core which uses onAuthStateChanged as the single source of truth
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

  const registerWithEmail = useCallback(async (email: string, pass: string, name: string, currency?: CurrencyCode, language?: string, theme?: string) => {
    const core = coreRef.current || await import('./firebase-auth-core');
    coreRef.current = core;
    const firebaseUser = await core.registerWithEmailImpl(email, pass, name, currency, language, theme);
    setUser(firebaseUser);
  }, []);

  const logout = useCallback(async () => {
    // 1. Sign out from Firebase Auth FIRST (prevents ghost sessions)
    if (coreRef.current) {
      try { await coreRef.current.logoutImpl(); } catch {}
    }
    // 2. Remove device from Firestore
    if (user?.uid) {
      try {
        const { deviceId } = await getDeviceInfoForHeartbeat(user.uid);
        await removeDevice(user.uid, deviceId);
      } catch {
        // If removal fails, device becomes a ghost — but user is already signed out
      }
    }
    // 3. Clear local state and storage
    try {
      const { clearIndexedDbPersistence } = await import('firebase/firestore');
      await clearIndexedDbPersistence(db);
    } catch {}
    clearStoredTokens();
    clearSessionToken();
    clearDeviceId(user?.uid);
    exitGuestMode();
    setUser(null);
    router.push('/login');
  }, [router, exitGuestMode, user?.uid]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    const core = coreRef.current || await import('./firebase-auth-core');
    coreRef.current = core;
    try {
      await core.changePasswordImpl(currentPassword, newPassword, user);
      return { success: true };
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        return { success: false, error: 'La contraseña actual es incorrecta' };
      }
      return { success: false, error: e.message || 'Error al cambiar la contraseña' };
    }
  }, [user]);

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

  const sendVerificationEmail = useCallback(async () => {
    const core = coreRef.current || await import('./firebase-auth-core');
    coreRef.current = core;
    return core.sendEmailVerificationImpl();
  }, []);

  const reloadUser = useCallback(async () => {
    const core = coreRef.current || await import('./firebase-auth-core');
    coreRef.current = core;
    const result = await core.reloadUserImpl();
    if (result.success && result.emailVerified !== undefined) {
      setUser((prev: any) => prev ? { ...prev, emailVerified: result.emailVerified } : prev);
    }
    return result;
  }, []);

  // Heartbeat: verificar cada 60s si el dispositivo sigue registrado
  // y actualizar lastActive + isOnline
  useEffect(() => {
    if (!user?.uid || isGuest) return;

    let intervalId: ReturnType<typeof setInterval>;

    const checkDevice = async () => {
      try {
        const { deviceId } = await getDeviceInfoForHeartbeat(user.uid);
        const localSessionToken = getSessionToken();
        const devices = await getUserDevices(user.uid);
        const device = devices.find((d) => d.deviceId === deviceId);

        // If device not registered, another session kicked us out.
        // Only enforce sessionToken check if the device has one stored AND we have one locally.
        // This prevents false logouts for legacy sessions without tokens.
        const tokenMismatch = device?.sessionToken && localSessionToken && device.sessionToken !== localSessionToken;
        if (!device || tokenMismatch) {
          try {
            const { clearIndexedDbPersistence } = await import('firebase/firestore');
            await clearIndexedDbPersistence(db);
          } catch {}
          clearStoredTokens();
          clearSessionToken();
          clearDeviceId(user.uid);
          exitGuestMode();
          setUser(null);
          router.push('/login');
          return;
        }

        // Update activity (marks as online)
        await updateDeviceLastActive(user.uid, deviceId);
      } catch {
        // Silenciar errores de red
      }
    };

    // Delay first check by 5s to give onUserReady time to register the device
    // Prevents race condition where heartbeat runs before device registration
    const timeoutId = setTimeout(() => {
      checkDevice();
      intervalId = setInterval(checkDevice, 60000);
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
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
      changePassword,
      deleteAccount,
      wipeAllData,
      sendVerificationEmail,
      reloadUser,
      enableNotifications,
      enterGuestMode,
      exitGuestMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
