'use client';

/**
 * @file Sidebar.tsx
 * @description Barra lateral de navegación del Dashboard Prosper-Pro.
 * Incluye logo, navegación principal, sección general y tarjeta promocional.
 * Adaptado a la estética "Donezo" con colores Verde Pino.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getGoalsByOwnerId } from '@/lib/firestore/goals';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconDashboard,
  IconTasks,
  IconCalendar,
  IconAnalytics,
  IconSettings,
  IconHelp,
  IconLogout,
  IconProsperLeaf,
  IconX,
} from './icons';

interface SidebarProps {
  /** Indica si el sidebar está abierto en vista móvil */
  isOpen: boolean;
  /** Función para cerrar el sidebar en vista móvil */
  onClose: () => void;
  /** Indica si el sidebar está colapsado (solo iconos) */
  isCollapsed: boolean;
  /** Función para alternar el estado colapsado */
  onToggleCollapse: () => void;
}

/**
 * Componente Sidebar del Dashboard.
 * Renderiza la navegación principal con items de menú agrupados y una tarjeta
 * promocional de enlace a la academia Prosper en el footer.
 */
export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { t } = useTranslation('common');
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isGuest } = useAuth();
  const [activeGoalsCount, setActiveGoalsCount] = useState(0);

  useEffect(() => {
    const uid = user?.uid as string;
    if (!uid) return;
    let cancelled = false;
    async function loadGoals() {
      try {
        const goals = await getGoalsByOwnerId(uid);
        if (!cancelled) setActiveGoalsCount(goals.filter((g) => g.status !== 'completed').length);
      } catch (e) { console.error(e); }
    }
    loadGoals();
    return () => { cancelled = true; };
  }, [user?.uid]);

  /**
   * Verifica si una ruta está activa para aplicar estilos de resaltado.
   */
  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
            display: 'none',
          }}
        />
      )}

      <aside className={`sidebar${isOpen ? ' open' : ''}${isCollapsed ? ' collapsed' : ''}`} id="main-sidebar">
        {/* Header: solo botón cerrar en móvil */}
        <div className="sidebar-header">
          {/* Botón cerrar para móvil */}
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label={t('sidebar.closeMenu')}
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        {/* Navegación Principal */}
        <nav className="sidebar-nav">
          {!isCollapsed && <p className="sidebar-label">{t('sidebar.menu')}</p>}
          <Link href="/" className={`nav-item ${isActive('/') ? 'active' : ''}`} id="nav-dashboard" title={isCollapsed ? t('sidebar.dashboard') : undefined}>
            <IconDashboard /> {!isCollapsed && t('sidebar.dashboard')}
          </Link>
          <Link href="/metas" className={`nav-item ${isActive('/metas') ? 'active' : ''}`} id="nav-tasks" title={isCollapsed ? t('sidebar.planes') : undefined}>
            <IconTasks /> {!isCollapsed && <>{t('sidebar.planes')}{activeGoalsCount > 0 && <span className="nav-badge">{activeGoalsCount}</span>}</>}
            {isCollapsed && activeGoalsCount > 0 && <span className="nav-badge nav-badge-collapsed">{activeGoalsCount}</span>}
          </Link>
          <Link href="/calendario" className={`nav-item ${isActive('/calendario') ? 'active' : ''}`} id="nav-calendar" title={isCollapsed ? t('sidebar.calendario') : undefined}>
            <IconCalendar /> {!isCollapsed && t('sidebar.calendario')}
          </Link>
          <Link href="/finanzas" className={`nav-item ${isActive('/finanzas') ? 'active' : ''}`} id="nav-analytics" title={isCollapsed ? t('sidebar.finanzas') : undefined}>
            <IconAnalytics /> {!isCollapsed && t('sidebar.finanzas')}
          </Link>

          {!isCollapsed && <p className="sidebar-label">{t('sidebar.general')}</p>}
          <Link href="/configuracion" className={`nav-item ${isActive('/configuracion') ? 'active' : ''}`} id="nav-settings" title={isCollapsed ? t('sidebar.configuracion') : undefined}>
            <IconSettings /> {!isCollapsed && t('sidebar.configuracion')}
          </Link>
          <Link href="/ayuda" className={`nav-item ${isActive('/ayuda') ? 'active' : ''}`} id="nav-help" title={isCollapsed ? t('sidebar.ayuda') : undefined}>
            <IconHelp /> {!isCollapsed && t('sidebar.ayuda')}
          </Link>
          <div className="nav-item" id="nav-logout" onClick={logout} style={{ cursor: 'pointer' }} title={isCollapsed ? (isGuest ? t('sidebar.logoutGuest') : t('sidebar.logout')) : undefined}>
            <IconLogout /> {!isCollapsed && (isGuest ? t('sidebar.logoutGuest') : t('sidebar.logout'))}
          </div>
        </nav>

        {/* Footer / Promo Card */}
        <div className="sidebar-footer">
          {isCollapsed ? (
            <div className="sidebar-promo-card sidebar-promo-card-collapsed" title="Prosper">
              <IconProsperLeaf />
            </div>
          ) : (
            <div className="sidebar-promo-card">
              <p className="promo-title">{t('sidebar.promoTitle')}</p>
              <p className="promo-sub">
                {t('sidebar.promoSubtitle')}
              </p>
              <button className="promo-btn" id="promo-cta" onClick={() => router.push('/inicio')}>
                {t('sidebar.promoBtn')}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Estilos para overlay en móvil */}
      <style>{`
        @media (max-width: 1024px) {
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </>
  );
}
