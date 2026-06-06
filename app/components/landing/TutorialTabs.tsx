'use client';

import { useState } from 'react';
import { AnimatedSection } from '../AnimatedSection';

const TUTORIALS = [
  {
    id: 'cuenta',
    title: 'Tu primera cuenta',
    icon: '💳',
    steps: [
      { n: 1, text: 'Regístrate gratis con Google o email en segundos.' },
      { n: 2, text: 'Crea tu primera cuenta: billetera, banco o divisas.' },
      { n: 3, text: 'Registra ingresos y gastos desde el dashboard.' },
    ],
    mockup: (
      <div className="tutorial-mockup">
        <div className="tm-row">
          <div className="tm-badge green">Ingreso</div>
          <span className="tm-text">Salario mensual</span>
          <span className="tm-amount">+$1,200</span>
        </div>
        <div className="tm-row">
          <div className="tm-badge red">Gasto</div>
          <span className="tm-text">Supermercado</span>
          <span className="tm-amount">-$85.50</span>
        </div>
        <div className="tm-row">
          <div className="tm-badge blue">Ahorro</div>
          <span className="tm-text">Fondo emergencia</span>
          <span className="tm-amount">+$200</span>
        </div>
      </div>
    ),
  },
  {
    id: 'plan',
    title: 'Crear un plan de ahorro',
    icon: '🎯',
    steps: [
      { n: 1, text: 'Ve a Planes Financieros y elige Ahorro.' },
      { n: 2, text: 'Define monto objetivo, fecha límite y frecuencia.' },
      { n: 3, text: 'Sigue tu progreso visual y cumple tus metas.' },
    ],
    mockup: (
      <div className="tutorial-mockup">
        <div className="tm-goal">
          <div className="tm-goal-header">
            <span>🚗 Auto nuevo</span>
            <span>65%</span>
          </div>
          <div className="tm-goal-bar"><div className="tm-goal-fill" style={{ width: '65%' }} /></div>
          <div className="tm-goal-meta">$3,250 / $5,000 · vence en 4 meses</div>
        </div>
      </div>
    ),
  },
  {
    id: 'vepay',
    title: 'Usar VEPay OCR',
    icon: '📸',
    steps: [
      { n: 1, text: 'Toma una captura de tu pago bancario.' },
      { n: 2, text: 'Súbela en Finanzas → Importar Captura.' },
      { n: 3, text: 'Revisa los datos extraídos y guarda la transacción.' },
    ],
    mockup: (
      <div className="tutorial-mockup">
        <div className="tm-receipt">
          <div className="tm-receipt-row"><span>Banco</span><span>Banesco</span></div>
          <div className="tm-receipt-row"><span>Monto</span><span>$120.00</span></div>
          <div className="tm-receipt-row"><span>Ref.</span><span>00992344</span></div>
          <div className="tm-receipt-row"><span>Fecha</span><span>06/06/2026</span></div>
          <div className="tm-receipt-status">✓ Datos verificados</div>
        </div>
      </div>
    ),
  },
  {
    id: 'p2p',
    title: 'Entender tasas P2P',
    icon: '⚖️',
    steps: [
      { n: 1, text: 'Al crear una cuenta cripto (USDT, SOL, BTC, USDC) elige modo.' },
      { n: 2, text: 'Oficial usa CoinGecko · P2P usa precio real Binance.' },
      { n: 3, text: 'Cambia entre modos desde el dashboard en un clic.' },
    ],
    mockup: (
      <div className="tutorial-mockup">
        <div className="tm-toggle-row">
          <span className="tm-toggle-label">Tasa USDT</span>
          <div className="tm-toggle-pills">
            <span className="tm-pill">Oficial 45.20</span>
            <span className="tm-pill active">P2P 46.80</span>
          </div>
        </div>
        <div className="tm-toggle-row">
          <span className="tm-toggle-label">Tasa BTC</span>
          <div className="tm-toggle-pills">
            <span className="tm-pill">Oficial 4,520,000</span>
            <span className="tm-pill active">P2P 4,680,000</span>
          </div>
        </div>
      </div>
    ),
  },
];

export function TutorialTabs() {
  const [active, setActive] = useState(TUTORIALS[0].id);
  const current = TUTORIALS.find((t) => t.id === active) || TUTORIALS[0];

  return (
    <section id="tutoriales" className="landing-tutorials-section">
      <div className="landing-tutorials-inner">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="section-header">
            <span className="section-tag">Tutoriales</span>
            <h2 className="section-title">Aprende a usar Prosper en minutos</h2>
            <p className="section-desc">Guías paso a paso para sacarle el máximo provecho a cada función.</p>
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="fade-up" delay={100}>
          <div className="tutorials-tabs">
            {TUTORIALS.map((t) => (
              <button
                key={t.id}
                className={`tutorial-tab ${active === t.id ? 'active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                <span className="tutorial-tab-icon">{t.icon}</span>
                <span className="tutorial-tab-title">{t.title}</span>
              </button>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="fade-up" delay={200}>
          <div className="tutorial-panel">
            <div className="tutorial-steps">
              {current.steps.map((s) => (
                <div key={s.n} className="tutorial-step">
                  <div className="tutorial-step-number">{s.n}</div>
                  <p className="tutorial-step-text">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="tutorial-visual">{current.mockup}</div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
