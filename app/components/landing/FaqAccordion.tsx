'use client';

import { useState } from 'react';
import { AnimatedSection } from '../AnimatedSection';

const FAQS = [
  {
    q: '¿Prosper Pro es realmente gratis?',
    a: 'Sí. Prosper Pro es 100% gratuito, sin anuncios y sin límites de cuentas o transacciones. Puedes usar todas las funciones desde el primer día.',
  },
  {
    q: '¿Qué monedas soporta?',
    a: 'Soportamos monedas fiduciarias (USD, BS, EUR, COP) y criptomonedas (USDT, SOL, BTC, USDC). Además puedes elegir tasa oficial o P2P para las criptos.',
  },
  {
    q: '¿Cómo funciona VEPay?',
    a: 'VEPay usa OCR para leer capturas de pantalla de apps bancarias venezolanas. Extrae automáticamente banco, monto, referencia, fecha y concepto, creando una transacción lista para guardar.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Sí. Tus datos se almacenan en Firebase con autenticación segura. Solo tú tienes acceso a tu información financiera.',
  },
  {
    q: '¿Puedo compartir gastos con otras personas?',
    a: 'Sí. En los planes de gasto compartido puedes invitar a otros usuarios por correo y dividir montos. Cada persona recibe notificaciones y puede aceptar o rechazar solicitudes.',
  },
  {
    q: '¿Necesito tarjeta de crédito para registrarme?',
    a: 'No. Solo necesitas un email o una cuenta de Google. No pedimos ni almacenamos información de pago.',
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<string | null>(FAQS[0].q);

  return (
    <section id="faq" className="landing-faq-section">
      <div className="landing-faq-inner">
        <AnimatedSection animationType="fade-up" delay={0}>
          <div className="section-header">
            <span className="section-tag">FAQ</span>
            <h2 className="section-title">Preguntas frecuentes</h2>
            <p className="section-desc">Todo lo que necesitas saber antes de empezar.</p>
          </div>
        </AnimatedSection>

        <div className="faq-list">
          {FAQS.map((faq, i) => {
            const isOpen = open === faq.q;
            return (
              <AnimatedSection key={faq.q} animationType="fade-up" delay={i * 50}>
                <div className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    className="faq-question"
                    onClick={() => setOpen(isOpen ? null : faq.q)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="faq-chevron">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
