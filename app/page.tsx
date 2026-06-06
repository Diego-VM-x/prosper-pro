'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/inicio');
      }
    }
  }, [user, loading, router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      color: 'var(--text-secondary)',
    }}>
      <div className="landing-spinner" style={{ width: 32, height: 32, marginRight: 12 }} />
      <span>Cargando Prosper Pro...</span>
    </div>
  );
}
