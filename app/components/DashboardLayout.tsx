'use client';

import React, { useState } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Componente Layout compartido para todas las páginas del Dashboard.
 * Provee el ThemeProvider, Sidebar, Topbar y la estructura base app-shell.
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <div className="app-shell">
        {/* === SIDEBAR === */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* === MAIN === */}
        <main className="main-content">
          {/* Topbar */}
          <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          {/* Page Content */}
          <div className="page-content">
            {children}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
