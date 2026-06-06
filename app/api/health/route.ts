import { NextResponse } from 'next/server';

const REQUIRED_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

export const dynamic = 'force-dynamic';

export async function GET() {
  const vars: Record<string, { present: boolean; preview: string }> = {};
  let allPresent = true;

  for (const key of REQUIRED_VARS) {
    const value = process.env[key];
    const present = !!value;
    if (!present) allPresent = false;
    vars[key] = {
      present,
      preview: present ? `${value!.slice(0, 4)}...${value!.slice(-4)}` : 'MISSING',
    };
  }

  return NextResponse.json(
    {
      ok: allPresent,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      variables: vars,
      message: allPresent
        ? 'All Firebase environment variables are present.'
        : 'Some Firebase environment variables are MISSING. Check Vercel Dashboard → Settings → Environment Variables, then redeploy.',
    },
    { status: allPresent ? 200 : 503 }
  );
}
