'use client';

import { auth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, type User } from '@/lib/firebase';
import { enableOfflinePersistence } from '@/lib/firebase';
import { createUserProfile, getUserProfile } from '@/lib/firestore/users';
import { registerDevice } from '@/lib/firestore/devices';
import { getDeviceInfo, storeSessionToken } from '@/lib/utils/deviceInfo';

import type { CurrencyCode } from '@/types';

export interface StoredTokens {
  localId: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  idToken: string;
  refreshToken: string;
  providerId?: 'password' | 'google.com';
}

export function storeTokens(tokens: StoredTokens) {
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

export function getStoredTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem('prosper_auth') || sessionStorage.getItem('prosper_auth');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

async function isNativePlatform(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const { Capacitor } = await import('@capacitor/core');
  return Capacitor.isNativePlatform();
}

async function waitForAuthUser(timeoutMs = 10000): Promise<User> {
  if (!auth) throw new Error('Firebase Auth no está disponible.');
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timeout esperando sincronización de autenticación.'));
    }, timeoutMs);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(u);
      }
    });
  });
}

async function onUserReady(u: User) {
  // Register for push/local notifications in the background
  try {
    const { requestNotificationPermissions, registerPushNotifications } = await import('@/lib/notifications');
    const granted = await requestNotificationPermissions();
    if (granted) {
      await registerPushNotifications(u.uid);
    }
  } catch {
    // Notifications are not critical for auth
  }

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
        language: 'es',
        showProfile: true,
      });
    }
    // Registrar/actualizar dispositivo
    try {
      const deviceInfo = await getDeviceInfo(u.uid);
      if (deviceInfo.sessionToken) {
        storeSessionToken(deviceInfo.sessionToken);
      }
      await registerDevice(u.uid, deviceInfo);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.error('Error registering device');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Error in onUserReady');
  }
}

export async function initAuth({
  setUser,
  setLoading,
  setAuthInitialized,
}: {
  setUser: (u: User | null) => void;
  setLoading: (v: boolean) => void;
  setAuthInitialized: (v: boolean) => void;
}) {
  if (!auth) {
    setLoading(false);
    setAuthInitialized(true);
    return () => {};
  }

  // Ensure auth state persists across reloads/app restarts
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Persistence may already be set; ignore
  }

  await enableOfflinePersistence();

  let initialized = false;
  const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Firebase Auth is the single source of truth — user is verified
      setUser(firebaseUser);
      // onUserReady runs in the background so it never blocks the UI
      onUserReady(firebaseUser).catch(() => {});
    } else {
      // No authenticated Firebase session
      // Do NOT clear stored tokens here — onAuthStateChanged fires with null
      // during Firebase initialization before it verifies the persisted session.
      // Tokens are only cleared on explicit logout.
      setUser(null);
    }
    setLoading(false);
    if (!initialized) {
      initialized = true;
      setAuthInitialized(true);
    }
  });

  return unsub;
}

export async function loginWithGoogleImpl(newsConsent?: boolean) {
  if (!auth) throw new Error('Firebase Auth no está disponible.');

  const isNative = await isNativePlatform();

  let result: { user: User | null; isNewUser?: boolean } = { user: null };

  if (isNative) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const nativeResult = await FirebaseAuthentication.signInWithGoogle();
    const firebaseUser = await waitForAuthUser();
    result = { user: firebaseUser, isNewUser: nativeResult.additionalUserInfo?.isNewUser };
  } else {
    const { signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } = await import('firebase/auth');
    const popupResult = await signInWithPopup(auth, new GoogleAuthProvider());
    const additionalInfo = getAdditionalUserInfo(popupResult);
    result = { user: popupResult.user, isNewUser: additionalInfo?.isNewUser };
  }

  if (result.user) {
    const idToken = await result.user.getIdToken();
    storeTokens({
      localId: result.user.uid,
      email: result.user.email || undefined,
      displayName: result.user.displayName || undefined,
      photoUrl: result.user.photoURL || undefined,
      idToken,
      refreshToken: (result.user as any).refreshToken || '',
      providerId: 'google.com',
    });
    if (result.isNewUser) {
      await createUserProfile({
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        createdAt: Date.now(),
        currency: 'USD' as CurrencyCode,
        showProfile: true,
        language: 'es',
        theme: 'dark',
        newsConsent: newsConsent || false,
      });
    }
    onUserReady(result.user).catch(() => {});
  }
  return result.user;
}

export async function loginWithEmailImpl(email: string, pass: string) {
  if (!auth) throw new Error('Firebase Auth no está disponible.');
  if (!navigator.onLine) throw { code: 'auth/network-request-failed', message: 'Sin conexión a internet.' };

  const isNative = await isNativePlatform();
  let userCred: { user: User };

  if (isNative) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    await FirebaseAuthentication.signInWithEmailAndPassword({ email, password: pass });
    const firebaseUser = await waitForAuthUser();
    userCred = { user: firebaseUser };
  } else {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    userCred = await signInWithEmailAndPassword(auth, email, pass);
  }

  storeTokens({
    localId: userCred.user.uid,
    email: userCred.user.email || undefined,
    displayName: userCred.user.displayName || undefined,
    photoUrl: userCred.user.photoURL || undefined,
    idToken: await userCred.user.getIdToken(),
    refreshToken: (userCred.user as any).refreshToken || '',
    providerId: 'password',
  });
  onUserReady(userCred.user).catch(() => {});
  return userCred.user;
}

export async function changePasswordImpl(currentPassword: string, newPassword: string, user: User) {
  if (!auth || !user?.email) throw new Error('Firebase Auth no está disponible.');

  const isNative = await isNativePlatform();
  let currentUser: User;

  if (isNative) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    await FirebaseAuthentication.signInWithEmailAndPassword({ email: user.email, password: currentPassword });
    await FirebaseAuthentication.updatePassword({ newPassword });
    currentUser = await waitForAuthUser();
  } else {
    const { signInWithEmailAndPassword, updatePassword } = await import('firebase/auth');
    const userCred = await signInWithEmailAndPassword(auth, user.email, currentPassword);
    await updatePassword(userCred.user, newPassword);
    currentUser = userCred.user;
  }

  // Refresh and store new tokens
  const idToken = await currentUser.getIdToken(true);
  storeTokens({
    localId: currentUser.uid,
    email: currentUser.email || undefined,
    displayName: currentUser.displayName || undefined,
    photoUrl: currentUser.photoURL || undefined,
    idToken,
    refreshToken: (currentUser as any).refreshToken || '',
    providerId: 'password',
  });
}

export async function registerWithEmailImpl(email: string, pass: string, name: string, currency?: CurrencyCode, language?: string, theme?: string, newsConsent?: boolean) {
  if (!auth) return;

  const isNative = await isNativePlatform();
  let userCred: { user: User };

  if (isNative) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    await FirebaseAuthentication.createUserWithEmailAndPassword({ email, password: pass });
    await FirebaseAuthentication.updateProfile({ displayName: name });
    const firebaseUser = await waitForAuthUser();
    userCred = { user: firebaseUser };
  } else {
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    userCred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCred.user, { displayName: name });
  }

  storeTokens({
    localId: userCred.user.uid,
    email: userCred.user.email || undefined,
    displayName: name,
    photoUrl: userCred.user.photoURL || undefined,
    idToken: await userCred.user.getIdToken(),
    refreshToken: (userCred.user as any).refreshToken || '',
    providerId: 'password',
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
    newsConsent: newsConsent || false,
  });
  await onUserReady(userCred.user);
  return userCred.user;
}

export async function logoutImpl() {
  clearStoredTokens();
  if (await isNativePlatform()) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    try { await FirebaseAuthentication.signOut(); } catch {}
  } else if (auth) {
    try { await signOut(auth); } catch {}
  }
}

export async function deleteAccountImpl(user: User) {
  if (!auth || !user) return { success: false, error: 'No hay usuario autenticado' };
  try {
    const { wipeAllUserData } = await import('@/lib/firestore/accounts');
    const result = await wipeAllUserData(user.uid);
    try {
      if (await isNativePlatform()) {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        await FirebaseAuthentication.deleteUser();
      } else {
        const { deleteUser } = await import('firebase/auth');
        await deleteUser(user);
      }
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

export async function enableNotificationsImpl(userId?: string) {
  try {
    const { requestNotificationPermissions, registerPushNotifications } = await import('@/lib/notifications');
    const granted = await requestNotificationPermissions();
    if (granted && userId) {
      await registerPushNotifications(userId);
    }
    return granted;
  } catch {
    return false;
  }
}

export async function sendEmailVerificationImpl() {
  if (!auth || !auth.currentUser) return { success: false, error: 'No hay usuario autenticado.' };
  try {
    if (await isNativePlatform()) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      await FirebaseAuthentication.sendEmailVerification();
    } else {
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(auth.currentUser, {
        url: typeof window !== 'undefined' ? `${window.location.origin}/configuracion?tab=seguridad` : 'https://prosper-pro.vercel.app/configuracion?tab=seguridad',
        handleCodeInApp: false,
      });
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al enviar el correo de verificación.' };
  }
}

export async function reloadUserImpl() {
  if (!auth || !auth.currentUser) return { success: false, error: 'No hay usuario autenticado.' };
  try {
    await auth.currentUser.reload();
    return { success: true, emailVerified: auth.currentUser.emailVerified };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al actualizar el usuario.' };
  }
}
