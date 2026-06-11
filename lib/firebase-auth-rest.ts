'use client';

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

interface RestAuthResponse {
  idToken: string;
  refreshToken: string;
  localId: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  registered?: boolean;
}

export async function signInWithEmailAndPasswordRest(email: string, password: string): Promise<RestAuthResponse> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const code = mapRestError(data.error?.message);
    throw { code, message: data.error?.message || 'Error al iniciar sesión' };
  }
  return res.json();
}

export async function signUpRest(email: string, password: string, displayName?: string): Promise<RestAuthResponse> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true, displayName }),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const code = mapRestError(data.error?.message);
    throw { code, message: data.error?.message || 'Error al registrar' };
  }
  return res.json();
}

export async function exchangeGoogleTokenRest(googleIdToken: string): Promise<RestAuthResponse> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: `id_token=${googleIdToken}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnSecureToken: true,
      }),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw { code: data.error?.message || 'google-error', message: 'Error al autenticar con Google' };
  }
  return res.json();
}

export async function refreshTokenRest(refreshToken: string): Promise<{ idToken: string; refreshToken: string }> {
  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    }
  );
  if (!res.ok) throw new Error('Error al refrescar token');
  return res.json();
}

export async function getUserDataRest(idToken: string) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!res.ok) throw new Error('Error al obtener datos del usuario');
  const data = await res.json();
  return data.users?.[0] || null;
}

function mapRestError(msg?: string): string {
  if (!msg) return 'auth/unknown';
  if (msg.includes('EMAIL_NOT_FOUND') || msg.includes('INVALID_LOGIN_CREDENTIALS')) return 'auth/invalid-credential';
  if (msg.includes('INVALID_PASSWORD')) return 'auth/wrong-password';
  if (msg.includes('USER_DISABLED')) return 'auth/user-disabled';
  if (msg.includes('EMAIL_EXISTS')) return 'auth/email-already-in-use';
  if (msg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) return 'auth/too-many-requests';
  if (msg.includes('WEAK_PASSWORD')) return 'auth/weak-password';
  if (msg.includes('INVALID_EMAIL')) return 'auth/invalid-email';
  if (msg.includes('OPERATION_NOT_ALLOWED')) return 'auth/operation-not-allowed';
  return 'auth/unknown';
}

export async function updatePasswordRest(idToken: string, newPassword: string): Promise<RestAuthResponse> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, password: newPassword, returnSecureToken: true }),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const code = mapRestError(data.error?.message);
    throw { code, message: data.error?.message || 'Error al actualizar la contraseña' };
  }
  return res.json();
}

export function isCapacitor(): boolean {
  return typeof (window as any)?.Capacitor !== 'undefined' && (window as any)?.Capacitor?.isNativePlatform();
}
