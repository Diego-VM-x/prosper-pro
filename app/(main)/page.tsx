'use client';
import '@/app/dashboard.css';

import { useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { DashboardLayoutProvider } from '@/lib/contexts/DashboardLayoutContext';

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
  const { user, loading, isGuest } = useAuth();

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      router.replace('/inicio');
    }
  }, [user, loading, isGuest, router]);

  if (loading || (!user && !isGuest)) {
    return <LoadingHome />;
  }

  return (
    <Suspense fallback={<LoadingHome />}>
      <DashboardLayoutProvider>
        <UpdateModal version="0.9.8" />
        <Dashboard />
      </DashboardLayoutProvider>
    </Suspense>
  );
}
