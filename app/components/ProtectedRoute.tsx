'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

function AuthSkeleton() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #f8fafc)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid var(--border-default, #e5e7eb)',
          borderTopColor: 'var(--color-prosper-green, #3DCC8E)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 12px',
        }} />
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #666)' }}>
          Cargando...
        </p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const redirecting = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user && !redirecting.current) {
      redirecting.current = true;
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <AuthSkeleton />;
  }

  return <>{children}</>;
}
