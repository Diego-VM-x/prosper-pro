import { cookies } from 'next/headers';

const ADMIN_COOKIE_NAME = 'prosper_admin_session';

export async function getAdminSessionCookieServer(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    return value ? decodeURIComponent(value) : null;
  } catch {
    return null;
  }
}
