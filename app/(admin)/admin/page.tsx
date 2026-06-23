'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { setAdminSessionCookie } from '@/lib/utils/adminCookieClient';
import {
  subscribeToAdminTasks,
  subscribeToFeedback,
  subscribeToAdminStats,
  addAdminTask,
  toggleAdminTask,
  deleteAdminTask,
  archiveFeedback,
  addGlobalNotification,
  getDeadlinePlusDays,
} from '@/lib/firestore/admin';
import type { AdminTask, GlobalNotification, AdminStats, FeedbackReport } from '@/types';
import styles from './admin.module.css';

const SUPER_ADMIN_UID = 'qpjtErB8lxWmxNdbOmoCdqZBeAl1';
const TOKEN_REFRESH_MS = 10 * 60 * 1000; // 10 minutos

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

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [feedback, setFeedback] = useState<FeedbackReport[]>([]);
  const [stats, setStats] = useState<AdminStats>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Forms
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState<'all' | 'specific'>('all');
  const [notifTargets, setNotifTargets] = useState('');

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

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

    // Keep server cookie fresh while the admin panel is open
    const refreshCookie = async () => {
      try {
        const token = await user.getIdToken(true);
        setAdminSessionCookie(token);
      } catch {
        // Token refresh failed silently
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

    return () => {
      unsubTasks();
      unsubFeedback();
      unsubStats();
    };
  }, [user]);

  const overdueCount = useMemo(
    () => tasks.filter((t) => isOverdue(t.deadline, t.completed)).length,
    [tasks]
  );
  const openCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);
  const bugCount = useMemo(() => feedback.filter((f) => f.type === 'bug').length, [feedback]);
  const suggestionCount = useMemo(() => feedback.filter((f) => f.type === 'suggestion').length, [feedback]);

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showToast('Completa título y mensaje', 'error');
      return;
    }
    try {
      const target: GlobalNotification['target'] =
        notifTarget === 'specific'
          ? notifTargets
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : 'all';
      await addGlobalNotification({
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        target,
        sentBy: SUPER_ADMIN_UID,
      });
      setNotifTitle('');
      setNotifMessage('');
      setNotifTargets('');
      setNotifTarget('all');
      showToast('Notificación global enviada');
    } catch {
      showToast('Error al enviar notificación', 'error');
    }
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
    } catch {
      showToast('Error al crear tarea', 'error');
    }
  }

  async function handleToggleTask(task: AdminTask) {
    try {
      await toggleAdminTask(task.id, task.completed);
      showToast(task.completed ? 'Tarea reabierta' : 'Tarea completada');
    } catch {
      showToast('Error al actualizar tarea', 'error');
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('¿Eliminar esta tarea permanentemente?')) return;
    try {
      await deleteAdminTask(taskId);
      showToast('Tarea eliminada');
    } catch {
      showToast('Error al eliminar tarea', 'error');
    }
  }

  async function handleArchiveFeedback(id: string) {
    if (!confirm('¿Archivar este feedback? Se eliminará de la colección.')) return;
    try {
      await archiveFeedback(id);
      showToast('Feedback archivado');
    } catch {
      showToast('Error al archivar feedback', 'error');
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
    } catch {
      showToast('Error al crear tarea', 'error');
    }
  }

  const defaultDeadline = useMemo(() => getDeadlinePlusDays(7), []);

  if (!mounted || loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Verificando acceso...</p>
      </div>
    );
  }

  if (!user || user.uid !== SUPER_ADMIN_UID) {
    return null; // router.replace already in progress
  }

  return (
    <div className={styles.container}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      )}

      <header className={styles.header}>
        <h1 className={styles.title}>🛡️ Panel de Administración</h1>
        <p className={styles.subtitle}>Acceso exclusivo · Super Administrador</p>
      </header>

      <section className={styles.kpiGrid}>
        <KpiCard label="Usuarios registrados" value={stats.totalUsers ?? 0} color="navy" />
        <KpiCard label="Transacciones totales" value={stats.totalTransactions ?? 0} color="emerald" />
        <KpiCard label="Feedback recibido" value={feedback.length} color="amber" />
        <KpiCard label="Tareas abiertas" value={openCount} alert={overdueCount > 0} alertValue={overdueCount} color="rose" />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>📢 Crear Notificación Global</h2>
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
                checked={notifTarget === 'all'}
                onChange={() => setNotifTarget('all')}
              />
              Todos los usuarios
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                value="specific"
                checked={notifTarget === 'specific'}
                onChange={() => setNotifTarget('specific')}
              />
              Usuarios específicos
            </label>
          </div>
          {notifTarget === 'specific' && (
            <input
              type="text"
              placeholder="UIDs separados por comas"
              value={notifTargets}
              onChange={(e) => setNotifTargets(e.target.value)}
              className={styles.input}
            />
          )}
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
            Enviar notificación global
          </button>
        </form>
      </section>

      <div className={styles.twoColumn}>
        <section className={`${styles.card} ${styles.scrollCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>💬 Feedback de la Comunidad</h2>
            <span className={styles.badge}>{feedback.length}</span>
          </div>
          <div className={styles.list}>
            {feedback.length === 0 ? (
              <p className={styles.empty}>No hay feedback recibido.</p>
            ) : (
              feedback.map((item) => (
                <div key={item.id} className={styles.feedbackItem}>
                  <div className={styles.feedbackTop}>
                    <span
                      className={`${styles.feedbackBadge} ${
                        item.type === 'bug' ? styles.badgeBug : styles.badgeSuggestion
                      }`}
                    >
                      {item.type === 'bug' ? 'BUG' : 'SUGERENCIA'}
                    </span>
                    <span className={styles.feedbackMeta}>{formatDate(item.createdAt)}</span>
                  </div>
                  <p className={styles.feedbackMessage}>{item.message}</p>
                  {item.page && <p className={styles.feedbackPage}>Página: {item.page}</p>}
                  <p className={styles.feedbackOwner}>UID: {item.ownerId}</p>
                  <div className={styles.feedbackActions}>
                    <button
                      onClick={() => handleCreateTaskFromFeedback(item)}
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      title="Crear tarea automática con deadline +7 días"
                    >
                      🛠️ Crear Tarea
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
            <h2 className={styles.cardTitle}>🛠️ Roadmap Técnico</h2>
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
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
  alert,
  alertValue,
}: {
  label: string;
  value: number;
  color: 'navy' | 'emerald' | 'amber' | 'rose';
  alert?: boolean;
  alertValue?: number;
}) {
  const colorClass = {
    navy: styles.kpiNavy,
    emerald: styles.kpiEmerald,
    amber: styles.kpiAmber,
    rose: styles.kpiRose,
  }[color];

  return (
    <div className={`${styles.kpiCard} ${colorClass}`}>
      <span className={styles.kpiValue}>{value.toLocaleString('es-ES')}</span>
      <span className={styles.kpiLabel}>{label}</span>
      {alert && alertValue ? (
        <span className={styles.kpiAlert}>{alertValue} vencidas</span>
      ) : null}
    </div>
  );
}
