'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { IconSearch, IconChevronDown } from '@/app/components/icons';

const faqs = [
  { q: '¿Cómo vinculo mi cuenta bancaria de forma segura?', a: 'Puedes vincular tu cuenta bancaria desde Configuración > Cuentas. Utilizamos encriptación de extremo a extremo y autenticación 2FA para proteger tus datos.' },
  { q: '¿Cómo crear una meta de ahorro personalizada?', a: 'Ve a Mis Metas > Nueva Meta. Define el nombre, monto objetivo, fecha límite y categoría. El sistema calculará automáticamente cuánto necesitas ahorrar por semana.' },
  { q: '¿Es segura mi información personal y financiera?', a: 'Absolutamente. Utilizamos encriptación AES-256, autenticación 2FA y cumplimos con estándares PCI DSS. Tus datos nunca se comparten con terceros.' },
  { q: '¿Puedo exportar mis datos a formato CSV o PDF?', a: 'Sí. Desde Finanzas > Exportar puedes descargar tus transacciones en CSV o PDF. También puedes exportar el resumen de tus metas.' },
];

const categories = [
  {
    title: 'Primeros Pasos',
    desc: 'Configura tu perfil, vincula tus primeras fuentes de ingresos y entiende la arquitectura de Prosper Pro.',
    icon: '🚀',
    tag: 'Guía Esencial',
    wide: true,
  },
  {
    title: 'Gestión de Metas',
    desc: 'Aprende a crear hitos financieros, configurar ahorros automáticos y monitorear tu progreso.',
    icon: '🎯',
    tags: ['Ahorro', 'Inversión'],
  },
  {
    title: 'Calendario y Recordatorios',
    desc: 'No pierdas ni una fecha de pago. Configura alertas inteligentes basadas en tu flujo de caja.',
    icon: '📅',
    link: 'Ver tutorial',
  },
  {
    title: 'Seguridad Financiera',
    desc: 'Protocolos de encriptación, autenticación 2FA y cómo protegemos tus datos biométricos.',
    icon: '🛡️',
    cta: 'Leer manifiesto de privacidad',
    wide: true,
  },
];

export default function AyudaPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = faqs.filter(f =>
    f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="ayuda-page">
          {/* Hero Section */}
          <section className="ayuda-hero">
            <h1 className="ayuda-hero-title">¿Cómo podemos ayudarte?</h1>
            <p className="ayuda-hero-subtitle">
              Busca guías, tutoriales y respuestas rápidas para optimizar tu inteligencia financiera.
            </p>
            <div className="ayuda-search-wrapper">
              <IconSearch className="ayuda-search-icon" width={20} height={20} />
              <input
                type="text"
                placeholder="Escribe tu pregunta aquí..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ayuda-search-input"
              />
            </div>
          </section>

          {/* Category Grid */}
          <section className="ayuda-categories">
            {categories.map((cat, i) => (
              <div key={i} className={`ayuda-card ${cat.wide ? 'ayuda-card-wide' : ''}`}>
                <div className="ayuda-card-header">
                  <div className="ayuda-card-icon">{cat.icon}</div>
                  {cat.tag && <span className="ayuda-card-tag">{cat.tag}</span>}
                </div>
                <h3 className="ayuda-card-title">{cat.title}</h3>
                <p className="ayuda-card-desc">{cat.desc}</p>
                {cat.tags && (
                  <div className="ayuda-card-tags">
                    {cat.tags.map((tag, j) => (
                      <span key={j} className="ayuda-tag">{tag}</span>
                    ))}
                  </div>
                )}
                {cat.link && (
                  <button className="ayuda-card-link">{cat.link}</button>
                )}
                {cat.cta && (
                  <div className="ayuda-card-cta">
                    <button className="ayuda-cta-btn">{cat.cta}</button>
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* FAQ Section */}
          <section className="ayuda-faq">
            <div className="ayuda-faq-header">
              <div>
                <h2 className="ayuda-faq-title">Preguntas frecuentes</h2>
                <p className="ayuda-faq-subtitle">Encuentra respuestas rápidas a las dudas más comunes de nuestros usuarios.</p>
              </div>
              <button className="ayuda-faq-link">Ver todas ↗</button>
            </div>
            <div className="ayuda-faq-list">
              {filteredFaqs.map((faq, i) => (
                <div key={i} className="ayuda-faq-item">
                  <button
                    className="ayuda-faq-question"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <IconChevronDown
                      width={18}
                      height={18}
                      className={`ayuda-faq-chevron ${openFaq === i ? 'ayuda-faq-chevron-open' : ''}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="ayuda-faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
              {filteredFaqs.length === 0 && (
                <p className="ayuda-faq-empty">No se encontraron resultados para "{searchQuery}"</p>
              )}
            </div>
          </section>

          {/* Support Options */}
          <section className="ayuda-support">
            <div className="ayuda-support-card">
              <div className="ayuda-support-header">
                <div className="ayuda-support-icon">💬</div>
                <div>
                  <h3 className="ayuda-support-title">Chat en Vivo</h3>
                  <p className="ayuda-support-subtitle">Habla con un asesor ahora mismo</p>
                </div>
              </div>
              <p className="ayuda-support-desc">
                Tiempo estimado de respuesta: <strong>{'<'} 2 minutos</strong>. Disponible de Lunes a Viernes, 9:00 - 18:00.
              </p>
              <button className="ayuda-support-btn ayuda-support-btn-primary">Iniciar Chat</button>
            </div>
            <div className="ayuda-support-card">
              <div className="ayuda-support-header">
                <div className="ayuda-support-icon">🎫</div>
                <div>
                  <h3 className="ayuda-support-title">Abrir Ticket</h3>
                  <p className="ayuda-support-subtitle">Envíanos un mensaje detallado</p>
                </div>
              </div>
              <p className="ayuda-support-desc">
                Ideal para consultas técnicas profundas o reportes de errores. Responderemos en un máximo de 24 horas hábiles.
              </p>
              <button className="ayuda-support-btn ayuda-support-btn-secondary">Enviar Ticket</button>
            </div>
          </section>

          {/* Footer */}
          <footer className="ayuda-footer">
            <p className="ayuda-footer-label">PROSPER PRO SUPPORT ECOSYSTEM</p>
            <div className="ayuda-footer-links">
              <a href="#">Estado del Sistema</a>
              <a href="#">Notas de Versión</a>
              <a href="#">Comunidad</a>
            </div>
          </footer>
        </div>

        <style>{`
          .ayuda-page {
            max-width: 960px;
            margin: 0 auto;
            padding: 24px 16px;
          }

          /* Hero */
          .ayuda-hero {
            text-align: center;
            margin-bottom: 40px;
          }
          .ayuda-hero-title {
            font-size: clamp(1.5rem, 5vw, 2.25rem);
            font-weight: 800;
            color: var(--text-primary);
            margin: 0 0 8px;
          }
          .ayuda-hero-subtitle {
            font-size: clamp(0.875rem, 2.5vw, 1rem);
            color: var(--text-secondary);
            margin: 0 0 24px;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
          }
          .ayuda-search-wrapper {
            position: relative;
            max-width: 500px;
            margin: 0 auto;
          }
          .ayuda-search-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--color-prosper-green);
            pointer-events: none;
          }
          .ayuda-search-input {
            width: 100%;
            padding: 14px 16px 14px 44px;
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-default);
            background: var(--bg-card);
            color: var(--text-primary);
            font-size: 0.9375rem;
            outline: none;
            transition: border-color var(--transition-fast);
          }
          .ayuda-search-input:focus {
            border-color: var(--color-prosper-green);
          }
          .ayuda-search-input::placeholder {
            color: var(--text-tertiary);
          }

          /* Categories Grid */
          .ayuda-categories {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 48px;
          }
          .ayuda-card {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            padding: 20px;
            transition: all var(--transition-fast);
            cursor: pointer;
          }
          .ayuda-card:hover {
            border-color: var(--border-strong);
            box-shadow: var(--shadow-sm);
          }
          .ayuda-card-wide {
            grid-column: span 2;
          }
          .ayuda-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
          }
          .ayuda-card-icon {
            width: 44px;
            height: 44px;
            border-radius: var(--radius-md);
            background: rgba(61, 204, 142, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
          }
          .ayuda-card-tag {
            font-size: 0.625rem;
            font-weight: 700;
            color: var(--color-prosper-green);
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .ayuda-card-title {
            font-size: 1.125rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 8px;
          }
          .ayuda-card-desc {
            font-size: 0.8125rem;
            color: var(--text-secondary);
            line-height: 1.5;
            margin: 0 0 12px;
          }
          .ayuda-card-tags {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
          }
          .ayuda-tag {
            font-size: 0.6875rem;
            padding: 3px 10px;
            border-radius: var(--radius-full);
            background: var(--bg-input);
            color: var(--color-prosper-green);
            border: 1px solid rgba(61, 204, 142, 0.2);
          }
          .ayuda-card-link {
            font-size: 0.8125rem;
            color: var(--color-prosper-green);
            font-weight: 600;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
          }
          .ayuda-card-link:hover {
            text-decoration: underline;
          }
          .ayuda-card-cta {
            display: flex;
            justify-content: flex-end;
            margin-top: 16px;
          }
          .ayuda-cta-btn {
            padding: 8px 16px;
            background: var(--color-prosper-green);
            color: white;
            border: none;
            border-radius: var(--radius-md);
            font-size: 0.8125rem;
            font-weight: 600;
            cursor: pointer;
          }

          /* FAQ */
          .ayuda-faq {
            margin-bottom: 48px;
          }
          .ayuda-faq-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 20px;
            gap: 16px;
          }
          .ayuda-faq-title {
            font-size: 1.375rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 4px;
          }
          .ayuda-faq-subtitle {
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin: 0;
          }
          .ayuda-faq-link {
            font-size: 0.8125rem;
            color: var(--color-prosper-green);
            font-weight: 600;
            background: none;
            border: none;
            cursor: pointer;
            white-space: nowrap;
          }
          .ayuda-faq-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .ayuda-faq-item {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            overflow: hidden;
          }
          .ayuda-faq-question {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: none;
            border: none;
            color: var(--text-primary);
            font-size: 0.9375rem;
            font-weight: 600;
            text-align: left;
            cursor: pointer;
          }
          .ayuda-faq-chevron {
            color: var(--text-tertiary);
            transition: transform var(--transition-fast);
            flex-shrink: 0;
            margin-left: 12px;
          }
          .ayuda-faq-chevron-open {
            transform: rotate(180deg);
          }
          .ayuda-faq-answer {
            padding: 0 20px 16px;
            color: var(--text-secondary);
            font-size: 0.875rem;
            line-height: 1.6;
          }
          .ayuda-faq-empty {
            text-align: center;
            padding: 24px;
            color: var(--text-tertiary);
            font-size: 0.875rem;
          }

          /* Support */
          .ayuda-support {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 48px;
          }
          .ayuda-support-card {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            padding: 24px;
            display: flex;
            flex-direction: column;
          }
          .ayuda-support-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
          }
          .ayuda-support-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(61, 204, 142, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.125rem;
            flex-shrink: 0;
          }
          .ayuda-support-title {
            font-size: 1rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0;
          }
          .ayuda-support-subtitle {
            font-size: 0.75rem;
            color: var(--text-secondary);
            margin: 0;
          }
          .ayuda-support-desc {
            font-size: 0.8125rem;
            color: var(--text-secondary);
            line-height: 1.5;
            margin: 0 0 20px;
            flex: 1;
          }
          .ayuda-support-desc strong {
            color: var(--color-prosper-green);
          }
          .ayuda-support-btn {
            width: 100%;
            padding: 12px;
            border-radius: var(--radius-md);
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: all var(--transition-fast);
          }
          .ayuda-support-btn-primary {
            background: var(--color-prosper-green);
            color: white;
          }
          .ayuda-support-btn-primary:hover {
            opacity: 0.9;
          }
          .ayuda-support-btn-secondary {
            background: rgba(61, 204, 142, 0.2);
            color: var(--color-prosper-green);
          }
          .ayuda-support-btn-secondary:hover {
            background: rgba(61, 204, 142, 0.3);
          }

          /* Footer */
          .ayuda-footer {
            text-align: center;
            padding: 24px 0;
            border-top: 1px solid var(--border-default);
          }
          .ayuda-footer-label {
            font-size: 0.625rem;
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.15em;
            margin: 0 0 12px;
          }
          .ayuda-footer-links {
            display: flex;
            justify-content: center;
            gap: 24px;
          }
          .ayuda-footer-links a {
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-decoration: none;
          }
          .ayuda-footer-links a:hover {
            color: var(--color-prosper-green);
          }

          /* Mobile Responsive */
          @media (max-width: 768px) {
            .ayuda-page { padding: 16px 12px; }
            .ayuda-categories { grid-template-columns: 1fr; gap: 12px; }
            .ayuda-card-wide { grid-column: span 1; }
            .ayuda-support { grid-template-columns: 1fr; gap: 12px; }
            .ayuda-faq-header { flex-direction: column; align-items: flex-start; }
            .ayuda-hero { margin-bottom: 28px; }
            .ayuda-card { padding: 16px; }
          }

          @media (max-width: 480px) {
            .ayuda-page { padding: 12px 8px; }
            .ayuda-hero-title { font-size: 1.375rem; }
            .ayuda-hero-subtitle { font-size: 0.8125rem; }
            .ayuda-search-input { padding: 12px 14px 12px 40px; font-size: 0.875rem; }
            .ayuda-card-title { font-size: 1rem; }
            .ayuda-card-desc { font-size: 0.75rem; }
            .ayuda-faq-title { font-size: 1.125rem; }
            .ayuda-faq-subtitle { font-size: 0.8125rem; }
            .ayuda-faq-question { padding: 14px 16px; font-size: 0.875rem; }
            .ayuda-support-card { padding: 16px; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
