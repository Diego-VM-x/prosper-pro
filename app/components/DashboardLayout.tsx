'use client';

import React, { useState } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ThemeProvider>
      <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="main-content">
          <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="page-content">
            {children}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
