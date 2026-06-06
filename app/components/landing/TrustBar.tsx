'use client';

import { AnimatedSection } from '../AnimatedSection';

const TRUST_ITEMS = [
  { icon: '💱', label: '8 Monedas', desc: 'USD, BS, EUR, COP, USDT, SOL, BTC, USDC' },
  { icon: '📊', label: 'Tasas en vivo', desc: 'BCV oficial + P2P Binance' },
  { icon: '📸', label: 'VEPay OCR', desc: '20+ bancos venezolanos' },
  { icon: '🎓', label: 'Academia', desc: 'Cursos de finanzas gratis' },
  { icon: '🔒', label: 'Privado', desc: 'Solo tú ves tus datos' },
  { icon: '⚡', label: '100% Gratis', desc: 'Sin anuncios ni límites' },
];

export function TrustBar() {
  return (
    <section className="landing-trust-section">
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
      </div>
    </section>
  );
}
