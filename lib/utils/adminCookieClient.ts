'use client';

const ADMIN_COOKIE_NAME = 'prosper_admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export function setAdminSessionCookie(idToken: string) {
  if (typeof document === 'undefined') return;
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${ADMIN_COOKIE_NAME}=${encodeURIComponent(idToken)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  } catch {
    // Ignorar entornos donde document.cookie no está disponible
  }
}

export function clearAdminSessionCookie() {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${ADMIN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {
    // Ignorar
  }
}
