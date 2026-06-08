'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CurrencyCode } from '@/types';

interface AuthContextType {
  user: any | null;
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
  const router = useRouter();
  const coreRef = useRef<any>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // Fast init: check localStorage synchronously, load Firebase only if needed
  useEffect(() => {
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
    await core.loginWithGoogleImpl();
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
    clearStoredTokens();
    setUser(null);
    if (coreRef.current) {
      try { await coreRef.current.logoutImpl(); } catch {}
    }
    router.push('/login');
  }, [router]);

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

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout,
      deleteAccount,
      wipeAllData,
      enableNotifications,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
