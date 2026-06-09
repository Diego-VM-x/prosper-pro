'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatedSection } from '../AnimatedSection';

const DEMO_MOCKUPS: Record<string, React.ReactNode> = {
  dashboard: (
    <div className="demo-mockup demo-dashboard">
      <div className="demo-sidebar">
        <div className="demo-logo">💰 Prosper</div>
        <div className="demo-nav-item active">📊 Dashboard</div>
        <div className="demo-nav-item">💳 Finanzas</div>
        <div className="demo-nav-item">🎯 Metas</div>
        <div className="demo-nav-item">📅 Calendario</div>

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
  finanzas: (
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
  metas: (
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
  calendario: (
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
};

interface DemoTab {
  id: string;
  icon: string;
  label: string;
  title: string;
  description: string;
}

export function ProductDemo() {
  const { t } = useTranslation('landing');
  const DEMOS_DATA = t('productDemo.tabs', { returnObjects: true }) as DemoTab[];
  const DEMOS = DEMOS_DATA.map((d) => ({ ...d, mockup: DEMO_MOCKUPS[d.id] }));

  const [active, setActive] = useState(DEMOS[0]?.id || 'dashboard');
  const current = DEMOS.find((d) => d.id === active) || DEMOS[0];

  return (
    <section id="demo" className="landing-demo-section lp-section">
      <div className="lp-container">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="section-header">
            <span className="section-tag">{t('productDemo.sectionTag')}</span>
            <h2 className="section-title">{t('productDemo.sectionTitle')}</h2>
            <p className="section-desc">{t('productDemo.sectionDesc')}</p>
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
