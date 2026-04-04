'use client';

import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default function ComunidadPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="coming-soon">
          <span className="coming-soon-icon">👥</span>
          <h1 className="coming-soon-title">Comunidad</h1>
          <p className="coming-soon-subtitle">Próximamente — Ranking, miembros y actividad</p>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
