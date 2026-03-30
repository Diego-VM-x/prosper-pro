'use client';

/**
 * @file Sidebar.tsx
 * @description Barra lateral de navegación del Dashboard Prosper-Pro.
 * Incluye logo, navegación principal, sección general y tarjeta promocional.
 * Adaptado a la estética "Donezo" con colores Verde Pino.
 */

import React from 'react';
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
          <div className="nav-item active" id="nav-dashboard">
            <IconDashboard /> Dashboard
          </div>
          <div className="nav-item" id="nav-tasks">
            <IconTasks /> Mis Metas
            <span className="nav-badge">12</span>
          </div>
          <div className="nav-item" id="nav-calendar">
            <IconCalendar /> Calendario
          </div>
          <div className="nav-item" id="nav-analytics">
            <IconAnalytics /> Finanzas
          </div>
          <div className="nav-item" id="nav-team">
            <IconTeam /> Comunidad
          </div>

          <p className="sidebar-label">Aprendizaje</p>
          <div className="nav-item" id="nav-courses">
            <IconBook /> Cursos
          </div>
          <div className="nav-item" id="nav-achievements">
            <IconTrophy /> Logros
          </div>

          <p className="sidebar-label">General</p>
          <div className="nav-item" id="nav-settings">
            <IconSettings /> Configuración
          </div>
          <div className="nav-item" id="nav-help">
            <IconHelp /> Ayuda
          </div>
          <div className="nav-item" id="nav-logout">
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
