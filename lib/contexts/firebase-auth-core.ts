'use client';

import { auth, onAuthStateChanged, signOut, updateCurrentUser, type User } from '@/lib/firebase';
import { enableOfflinePersistence } from '@/lib/firebase';
import { createUserProfile, getUserProfile } from '@/lib/firestore/users';
import { registerDevice, updateDeviceLastActive, getUserDevices } from '@/lib/firestore/devices';
import { getDeviceInfo } from '@/lib/utils/deviceInfo';
import { notifyNewLogin } from '@/lib/firestore/notifications';
import type { CurrencyCode } from '@/types';

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

export function storeTokens(tokens: { localId: string; email?: string; displayName?: string; photoUrl?: string; idToken: string; refreshToken: string }) {
  try {
    const json = JSON.stringify(tokens);
    localStorage.setItem('prosper_auth', json);
    sessionStorage.setItem('prosper_auth', json);
  } catch {}
}

export function clearStoredTokens() {
  try { localStorage.removeItem('prosper_auth'); } catch {}
  try { sessionStorage.removeItem('prosper_auth'); } catch {}
}

export function getStoredTokens() {
  try {
    const raw = localStorage.getItem('prosper_auth') || sessionStorage.getItem('prosper_auth');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

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
    // Registrar/actualizar dispositivo
    try {
      const deviceInfo = getDeviceInfo();
      const existingDevices = await getUserDevices(u.uid);
      const isNewDevice = !existingDevices.some((d) => d.deviceId === deviceInfo.deviceId);
      const isFirstDevice = existingDevices.length === 0;
      await registerDevice(u.uid, deviceInfo);
      // Auto-assign admin to first device
      if (isFirstDevice || isNewDevice) {
        const devicesAfter = await getUserDevices(u.uid);
        const hasAdmin = devicesAfter.some((d) => d.isAdmin === true);
        if (!hasAdmin) {
          const { setAdminDevice } = await import('@/lib/firestore/devices');
          await setAdminDevice(u.uid, deviceInfo.deviceId);
        }
      }
      // Notificar a otros dispositivos sobre el nuevo inicio de sesión
      try {
        await notifyNewLogin(
          u.uid,
          deviceInfo.deviceName,
          deviceInfo.deviceType,
          deviceInfo.browser,
          deviceInfo.os
        );
      } catch (e) {
        console.error('Error sending new login notification:', e);
      }
    } catch (e) {
      console.error('Error registering device:', e);
    }
    try {
      const { requestNotificationPermission } = await import('@/lib/firestore/notifications');
      await requestNotificationPermission();
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  } catch (error) {
    console.error('Error in onUserReady:', error);
  }
}

export async function initAuth({
  setUser,
  setLoading,
}: {
  setUser: (u: User | null) => void;
  setLoading: (v: boolean) => void;
}) {
  if (!auth) {
    setLoading(false);
    return () => {};
  }
  await enableOfflinePersistence();

  const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      setUser(firebaseUser);
      await onUserReady(firebaseUser);
    } else {
      const tokens = getStoredTokens();
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
            // Actualizar lastActive del dispositivo en initAuth
            try {
              const deviceInfo = getDeviceInfo();
              await updateDeviceLastActive(userObj.uid, deviceInfo.deviceId);
            } catch (e) {
              console.error('Error updating device lastActive:', e);
            }
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
    setLoading(false);
  });

  return unsub;
}

export async function loginWithGoogleImpl() {
  if (!auth) throw new Error('Firebase Auth no está disponible.');
  const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  if (result.user) {
    const idToken = await result.user.getIdToken();
    storeTokens({
      localId: result.user.uid,
      email: result.user.email || undefined,
      displayName: result.user.displayName || undefined,
      photoUrl: result.user.photoURL || undefined,
      idToken,
      refreshToken: (result.user as any).refreshToken || '',
    });
    await onUserReady(result.user);
  }
  return result.user;
}

export async function loginWithEmailImpl(email: string, pass: string) {
  if (!auth) throw new Error('Firebase Auth no está disponible.');
  if (!navigator.onLine) throw { code: 'auth/network-request-failed', message: 'Sin conexión a internet.' };
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
  await onUserReady(userCred.user);
  return userCred.user;
}

export async function changePasswordImpl(currentPassword: string, newPassword: string, user: User) {
  if (!auth || !user?.email) throw new Error('Firebase Auth no está disponible.');
  const { signInWithEmailAndPassword, updatePassword } = await import('firebase/auth');
  // Re-authenticate with current password
  const userCred = await signInWithEmailAndPassword(auth, user.email, currentPassword);
  // Update password
  await updatePassword(userCred.user, newPassword);
  // Refresh and store new tokens
  const idToken = await userCred.user.getIdToken(true);
  storeTokens({
    localId: userCred.user.uid,
    email: userCred.user.email || undefined,
    displayName: userCred.user.displayName || undefined,
    photoUrl: userCred.user.photoURL || undefined,
    idToken,
    refreshToken: (userCred.user as any).refreshToken || '',
  });
}

export async function registerWithEmailImpl(email: string, pass: string, name: string, currency?: CurrencyCode, language?: string, theme?: string) {
  if (!auth) return;
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
  await createUserProfile({
    uid: userCred.user.uid,
    displayName: name,
    email: email,
    photoURL: null,
    createdAt: Date.now(),
    currency: currency || 'USD',
    showProfile: true,
    language: language || 'es',
    theme: theme || 'dark',
  });
  await onUserReady(userCred.user);
  return userCred.user;
}

export async function logoutImpl() {
  clearStoredTokens();
  if (auth) try { await signOut(auth); } catch {}
}

export async function deleteAccountImpl(user: User) {
  if (!auth || !user) return { success: false, error: 'No hay usuario autenticado' };
  try {
    const { wipeAllUserData } = await import('@/lib/firestore/accounts');
    const result = await wipeAllUserData(user.uid);
    try {
      const { deleteUser } = await import('firebase/auth');
      await deleteUser(user);
    } catch {}
    clearStoredTokens();
    return { success: true, wiped: result.wiped };
  } catch (e: any) {
    if (e?.code === 'auth/requires-recent-login') {
      return { success: false, needsReauth: true, error: 'Debes volver a iniciar sesión por seguridad antes de eliminar tu cuenta.' };
    }
    return { success: false, error: e?.message || 'Error desconocido al eliminar la cuenta.' };
  }
}

export async function wipeAllDataImpl(user: User) {
  if (!auth || !user) return { success: false, error: 'No hay usuario autenticado' };
  try {
    const { wipeAllUserData } = await import('@/lib/firestore/accounts');
    const result = await wipeAllUserData(user.uid);
    return { success: true, wiped: result.wiped, errors: result.errors };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error desconocido al borrar datos.' };
  }
}

export async function enableNotificationsImpl() {
  const { requestNotificationPermission } = await import('@/lib/firestore/notifications');
  return requestNotificationPermission();
}
