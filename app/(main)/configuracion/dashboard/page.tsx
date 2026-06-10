'use client';

import { DashboardLayout } from '@/app/components/DashboardLayout';
import { DashboardCustomizer } from '@/app/components/dashboard/DashboardCustomizer';

export default function DashboardSettingsPage() {
  return (
    <DashboardLayout>
      <DashboardCustomizer />
    </DashboardLayout>
  );
}
