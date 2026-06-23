import { getAdminSessionCookieServer } from './adminCookieServer';
import { SUPER_ADMIN_UID } from '@/lib/constants/admin';

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDUGxu2cfgxVrgSS1xamE0NaVUOv7TnX2E';

async function verifyIdToken(idToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.users?.[0]?.localId || null;
  } catch {
    return null;
  }
}

export async function verifyAdminSession(): Promise<string | null> {
  const idToken = await getAdminSessionCookieServer();
  if (!idToken) return null;
  const uid = await verifyIdToken(idToken);
  if (!uid || uid !== SUPER_ADMIN_UID) return null;
  return uid;
}
