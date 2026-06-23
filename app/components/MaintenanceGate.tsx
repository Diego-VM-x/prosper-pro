'use client';

import React from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useFeatureFlags } from '@/lib/contexts/FeatureFlagsContext';
import { SUPER_ADMIN_UID } from '@/lib/constants/admin';
import styles from './MaintenanceGate.module.css';

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, authInitialized } = useAuth();
  const { maintenanceMode, loading: flagsLoading } = useFeatureFlags();

  const isAdmin = !!user && user.uid === SUPER_ADMIN_UID;
  const isBusy = authLoading || !authInitialized || flagsLoading;

  if (isBusy) {
    return (
      <div className={styles.overlay}>
        <div className={styles.spinner} />
        <p className={styles.message}>Cargando Prosper Pro…</p>
      </div>
    );
  }

  if (maintenanceMode && !isAdmin) {
    return (
      <div className={styles.overlay} data-theme="dark">
        <div className={styles.card}>
          <img src="/logo-icon.png" alt="Prosper" width={64} height={64} className={styles.logo} />
          <h1 className={styles.title}>En mantenimiento</h1>
          <p className={styles.message}>
            Estamos realizando mejoras para brindarte una mejor experiencia.
            Vuelve a intentarlo en unos minutos.
          </p>
          <button
            className={styles.refreshBtn}
            onClick={() => window.location.reload()}
            type="button"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
