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
import { subscribeToGoals } from '@/lib/firestore/goals';
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
}

/**
 * Componente Sidebar del Dashboard.
 * Renderiza la navegación principal con items de menú agrupados y una tarjeta
 * promocional de enlace a la academia Prosper en el footer.
 */
export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [activeGoalsCount, setActiveGoalsCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToGoals(user.uid, (goals) => {
      setActiveGoalsCount(goals.filter((g) => g.status !== 'completed').length);
    });
    return () => unsub();
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

      <aside className={`sidebar${isOpen ? ' open' : ''}`} id="main-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <img
            src="/logo-icon.png"
            alt="Prosper Logo"
            width={36}
            height={36}
            style={{ borderRadius: 'var(--radius-md)', flexShrink: 0 }}
          />
          <span className="sidebar-logo-text">
            Prosper<span style={{ color: 'var(--color-prosper-green)' }}>.</span>
          </span>
          {/* Botón cerrar para móvil */}
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Cerrar menú"
            style={{
              marginLeft: 'auto',
              display: 'none',
              width: 28,
              height: 28,
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        {/* Navegación Principal */}
        <nav className="sidebar-nav">
          <p className="sidebar-label">Menú</p>
          <Link href="/" className={`nav-item ${isActive('/') ? 'active' : ''}`} id="nav-dashboard">
            <IconDashboard /> Dashboard
          </Link>
          <Link href="/metas" className={`nav-item ${isActive('/metas') ? 'active' : ''}`} id="nav-tasks">
            <IconTasks /> Mis Metas
            {activeGoalsCount > 0 && <span className="nav-badge">{activeGoalsCount}</span>}
          </Link>
          <Link href="/calendario" className={`nav-item ${isActive('/calendario') ? 'active' : ''}`} id="nav-calendar">
            <IconCalendar /> Calendario
          </Link>
          <Link href="/finanzas" className={`nav-item ${isActive('/finanzas') ? 'active' : ''}`} id="nav-analytics">
            <IconAnalytics /> Finanzas
          </Link>
          <Link href="/comunidad" className={`nav-item ${isActive('/comunidad') ? 'active' : ''}`} id="nav-team">
            <IconTeam /> Comunidad
          </Link>

          <p className="sidebar-label">Aprendizaje</p>
          <Link href="/cursos" className={`nav-item ${isActive('/cursos') ? 'active' : ''}`} id="nav-courses">
            <IconBook /> Cursos
          </Link>
          <Link href="/logros" className={`nav-item ${isActive('/logros') ? 'active' : ''}`} id="nav-achievements">
            <IconTrophy /> Logros
          </Link>

          <p className="sidebar-label">General</p>
          <Link href="/configuracion" className={`nav-item ${isActive('/configuracion') ? 'active' : ''}`} id="nav-settings">
            <IconSettings /> Configuración
          </Link>
          <Link href="/ayuda" className={`nav-item ${isActive('/ayuda') ? 'active' : ''}`} id="nav-help">
            <IconHelp /> Ayuda
          </Link>
          <div className="nav-item" id="nav-logout" onClick={logout} style={{ cursor: 'pointer' }}>
            <IconLogout /> Cerrar Sesión
          </div>
        </nav>

        {/* Footer / Promo Card */}
        <div className="sidebar-footer">
          <div className="sidebar-promo-card">
            <p className="promo-title">Academia Prosper</p>
            <p className="promo-sub">
              Aprende educación financiera con lecciones gamificadas.
            </p>
            <button className="promo-btn" id="promo-cta">
              Comenzar Curso
            </button>
          </div>
        </div>
      </aside>

      {/* Estilos responsivos inline para overlay y botón close */}
      <style>{`
        @media (max-width: 1024px) {
          .sidebar-overlay { display: block !important; }
          .sidebar-close-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
