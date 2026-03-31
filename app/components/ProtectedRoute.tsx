'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

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
  }, [user, loading]);

  if (loading || !user) {
    return null;
  }

  return <>{children}</>;
}
