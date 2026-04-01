'use client';

/**
 * @file ThemeProvider.tsx
 * @description Wrapper de next-themes para evitar flicker al cargar.
 * Mantiene la API existente (theme, toggleTheme) para compatibilidad.
 */

import { useTheme as useNextTheme, ThemeProvider as NextThemesProvider } from 'next-themes';
import React, { createContext, useContext, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

function ThemeProviderInner({ children }: { children: React.ReactNode }) {
  const { theme: nextTheme, setTheme } = useNextTheme();

  const toggleTheme = useCallback(() => {
    setTheme(nextTheme === 'dark' ? 'light' : 'dark');
  }, [nextTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme: (nextTheme as Theme) || 'light', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      storageKey="prosper-pro-theme"
    >
      <ThemeProviderInner>{children}</ThemeProviderInner>
    </NextThemesProvider>
  );
}
