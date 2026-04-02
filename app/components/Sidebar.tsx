'use client';

/**
 * @file Sidebar.tsx
 * @description Barra lateral de navegación del Dashboard Prosper-Pro.
 * Incluye logo, navegación principal, sección general y tarjeta promocional.
 * Adaptado a la estética "Donezo" con colores Verde Pino.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getGoalsByOwnerId } from '@/lib/firestore/goals';
import { useState, useEffect } from 'react';
import {
  IconDashboard,
  IconTasks,
  IconCalendar,
  IconAnalytics,
  IconTeam,
  IconSettings,
  IconHelp,
  IconLogout,
  IconProsperLeaf,
  IconBook,
  IconTrophy,
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
  const pathname = usePathname();
  const { user, logout } = useAuth();
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
            aria-label="Cerrar menú"
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        {/* Navegación Principal */}
        <nav className="sidebar-nav">
          {!isCollapsed && <p className="sidebar-label">Menú</p>}
          <Link href="/" className={`nav-item ${isActive('/') ? 'active' : ''}`} id="nav-dashboard" title={isCollapsed ? 'Dashboard' : undefined}>
            <IconDashboard /> {!isCollapsed && 'Dashboard'}
          </Link>
          <Link href="/metas" className={`nav-item ${isActive('/metas') ? 'active' : ''}`} id="nav-tasks" title={isCollapsed ? 'Mis Metas' : undefined}>
            <IconTasks /> {!isCollapsed && <>Mis Metas{activeGoalsCount > 0 && <span className="nav-badge">{activeGoalsCount}</span>}</>}
            {isCollapsed && activeGoalsCount > 0 && <span className="nav-badge nav-badge-collapsed">{activeGoalsCount}</span>}
          </Link>
          <Link href="/calendario" className={`nav-item ${isActive('/calendario') ? 'active' : ''}`} id="nav-calendar" title={isCollapsed ? 'Calendario' : undefined}>
            <IconCalendar /> {!isCollapsed && 'Calendario'}
          </Link>
          <Link href="/finanzas" className={`nav-item ${isActive('/finanzas') ? 'active' : ''}`} id="nav-analytics" title={isCollapsed ? 'Finanzas' : undefined}>
            <IconAnalytics /> {!isCollapsed && 'Finanzas'}
          </Link>
          <Link href="/comunidad" className={`nav-item ${isActive('/comunidad') ? 'active' : ''}`} id="nav-team" title={isCollapsed ? 'Comunidad' : undefined}>
            <IconTeam /> {!isCollapsed && 'Comunidad'}
          </Link>

          {!isCollapsed && <p className="sidebar-label">Aprendizaje</p>}
          <Link href="/cursos" className={`nav-item ${isActive('/cursos') ? 'active' : ''}`} id="nav-courses" title={isCollapsed ? 'Cursos' : undefined}>
            <IconBook /> {!isCollapsed && 'Cursos'}
          </Link>
          <Link href="/logros" className={`nav-item ${isActive('/logros') ? 'active' : ''}`} id="nav-achievements" title={isCollapsed ? 'Logros' : undefined}>
            <IconTrophy /> {!isCollapsed && 'Logros'}
          </Link>

          {!isCollapsed && <p className="sidebar-label">General</p>}
          <Link href="/configuracion" className={`nav-item ${isActive('/configuracion') ? 'active' : ''}`} id="nav-settings" title={isCollapsed ? 'Configuración' : undefined}>
            <IconSettings /> {!isCollapsed && 'Configuración'}
          </Link>
          <Link href="/ayuda" className={`nav-item ${isActive('/ayuda') ? 'active' : ''}`} id="nav-help" title={isCollapsed ? 'Ayuda' : undefined}>
            <IconHelp /> {!isCollapsed && 'Ayuda'}
          </Link>
          <div className="nav-item" id="nav-logout" onClick={logout} style={{ cursor: 'pointer' }} title={isCollapsed ? 'Cerrar Sesión' : undefined}>
            <IconLogout /> {!isCollapsed && 'Cerrar Sesión'}
          </div>
        </nav>

        {/* Footer / Promo Card */}
        <div className="sidebar-footer">
          {isCollapsed ? (
            <div className="sidebar-promo-card sidebar-promo-card-collapsed" title="Academia Prosper">
              <IconBook />
            </div>
          ) : (
            <div className="sidebar-promo-card">
              <p className="promo-title">Academia Prosper</p>
              <p className="promo-sub">
                Aprende educación financiera con lecciones gamificadas.
              </p>
              <button className="promo-btn" id="promo-cta">
                Comenzar Curso
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
