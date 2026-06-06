'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InicioRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a1628',
      color: 'white',
    }}>
      <div className="landing-spinner" style={{ width: 40, height: 40, marginRight: 12 }} />
      <span>Redirigiendo...</span>
    </div>
  );
}
