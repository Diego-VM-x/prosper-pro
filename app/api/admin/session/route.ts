import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionCookieServer } from '@/lib/utils/adminCookieServer';

const SUPER_ADMIN_UID = 'qpjtErB8lxWmxNdbOmoCdqZBeAl1';
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

export async function GET() {
  const idToken = await getAdminSessionCookieServer();
  if (!idToken) {
    return NextResponse.json({ uid: null }, { status: 401 });
  }
  const uid = await verifyIdToken(idToken);
  if (!uid || uid !== SUPER_ADMIN_UID) {
    return NextResponse.json({ uid: null }, { status: 401 });
  }
  return NextResponse.json({ uid });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const idToken = body.idToken;
  if (!idToken || typeof idToken !== 'string') {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }
  const uid = await verifyIdToken(idToken);
  if (!uid || uid !== SUPER_ADMIN_UID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const response = NextResponse.json({ uid });
  response.cookies.set('prosper_admin_session', idToken, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
