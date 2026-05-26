import { UpdateModal } from '@/app/components/UpdateModal';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { Dashboard } from '@/app/components/Dashboard';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <UpdateModal />
      <Dashboard />
    </ProtectedRoute>
  );
}
