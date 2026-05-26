'use client';

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { UpdateModal } from './UpdateModal';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved !== null ? JSON.parse(saved) : false;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <ThemeProvider>
      <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="main-wrapper">
          <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <main className="main-content">
            <div className="page-content page-content-overflow-fix animate-page-entrance">
              {children}
            </div>
          </main>
        </div>
        <UpdateModal />
      </div>
    </ThemeProvider>
  );
}
