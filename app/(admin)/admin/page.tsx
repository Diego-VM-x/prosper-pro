'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { setAdminSessionCookie } from '@/lib/utils/adminCookieClient';
import {
  subscribeToAdminTasks,
  subscribeToFeedback,
  subscribeToAdminStats,
  subscribeToActiveUsers,
  subscribeToGlobalConfig,
  addAdminTask,
  toggleAdminTask,
  deleteAdminTask,
  archiveFeedback,
  respondToFeedback,
  updateFeedbackStatus,
  dispatchGlobalNotification,
  sendDirectNotification,
  searchUsersByNameOrEmail,
  getAllUsers,
  wipeUserData,
  getCurrentBCVRate,
  setGlobalConfig as saveGlobalConfig,
  recalculateAdminStats,
  getDeadlinePlusDays,
  type AdminUser,
  type ActiveUsersStats,
} from '@/lib/firestore/admin';
import {
  IconDashboard,
  IconTeam,
  IconTasks,
  IconAnalytics,
  IconBell,
  IconSearch,
  IconX,
  IconEdit,
  IconMail,
  IconTrash,
  IconCheck,
  IconWallet,
  IconSettings,
} from '@/app/components/icons';
import type { AdminTask, AdminStats, FeedbackReport, GlobalConfig } from '@/types';
import { SUPER_ADMIN_UID } from '@/lib/constants/admin';
import styles from './admin.module.css';
const TOKEN_REFRESH_MS = 10 * 60 * 1000;

function formatDate(ts: number): string {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(deadline: string, completed: boolean): boolean {
  if (completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline);
  dl.setHours(0, 0, 0, 0);
  return dl.getTime() < today.getTime();
}

function daysUntil(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline);
  dl.setHours(0, 0, 0, 0);
  return Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function userDisplayName(user: AdminUser): string {
  return user.displayName || user.email || user.uid;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [feedback, setFeedback] = useState<FeedbackReport[]>([]);
  const [stats, setStats] = useState<AdminStats>({});
  const [activeUsers, setActiveUsers] = useState<ActiveUsersStats>({
    activeNow: 0,
    activeToday: 0,
    totalUsers: 0,
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Notification form
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTargetMode, setNotifTargetMode] = useState<'all' | 'specific'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);

  // Task form
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');

  // Global config / feature flags
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({});

  // Feedback response
  const [respondingTo, setRespondingTo] = useState<FeedbackReport | null>(null);
  const [responseText, setResponseText] = useState('');

  // Users audit
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [directNotifTitle, setDirectNotifTitle] = useState('');
  const [directNotifMessage, setDirectNotifMessage] = useState('');

  // Rates
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [rateOverride, setRateOverride] = useState<string>('');
  const [rateEnabled, setRateEnabled] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  const defaultDeadline = useMemo(() => getDeadlinePlusDays(7), []);

  // Client-side guard + token refresh
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user || user.uid !== SUPER_ADMIN_UID) {
      router.replace('/');
      return;
    }

    const refreshCookie = async () => {
      try {
        const token = await user.getIdToken(true);
        setAdminSessionCookie(token);
      } catch {
        // ignore
      }
    };
    refreshCookie();
    const interval = setInterval(refreshCookie, TOKEN_REFRESH_MS);
    return () => clearInterval(interval);
  }, [user, loading, router]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user || user.uid !== SUPER_ADMIN_UID) return;

    const unsubTasks = subscribeToAdminTasks(setTasks);
    const unsubFeedback = subscribeToFeedback(setFeedback);
    const unsubStats = subscribeToAdminStats(setStats);
    const unsubActive = subscribeToActiveUsers(setActiveUsers);
    const unsubConfig = subscribeToGlobalConfig((cfg) => {
      setGlobalConfig(cfg);
      setRateEnabled(cfg.rates?.enabled ?? false);
      setRateOverride(cfg.rates?.USD ? String(cfg.rates.USD) : '');
    });

    return () => {
      unsubTasks();
      unsubFeedback();
      unsubStats();
      unsubActive();
      unsubConfig();
    };
  }, [user]);

  // Load users and current BCV rate once
  useEffect(() => {
    if (!user || user.uid !== SUPER_ADMIN_UID) return;
    getAllUsers().then(setUsers).catch(() => {});
    getCurrentBCVRate().then(setCurrentRate).catch(() => {});
  }, [user]);

  // Recalculate derived stats once on load
  useEffect(() => {
    if (!user || user.uid !== SUPER_ADMIN_UID) return;
    recalculateAdminStats().catch(() => {});
  }, [user]);

  // Search users for notifications
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim() || notifTargetMode !== 'specific') {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchUsersByNameOrEmail(searchQuery);
        const filtered = results.filter((u) => !selectedUsers.some((s) => s.uid === u.uid));
        setSearchResults(filtered);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [searchQuery, notifTargetMode, selectedUsers]);

  const overdueCount = useMemo(
    () => tasks.filter((t) => isOverdue(t.deadline, t.completed)).length,
    [tasks]
  );
  const openCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showToast('Completa título y mensaje', 'error');
      return;
    }
    if (notifTargetMode === 'specific' && selectedUsers.length === 0) {
      showToast('Selecciona al menos un usuario', 'error');
      return;
    }
    try {
      const target: 'all' | string[] =
        notifTargetMode === 'specific' ? selectedUsers.map((u) => u.uid) : 'all';
      const result = await dispatchGlobalNotification({
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        target,
        sentBy: SUPER_ADMIN_UID,
      });
      setNotifTitle('');
      setNotifMessage('');
      setSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
      setNotifTargetMode('all');
      showToast(`Notificación enviada a ${result.recipients} usuario${result.recipients === 1 ? '' : 's'}`);
    } catch (err: any) {
      showToast(err?.message || 'Error al enviar notificación', 'error');
    }
  }

  function selectUser(user: AdminUser) {
    setSelectedUsers((prev) => [...prev, user]);
    setSearchQuery('');
    setSearchResults([]);
  }

  function removeSelectedUser(uid: string) {
    setSelectedUsers((prev) => prev.filter((u) => u.uid !== uid));
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskText.trim() || !newTaskDeadline) {
      showToast('Completa la tarea y fecha límite', 'error');
      return;
    }
    try {
      await addAdminTask({
        task: newTaskText.trim(),
        deadline: newTaskDeadline,
        completed: false,
        createdAt: Date.now(),
      });
      setNewTaskText('');
      setNewTaskDeadline('');
      showToast('Tarea añadida al roadmap');
    } catch (err: any) {
      showToast(err?.message || 'Error al crear tarea', 'error');
    }
  }

  async function handleToggleTask(task: AdminTask) {
    try {
      await toggleAdminTask(task.id, task.completed);
      showToast(task.completed ? 'Tarea reabierta' : 'Tarea completada');
    } catch (err: any) {
      showToast(err?.message || 'Error al actualizar tarea', 'error');
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('¿Eliminar esta tarea permanentemente?')) return;
    try {
      await deleteAdminTask(taskId);
      showToast('Tarea eliminada');
    } catch (err: any) {
      showToast(err?.message || 'Error al eliminar tarea', 'error');
    }
  }

  async function handleArchiveFeedback(id: string) {
    if (!confirm('¿Archivar este feedback? Se eliminará de la colección.')) return;
    try {
      await archiveFeedback(id);
      showToast('Feedback archivado');
    } catch (err: any) {
      showToast(err?.message || 'Error al archivar feedback', 'error');
    }
  }

  async function handleCreateTaskFromFeedback(item: FeedbackReport) {
    const tag = item.type === 'bug' ? '[BUG REPORTADO]' : '[SUGERENCIA]';
    const taskText = `${tag} ${item.message}`;
    const deadline = getDeadlinePlusDays(7);
    try {
      await addAdminTask({
        task: taskText,
        deadline,
        completed: false,
        createdAt: Date.now(),
      });
      showToast('Tarea creada desde feedback');
    } catch (err: any) {
      showToast(err?.message || 'Error al crear tarea', 'error');
    }
  }

  async function handleStatusChange(item: FeedbackReport, status: FeedbackReport['status']) {
    try {
      await updateFeedbackStatus(item.id, status);
      showToast('Estado actualizado');
    } catch (err: any) {
      showToast(err?.message || 'Error al actualizar estado', 'error');
    }
  }

  async function handleSubmitResponse(e: React.FormEvent) {
    e.preventDefault();
    if (!respondingTo || !responseText.trim()) return;
    try {
      await respondToFeedback(respondingTo.id, respondingTo.ownerId, responseText.trim(), SUPER_ADMIN_UID);
      setRespondingTo(null);
      setResponseText('');
      showToast('Respuesta enviada al usuario');
    } catch (err: any) {
      showToast(err?.message || 'Error al responder', 'error');
    }
  }

  async function handleSaveRateOverride(e: React.FormEvent) {
    e.preventDefault();
    try {
      const rateValue = rateEnabled ? parseFloat(rateOverride) : undefined;
      await saveGlobalConfig(
        {
          rates: {
            enabled: rateEnabled,
            USD: rateValue,
            source: rateEnabled ? 'manual' : 'api',
          },
        },
        SUPER_ADMIN_UID
      );
      showToast(rateEnabled ? 'Override de tasa guardado' : 'Override desactivado');
    } catch (err: any) {
      showToast(err?.message || 'Error al guardar tasa', 'error');
    }
  }

  async function handleToggleFeature(key: keyof GlobalConfig, value: boolean) {
    try {
      await saveGlobalConfig({ [key]: value }, SUPER_ADMIN_UID);
      showToast('Configuración actualizada');
    } catch (err: any) {
      showToast(err?.message || 'Error al actualizar configuración', 'error');
    }
  }

  async function handleDeleteUser(uid: string) {
    if (!confirm('¿Eliminar TODOS los datos de este usuario? La cuenta de autenticación seguirá existiendo.')) return;
    try {
      await wipeUserData(uid);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      if (selectedUser?.uid === uid) setSelectedUser(null);
      showToast('Datos del usuario eliminados');
    } catch (err: any) {
      showToast(err?.message || 'Error al eliminar usuario', 'error');
    }
  }

  async function handleSendDirectNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !directNotifTitle.trim() || !directNotifMessage.trim()) return;
    try {
      await sendDirectNotification(selectedUser.uid, directNotifTitle.trim(), directNotifMessage.trim(), SUPER_ADMIN_UID);
      setDirectNotifTitle('');
      setDirectNotifMessage('');
      showToast('Notificación directa enviada');
    } catch (err: any) {
      showToast(err?.message || 'Error al enviar notificación', 'error');
    }
  }

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  if (!mounted || loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Verificando acceso...</p>
      </div>
    );
  }

  if (!user || user.uid !== SUPER_ADMIN_UID) {
    return null;
  }

  return (
    <div className={styles.container}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      )}

      <header className={styles.header}>
        <h1 className={styles.title}>
          <IconShield className={styles.headerIcon} />
          Panel de Administración
        </h1>
        <p className={styles.subtitle}>Acceso exclusivo · Super Administrador</p>
      </header>

      <section className={styles.kpiGrid}>
        <KpiCard
          label="Usuarios registrados"
          value={activeUsers.totalUsers}
          icon={<IconTeam />}
          color="navy"
        />
        <KpiCard
          label="Activos ahora"
          value={activeUsers.activeNow}
          icon={<IconDashboard />}
          color="emerald"
        />
        <KpiCard
          label="Activos hoy"
          value={activeUsers.activeToday}
          icon={<IconAnalytics />}
          color="amber"
        />
        <KpiCard
          label="Feedback recibido"
          value={feedback.length}
          icon={<IconBell />}
          color="rose"
        />
        <KpiCard
          label="Tareas abiertas"
          value={openCount}
          icon={<IconTasks />}
          color="blue"
          alert={overdueCount > 0}
          alertValue={overdueCount}
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <IconBell className={styles.cardIcon} />
          Crear Notificación Global
        </h2>
        <form onSubmit={handleSendNotification} className={styles.notificationForm}>
          <input
            type="text"
            placeholder="Título de la notificación"
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            className={styles.input}
          />
          <textarea
            placeholder="Mensaje para los usuarios"
            value={notifMessage}
            onChange={(e) => setNotifMessage(e.target.value)}
            className={styles.textarea}
            rows={3}
          />
          <div className={styles.radioRow}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                value="all"
                checked={notifTargetMode === 'all'}
                onChange={() => setNotifTargetMode('all')}
              />
              Todos los usuarios
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                value="specific"
                checked={notifTargetMode === 'specific'}
                onChange={() => setNotifTargetMode('specific')}
              />
              Usuarios específicos
            </label>
          </div>

          {notifTargetMode === 'specific' && (
            <div className={styles.userSearch}>
              <div className={styles.searchInputWrapper}>
                <IconSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.input}
                />
              </div>

              {searching && <p className={styles.hint}>Buscando...</p>}

              {searchResults.length > 0 && (
                <div className={styles.searchResults}>
                  {searchResults.map((u) => (
                    <button
                      key={u.uid}
                      type="button"
                      onClick={() => selectUser(u)}
                      className={styles.searchResultItem}
                    >
                      <div className={styles.userAvatar}>
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" />
                        ) : (
                          <span>{userDisplayName(u).charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{userDisplayName(u)}</span>
                        <span className={styles.userEmail}>{u.email || u.uid}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedUsers.length > 0 && (
                <div className={styles.selectedUsers}>
                  {selectedUsers.map((u) => (
                    <span key={u.uid} className={styles.selectedChip}>
                      {userDisplayName(u)}
                      <button
                        type="button"
                        onClick={() => removeSelectedUser(u.uid)}
                        className={styles.chipRemove}
                        aria-label="Quitar usuario"
                      >
                        <IconX />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
            Enviar notificación global
          </button>
        </form>
      </section>

      <div className={styles.twoColumn}>
        <section className={`${styles.card} ${styles.scrollCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <IconBell className={styles.cardIcon} />
              Feedback de la Comunidad
            </h2>
            <span className={styles.badge}>{feedback.length}</span>
          </div>
          <div className={styles.list}>
            {feedback.length === 0 ? (
              <p className={styles.empty}>No hay feedback recibido.</p>
            ) : (
              feedback.map((item) => (
                <div key={item.id} className={`${styles.feedbackItem} ${styles[`feedback${item.status}`]}`}>
                  <div className={styles.feedbackTop}>
                    <span
                      className={`${styles.feedbackBadge} ${
                        item.type === 'bug' ? styles.badgeBug : styles.badgeSuggestion
                      }`}
                    >
                      {item.type === 'bug' ? 'BUG' : 'SUGERENCIA'}
                    </span>
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item, e.target.value as FeedbackReport['status'])}
                      className={styles.statusSelect}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En progreso</option>
                      <option value="resolved">Resuelto</option>
                    </select>
                  </div>
                  <p className={styles.feedbackMessage}>{item.message}</p>
                  {item.page && <p className={styles.feedbackPage}>Página: {item.page}</p>}
                  <p className={styles.feedbackOwner}>UID: {item.ownerId}</p>
                  {item.adminResponse && (
                    <div className={styles.adminResponse}>
                      <strong>Respuesta:</strong> {item.adminResponse}
                    </div>
                  )}
                  <div className={styles.feedbackActions}>
                    <button
                      onClick={() => handleCreateTaskFromFeedback(item)}
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      title="Crear tarea automática con deadline +7 días"
                    >
                      <IconTasks />
                      Crear Tarea
                    </button>
                    <button
                      onClick={() => setRespondingTo(item)}
                      className={`${styles.btn} ${styles.btnSecondary}`}
                    >
                      <IconEdit />
                      Responder
                    </button>
                    <button
                      onClick={() => handleArchiveFeedback(item.id)}
                      className={`${styles.btn} ${styles.btnGhost}`}
                    >
                      Archivar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={`${styles.card} ${styles.scrollCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <IconTasks className={styles.cardIcon} />
              Roadmap Técnico
            </h2>
            <span className={`${styles.badge} ${overdueCount > 0 ? styles.badgeOverdue : ''}`}>
              {openCount} abiertas
            </span>
          </div>

          <form onSubmit={handleAddTask} className={styles.taskForm}>
            <input
              type="text"
              placeholder="Nueva tarea técnica..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              className={styles.input}
            />
            <div className={styles.taskFormRow}>
              <input
                type="date"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                className={styles.input}
              />
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                Añadir
              </button>
            </div>
            {!newTaskDeadline && (
              <span className={styles.hint}>Por defecto: {defaultDeadline}</span>
            )}
          </form>

          <div className={styles.list}>
            {tasks.length === 0 ? (
              <p className={styles.empty}>No hay tareas en el roadmap.</p>
            ) : (
              tasks.map((task) => {
                const overdue = isOverdue(task.deadline, task.completed);
                const days = daysUntil(task.deadline);
                return (
                  <div
                    key={task.id}
                    className={`${styles.taskItem} ${overdue ? styles.taskOverdue : ''} ${
                      task.completed ? styles.taskCompleted : ''
                    }`}
                  >
                    <label className={styles.taskCheckbox}>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(task)}
                      />
                      <span className={styles.checkmark} />
                    </label>
                    <div className={styles.taskContent}>
                      <p className={styles.taskText}>{task.task}</p>
                      <div className={styles.taskMeta}>
                        <span className={overdue ? styles.deadlineOverdue : styles.deadline}>
                          {overdue
                            ? `Vencida (${Math.abs(days)} días)`
                            : days === 0
                            ? 'Vence hoy'
                            : days === 1
                            ? 'Vence mañana'
                            : `${days} días restantes`}
                        </span>
                        <span className={styles.taskDate}>Creada: {formatDate(task.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className={styles.taskDelete}
                      aria-label="Eliminar tarea"
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Response Modal */}
      {respondingTo && (
        <div className={styles.modalOverlay} onClick={() => setRespondingTo(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Responder feedback</h3>
              <button onClick={() => setRespondingTo(null)} className={styles.modalClose}>
                <IconX />
              </button>
            </div>
            <p className={styles.modalHint}>Usuario: {respondingTo.ownerId}</p>
            <form onSubmit={handleSubmitResponse} className={styles.notificationForm}>
              <textarea
                placeholder="Escribe la respuesta para el usuario..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                className={styles.textarea}
                rows={4}
              />
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                Enviar respuesta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rates & Feature Flags */}
      <div className={styles.twoColumn}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <IconWallet className={styles.cardIcon} />
            Control de Tasas
          </h2>
          <div className={styles.rateInfo}>
            <span className={styles.rateLabel}>Tasa BCV actual:</span>
            <span className={styles.rateValue}>
              {currentRate ? `${currentRate} Bs/USD` : 'No disponible'}
            </span>
          </div>
          <form onSubmit={handleSaveRateOverride} className={styles.notificationForm}>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={rateEnabled}
                onChange={(e) => setRateEnabled(e.target.checked)}
              />
              <span>Activar override manual</span>
            </label>
            {rateEnabled && (
              <input
                type="number"
                step="0.01"
                placeholder="Tasa manual (Bs/USD)"
                value={rateOverride}
                onChange={(e) => setRateOverride(e.target.value)}
                className={styles.input}
              />
            )}
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
              Guardar configuración de tasas
            </button>
          </form>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <IconSettings className={styles.cardIcon} />
            Feature Flags
          </h2>
          <div className={styles.flagsList}>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={globalConfig.maintenanceMode ?? false}
                onChange={(e) => handleToggleFeature('maintenanceMode', e.target.checked)}
              />
              <span>Modo mantenimiento</span>
            </label>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={globalConfig.hideAndroidDownload ?? false}
                onChange={(e) => handleToggleFeature('hideAndroidDownload', e.target.checked)}
              />
              <span>Ocultar descarga Android</span>
            </label>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={globalConfig.disableRegister ?? false}
                onChange={(e) => handleToggleFeature('disableRegister', e.target.checked)}
              />
              <span>Deshabilitar registro</span>
            </label>
          </div>
        </section>
      </div>

      {/* Users Audit */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <IconTeam className={styles.cardIcon} />
          Auditoría de Usuarios
        </h2>
        <div className={styles.searchInputWrapper}>
          <IconSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar usuarios por nombre, email o UID..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.usersGrid}>
          {filteredUsers.length === 0 ? (
            <p className={styles.empty}>No se encontraron usuarios.</p>
          ) : (
            filteredUsers.map((u) => {
              const lastActive = u.devices?.reduce((max, d) => Math.max(max, d.lastActive || 0), 0);
              return (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => setSelectedUser(u)}
                  className={`${styles.userCard} ${selectedUser?.uid === u.uid ? styles.userCardActive : ''}`}
                >
                  <div className={styles.userAvatarLarge}>
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" />
                    ) : (
                      <span>{(u.displayName || u.email || u.uid).charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{u.displayName || 'Sin nombre'}</span>
                    <span className={styles.userEmail}>{u.email || u.uid}</span>
                    <span className={styles.userMeta}>
                      Última actividad: {lastActive ? formatDate(lastActive) : 'Nunca'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {selectedUser && (
          <div className={styles.userDetail}>
            <h3 className={styles.userDetailTitle}>Acciones para {selectedUser.displayName || selectedUser.email}</h3>
            <form onSubmit={handleSendDirectNotification} className={styles.notificationForm}>
              <input
                type="text"
                placeholder="Título de la notificación"
                value={directNotifTitle}
                onChange={(e) => setDirectNotifTitle(e.target.value)}
                className={styles.input}
              />
              <textarea
                placeholder="Mensaje directo al usuario"
                value={directNotifMessage}
                onChange={(e) => setDirectNotifMessage(e.target.value)}
                className={styles.textarea}
                rows={3}
              />
              <div className={styles.userDetailActions}>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  <IconMail />
                  Enviar notificación
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(selectedUser.uid)}
                  className={`${styles.btn} ${styles.btnDanger}`}
                >
                  <IconTrash />
                  Borrar datos
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  color,
  alert,
  alertValue,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'navy' | 'emerald' | 'amber' | 'rose' | 'blue';
  alert?: boolean;
  alertValue?: number;
}) {
  const colorClass = {
    navy: styles.kpiNavy,
    emerald: styles.kpiEmerald,
    amber: styles.kpiAmber,
    rose: styles.kpiRose,
    blue: styles.kpiBlue,
  }[color];

  return (
    <div className={`${styles.kpiCard} ${colorClass}`}>
      <div className={styles.kpiIcon}>{icon}</div>
      <span className={styles.kpiValue}>{value.toLocaleString('es-ES')}</span>
      <span className={styles.kpiLabel}>{label}</span>
      {alert && alertValue ? (
        <span className={styles.kpiAlert}>{alertValue} vencidas</span>
      ) : null}
    </div>
  );
}

// Shield icon local to avoid adding to shared icons
function IconShield({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
