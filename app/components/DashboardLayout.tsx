'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from './ThemeProvider';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { UpdateModal } from './UpdateModal';
import { safeLocalStorage } from '@/lib/utils/safeStorage';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = safeLocalStorage.getItem('sidebarCollapsed');
        return saved !== null ? JSON.parse(saved) : false;
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    try { safeLocalStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed)); } catch {}
  }, [sidebarCollapsed]);

  return (
    <ThemeProvider>
      <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="main-wrapper">
          <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <main className="main-content">
            <div className="page-content page-content-overflow-fix animate-page-entrance" key={pathname}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
