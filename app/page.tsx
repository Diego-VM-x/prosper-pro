'use client';

import { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/contexts/AuthContext';
import { UpdateModal } from '@/app/components/UpdateModal';

const Dashboard = dynamic(() => import('@/app/components/Dashboard').then((m) => ({ default: m.Dashboard })), {
  ssr: false,
  loading: () => (
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
  ),
});

const LandingPage = dynamic(() => import('@/app/components/landing/LandingPage').then((m) => ({ default: m.LandingPage })), {
  ssr: false,
  loading: () => (
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
  ),
});

export default function Home() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading || !mounted) {
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

  if (user) {
    return (
      <>
        <UpdateModal />
        <Suspense fallback={null}>
          <Dashboard />
        </Suspense>
      </>
    );
  }

  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  );
}
