'use client';

import { AnimatedSection } from '../AnimatedSection';
import { AnimatedCounter } from './AnimatedCounter';

const TRUST_ITEMS = [
  { icon: '💱', label: '8 Monedas', desc: 'USD, BS, EUR, COP, USDT, SOL, BTC, USDC' },
  { icon: '📊', label: 'Tasas en vivo', desc: 'BCV oficial + P2P Binance' },
  { icon: '📸', label: 'VEPay OCR', desc: '20+ bancos venezolanos' },
  { icon: '🎓', label: 'Academia', desc: 'Cursos de finanzas gratis' },
  { icon: '🔒', label: 'Privado', desc: 'Solo tú ves tus datos' },
  { icon: '⚡', label: '100% Gratis', desc: 'Sin anuncios ni límites' },
];

const COUNTERS = [
  { icon: '💰', end: 8, suffix: '', label: 'Monedas soportadas' },
  { icon: '🏦', end: 20, suffix: '+', label: 'Bancos en VEPay OCR' },
  { icon: '📚', end: 15, suffix: '+', label: 'Cursos disponibles' },
  { icon: '🌍', end: 100, suffix: '%', label: 'Gratis para siempre' },
];

export function TrustBar() {
  return (
    <div className="landing-trust-section">
      <div className="landing-trust-inner">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="trust-grid">
            {TRUST_ITEMS.map((item) => (
              <div key={item.label} className="trust-item">
                <span className="trust-icon">{item.icon}</span>
                <div className="trust-text">
                  <span className="trust-label">{item.label}</span>
                  <span className="trust-desc">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection animationType="fade-up" delay={150}>
          <div className="trust-counters">
            {COUNTERS.map((c) => (
              <AnimatedCounter key={c.label} {...c} />
            ))}
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
