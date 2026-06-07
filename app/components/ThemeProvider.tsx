'use client';

import { useTheme as useNextTheme, ThemeProvider as NextThemesProvider } from 'next-themes';
import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'amoled';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

function ThemeProviderInner({ children }: { children: React.ReactNode }) {
  const { theme: nextTheme, setTheme: nextSetTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    nextSetTheme(t);
  }, [nextSetTheme]);

  const toggleTheme = useCallback(() => {
    const themes: Theme[] = ['light', 'dark', 'amoled'];
    const current = (nextTheme as Theme) || 'light';
    const idx = themes.indexOf(current);
    const next = themes[(idx + 1) % themes.length];
    nextSetTheme(next);
  }, [nextTheme, nextSetTheme]);

  // Evitar hydration mismatch: no renderizar children hasta que el cliente esté listo
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'light', setTheme, toggleTheme }}>
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme: (nextTheme as Theme) || 'light', setTheme, toggleTheme }}>
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
