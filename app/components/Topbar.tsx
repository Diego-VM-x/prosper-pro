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
import { useGoals } from '@/lib/contexts/GoalsContext';
import { subscribeToNotifications, markNotificationRead, getUnreadCount, requestNotificationPermission, sendBrowserNotification, deleteNotification, deleteAllNotifications } from '@/lib/firestore/notifications';
import {
  IconSearch,
  IconBell,
  IconSun,
  IconMoon,
  IconMenu,
  IconLogout,
  IconX,
  IconSettings,
  IconLogin,
  IconDashboard,
  IconTasks,
  IconCalendar,
  IconAnalytics,
  IconHelp,
} from './icons';
import type { Notification, Transaction } from '@/types';
import Link from 'next/link';

interface TopbarProps {
  /** Función para alternar la visibilidad del sidebar en móvil */
  onToggleSidebar: () => void;
  /** Indica si el sidebar está colapsado */
  isCollapsed: boolean;
  /** Función para alternar el estado colapsado */
  onToggleCollapse: () => void;
}

/**
 * Componente Topbar / barra de navegación superior.
 * Incluye la barra de búsqueda global, botones de acción rápida,
 * toggle de modo oscuro/claro y el perfil del usuario.
 */
export function Topbar({ onToggleSidebar, isCollapsed, onToggleCollapse }: TopbarProps) {
  const { theme, setTheme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { query: searchQuery, setQuery: setSearchQuery } = useSearch();
  const { goals } = useGoals();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [notifPermissioned, setNotifPermissioned] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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

  // Cargar cursos y transacciones para búsqueda
  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    let cancelled = false;
    async function loadData() {
      try {
        const [{ getTransactionsByOwnerId }] = await Promise.all([
          import('@/lib/firestore/transactions'),
        ]);
        const txData = await getTransactionsByOwnerId(uid);
        if (!cancelled) {
          setTransactions(txData.slice(0, 50));
        }
      } catch (e) {
        console.error('Search data load error:', e);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [user?.uid]);

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
        setShowMobileMenu(false);
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
    { name: 'Inicio', route: '/', icon: '🏠', keywords: 'inicio landing página principal' },
    { name: 'Dashboard', route: '/dashboard', icon: '📊', keywords: 'dashboard inicio principal' },
    { name: 'Planes Financieros', route: '/metas', icon: '🎯', keywords: 'planes metas objetivos tareas finanzas' },
    { name: 'Calendario', route: '/calendario', icon: '📅', keywords: 'calendario eventos fechas' },
    { name: 'Finanzas', route: '/finanzas', icon: '💰', keywords: 'finanzas dinero gastos ingresos cuentas' },
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

  // Filtrar metas según query
  const goalResults = searchQuery.trim()
    ? goals.filter(g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Filtrar transacciones según query
  const txResults = searchQuery.trim()
    ? transactions.filter(t =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10)
    : [];

  const hasResults = searchResults.length > 0 || goalResults.length > 0 || txResults.length > 0;
  const noData = goals.length === 0 && transactions.length === 0;

  return (
    <header className="topbar" id="main-topbar">
      {/* Logo + colapsar + menú móvil */}
      <div className="topbar-left">
        <Link href="/dashboard" className="topbar-logo-link">
          <img
            src="/logo-icon.png"
            alt="Prosper Logo"
            width={32}
            height={32}
            style={{ borderRadius: 'var(--radius-md)', flexShrink: 0 }}
          />
        </Link>
        {/* Botón colapsar para desktop */}
        <button
          className="topbar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {isCollapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
        {/* Menú hamburguesa para móvil */}
        <button
          className="topbar-icon-btn mobile-menu-btn"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label="Abrir menú"
        >
          {showMobileMenu ? <IconX width={20} /> : <IconMenu />}
        </button>
        {/* Título dinámico */}
        <span className="topbar-title-dynamic">
          {isCollapsed ? 'Navegación Rápida' : `Hola, ${user?.displayName || 'Usuario'}`}
        </span>
      </div>

      {/* Búsqueda con resultados de metas */}
      <div className="topbar-search-wrapper">
        <div className="topbar-search" onClick={() => document.getElementById('global-search')?.focus()}>
          <IconSearch className="topbar-search-icon" />
          <input
            type="text"
            placeholder="Buscar..."
            id="global-search"
            aria-label="Buscador de metas"
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

        {/* Resultados unificados */}
        {showSearch && searchQuery.trim() && hasResults && (
          <div className="search-results-dropdown">
            {/* Rutas */}
            {searchResults.length > 0 && (
              <>
                <div className="search-results-header">
                  <span>Páginas</span>
                  <span className="search-results-count">{searchResults.length}</span>
                </div>
                {searchResults.map((r) => (
                  <Link
                    key={r.route}
                    href={r.route}
                    className="search-result-item"
                    onClick={() => { setSearchQuery(''); setShowMobileMenu(false); }}
                  >
                    <span className="search-result-icon">{r.icon}</span>
                    <div className="search-result-content">
                      <span className="search-result-name">{r.name}</span>
                    </div>
                    <span className="search-result-arrow">→</span>
                  </Link>
                ))}
              </>
            )}

            {/* Planes */}
            {goalResults.length > 0 && (
              <>
                <div className="search-results-header">
                  <span>Planes</span>
                  <span className="search-results-count">{goalResults.length}</span>
                </div>
                {goalResults.slice(0, 5).map((goal) => (
                  <Link
                    key={goal.id}
                    href="/metas"
                    className="search-result-item"
                    onClick={() => { setSearchQuery(''); setShowMobileMenu(false); }}
                  >
                    <span className={`search-result-status ${goal.status === 'completed' ? 'completed' : goal.status === 'progress' ? 'in-progress' : 'pending'}`} />
                    <div className="search-result-content">
                      <span className="search-result-name">{goal.title}</span>
                      <span className="search-result-desc">{goal.category} · ${goal.target.toLocaleString()}</span>
                    </div>
                    <span className="search-result-arrow">→</span>
                  </Link>
                ))}
              </>
            )}

            {/* Transacciones */}
            {txResults.length > 0 && (
              <>
                <div className="search-results-header">
                  <span>Transacciones</span>
                  <span className="search-results-count">{txResults.length}</span>
                </div>
                {txResults.slice(0, 5).map((tx) => {
                  const typeIcon = tx.type === 'income' ? '📥' : tx.type === 'expense' ? '📤' : '💰';
                  const typeLabel = tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Gasto' : 'Ahorro';
                  return (
                    <div
                      key={tx.id}
                      className="search-result-item"
                      onClick={() => { setSearchQuery(''); }}
                    >
                      <span className="search-result-icon">{typeIcon}</span>
                      <div className="search-result-content">
                        <span className="search-result-name">{tx.description}</span>
                        <span className="search-result-desc">{typeLabel} · {tx.category} · ${tx.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
        {showSearch && searchQuery.trim() && !hasResults && !noData && (
          <div className="search-results-dropdown">
            <div className="search-no-results">
              <p>No se encontraron resultados para &quot;{searchQuery}&quot;</p>
            </div>
          </div>
        )}
        {showSearch && searchQuery.trim() && noData && (
          <div className="search-results-dropdown">
            <div className="search-no-results">
              <p>Crea metas o transacciones para buscar</p>
            </div>
          </div>
        )}
      </div>

      {/* Acciones desktop */}
      <div className="topbar-actions desktop-actions">
        {/* Toggle de tema */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Cambiar a modo ${theme === 'light' ? 'oscuro' : theme === 'dark' ? 'AMOLED' : 'claro'}`}
          id="theme-toggle-btn"
          title={theme === 'light' ? 'Cambiar a Oscuro' : theme === 'dark' ? 'Cambiar a AMOLED' : 'Cambiar a Claro'}
        >
          <span className="theme-toggle-icon">
            {theme === 'light' ? '🌙' : theme === 'dark' ? '⚫' : '☀️'}
          </span>
          <span className="theme-toggle-label">
            {theme === 'light' ? 'Oscuro' : theme === 'dark' ? 'AMOLED' : 'Claro'}
          </span>
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
                <div className="notif-actions">
                  {notifications.length > 0 && (
                    <button className="notif-clear-btn" onClick={() => deleteAllNotifications(user?.uid || '')}>
                      Limpiar todo
                    </button>
                  )}
                </div>
              </div>
              {notifications.length > 0 ? notifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${notif.read ? 'read' : 'unread'}`}
                >
                  <div className="notif-content" onClick={() => handleMarkRead(notif.id)}>
                    <p className="notif-title">{notif.title}</p>
                    <p className="notif-message">{notif.message}</p>
                  </div>
                  <button className="notif-delete-btn" onClick={() => deleteNotification(notif.id)} title="Eliminar">
                    ✕
                  </button>
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
             <div className="user-dropdown mobile-user-dropdown">
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
                 style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 16px', justifyContent: 'flex-start' }}
               >
                 <IconLogout width={20} height={20} /> Cerrar Sesión
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

      {/* Acciones móviles: Notificaciones + Avatar */}
      {user && (
        <div className="mobile-user-actions">
          {/* Notificaciones móvil */}
          <div className="mobile-notif-wrapper">
            <button
              className="topbar-icon-btn mobile-notif-btn"
              aria-label="Notificaciones"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <IconBell />
              {unreadCount > 0 && <span className="topbar-notif-dot" />}
            </button>
            {showNotifications && (
              <div className="notifications-dropdown mobile-notif-dropdown">
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
                  >
                    <div className="notif-content" onClick={() => handleMarkRead(notif.id)}>
                      <p className="notif-title">{notif.title}</p>
                      <p className="notif-message">{notif.message}</p>
                    </div>
                    <button className="notif-delete-btn" onClick={() => deleteNotification(notif.id)} title="Eliminar">
                      ✕
                    </button>
                  </div>
                )) : (
                  <div className="notif-empty">
                    <p>Sin notificaciones</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Avatar con dropdown */}
          <div className="mobile-user-info" onClick={() => setShowUserMenu(!showUserMenu)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '2px 0' }}>
            <div className="topbar-avatar">
              {user?.photoURL ? <img src={user.photoURL} alt="Avatar" /> : userInitial}
            </div>
            <div className="mobile-user-text">
              <span className="mobile-user-name">{user?.displayName || 'Usuario'}</span>
              <span className="mobile-user-email">{user?.email}</span>
            </div>
          </div>
          {showUserMenu && (
            <div className="user-dropdown mobile-user-dropdown">
              <div className="user-dropdown-header">
                <p className="user-dropdown-name">{user?.displayName || 'Usuario'}</p>
                <p className="user-dropdown-email">{user?.email}</p>
              </div>
              <Link href="/configuracion" className="user-dropdown-item" onClick={() => setShowUserMenu(false)}>
                <IconSettings /> Configuración
              </Link>
               <div className="theme-buttons" style={{ display: 'flex', gap: '8px', padding: '8px 16px' }}>
                  <button className="mobile-menu-theme" onClick={() => { setShowUserMenu(false); setTheme('light'); }} style={{ flex: 1, padding: '10px 0' }} title="Tema Claro" aria-label="Tema Claro">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                  </button>

                 <button className="mobile-menu-theme" onClick={() => { setShowUserMenu(false); setTheme('dark'); }} style={{ flex: 1, padding: '10px 0' }} title="Tema Oscuro" aria-label="Tema Oscuro">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                   </svg>
                 </button>
                 <button className="mobile-menu-theme" onClick={() => { setShowUserMenu(false); setTheme('amoled'); }} style={{ flex: 1, padding: '10px 0' }} title="Tema AMOLED" aria-label="Tema AMOLED">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <circle cx="12" cy="12" r="10"></circle>
                   </svg>
                 </button>
               </div>
               <div className="user-dropdown-divider" />
               <button
                 className="user-dropdown-item user-dropdown-logout"
                 onClick={() => { setShowUserMenu(false); logout(); }}
                 style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 16px', justifyContent: 'flex-start' }}
               >
                 <IconLogout width={20} height={20} /> Cerrar Sesión
               </button>
            </div>
          )}
        </div>
      )}

      {/* Menú móvil desplegable */}
      {showMobileMenu && (
        <div className="mobile-menu-overlay" onClick={() => setShowMobileMenu(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <div className="mobile-menu-user">
                <div className="mobile-menu-avatar">
                  {user?.photoURL ? <img src={user.photoURL} alt="Avatar" /> : userInitial}
                </div>
                <div>
                  <p className="mobile-menu-name">{user?.displayName || 'Usuario'}</p>
                  <p className="mobile-menu-email">{user?.email}</p>
                </div>
              </div>
              <button className="mobile-menu-close" onClick={() => setShowMobileMenu(false)}>
                <IconX width={20} />
              </button>
            </div>
            <nav className="mobile-menu-nav">
              <Link href="/dashboard" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <IconDashboard /> Dashboard
              </Link>
              <Link href="/metas" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <IconTasks /> Planes Financieros
              </Link>
              <Link href="/calendario" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <IconCalendar /> Calendario
              </Link>
              <Link href="/finanzas" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <IconAnalytics /> Finanzas
              </Link>
              <Link href="/configuracion" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <IconSettings /> Configuración
              </Link>
              <Link href="/ayuda" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <IconHelp /> Ayuda
              </Link>
            </nav>

             <div className="mobile-menu-footer">
               <Link href="/" className="mobile-menu-item mobile-menu-footer-link" onClick={() => setShowMobileMenu(false)}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                 Ir al Inicio
               </Link>
                <div className="mobile-menu-theme-buttons" style={{ display: 'flex', gap: '8px' }}>
                  <button className="mobile-menu-theme" onClick={() => { setTheme('light'); setShowMobileMenu(false); }} style={{ flex: 1, padding: '10px 0' }} title="Tema Claro" aria-label="Tema Claro">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                  </button>
                  <button className="mobile-menu-theme" onClick={() => { setTheme('dark'); setShowMobileMenu(false); }} style={{ flex: 1, padding: '10px 0' }} title="Tema Oscuro" aria-label="Tema Oscuro">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                  </button>
                  <button className="mobile-menu-theme" onClick={() => { setTheme('amoled'); setShowMobileMenu(false); }} style={{ flex: 1, padding: '10px 0' }} title="Tema AMOLED" aria-label="Tema AMOLED">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                  </button>
                </div>
               </div>
               <button className="mobile-menu-logout" onClick={() => { setShowMobileMenu(false); logout(); }}>
                 <IconLogout width={20} height={20} /> Cerrar Sesión
               </button>
          </div>
        </div>
      )}

      {/* Estilos inline */}
      <style>{`
        .mobile-menu-btn { display: none; }
        .desktop-actions { display: flex; align-items: center; gap: 12px; z-index: 100; }
        .mobile-menu-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 1002;
          display: flex;
          justify-content: flex-start;
          animation: fadeIn 0.25s ease;
        }
        .mobile-menu {
          width: 400px;
          max-width: 85vw;
          height: 100%;
          min-height: 100dvh;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          box-shadow: 4px 0 32px rgba(0, 0, 0, 0.5), 0 0 48px rgba(61, 204, 142, 0.08);
          animation: slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
        }
        [data-theme="dark"] .mobile-menu {
          background: #0a1628;
          border-right: 1px solid rgba(255, 255, 255, 0.06);
        }
        [data-theme="amoled"] .mobile-menu {
          background: #000000;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }
        .mobile-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid var(--border-default);
        }
        .mobile-menu-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .mobile-menu-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-prosper-green), var(--color-prosper-navy));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1rem;
          font-weight: 700;
          overflow: hidden;
        }
        .mobile-menu-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .mobile-menu-name { font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); margin: 0; }
        .mobile-menu-email { font-size: 0.75rem; color: var(--text-secondary); margin: 0; }
        .mobile-menu-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          display: flex;
        }
        .mobile-menu-nav {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }
        .mobile-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: var(--radius-md);
          color: var(--text-primary);
          text-decoration: none;
          font-size: 0.9375rem;
          font-weight: 500;
          transition: background var(--transition-fast);
        }
        .mobile-menu-item:hover { background: var(--bg-input); }
        .mobile-menu-item svg { width: 20px; height: 20px; color: var(--text-secondary); }
        [data-theme="dark"] .mobile-menu-item:hover {
          background: rgba(61, 204, 142, 0.1);
          color: #3DCC8E;
        }
        [data-theme="dark"] .mobile-menu-item:hover svg { color: #3DCC8E; }
        [data-theme="amoled"] .mobile-menu-item:hover {
          background: rgba(61, 204, 142, 0.15);
          color: #3DCC8E;
        }
        [data-theme="amoled"] .mobile-menu-item:hover svg { color: #3DCC8E; }
        .mobile-menu-footer {
          padding: 16px;
          border-top: 1px solid var(--border-default);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mobile-menu-footer-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-prosper-green);
          text-decoration: none;
          transition: all var(--transition-fast);
        }
        .mobile-menu-footer-link:hover { background: rgba(61,204,142,0.1); }
        .mobile-menu-footer-link svg { width: 18px; height: 18px; }
        .mobile-menu-theme,
        .mobile-menu-logout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--border-default);
          transition: all var(--transition-fast);
        }
        .mobile-menu-theme {
          background: var(--bg-input);
          color: var(--text-primary);
        }
        .mobile-menu-theme:hover {
          background: var(--bg-accent-soft);
          color: var(--color-prosper-green);
          border-color: var(--color-prosper-green);
        }
        .mobile-theme-icon { font-size: 1.125rem; line-height: 1; }
        [data-theme="dark"] .mobile-menu-theme {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        [data-theme="dark"] .mobile-menu-theme:hover {
          background: rgba(61, 204, 142, 0.15);
          border-color: rgba(61, 204, 142, 0.4);
          color: #3DCC8E;
        }
        [data-theme="amoled"] .mobile-menu-theme {
          background: #111111;
          border-color: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }
        [data-theme="amoled"] .mobile-menu-theme:hover {
          background: rgba(61, 204, 142, 0.2);
          border-color: rgba(61, 204, 142, 0.5);
          color: #3DCC8E;
        }
        .mobile-menu-logout {
          background: rgba(239,68,68,0.1);
          color: var(--color-red-500);
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .topbar-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        /* Base: ocultar elementos móviles en desktop */
        .mobile-menu-btn { display: none; }
        .mobile-user-actions { display: none; align-items: center; gap: 6px; margin-left: auto; padding-right: 4px; position: relative; z-index: 1001; }
        /* Base: mostrar acciones desktop */
        .desktop-actions { display: flex; align-items: center; gap: 12px; position: relative; z-index: 100; }
        .topbar-logo-link {
          display: flex;
          align-items: center;
          text-decoration: none;
          transition: opacity var(--transition-fast);
        }
        .topbar-logo-link:hover { opacity: 0.85; }
        .topbar-collapse-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          background: var(--bg-input);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }
        .topbar-collapse-btn:hover {
          background: var(--bg-accent-soft);
          border-color: var(--color-prosper-green);
          color: var(--color-prosper-green);
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
          background: #ffffff;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 10000;
          max-height: 360px;
          overflow-y: auto;
          animation: fadeInUp 0.2s ease;
        }
        [data-theme="dark"] .search-results-dropdown {
          background: #0a1628;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(61, 204, 142, 0.08);
        }
        [data-theme="amoled"] .search-results-dropdown {
          background: #0a0a0a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.9);
        }
        .search-results-header {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-default);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .search-results-count {
          background: var(--color-prosper-green);
          color: white;
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .search-result-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
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
        .search-result-status {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 4px;
        }
        .search-result-status.completed { background: var(--color-pine-500); }
        .search-result-status.in-progress { background: var(--color-gold-500); }
        .search-result-status.pending { background: var(--border-default); }
        .search-result-icon {
          font-size: 1rem;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .search-result-content { flex: 1; min-width: 0; }
        .search-result-name { font-size: 0.8125rem; font-weight: 600; display: block; }
        .search-result-desc {
          font-size: 0.6875rem;
          color: var(--text-secondary);
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }
        .search-result-arrow { color: var(--text-tertiary); font-size: 1rem; flex-shrink: 0; margin-top: 2px; }
        .search-no-results {
          padding: 20px 16px;
          text-align: center;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        @media (max-width: 1024px) {
          .mobile-menu-btn { display: flex; }
          .mobile-user-actions { display: flex; }
          .desktop-actions { display: none !important; }
          .topbar-collapse-btn { display: none; }
          .topbar-title-dynamic { max-width: 120px; font-size: 0.8125rem; }
        }

        /* Notificaciones dropdown */
        .topbar-notif-wrapper { position: relative; }
        .notifications-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 320px;
          background: #ffffff;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 10000;
          max-height: 400px;
          overflow-y: auto;
          animation: fadeInUp 0.2s ease;
        }
        [data-theme="dark"] .notifications-dropdown {
          background: #0a1628;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(61, 204, 142, 0.08);
        }
        [data-theme="amoled"] .notifications-dropdown {
          background: #0a0a0a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.9);
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
        .notif-actions {
          display: flex;
          gap: 8px;
        }
        .notif-clear-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.6875rem;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 8px;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }
        .notif-clear-btn:hover {
          color: var(--color-error);
          background: rgba(239,68,68,0.08);
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
          display: flex;
          align-items: flex-start;
          gap: 8px;
          transition: background var(--transition-fast);
        }
        .notif-item.unread { background: var(--bg-input); }
        .notif-item:hover { background: var(--bg-card-hover); }
        .notif-item:last-child { border-bottom: none; }
        .notif-content {
          flex: 1;
          min-width: 0;
          cursor: pointer;
        }
        .notif-title { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
        .notif-message { font-size: 0.75rem; color: var(--text-secondary); }
        .notif-delete-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-size: 0.875rem;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: var(--radius-md);
          flex-shrink: 0;
          transition: all var(--transition-fast);
        }
        .notif-delete-btn:hover {
          color: var(--color-error);
          background: rgba(239,68,68,0.08);
        }
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
          max-height: 80vh;
          overflow-y: auto;
          background: #ffffff;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
          z-index: 10000;
          animation: fadeInUp 0.2s ease;
        }
        [data-theme="dark"] .user-dropdown {
          background: #0a1628;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 24px rgba(61, 204, 142, 0.08);
        }
        [data-theme="amoled"] .user-dropdown {
          background: #0a0a0a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.9);
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

        /* Mobile user actions (notif + avatar) */
        .mobile-user-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mobile-user-text {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }
        .mobile-user-email {
          font-size: 0.625rem;
          color: var(--text-secondary);
          white-space: nowrap;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mobile-user-dropdown {
          z-index: 10002 !important;
        }
        .mobile-notif-wrapper {
          position: relative;
        }
        .mobile-notif-dropdown {
          right: 0 !important;
          left: auto !important;
          width: 280px;
          z-index: 10000 !important;
        }
        /* Responsive */
        @media (max-width: 768px) {
          .topbar-search { max-width: 140px; }
          .topbar-search-shortcut { display: none; }
          .notifications-dropdown { 
            position: fixed;
            top: 64px;
            left: 16px;
            right: 16px;
            width: auto;
            max-height: 80vh;
            overflow-y: auto;
          }
          .user-dropdown:not(.mobile-user-dropdown) { 
            position: fixed;
            top: 64px;
            left: 16px;
            right: 16px;
            width: auto;
            max-height: 80vh;
            overflow-y: auto;
          }
          .user-dropdown.mobile-user-dropdown {
            position: fixed !important;
            bottom: 0 !important;
            top: auto !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            border-radius: 20px 20px 0 0 !important;
            max-height: 80vh !important;
            overflow-y: auto !important;
            animation: fadeInUp 0.3s ease;
          }
          .topbar-login-btn span { display: none; }
          .topbar-login-btn { padding: 8px; }
        }

        /* Mobile notifications */
        .mobile-menu-notifications {
          padding: 12px;
          border-top: 1px solid var(--border-default);
          max-height: 200px;
          overflow-y: auto;
        }
        .mobile-menu-notifications-header {
          padding: 8px 4px;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        @media (max-width: 480px) {
          .topbar-search { max-width: 120px; }
          .topbar-search input { padding: 6px 10px 6px 30px; font-size: 0.8125rem; }
          .topbar-icon-btn { width: 32px; height: 32px; }
          .topbar-avatar { width: 28px; height: 28px; font-size: 0.6875rem; }
          .mobile-user-name { font-size: 0.7rem; max-width: 70px; }
          .mobile-user-email { font-size: 0.5625rem; max-width: 70px; }
          .mobile-user-text { display: none; }
          .mobile-user-actions { gap: 2px; padding-right: 2px; }
          .notifications-dropdown { width: 260px; }
          .mobile-menu { width: 100%; max-width: 100%; min-height: 100dvh; }
          .user-dropdown.mobile-user-dropdown {
            max-height: 70vh !important;
          }
        }
      `}</style>
    </header>
  );
}


