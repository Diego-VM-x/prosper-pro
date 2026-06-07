'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(id);
    }
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    setToasts((prev) => [...prev, { id, message, type }]);
    const timer = setTimeout(() => {
      removeToast(id);
    }, 4000);
    toastTimers.current.set(id, timer);
  }, [removeToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      toastTimers.current.forEach((timer) => clearTimeout(timer));
      toastTimers.current.clear();
    };
  }, []);

  const typeIcons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const typeColors: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: '#EEF8F3', border: 'var(--color-prosper-green)', icon: 'var(--color-prosper-green)' },
    error: { bg: '#FEF2F2', border: 'var(--color-error)', icon: 'var(--color-error)' },
    warning: { bg: '#FFFBEB', border: 'var(--color-warning, #F59E0B)', icon: 'var(--color-warning, #F59E0B)' },
    info: { bg: '#EFF6FF', border: 'var(--color-blue-500, #3B82F6)', icon: 'var(--color-blue-500, #3B82F6)' },
  };

  return (
    <ToastContext.Provider
      value={{
        toast: addToast,
        success: (m) => addToast(m, 'success'),
        error: (m) => addToast(m, 'error'),
        warning: (m) => addToast(m, 'warning'),
        info: (m) => addToast(m, 'info'),
      }}
    >
      {children}
      <div className="toast-container">
        {toasts.map((t) => {
          const colors = typeColors[t.type];
          return (
            <div key={t.id} className="toast-item" data-type={t.type} style={{ background: colors.bg, borderLeftColor: colors.border }}>
              <span className="toast-icon" style={{ color: colors.icon }}>{typeIcons[t.type]}</span>
              <span className="toast-message">{t.message}</span>
              <button className="toast-close" onClick={() => removeToast(t.id)}>✕</button>
            </div>
          );
        })}
      </div>
      <style>{`
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 400px;
          pointer-events: none;
        }
        .toast-item { pointer-events: auto; }
        .toast-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          border-left: 4px solid;
          box-shadow: var(--shadow-lg);
          animation: toastSlideIn 0.3s ease;
        }
        .toast-item.removing { animation: toastSlideOut 0.3s ease; }
        .toast-icon { font-size: 1.125rem; font-weight: 700; flex-shrink: 0; }
        .toast-message { flex: 1; font-size: 0.875rem; color: var(--text-primary); font-weight: 500; }
        .toast-close {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          font-size: 1rem;
          padding: 2px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }
        .toast-close:hover { color: var(--text-primary); background: rgba(0,0,0,0.1); }
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes toastSlideOut {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(100%); }
        }
        [data-theme="dark"] .toast-item[data-type="success"] { background: rgba(61,204,142,0.15) !important; }
        [data-theme="dark"] .toast-item[data-type="error"] { background: rgba(239,68,68,0.15) !important; }
        [data-theme="dark"] .toast-item[data-type="warning"] { background: rgba(245,158,11,0.15) !important; }
        [data-theme="dark"] .toast-item[data-type="info"] { background: rgba(59,130,246,0.15) !important; }
        [data-theme="amoled"] .toast-item[data-type="success"] { background: rgba(61,204,142,0.2) !important; }
        [data-theme="amoled"] .toast-item[data-type="error"] { background: rgba(239,68,68,0.2) !important; }
        [data-theme="amoled"] .toast-item[data-type="warning"] { background: rgba(245,158,11,0.2) !important; }
        [data-theme="amoled"] .toast-item[data-type="info"] { background: rgba(59,130,246,0.2) !important; }
        @media (max-width: 480px) {
          .toast-container { top: 10px; right: 10px; left: 10px; max-width: none; }
          .toast-item { padding: 10px 12px; }
        }
        @media (max-width: 768px) {
          .confirm-dialog { width: 95%; max-width: none; margin: 0 10px; padding: 20px; }
          .confirm-footer { flex-direction: column-reverse; }
          .confirm-btn { width: 100%; text-align: center; padding: 14px; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// Confirm dialog personalizado
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  secondaryText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  onSecondary?: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  secondaryText,
  variant = 'info',
  onConfirm,
  onCancel,
  onSecondary,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantColors = {
    danger: { btn: 'var(--color-error)', bg: 'rgba(239,68,68,0.1)' },
    warning: { btn: 'var(--color-warning, #F59E0B)', bg: 'rgba(245,158,11,0.1)' },
    info: { btn: 'var(--color-prosper-green)', bg: 'rgba(61,204,142,0.1)' },
  };

  const colors = variantColors[variant];

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-header">
          <h3 className="confirm-title">{title}</h3>
          <button className="confirm-close" onClick={onCancel}>✕</button>
        </div>
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        <div className="confirm-footer">
          <button className="confirm-btn confirm-btn-cancel" onClick={onCancel}>{cancelText}</button>
          {onSecondary && secondaryText && (
            <button className="confirm-btn confirm-btn-secondary" onClick={onSecondary}>
              {secondaryText}
            </button>
          )}
          <button className="confirm-btn confirm-btn-confirm" style={{ background: colors.btn }} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
      <style>{`
        .confirm-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 10001; backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .confirm-dialog {
          background: #ffffff; border: 1px solid var(--border-default);
          border-radius: var(--radius-xl); width: 90%; max-width: 400px;
          padding: 24px; animation: fadeInUp 0.3s ease;
          max-height: 90vh; overflow-y: auto;
        }
        [data-theme="dark"] .confirm-dialog { background: #0a1628; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6); }
        [data-theme="amoled"] .confirm-dialog { background: #0a0a0a; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9); }
        .confirm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .confirm-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }
        .confirm-close {
          background: none; border: none; color: var(--text-secondary); cursor: pointer;
          font-size: 1.25rem; padding: 8px; min-width: 44px; min-height: 44px;
          display: flex; align-items: center; justify-content: center;
          border-radius: var(--radius-sm);
        }
        .confirm-close:hover { color: var(--text-primary); background: var(--bg-input); }
        .confirm-body { margin-bottom: 24px; }
        .confirm-body p { color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.5; margin: 0; }
        .confirm-footer { display: flex; gap: 12px; justify-content: flex-end; }
        .confirm-btn {
          padding: 10px 20px; border-radius: var(--radius-md); font-size: 0.875rem;
          font-weight: 600; cursor: pointer; border: none; transition: all var(--transition-fast);
        }
        .confirm-btn-cancel { background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-default); }
        .confirm-btn-cancel:hover { background: var(--border-default); }
        .confirm-btn-secondary { background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border-default); }
        .confirm-btn-secondary:hover { background: var(--bg-input); color: var(--text-primary); border-color: var(--color-prosper-green); }
        .confirm-btn-confirm { color: white; }
        .confirm-btn-confirm:hover { filter: brightness(1.1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
