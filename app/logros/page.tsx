'use client';

import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default function LogrosPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="coming-soon">
          <span className="coming-soon-icon">🏆</span>
          <h1 className="coming-soon-title">Logros</h1>
          <p className="coming-soon-subtitle">Próximamente — Galería de logros y medallas</p>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
