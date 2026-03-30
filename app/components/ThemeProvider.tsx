'use client';

/**
 * @file ThemeProvider.tsx
 * @description Componente que gestiona el modo oscuro/claro de la aplicación.
 * Persiste la preferencia del usuario en localStorage y detecta el sistema operativo.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  /** Tema actual activo */
  theme: Theme;
  /** Función para alternar entre modo claro y oscuro */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

/**
 * Hook personalizado para acceder al tema desde cualquier componente.
 * @returns {ThemeContextType} El tema actual y la función para alternarlo.
 */
export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

const STORAGE_KEY = 'prosper-pro-theme';

/**
 * Provider de tema que envuelve la aplicación.
 * Detecta la preferencia del sistema operativo al inicio y permite al usuario
 * alternar manualmente entre modos.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Leer preferencia al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === 'dark' || stored === 'light') {
        setTheme(stored);
      } else {
        // Detectar preferencia del sistema operativo
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
    } catch {
      // localStorage no disponible (SSR)
    }
    setMounted(true);
  }, []);

  // Aplicar atributo data-theme al <html>
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Silenciar errores de localStorage
    }
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Evitar flash de contenido sin tema
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
