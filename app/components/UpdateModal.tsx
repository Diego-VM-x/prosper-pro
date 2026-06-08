'use client';
import React, { useState, useEffect } from 'react';
import { safeLocalStorage, safeSessionStorage } from '@/lib/utils/safeStorage';
interface UpdateNote {
  emoji: string;
  text: string;
}
interface UpdateModalProps {
  version?: string;
  notes?: UpdateNote[];
}
export function UpdateModal({
  version = "0.9.6",
  notes = [
    { emoji: "🎨", text: "Landing page completamente rediseñada: más interactiva, sin espacios vacíos y con demo de todas las secciones de la app." },
    { emoji: "🖥️", text: "Demo interactiva: explora mockups del Dashboard, Finanzas, Metas, Calendario y Academia sin salir de la landing." },
    { emoji: "⭐", text: "Cuentas favoritas: sigue marcando hasta 3 cuentas para personalizar tu Dashboard." },
  ],
}: UpdateModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);

  // Show modal when version changes (even in the same session)
  useEffect(() => {
    try {
      const modalDisabled = safeLocalStorage.getItem('prosper_show_update_modal') === 'false';
      if (modalDisabled) {
        setShouldHide(true);
        return;
      }

      const seenVersion = safeLocalStorage.getItem('prosper_update_seen');
      if (seenVersion !== version) {
        // Reset session flag so the new version is shown immediately
        safeSessionStorage.removeItem('prosper_update_seen_session');
        setTimeout(() => setIsOpen(true), 600);
      }
    } catch {}
  }, [version]);

  // Mark as seen when opened
  useEffect(() => {
    if (isOpen) {
      try {
        safeSessionStorage.setItem('prosper_update_seen_session', 'true');
        safeLocalStorage.setItem('prosper_update_seen', version);
      } catch {}
    }
  }, [isOpen, version]);

  const handleClose = () => {
    try { safeLocalStorage.setItem('prosper_update_seen', version); } catch {}
    setClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setClosing(false);
    }, 300);
  };

  const handleNeverShow = () => {
    try { safeLocalStorage.setItem('prosper_show_update_modal', 'false'); } catch {}
    setIsOpen(false);
  };

  if (!isOpen || shouldHide) return null;

  return (
    <>
      <style>{`
        @keyframes um-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes um-fadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes um-slideUp {
          from { transform: translateY(40px) scale(0.96); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @keyframes um-slideDown {
          from { transform: translateY(0)    scale(1);    opacity: 0; }
        }
        @keyframes um-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes um-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.08); }
        }
        @keyframes um-noteIn {
          from { opacity: 0; transform: translateX(-14px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .um-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: ${closing ? 'um-fadeOut' : 'um-fadeIn'} 0.35s ease forwards;
        }

        .um-card {
          position: relative;
          width: 90%;
          max-width: 480px;
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.08),
            0 20px 60px rgba(0,0,0,0.4),
            0 0 80px rgba(61,204,142,0.12);
          animation: ${closing ? 'um-slideDown' : 'um-slideUp'} 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
          background: var(--bg-card, #1a1a2e);
        }

        /* ── HEADER ── */
        .um-header {
          position: relative;
          padding: 2rem 1.75rem 1.5rem;
          background: linear-gradient(135deg, #0f4c35 0%, #1a6b4a 50%, #3DCC8E 100%);
          overflow: hidden;
        }
        .um-header::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.08) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: ${closing ? 'um-fadeOut' : 'um-fadeIn'} 0.35s ease forwards;
        }
        .um-header-dots {
          position: absolute;
          top: -20px; right: -20px;
          width: 140px; height: 140px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%);
        }
        .um-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
        }
        .um-title {
          margin: 0;
          font-size: 1.6rem;
          font-weight: 800;
          color: #fff;
          line-height: 1.2;
        }
        .um-subtitle {
          margin: 0.4rem 0 0;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.7);
          position: relative;
        }
        .um-rocket {
          position: absolute;
          top: 1rem; right: 1rem;
          font-size: 2.8rem;
          animation: um-pulse 2.5s ease-in-out infinite;
          user-select: none;
        }

        /* ── CLOSE BTN ── */
        .um-close {
          position: absolute;
          top: 0.9rem; right: 0.9rem;
          width: 32px; height: 32px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.15);
          color: #fff;
          font-size: 1.1rem;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s, transform 0.2s;
          line-height: 1;
          z-index: 2;
        }
        .um-close:hover {
          background: rgba(255,255,255,0.3);
          transform: rotate(90deg);
        }

        /* ── BODY ── */
        .um-body {
          padding: 1.5rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .um-note {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.7rem 1rem;
          border-radius: 12px;
          background: var(--bg-secondary, rgba(255,255,255,0.04));
          border: 1px solid var(--border-default, rgba(255,255,255,0.07));
          transition: border-color 0.2s, background 0.2s;
          animation: um-noteIn 0.4s ease both;
        }
        .um-note:hover {
          border-color: rgba(61,204,142,0.4);
          background: rgba(61,204,142,0.06);
        }
        .um-note-emoji {
          font-size: 1.2rem;
          line-height: 1.4;
          flex-shrink: 0;
        }
        .um-note-text {
          font-size: 0.875rem;
          color: var(--text-primary, #e2e8f0);
          line-height: 1.5;
          margin: 0;
        }

        /* stagger */
        .um-note:nth-child(1) { animation-delay: 0.05s; }
        .um-note:nth-child(2) { animation-delay: 0.12s; }
        .um-note:nth-child(3) { animation-delay: 0.19s; }
        .um-note:nth-child(4) { animation-delay: 0.26s; }
        .um-note:nth-child(5) { animation-delay: 0.33s; }
        .um-note:nth-child(6) { animation-delay: 0.40s; }
        .um-note:nth-child(7) { animation-delay: 0.47s; }

        /* ── FOOTER ── */
        .um-footer {
          padding: 1rem 1.75rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .um-footer-hint {
          font-size: 0.75rem;
          color: var(--text-secondary, #888);
        }
        .um-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.65rem 1.4rem;
          border-radius: 10px;
          border: none;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          background: linear-gradient(135deg, #3DCC8E, #2ba870);
          color: #fff;
          box-shadow: 0 4px 15px rgba(61,204,142,0.35);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          white-space: nowrap;
        }
        .um-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(61,204,142,0.45);
        }
        .um-btn:active {
          transform: translateY(0);
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .um-card { max-width: 90%; }
          .um-header { padding: 1.5rem 1.25rem 1.25rem; }
          .um-title { font-size: 1.35rem; }
          .um-subtitle { font-size: 0.8rem; }
          .um-body { padding: 1.25rem 1.25rem; gap: 0.6rem; }
          .um-note { padding: 0.6rem 0.85rem; }
          .um-note-text { font-size: 0.8rem; }
          .um-footer { padding: 0.85rem 1.25rem 1.25rem; gap: 0.6rem; }
          .um-btn { padding: 0.55rem 1rem; font-size: 0.82rem; }
        }
        @media (max-width: 480px) {
          .um-overlay { align-items: flex-end; }
          .um-card {
            max-width: 100%;
            width: 100%;
            border-radius: 20px 20px 0 0;
            max-height: 85vh;
            overflow-y: auto;
          }
          .um-header { padding: 1.25rem 1rem 1rem; }
          .um-title { font-size: 1.15rem; }
          .um-subtitle { font-size: 0.75rem; }
          .um-badge { font-size: 0.65rem; padding: 3px 10px; }
          .um-close { top: 0.7rem; right: 0.7rem; width: 28px; height: 28px; font-size: 1rem; }
          .um-body { padding: 1rem 1rem; gap: 0.5rem; }
          .um-note { padding: 0.5rem 0.75rem; border-radius: 10px; gap: 0.6rem; }
          .um-note-emoji { font-size: 1rem; }
          .um-note-text { font-size: 0.75rem; }
          .um-footer {
            flex-direction: column-reverse;
            padding: 0.75rem 1rem 1.25rem;
            gap: 0.5rem;
          }
          .um-btn {
            width: 100%;
            justify-content: center;
            padding: 0.65rem 1rem;
            font-size: 0.85rem;
          }
        }
        @media (max-width: 360px) {
          .um-title { font-size: 1rem; }
          .um-note-text { font-size: 0.7rem; }
          .um-btn { font-size: 0.78rem; padding: 0.55rem 0.85rem; }
        }
      `}</style>
      <div className="um-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
        <div className="um-card" role="dialog" aria-modal="true" aria-label="Novedades de la versión">
          {/* HEADER */}
          <div className="um-header">
            <div className="um-header-dots" />
            <div className="um-badge">✨ Nueva versión</div>
            <button className="um-close" onClick={handleClose} aria-label="Cerrar">✕</button>
            <h2 className="um-title">¡Hay novedades! 🎉</h2>
            <p className="um-subtitle">Actualización {version} — ya disponible para ti</p>
          </div>
          {/* BODY */}
          <div className="um-body">
            {notes.map((note, i) => (
              <div className="um-note" key={i}>
                <span className="um-note-emoji">{note.emoji}</span>
                <p className="um-note-text">{note.text}</p>
              </div>
            ))}
          </div>
          {/* FOOTER */}
          <div className="um-footer">
            <button className="um-btn" onClick={handleNeverShow}>No volver a mostrar</button>
            <button className="um-btn" onClick={handleClose}>¡Vamos! 🚀</button>
          </div>
        </div>
      </div>
    </>
  );
}
