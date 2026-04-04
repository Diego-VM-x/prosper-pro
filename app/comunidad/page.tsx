'use client';

import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default function ComunidadPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '4rem', marginBottom: '16px' }}>👥</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            Comunidad
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0 }}>
            Próximamente — Ranking, miembros y actividad
          </p>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
