import '../animations.css';
import '@/app/dashboard.css';
import '@/app/dashboard-customizer.css';
import '@/app/finanzas.css';

import { Suspense } from 'react';
import { SearchProvider } from '@/lib/contexts/SearchContext';
import { GoalsProvider } from '@/lib/contexts/GoalsContext';
import { CurrencyProvider } from '@/lib/contexts/CurrencyContext';
import { ToastProvider } from '@/app/components/Toast';
import { DashboardLayoutProvider } from '@/lib/contexts/DashboardLayoutContext';

function LoadingSkeleton() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-card, #ffffff)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48,
          height: 48,
          border: '4px solid var(--border-default, #e5e7eb)',
          borderTopColor: 'var(--color-prosper-green, #3DCC8E)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #666)' }}>
          Cargando Prosper Pro...
        </p>
      </div>
    </div>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CurrencyProvider>
      <GoalsProvider>
        <SearchProvider>
          <ToastProvider>
            <DashboardLayoutProvider>
              <Suspense fallback={<LoadingSkeleton />}>
                {children}
              </Suspense>
            </DashboardLayoutProvider>
          </ToastProvider>
        </SearchProvider>
      </GoalsProvider>
    </CurrencyProvider>
  );
}
