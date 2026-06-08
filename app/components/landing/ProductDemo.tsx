'use client';

import { useState } from 'react';
import { AnimatedSection } from '../AnimatedSection';

const DEMOS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    title: 'Tu panorama financiero en un vistazo',
    description: 'Visualiza ingresos, gastos, balance mensual, metas en progreso y accesos directos a todas tus herramientas.',
    mockup: (
      <div className="demo-mockup demo-dashboard">
        <div className="demo-sidebar">
          <div className="demo-logo">💰 Prosper</div>
          <div className="demo-nav-item active">📊 Dashboard</div>
          <div className="demo-nav-item">💳 Finanzas</div>
          <div className="demo-nav-item">🎯 Metas</div>
          <div className="demo-nav-item">📅 Calendario</div>
          <div className="demo-nav-item">🎓 Cursos</div>
        </div>
        <div className="demo-main">
          <div className="demo-topbar">
            <span>Dashboard</span>
            <div className="demo-avatar">U</div>
          </div>
          <div className="demo-stats-row">
            <div className="demo-stat-card green">
              <span>Ingresos</span>
              <strong>$2,450</strong>
            </div>
            <div className="demo-stat-card red">
              <span>Gastos</span>
              <strong>$1,280</strong>
            </div>
            <div className="demo-stat-card blue">
              <span>Balance</span>
              <strong>$1,170</strong>
            </div>
          </div>
          <div className="demo-widgets">
            <div className="demo-widget chart">
              <div className="demo-widget-header">Resumen del Mes</div>
              <div className="demo-bars">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="demo-bar" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="demo-widget accounts">
              <div className="demo-widget-header">Mis Cuentas</div>
              <div className="demo-account-row"><span>💰 Ahorro</span><span>$1,240</span></div>
              <div className="demo-account-row"><span>🏦 Corriente</span><span>$3,580</span></div>
              <div className="demo-account-row"><span>💎 USDT</span><span>₮850</span></div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: '💳',
    title: 'Control total de tus cuentas y transacciones',
    description: 'Gestiona múltiples monedas, registra movimientos, transfiere entre cuentas e importa comprobantes con OCR.',
    mockup: (
      <div className="demo-mockup demo-finanzas">
        <div className="demo-finance-header">
          <h3>💳 Mis Cuentas</h3>
          <button className="demo-btn">+ Nueva</button>
        </div>
        <div className="demo-finance-cards">
          <div className="demo-finance-card" style={{ borderLeftColor: '#3DCC8E' }}>
            <div className="demo-fc-top"><span>💰 Ahorro</span><span>$1,240.00</span></div>
            <div className="demo-fc-type">Billetera Digital • USD</div>
          </div>
          <div className="demo-finance-card" style={{ borderLeftColor: '#3B82F6' }}>
            <div className="demo-fc-top"><span>🏦 Corriente</span><span>$3,580.50</span></div>
            <div className="demo-fc-type">Banco • USD</div>
          </div>
          <div className="demo-finance-card" style={{ borderLeftColor: '#F59E0B' }}>
            <div className="demo-fc-top"><span>💎 USDT</span><span>₮850.00</span></div>
            <div className="demo-fc-type">Cripto • USDT</div>
          </div>
        </div>
        <div className="demo-tx-list">
          <div className="demo-tx-item"><span className="demo-tx-badge in">Ingreso</span><span>Salario mensual</span><span className="demo-tx-amt in">+$1,200</span></div>
          <div className="demo-tx-item"><span className="demo-tx-badge out">Gasto</span><span>Supermercado</span><span className="demo-tx-amt out">-$85.50</span></div>
          <div className="demo-tx-item"><span className="demo-tx-badge save">Ahorro</span><span>Fondo emergencia</span><span className="demo-tx-amt save">+$200</span></div>
        </div>
      </div>
    ),
  },
  {
    id: 'metas',
    label: 'Metas',
    icon: '🎯',
    title: 'Planes financieros que cumples',
    description: 'Crea planes de ahorro, gastos planificados y pagos recurrentes. Comparte gastos y sigue el progreso visual.',
    mockup: (
      <div className="demo-mockup demo-metas">
        <div className="demo-goal-card">
          <div className="demo-goal-header">
            <span>🚗 Auto nuevo</span>
            <span className="demo-goal-pct">65%</span>
          </div>
          <div className="demo-goal-bar"><div className="demo-goal-fill" style={{ width: '65%' }} /></div>
          <div className="demo-goal-meta">$3,250 / $5,000 · vence en 4 meses</div>
          <div className="demo-goal-contribs">
            <span className="demo-goal-avatar">Y</span>
            <span className="demo-goal-avatar">C</span>
            <span className="demo-goal-avatar">+2</span>
          </div>
        </div>
        <div className="demo-goal-card">
          <div className="demo-goal-header">
            <span>🏖️ Vacaciones</span>
            <span className="demo-goal-pct">42%</span>
          </div>
          <div className="demo-goal-bar"><div className="demo-goal-fill blue" style={{ width: '42%' }} /></div>
          <div className="demo-goal-meta">$1,260 / $3,000 · vence en 8 meses</div>
        </div>
        <div className="demo-goal-card completed">
          <div className="demo-goal-header">
            <span>🎓 Curso online</span>
            <span className="demo-goal-pct">✓</span>
          </div>
          <div className="demo-goal-bar"><div className="demo-goal-fill green" style={{ width: '100%' }} /></div>
          <div className="demo-goal-meta">$450 / $450 · completado</div>
        </div>
      </div>
    ),
  },
  {
    id: 'calendario',
    label: 'Calendario',
    icon: '📅',
    title: 'Nunca más olvides una fecha importante',
    description: 'Visualiza vencimientos, recordatorios, pagos recurrentes y planes con fecha límite en una interfaz clara.',
    mockup: (
      <div className="demo-mockup demo-calendario">
        <div className="demo-cal-header">
          <strong>Junio 2026</strong>
          <div className="demo-cal-dots">
            <span className="demo-dot green" /> Ingreso
            <span className="demo-dot red" /> Gasto
            <span className="demo-dot blue" /> Recordatorio
          </div>
        </div>
        <div className="demo-cal-grid">
          {Array.from({ length: 30 }).map((_, i) => {
            const day = i + 1;
            const hasEvent = [5, 12, 15, 20, 25].includes(day);
            const eventType = day === 5 ? 'green' : day === 12 ? 'red' : day === 15 ? 'blue' : day === 20 ? 'red' : 'green';
            return (
              <div key={day} className={`demo-cal-day ${hasEvent ? 'has-' + eventType : ''}`}>
                {day}
              </div>
            );
          })}
        </div>
        <div className="demo-cal-events">
          <div className="demo-cal-event"><span className="demo-dot green" /> 5 - Salario</div>
          <div className="demo-cal-event"><span className="demo-dot red" /> 12 - Alquiler</div>
          <div className="demo-cal-event"><span className="demo-dot blue" /> 15 - Revisar metas</div>
        </div>
      </div>
    ),
  },
  {
    id: 'cursos',
    label: 'Academia',
    icon: '🎓',
    title: 'Aprende finanzas personales paso a paso',
    description: 'Cursos prácticos con progreso guardado. Desde presupuesto básico hasta inversión y libertad financiera.',
    mockup: (
      <div className="demo-mockup demo-cursos">
        <div className="demo-course-card">
          <div className="demo-course-cover" style={{ background: 'linear-gradient(135deg, #3DCC8E, #2BA87A)' }}>
            <span>📘 Presupuesto Inteligente</span>
          </div>
          <div className="demo-course-body">
            <div className="demo-course-progress"><div className="demo-course-fill" style={{ width: '75%' }} /></div>
            <span className="demo-course-pct">75% completado</span>
          </div>
        </div>
        <div className="demo-course-card">
          <div className="demo-course-cover" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
            <span>📗 Ahorro de Emergencia</span>
          </div>
          <div className="demo-course-body">
            <div className="demo-course-progress"><div className="demo-course-fill" style={{ width: '30%' }} /></div>
            <span className="demo-course-pct">30% completado</span>
          </div>
        </div>
        <div className="demo-course-card locked">
          <div className="demo-course-cover" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
            <span>🔒 Inversión para Principiantes</span>
          </div>
          <div className="demo-course-body">
            <span className="demo-course-lock">Completa el curso anterior para desbloquear</span>
          </div>
        </div>
      </div>
    ),
  },
];

export function ProductDemo() {
  const [active, setActive] = useState(DEMOS[0].id);
  const current = DEMOS.find((d) => d.id === active) || DEMOS[0];

  return (
    <section id="demo" className="landing-demo-section lp-section">
      <div className="lp-container">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="section-header">
            <span className="section-tag">Demo Interactiva</span>
            <h2 className="section-title">Explora cada rincón de Prosper</h2>
            <p className="section-desc">Haz clic en las pestañas para ver cómo se ve cada sección de la app.</p>
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="fade-up" delay={100}>
          <div className="demo-tabs">
            {DEMOS.map((d) => (
              <button
                key={d.id}
                className={`demo-tab ${active === d.id ? 'active' : ''}`}
                onClick={() => setActive(d.id)}
              >
                <span className="demo-tab-icon">{d.icon}</span>
                <span className="demo-tab-label">{d.label}</span>
              </button>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="fade-up" delay={200} key={active}>
          <div className="demo-stage">
            <div className="demo-info">
              <h3>{current.title}</h3>
              <p>{current.description}</p>
            </div>
            <div className="demo-visual-wrapper">{current.mockup}</div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
