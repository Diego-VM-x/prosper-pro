'use client';

/**
 * @file Topbar.tsx
 * @description Barra superior del Dashboard con búsqueda, toggle de tema,
 * notificaciones y perfil de usuario Prosper-Pro.
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { useAuth } from '@/lib/contexts/AuthContext';
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
} from './icons';
import type { Notification } from '@/types';
import Link from 'next/link';

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
  const [searchQuery, setSearchQuery] = useState('');
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
      <div className="topbar-search" onClick={() => setShowSearch(true)} style={{ cursor: 'pointer' }}>
        <IconSearch className="topbar-search-icon" />
        <input
          type="text"
          placeholder="Buscar metas, cursos..."
          id="global-search"
          aria-label="Buscador global"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClick={(e) => e.stopPropagation()}
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
        <div style={{ position: 'relative' }}>
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
            <div className="notifications-dropdown" style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 320,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100,
              maxHeight: 400,
              overflowY: 'auto',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Notificaciones</span>
                {unreadCount > 0 && (
                  <span style={{ background: 'var(--color-prosper-green)', color: 'white', fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                    {unreadCount} nueva{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {notifications.length > 0 ? notifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkRead(notif.id)}
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    background: notif.read ? 'transparent' : 'var(--bg-input)',
                    transition: 'background var(--transition-fast)',
                  }}
                >
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{notif.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{notif.message}</p>
                </div>
              )) : (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No hay notificaciones</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="topbar-divider" />

        {/* Usuario */}
        <div className="topbar-user" id="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          <div
            className="topbar-avatar"
            style={{ overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {user?.photoURL ? <img src={user.photoURL} alt="Avatar" /> : userInitial}
          </div>
          <div className="topbar-user-info" style={{ cursor: 'pointer' }} onClick={() => setShowUserMenu(!showUserMenu)}>
            <span className="topbar-user-name">{user?.displayName || 'Usuario Pro'}</span>
            <span className="topbar-user-email">{user?.email}</span>
          </div>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 220,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100,
              overflow: 'hidden',
              animation: 'fadeInUp 0.2s ease',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{user?.displayName || 'Usuario'}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{user?.email}</p>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Link href="/configuracion" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', fontSize: '0.875rem' }}>
                  <IconSettings /> Configuración
                </Link>
              </button>
              <div style={{ borderTop: '1px solid var(--border-default)' }}>
                <button
                  onClick={() => { setShowUserMenu(false); logout(); }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-error)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <IconLogout /> Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estilos inline para hambúrguer en móvil */}
      <style>{`
        @media (max-width: 1024px) {
          .sidebar-toggle { display: flex !important; }
        }
        .notifications-dropdown {
          animation: fadeInUp 0.2s ease;
        }
      `}</style>
    </header>
  );
}
