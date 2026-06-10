'use client';

import '@/app/dashboard-customizer.css';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import { DashboardCustomizer } from '@/app/components/dashboard/DashboardCustomizer';

export default function DashboardSettingsPage() {
  return (
    <DashboardLayout>
      <DashboardCustomizer />
    </DashboardLayout>
  );
}
