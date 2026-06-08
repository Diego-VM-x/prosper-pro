'use client';

import React from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default function NotasVersionPage() {
  const versions = [
    { version: '0.9.5', date: '2026-06-07', notes: [
      'Cuentas favoritas: ahora puedes marcar hasta 3 cuentas como favoritas desde la sección Finanzas.',
      'El widget "Mis Cuentas" del Dashboard se renovó para mostrar únicamente tus cuentas favoritas.',
      'Si no tienes favoritas, el Dashboard te indicará cómo agregarlas para personalizar tu vista principal.',
      'Puedes quitar una cuenta de favoritos directamente desde el Dashboard o desde Finanzas con un solo clic.',
      'Se mantiene el límite de 3 favoritas para mantener el Dashboard limpio y enfocado en lo más importante.',
    ], preRelease: false },
    { version: '0.9.1', date: '2026-06-06', notes: [
      'Optimización de rendimiento: carga de código dividida (dynamic imports) para reducir el bundle inicial.',
      'Imágenes optimizadas por Next.js (formatos WebP/AVIF automáticos).',
      'Nuevas criptomonedas P2P: Bitcoin (BTC) y USD Coin (USDC) con precios reales de Binance.',
      'Landing page completamente renovada con testimonios, FAQ interactivo, barra de confianza y tutoriales.',
      'Redirección inteligente: /dashboard redirige a / para evitar duplicación de landing pages.',
      'Animaciones CSS optimizadas: menor consumo de CPU en dispositivos de gama baja.',
    ], preRelease: false },
    { version: '0.9.0', date: '2026-06-06', notes: [
      'Tasas P2P: ahora puedes elegir entre la tasa oficial del BCV o el precio real del mercado (Binance) al ver tus saldos en bolívares.',
      'Notificaciones mejoradas: borra notificaciones una por una o limpia todas de una vez.',
      'Historial de movimientos en Finanzas carga de 5 en 5 para mejor velocidad.',
      'Diseño adaptado a celular: botones, tablas y menús se ven mejor en pantallas pequeñas.',
      'Dashboard simplificado: se quitó la sección de Ahorro para enfocarse en ingresos, gastos y balance.',
      'Stats del dashboard ahora muestran 3 indicadores en una sola fila.',
    ], preRelease: false },
    { version: '0.8.9 BETA', date: '2026-05-30', notes: [
      'Dashboard funciona correctamente en móvil: CSS movido a archivo propio (dashboard.css), conflictos resueltos con globals.css.',
      'Widget Progreso General completamente funcional: ahora contabiliza metas y planes, incluyendo planes compartidos.',
      'Animaciones con fallback prefers-reduced-motion para evitar elementos invisibles en dispositivos con preferencia de movimiento reducido.',
      'Corregido stats-grid que forzaba 4 columnas en 1280px (ahora colapsa a 2).',
      'Corregido stroke-dashoffset del anillo de progreso que mostraba la barra pre-llenada.',
      'Corregido modal-content que no respetaba max-width: 440px en 480px.',
      'Eliminado * { box-sizing: border-box } global del dashboard CSS que pisaba estilos del sistema.',
    ], preRelease: true },
    { version: '0.8.7 BETA', date: '2026-05-29', notes: [
      'Dashboard renovado con 3 nuevos widgets: Resumen del Mes (ingresos/gastos/balance), Últimos Movimientos y Acciones Rápidas.',
      'Flechas inteligentes en secciones scrollables: aparecen al hover y auto-scrollan al mantener el ratón.',
      'Estética mejorada: glassmorphism, sombras premium, transiciones suaves y hover effects en cards.',
    ], preRelease: true },
    { version: '0.8.6 BETA', date: '2026-05-29', notes: [
      'Planes compartidos colaborativos: los planes donde te invitan aparecen automáticamente en Metas con badges "Compartido" e "Invitado".',
      'Contribuciones por usuario: al añadir fondos a un plan compartido se registra quién aportó y se muestra en la tarjeta.',
      'Barra Guardar Cambios global en Configuración, visible desde cualquier pestaña.',
      'Privacidad de perfil persistente: el toggle público/privado se guarda correctamente al hacer clic en Guardar Cambios.',
      'Exclusión automática del usuario actual al buscar personas para compartir planes.',
      'Firestore rules actualizadas para permitir que usuarios invitados actualicen planes compartidos.',
    ], preRelease: true },
    { version: '0.8.5 BETA', date: '2026-05-29', notes: [
      'Privacidad de perfil: nueva opción en Configuración para elegir si tu perfil es público o privado. Si es privado, solo te encuentran por email exacto.',
      'Búsqueda por nombre al compartir planes: ahora puedes escribir el nombre de la persona y aparecerá una lista con los resultados.',
      'Menú hamburguesa renovado: ahora cubre toda la pantalla y se desliza suavemente desde la izquierda.',
      'Menú de usuario en móvil: al tocar tu avatar se abre una ventana desde abajo (bottom-sheet) con bordes redondeados.',
      'Nombre visible en la barra superior del móvil junto al avatar.',
      'Animaciones corregidas: todos los menús y ventanas ahora tienen transiciones consistentes y suaves.',
      'Ventana de novedades adaptada a cualquier pantalla, anclada al fondo en móviles.',
      'Etiquetas "En Desarrollo" agregadas en Idiomas, Sesiones Activas y contacto por Email.',
    ], preRelease: true },
    { version: '0.8.0', date: '2026-05-26', notes: ['Actualización a BETA 0.8.0 con mejoras de rendimiento.', 'Nuevas herramientas de análisis financiero.'], preRelease: true },
    { version: '0.8.2', date: '2026-05-27', notes: ['Actualización a BETA 0.8.2 con mejoras de rendimiento y nuevas funcionalidades.', 'Nuevas herramientas de análisis financiero y reporte avanzado.'], preRelease: true },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <style jsx>{`
          @keyframes scrollUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes scrollDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
        <div className="notas-page" style={{ maxWidth: '900px', margin: '0 auto', padding: '32px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h1 className="notas-title" style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '24px', textAlign: 'center', color: 'var(--color-prosper-green)' }}>📜 Notas de Versión</h1>
          <section className="notas-history" style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', borderBottom: '2px solid var(--color-prosper-green)', paddingBottom: '4px' }}>Historial</h2>
            {versions.map((v, i) => (
              <div key={i} className="notas-item" style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-prosper-green)' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <img src="/logo-icon.png" alt="Prosper" width={24} height={24} loading="lazy" style={{ marginRight: '12px' }} />
                  <div>
                    <strong style={{ color: 'var(--color-prosper-green)' }}>{v.version}</strong>
                    {v.preRelease && <span style={{ background: 'var(--color-prosper-green)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: '8px' }}>PRE-release</span>}
                  </div>
                </div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>{v.date}</span>
                <ul style={{ marginTop: '8px', paddingLeft: '24px' }}>
                  {v.notes.map((note, j) => (<li key={j} style={{ color: 'var(--text-primary)' }}>{note}</li>))}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
