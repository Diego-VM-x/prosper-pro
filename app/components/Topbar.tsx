'use client';

/**
 * @file Topbar.tsx
 * @description Barra superior del Dashboard con búsqueda, toggle de tema,
 * notificaciones y perfil de usuario Prosper-Pro.
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSearch } from '@/lib/contexts/SearchContext';
import { subscribeToNotifications, markNotificationRead, getUnreadCount, requestNotificationPermission, sendBrowserNotification } from '@/lib/firestore/notifications';
import {
  IconSearch,
  IconMail,
  IconBell,
  IconSun,
  IconMoon,
  IconMenu,
  IconLogout,
  IconX,
  IconSettings,
  IconLogin,
} from './icons';
import type { Notification } from '@/types';
import Link from 'next/link';

interface TopbarProps {
  /** Función para alternar la visibilidad del sidebar en móvil */
  onToggleSidebar: () => void;
  /** Indica si el sidebar está colapsado */
  isCollapsed: boolean;
}

/**
 * Componente Topbar / barra de navegación superior.
 * Incluye la barra de búsqueda global, botones de acción rápida,
 * toggle de modo oscuro/claro y el perfil del usuario.
 */
export function Topbar({ onToggleSidebar, isCollapsed }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { query: searchQuery, setQuery: setSearchQuery } = useSearch();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifPermissioned, setNotifPermissioned] = useState(false);

  const userInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNotifications(user.uid, (n) => {
      setNotifications(n);
      setUnreadCount(n.filter((notif) => !notif.read).length);
    });
    return () => unsub();
  }, [user?.uid]);

  // Solicitar permiso de notificaciones push al cargar
  useEffect(() => {
    if (!user?.uid) return;
    requestNotificationPermission().then(granted => {
      setNotifPermissioned(granted);
    });
  }, [user?.uid]);

  // Enviar notificación push cuando hay nuevas notificaciones no leídas
  useEffect(() => {
    if (unreadCount > 0 && notifPermissioned) {
      sendBrowserNotification('Prosper', `Tienes ${unreadCount} notificación${unreadCount > 1 ? 'es' : ''} nueva${unreadCount > 1 ? 's' : ''}`);
    }
  }, [unreadCount, notifPermissioned]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
  };

  // Rutas disponibles para búsqueda
  const searchRoutes = [
    { name: 'Dashboard', route: '/', icon: '📊', keywords: 'dashboard inicio principal' },
    { name: 'Mis Metas', route: '/metas', icon: '🎯', keywords: 'metas objetivos tareas' },
    { name: 'Calendario', route: '/calendario', icon: '📅', keywords: 'calendario eventos fechas' },
    { name: 'Finanzas', route: '/finanzas', icon: '💰', keywords: 'finanzas dinero gastos ingresos' },
    { name: 'Comunidad', route: '/comunidad', icon: '👥', keywords: 'comunidad gente usuarios' },
    { name: 'Cursos', route: '/cursos', icon: '📚', keywords: 'cursos aprendizaje educación' },
    { name: 'Logros', route: '/logros', icon: '🏆', keywords: 'logros trofeos premios' },
    { name: 'Configuración', route: '/configuracion', icon: '⚙️', keywords: 'configuración ajustes preferencias' },
    { name: 'Ayuda', route: '/ayuda', icon: '❓', keywords: 'ayuda soporte ayuda' },
  ];

  // Filtrar resultados según query
  const searchResults = searchQuery.trim()
    ? searchRoutes.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.keywords.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <header className="topbar" id="main-topbar">
      {/* Menú móvil + título */}
      <div className="topbar-left">
        {/* Menú hamburguesa para móvil */}
        <button
          className="topbar-icon-btn sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Abrir menú"
        >
          <IconMenu />
        </button>
        {/* Título dinámico */}
        <span className="topbar-title-dynamic">
          {isCollapsed ? 'Navegación Rápida' : `Hola, ${user?.displayName || 'Usuario'}`}
        </span>
      </div>

      {/* Búsqueda con resultados */}
      <div className="topbar-search-wrapper">
        <div className="topbar-search" onClick={() => document.getElementById('global-search')?.focus()}>
          <IconSearch className="topbar-search-icon" />
          <input
            type="text"
            placeholder="Buscar metas, cursos..."
            id="global-search"
            aria-label="Buscador global"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
              <IconX width={14} height={14} />
            </button>
          )}
          <span className="topbar-search-shortcut">⌘F</span>
        </div>

        {/* Resultados de búsqueda */}
        {showSearch && searchResults.length > 0 && (
          <div className="search-results-dropdown">
            {searchResults.map((result) => (
              <Link
                key={result.route}
                href={result.route}
                className="search-result-item"
                onClick={() => setSearchQuery('')}
              >
                <span className="search-result-icon">{result.icon}</span>
                <span className="search-result-name">{result.name}</span>
                <span className="search-result-arrow">→</span>
              </Link>
            ))}
          </div>
        )}
        {showSearch && searchQuery.trim() && searchResults.length === 0 && (
          <div className="search-results-dropdown">
            <div className="search-no-results">
              <p>No se encontraron resultados para "{searchQuery}"</p>
            </div>
          </div>
        )}
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
        <div className="topbar-notif-wrapper">
          <button
            className="topbar-icon-btn"
            aria-label="Notificaciones"
            id="btn-notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <IconBell />
            {unreadCount > 0 && <span className="topbar-notif-dot" />}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-dropdown-header">
                <span>Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="notifications-badge">{unreadCount} nueva{unreadCount > 1 ? 's' : ''}</span>
                )}
              </div>
              {notifications.length > 0 ? notifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${notif.read ? 'read' : 'unread'}`}
                  onClick={() => handleMarkRead(notif.id)}
                >
                  <p className="notif-title">{notif.title}</p>
                  <p className="notif-message">{notif.message}</p>
                </div>
              )) : (
                <div className="notif-empty">
                  <p>No hay notificaciones</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="topbar-divider" />

        {/* Usuario */}
        <div className="topbar-user" id="user-profile">
          {user ? (
            <>
              <div
                className="topbar-avatar"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user?.photoURL ? <img src={user.photoURL} alt="Avatar" /> : userInitial}
              </div>
              <div className="topbar-user-info" onClick={() => setShowUserMenu(!showUserMenu)}>
                <span className="topbar-user-name">{user?.displayName || 'Usuario'}</span>
                <span className="topbar-user-email">{user?.email}</span>
              </div>

              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <p className="user-dropdown-name">{user?.displayName || 'Usuario'}</p>
                    <p className="user-dropdown-email">{user?.email}</p>
                  </div>
                  <Link href="/configuracion" className="user-dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <IconSettings /> Configuración
                  </Link>
                  <div className="user-dropdown-divider" />
                  <button
                    className="user-dropdown-item user-dropdown-logout"
                    onClick={() => { setShowUserMenu(false); logout(); }}
                  >
                    <IconLogout /> Cerrar Sesión
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link href="/login" className="topbar-login-btn" onClick={() => setShowUserMenu(false)}>
              <IconLogin /> Iniciar Sesión
            </Link>
          )}
        </div>
      </div>

      {/* Estilos inline */}
      <style>{`
        .topbar-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .topbar-title-dynamic {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }
        .topbar-search-wrapper {
          position: relative;
          flex: 1;
          max-width: 400px;
        }
        .search-clear-btn {
          position: absolute;
          right: 36px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all var(--transition-fast);
        }
        .search-clear-btn:hover {
          color: var(--text-primary);
          background: var(--bg-input);
        }
        .search-results-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 200;
          max-height: 320px;
          overflow-y: auto;
          animation: fadeInUp 0.2s ease;
        }
        .search-result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          text-decoration: none;
          color: var(--text-primary);
          cursor: pointer;
          transition: background var(--transition-fast);
          border-bottom: 1px solid var(--border-default);
        }
        .search-result-item:last-child { border-bottom: none; }
        .search-result-item:hover {
          background: var(--bg-accent-soft);
        }
        .search-result-icon { font-size: 1.25rem; flex-shrink: 0; }
        .search-result-name { font-size: 0.875rem; font-weight: 500; flex: 1; }
        .search-result-arrow { color: var(--text-tertiary); font-size: 1rem; }
        .search-no-results {
          padding: 20px 16px;
          text-align: center;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .sidebar-toggle { display: none; }
        @media (max-width: 1024px) {
          .sidebar-toggle { display: flex !important; }
          .topbar-title-dynamic { max-width: 120px; font-size: 0.8125rem; }
        }

        /* Notificaciones dropdown */
        .topbar-notif-wrapper { position: relative; }
        .notifications-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 320px;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 100;
          max-height: 400px;
          overflow-y: auto;
          animation: fadeInUp 0.2s ease;
        }
        .notifications-dropdown-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-default);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .notifications-badge {
          background: var(--color-prosper-green);
          color: white;
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .notif-item {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-default);
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .notif-item.unread { background: var(--bg-input); }
        .notif-item:hover { background: var(--bg-card-hover); }
        .notif-item:last-child { border-bottom: none; }
        .notif-title { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
        .notif-message { font-size: 0.75rem; color: var(--text-secondary); }
        .notif-empty { padding: 24px 16px; text-align: center; font-size: 0.8125rem; color: var(--text-secondary); }

        /* User dropdown */
        .topbar-user { display: flex; align-items: center; gap: 12px; position: relative; }
        .topbar-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-prosper-green), var(--color-prosper-navy));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.8125rem;
          font-weight: 700;
          border: 2px solid var(--color-pine-300);
          flex-shrink: 0;
          cursor: pointer;
          overflow: hidden;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }
        .topbar-avatar:hover { transform: scale(1.05); box-shadow: 0 0 0 3px rgba(61,204,142,0.2); }
        .topbar-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .topbar-user-info { display: flex; flex-direction: column; cursor: pointer; }
        .topbar-user-name { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); line-height: 1.2; }
        .topbar-user-email { font-size: 0.6875rem; color: var(--text-secondary); }

        .user-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 260px;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
          z-index: 100;
          overflow: hidden;
          animation: fadeInUp 0.2s ease;
          backdrop-filter: blur(12px);
        }
        .user-dropdown-header {
          padding: 16px;
          background: linear-gradient(135deg, var(--color-prosper-navy), var(--color-prosper-green));
          position: relative;
        }
        .user-dropdown-header::after {
          content: '';
          position: absolute;
          top: -6px;
          right: 16px;
          width: 12px;
          height: 12px;
          background: var(--color-prosper-navy);
          transform: rotate(45deg);
          border-left: 1px solid var(--border-default);
          border-top: 1px solid var(--border-default);
        }
        .user-dropdown-name { font-size: 0.9375rem; font-weight: 700; color: white; margin: 0; }
        .user-dropdown-email { font-size: 0.75rem; color: rgba(255,255,255,0.75); margin: 4px 0 0 0; }
        .user-dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          font-size: 0.875rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
          text-decoration: none;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          font-family: inherit;
          position: relative;
        }
        .user-dropdown-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: transparent;
          transition: background var(--transition-fast);
        }
        .user-dropdown-item:hover { background: var(--bg-accent-soft); }
        .user-dropdown-item:hover::before { background: var(--color-prosper-green); }
        .user-dropdown-item svg { width: 18px; height: 18px; flex-shrink: 0; color: var(--text-secondary); transition: color var(--transition-fast); }
        .user-dropdown-item:hover svg { color: var(--color-prosper-green); }
        .user-dropdown-divider { height: 1px; background: var(--border-default); margin: 4px 0; }
        .user-dropdown-logout { color: var(--color-error); }
        .user-dropdown-logout:hover { background: rgba(239,68,68,0.08); }
        .user-dropdown-logout::before { background: transparent !important; }
        .user-dropdown-logout:hover::before { background: var(--color-error) !important; }
        .user-dropdown-logout svg { color: var(--color-error); }

        /* Login button en topbar */
        .topbar-login-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          background: var(--color-prosper-green);
          color: white;
          font-size: 0.8125rem;
          font-weight: 600;
          text-decoration: none;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }
        .topbar-login-btn:hover {
          background: #34BB81;
          transform: translateY(-1px);
        }
        .topbar-login-btn svg { width: 16px; height: 16px; }

        /* Responsive */
        @media (max-width: 768px) {
          .topbar-search { max-width: 180px; }
          .topbar-search-shortcut { display: none; }
          .topbar-user-info { display: none; }
          .notifications-dropdown { width: 280px; right: -8px; }
          .user-dropdown { width: 220px; }
          .topbar-login-btn span { display: none; }
          .topbar-login-btn { padding: 8px; }
        }
        @media (max-width: 480px) {
          .topbar-search { max-width: 120px; }
          .topbar-search input { padding: 6px 10px 6px 30px; font-size: 0.8125rem; }
          .topbar-icon-btn { width: 32px; height: 32px; }
          .topbar-avatar { width: 28px; height: 28px; font-size: 0.6875rem; }
          .notifications-dropdown { width: 260px; }
        }
      `}</style>
    </header>
  );
}
