'use client';

import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default function AyudaPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="coming-soon">
          <span className="coming-soon-icon">❓</span>
          <h1 className="coming-soon-title">Ayuda</h1>
          <p className="coming-soon-subtitle">Próximamente — FAQ, guías y soporte</p>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
