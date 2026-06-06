'use client';

export function HeroMockup() {
  return (
    <div className="hero-mockup">
      <div className="mockup-header">
        <div className="mockup-dots">
          <span /><span /><span />
        </div>
        <span className="mockup-title">Prosper Dashboard</span>
      </div>
      <div className="mockup-body">
        <div className="mockup-stat-row">
          <div className="mockup-stat mockup-stat-green">
            <span className="mockup-stat-label">Ingresos</span>
            <span className="mockup-stat-value">$2,450</span>
          </div>
          <div className="mockup-stat mockup-stat-red">
            <span className="mockup-stat-label">Gastos</span>
            <span className="mockup-stat-value">$1,280</span>
          </div>
          <div className="mockup-stat mockup-stat-blue">
            <span className="mockup-stat-label">Ahorro</span>
            <span className="mockup-stat-value">$620</span>
          </div>
        </div>

        <div className="mockup-chart">
          {[60, 80, 45, 90, 70, 95, 55].map((h, i) => (
            <div key={i} className="mockup-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>

        <div className="mockup-goals">
          <div className="mockup-goal">
            <span>Fondo de Emergencia</span>
            <div className="mockup-goal-bar"><div className="mockup-goal-fill" style={{ width: '72%' }} /></div>
          </div>
          <div className="mockup-goal">
            <span>Vacaciones</span>
            <div className="mockup-goal-bar"><div className="mockup-goal-fill" style={{ width: '45%' }} /></div>
          </div>
        </div>

        <div className="mockup-rate-float">
          <div className="mockup-rate-item">
            <span className="mockup-rate-flag">🇺🇸</span>
            <span className="mockup-rate-pair">USD/BS</span>
            <span className="mockup-rate-value">45.20</span>
          </div>
          <div className="mockup-rate-divider" />
          <div className="mockup-rate-item">
            <span className="mockup-rate-flag">💎</span>
            <span className="mockup-rate-pair">USDT/BS</span>
            <span className="mockup-rate-value">46.80</span>
          </div>
        </div>
      </div>
    </div>
  );
}
