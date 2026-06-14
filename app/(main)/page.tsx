'use client';

import { useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';


const UpdateModal = lazy(() => import('@/app/components/UpdateModal').then(m => ({ default: m.UpdateModal })));
const Dashboard = lazy(() => import('@/app/components/Dashboard').then(m => ({ default: m.Dashboard })));

function LoadingHome() {
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

export default function Home() {
  const router = useRouter();
  const { user, loading, isGuest, authInitialized } = useAuth();

  useEffect(() => {
    if (loading || !authInitialized) return;
    if (!user && !isGuest) {
      router.replace('/inicio');
    }
  }, [user, loading, isGuest, authInitialized, router]);

  if (loading || !authInitialized || (!user && !isGuest)) {
    return <LoadingHome />;
  }

  return (
    <Suspense fallback={<LoadingHome />}>
      <UpdateModal version="1.0.2" />
      <Dashboard />
    </Suspense>
  );
}
