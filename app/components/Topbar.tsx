'use client';

/**
 * @file Topbar.tsx
 * @description Barra superior del Dashboard con búsqueda, toggle de tema,
 * notificaciones y perfil de usuario Prosper-Pro.
 */

import React from 'react';
import { useTheme } from './ThemeProvider';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  IconSearch,
  IconMail,
  IconBell,
  IconSun,
  IconMoon,
  IconMenu,
  IconLogout, // Añadir este icono si existe o usar uno similar
} from './icons';

interface TopbarProps {
  /** Función para alternar la visibilidad del sidebar en móvil */
  onToggleSidebar: () => void;
}

/**
 * Componente Topbar / barra de navegación superior.
 * Incluye la barra de búsqueda global, botones de acción rápida,
 * toggle de modo oscuro/claro y el perfil del usuario.
 */
export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const userInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

  return (
    <header className="topbar" id="main-topbar">
      {/* Menú hamburguesa para móvil */}
      <button
        className="topbar-icon-btn sidebar-toggle"
        onClick={onToggleSidebar}
        aria-label="Abrir menú"
        style={{ display: 'none' }}
      >
        <IconMenu />
      </button>

      {/* Búsqueda */}
      <div className="topbar-search">
        <IconSearch className="topbar-search-icon" />
        <input
          type="text"
          placeholder="Buscar metas, cursos..."
          id="global-search"
          aria-label="Buscador global"
        />
        <span className="topbar-search-shortcut">⌘ F</span>
      </div>

      {/* Acciones */}
      <div className="topbar-actions">
        {/* Toggle de tema */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
          id="theme-toggle-btn"
          title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
        >
          {theme === 'light' ? <IconMoon /> : <IconSun />}
        </button>

        {/* Mail */}
        <button className="topbar-icon-btn" aria-label="Mensajes" id="btn-mail">
          <IconMail />
        </button>

        {/* Notificaciones */}
        <button
          className="topbar-icon-btn"
          aria-label="Notificaciones"
          id="btn-notifications"
        >
          <IconBell />
          <span className="topbar-notif-dot" />
        </button>

        <div className="topbar-divider" />

        {/* Usuario */}
        <div className="topbar-user" id="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="topbar-avatar" style={{ overflow: 'hidden' }}>
            {user?.photoURL ? <img src={user.photoURL} alt="Avatar" /> : userInitial}
          </div>
          <div className="topbar-user-info">
            <span className="topbar-user-name">{user?.displayName || 'Usuario Pro'}</span>
            <span className="topbar-user-email">{user?.email}</span>
          </div>
          <button 
            className="topbar-icon-btn logout-btn" 
            onClick={logout} 
            title="Cerrar sesión"
            style={{ marginLeft: '8px' }}
          >
            <IconLogout />
          </button>
        </div>
      </div>

      {/* Estilos inline para hambúrguer en móvil */}
      <style>{`
        @media (max-width: 1024px) {
          .sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
