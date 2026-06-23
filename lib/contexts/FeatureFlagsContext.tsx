'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeToGlobalConfig } from '@/lib/firestore/admin';
import type { GlobalConfig } from '@/types';

interface FeatureFlagsValue extends GlobalConfig {
  loading: boolean;
  error: string | null;
}

const defaultValue: FeatureFlagsValue = {
  maintenanceMode: false,
  hideAndroidDownload: false,
  disableRegister: false,
  loading: true,
  error: null,
};

const FeatureFlagsContext = createContext<FeatureFlagsValue>(defaultValue);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<GlobalConfig>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeToGlobalConfig((next) => {
      if (!mounted) return;
      setConfig(next);
      setLoading(false);
      setError(null);
    });

    // Si la suscripción tarda, dejar de mostrar spinner tras un breve timeout
    const timeout = setTimeout(() => {
      if (mounted && loading) setLoading(false);
    }, 1500);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const value = useMemo<FeatureFlagsValue>(() => ({ ...config, loading, error }), [config, loading, error]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
