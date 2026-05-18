'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import {
  IconSearch,
  IconChevronDown,
  IconArrowForward,
  IconX,
} from '@/app/components/icons';

const faqs = [
  { category: 'Primeros Pasos', q: '¿Cómo creo mi cuenta en Prosper Pro?', a: 'Ve a la página de registro, ingresa tu email y contraseña, o usa tu cuenta de Google. Una vez registrado, accederás al dashboard en /dashboard.' },
  { category: 'Primeros Pasos', q: '¿Cómo configuro mi perfil?', a: 'Ve a Configuración > Perfil. Ahí puedes cambiar tu nombre, foto de perfil, email y preferencias de tema (claro/oscuro).' },
  { category: 'Primeros Pasos', q: '¿Cómo vinculo mi primera cuenta financiera?', a: 'Ve a Finanzas > Nueva Cuenta. Selecciona el tipo (Corriente, Ahorro, Efectivo), asigna un nombre y balance inicial.' },
  { category: 'Primeros Pasos', q: '¿Cómo navego por la app?', a: 'El dashboard tiene un menú lateral con acceso a: Dashboard, Planes Financieros, Calendario, Finanzas, Configuración y Ayuda. En móvil, usa el botón hamburguesa.' },
  { category: 'Primeros Pasos', q: '¿Cómo cambio entre modo claro y oscuro?', a: 'Haz clic en el icono de luna/sol en la barra superior. Tu preferencia se guarda automáticamente.' },
  { category: 'Planes Financieros', q: '¿Qué son los Planes Financieros?', a: 'Son tu sistema central de gestión financiera. Incluyen planes de ahorro, gastos planificados y pagos recurrentes.' },
  { category: 'Planes Financieros', q: '¿Cómo creo un plan de ahorro?', a: 'Ve a Planes Financieros > Nuevo Plan. Selecciona tipo "Ahorro", define nombre, categoría, monto objetivo y fecha límite.' },
  { category: 'Planes Financieros', q: '¿Cómo añado fondos a un plan?', a: 'Haz clic en un plan de ahorro y presiona "Añadir Fondos". Selecciona la cuenta de origen y el monto. Se crea una transacción automática.' },
  { category: 'Planes Financieros', q: '¿Qué es un gasto planificado?', a: 'Es un plan tipo "expense" para跟踪 gastos futuros. Puedes abonar gradualmente y ver el progreso de pago.' },
  { category: 'Planes Financieros', q: '¿Cómo funcionan los pagos recurrentes?', a: 'Crea un plan tipo "recurring" con frecuencia (semanal, quincenal, mensual, trimestral, anual). Registra pagos y el sistema calcula la próxima fecha de vencimiento.' },
  { category: 'Planes Financieros', q: '¿Puedo compartir gastos con otros usuarios?', a: 'Sí. En un plan, usa la opción "Compartir" e ingresa el email del usuario. Se envía una solicitud que puede aceptar o rechazar.' },
  { category: 'Finanzas', q: '¿Cómo registro una transacción?', a: 'Ve a Finanzas > Nueva Transacción. Selecciona tipo (Ingreso, Gasto, Ahorro), cuenta, categoría, monto y descripción.' },
  { category: 'Finanzas', q: '¿Cómo veo el balance de mis cuentas?', a: 'En Finanzas verás tarjetas con el balance de cada cuenta. El balance total se calcula automáticamente desde todas las cuentas.' },
  { category: 'Finanzas', q: '¿Cómo filtro transacciones?', a: 'Usa los selectores de cuenta, tipo y categoría en la barra de filtros superiores.' },
  { category: 'Finanzas', q: '¿Qué es la Gestión Contable?', a: 'Es un modal accesible desde Finanzas que permite acciones globales: vaciar todo, vaciar por tipo, recalcular balances, y acciones por cuenta individual.' },
  { category: 'Finanzas', q: '¿Cómo recalcular el balance de una cuenta?', a: 'Abre Gestión Contable y usa "Recalcular balances". El sistema recalcula desde las transacciones activas (ingresos +, gastos -, ahorros -).' },
  { category: 'Finanzas', q: '¿Qué muestra la gráfica financiera?', a: 'Ingresos, gastos y ahorros por período (Día, Semana, Mes, Año) con barras de colores y totales.' },
  { category: 'VEPay', q: '¿Qué es VEPay?', a: 'VEPay es el sistema de captura de comprobantes de pago móvil de Prosper Pro. Permite subir capturas de pantalla de transferencias bancarias venezolanas y extraer automáticamente los datos del comprobante.' },
  { category: 'VEPay', q: '¿Cómo funciona la captura de comprobantes?', a: 'Sube una captura de pantalla de tu app bancaria (BDV, Mercantil, Provincial, etc.). El sistema usa OCR (reconocimiento óptico de caracteres) para leer el texto de la imagen y extraer: banco, monto, referencia, fecha, origen y destinatario.' },
  { category: 'VEPay', q: '¿Qué bancos soporta VEPay?', a: 'Soporta las principales apps bancarias de Venezuela: BDV, Bancamiga, Banesco, Mercantil, Provincial, Bicentenario, Tesoro, Caroní, Exterior, Fondo Común, 100 Banco, Sofitasa, Plaza, Mi Banco, Activo, Del Sur, Bancaribe, Occidental, Agrícola, Bancrecer, Banfanb y más.' },
  { category: 'VEPay', q: '¿Qué datos extrae automáticamente?', a: 'Banco emisor, monto en Bolívares (VES), número de referencia, fecha y hora de la transacción, teléfono y cuenta del origen, documento y nombre del destinatario, y concepto de la transferencia.' },
  { category: 'VEPay', q: '¿Puedo subir múltiples comprobantes?', a: 'Sí. VEPay permite subir varias capturas a la vez y procesarlas en lote. Recibirás un resumen con el total de comprobantes procesados, completos e incompletos.' },
  { category: 'VEPay', q: '¿Qué pasa si el OCR no lee bien?', a: 'El sistema valida cada comprobante y muestra campos faltantes o advertencias. Puedes revisar el texto crudo extraído y corregir manualmente si es necesario.' },
  { category: 'Calendario', q: '¿Cómo creo un recordatorio?', a: 'Ve al Calendario, selecciona un día y haz clic en "+ Recordatorio".' },
  { category: 'Calendario', q: '¿Cómo veo mis metas en el calendario?', a: 'Los planes con fecha límite aparecen automáticamente con su color original.' },
  { category: 'Calendario', q: '¿Puedo crear tipos de recordatorio personalizados?', a: 'Sí. Escribe un nombre nuevo en el selector de tipo al crear un recordatorio.' },
  { category: 'Configuración', q: '¿Cómo cambio mi foto de perfil?', a: 'Ve a Configuración > Perfil. Haz clic en tu foto y selecciona una nueva. Se comprime automáticamente antes de subir.' },
  { category: 'Configuración', q: '¿Cómo elimino mi cuenta?', a: 'Ve a Configuración > Zona de Peligro. Haz clic en "Eliminar mi cuenta para siempre". Se eliminan todos tus datos de Firestore y Storage.' },
  { category: 'Seguridad', q: '¿Mis datos están seguros?', a: 'Sí. Usamos Firebase con reglas de seguridad que aíslan datos por ownerId. Solo tú puedes acceder a tu información.' },
  { category: 'Seguridad', q: '¿Puedo usar Prosper Pro en varios dispositivos?', a: 'Sí. Los datos se sincronizan en tiempo real via Firestore.' },
  { category: 'General', q: '¿Prosper Pro es gratuito?', a: 'Sí. Todas las funcionalidades están disponibles sin costo.' },
  { category: 'General', q: '¿En qué URL está el dashboard?', a: 'El dashboard está en /dashboard. La página principal (/) es una landing page.' },
];

const categories = [
  { title: 'Primeros Pasos', desc: 'Configura tu perfil, vincula cuentas y entiende Prosper Pro.', icon: '🚀', tag: 'Guía Esencial', wide: true },
  { title: 'Planes Financieros', desc: 'Crea planes de ahorro, gastos y pagos recurrentes.', icon: '🎯', tags: ['Ahorro', 'Gastos', 'Recurrentes'] },
  { title: 'Finanzas', desc: 'Registra transacciones, gestiona cuentas y balances.', icon: '💰', tags: ['Cuentas', 'Transacciones'] },
  { title: 'VEPay', desc: 'Captura comprobantes de pago móvil venezolano con OCR.', icon: '📱', tags: ['OCR', 'Venezuela', 'Automático'], wide: true },
  { title: 'Calendario', desc: 'Configura recordatorios y visualiza vencimientos.', icon: '📅', link: 'Ver tutorial' },
  { title: 'Seguridad', desc: 'Protocolos de encriptación y protección de datos.', icon: '🛡️', cta: 'Leer manifiesto', wide: true },
];

const quickLinks = [
  { icon: '🎯', title: 'Crear plan financiero', route: '/metas' },
  { icon: '💰', title: 'Registrar transacción', route: '/finanzas' },
  { icon: '📅', title: 'Añadir recordatorio', route: '/calendario' },
  { icon: '🏦', title: 'Nueva cuenta', route: '/finanzas' },
  { icon: '⚙️', title: 'Configurar perfil', route: '/configuracion' },
  { icon: '📱', title: 'Capturar comprobante', route: '/finanzas' },
];

function getTutorialSteps(category: string): string[] {
  const t: Record<string, string[]> = {
    'Primeros Pasos': ['Crea tu cuenta con email o Google.', 'Configura tu perfil en Configuración.', 'Vincula tu primera cuenta en Finanzas.', 'Explora el dashboard y el menú lateral.', 'Activa modo oscuro/claro desde la barra superior.'],
    'Planes Financieros': ['Ve a Planes Financieros y haz clic en "Nuevo Plan".', 'Selecciona el tipo: Ahorro, Gasto o Recurrente.', 'Define nombre, categoría y monto objetivo.', 'Establece una fecha límite.', 'Para recurrentes: elige la frecuencia (semanal, mensual, etc.).'],
    'Finanzas': ['Revisa tus cuentas en Finanzas.', 'Registra transacciones: Nueva Transacción.', 'Selecciona tipo: Ingreso, Gasto o Ahorro.', 'Usa filtros para ver por cuenta o categoría.', 'Consulta la gráfica de rendimiento financiero.'],
    'VEPay': ['Ve a Finanzas y busca la opción de captura VEPay.', 'Sube una captura de pantalla de tu app bancaria.', 'El sistema procesa la imagen con OCR automáticamente.', 'Revisa los datos extraídos: banco, monto, referencia, fecha.', 'Si hay campos faltantes, el sistema te lo indicará.', 'Puedes subir múltiples comprobantes en lote.'],
    'Calendario': ['Ve al Calendario y selecciona un día.', 'Haz clic en "+ Recordatorio".', 'Ingresa título, descripción y hora.', 'Los planes con fecha aparecen automáticamente.'],
    'Seguridad': ['Usa una contraseña fuerte.', 'Nunca compartas tu contraseña.', 'Cierra sesión en dispositivos compartidos.', 'Reporta actividad sospechosa desde el chat de ayuda.'],
  };
  return t[category] || ['Tutorial no disponible.'];
}

function getTutorialRoute(category: string): string {
  const r: Record<string, string> = { 'Primeros Pasos': '/configuracion', 'Planes Financieros': '/metas', 'Finanzas': '/finanzas', 'VEPay': '/finanzas', 'Calendario': '/calendario', 'Seguridad': '/configuracion' };
  return r[category] || '/';
}

export default function AyudaPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [openTutorial, setOpenTutorial] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatType, setChatType] = useState<'suggestion' | 'bug'>('bug');
  const [chatMessages, setChatMessages] = useState<{ type: 'user' | 'system'; text: string; time: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const allCategories = ['Todas', ...Array.from(new Set(faqs.map(f => f.category)))];
  const searchLower = searchQuery.toLowerCase().trim();

  const filteredFaqs = useMemo(() => {
    if (!searchLower && selectedCategory === 'Todas') return faqs;
    return faqs.filter(f => {
      const matchesSearch = !searchLower || f.q.toLowerCase().includes(searchLower) || f.a.toLowerCase().includes(searchLower) || f.category.toLowerCase().includes(searchLower);
      const matchesCategory = selectedCategory === 'Todas' || f.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchLower, selectedCategory]);

  const filteredCategories = useMemo(() => {
    if (!searchLower) return categories;
    return categories.filter(c => c.title.toLowerCase().includes(searchLower) || c.desc.toLowerCase().includes(searchLower));
  }, [searchLower]);

  const filteredQuickLinks = useMemo(() => {
    if (!searchLower) return quickLinks;
    return quickLinks.filter(l => l.title.toLowerCase().includes(searchLower));
  }, [searchLower]);

  const totalResults = filteredFaqs.length + filteredCategories.length + filteredQuickLinks.length;
  const hasResults = totalResults > 0;

  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setChatMessages(prev => [...prev, { type: 'user', text: chatMessage, time }]);
    const label = chatType === 'bug' ? '🐛 Bug reportado' : '💡 Sugerencia enviada';
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        type: 'system',
        text: `${label}. Gracias por tu feedback. Lo revisaremos pronto.`,
        time: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
      }]);
    }, 800);
    setChatMessage('');
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="ayuda-page">
          {/* Hero Section */}
          <section className="ayuda-hero">
            <div className="ayuda-hero-bg">
              <div className="ayuda-hero-shape ayuda-hero-shape-1" />
              <div className="ayuda-hero-shape ayuda-hero-shape-2" />
              <div className="ayuda-hero-shape ayuda-hero-shape-3" />
            </div>
            <div className="ayuda-hero-content">
              <h1 className="ayuda-hero-title">Centro de Ayuda</h1>
              <p className="ayuda-hero-subtitle">Todo lo que necesitas saber para aprovechar Prosper Pro al máximo.</p>
              <div className="ayuda-search-wrapper">
                <IconSearch className="ayuda-search-icon" width={20} height={20} />
                <input type="text" placeholder="Buscar guías, tutoriales, preguntas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ayuda-search-input" />
                {searchQuery && (
                  <button className="ayuda-search-clear" onClick={() => setSearchQuery('')}>
                    <IconX width={16} height={16} />
                  </button>
                )}
              </div>
            </div>
          </section>

          {searchQuery && (
            <div className="ayuda-search-results">
              <p>{hasResults ? `${totalResults} resultado${totalResults !== 1 ? 's' : ''} para "${searchQuery}"` : `No se encontraron resultados para "${searchQuery}"`}</p>
              <button className="ayuda-clear-search" onClick={() => setSearchQuery('')}>Limpiar</button>
            </div>
          )}

          {/* Quick Links */}
          {filteredQuickLinks.length > 0 && (
            <section className="ayuda-section">
              <div className="ayuda-section-header">
                <span className="ayuda-section-icon">⚡</span>
                <h2 className="ayuda-section-title">Accesos Rápidos</h2>
              </div>
              <div className="ayuda-quick-grid">
                {filteredQuickLinks.map((link, i) => (
                  <button key={i} className="ayuda-quick-card" onClick={() => router.push(link.route)}>
                    <div className="ayuda-quick-card-icon">{link.icon}</div>
                    <div className="ayuda-quick-card-content">
                      <span className="ayuda-quick-title">{link.title}</span>
                    </div>
                    <IconArrowForward width={16} height={16} className="ayuda-quick-arrow" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Categories */}
          {filteredCategories.length > 0 && (
            <section className="ayuda-section">
              <div className="ayuda-section-header">
                <span className="ayuda-section-icon">📚</span>
                <h2 className="ayuda-section-title">Guías por Categoría</h2>
              </div>
              <div className="ayuda-categories-grid">
                {filteredCategories.map((cat, i) => (
                  <div key={i} className={`ayuda-card ${cat.wide ? 'ayuda-card-wide' : ''}`}>
                    <div className="ayuda-card-top">
                      <div className="ayuda-card-icon-wrap">
                        <span className="ayuda-card-emoji">{cat.icon}</span>
                      </div>
                      {cat.tag && <span className="ayuda-card-badge">{cat.tag}</span>}
                    </div>
                    <h3 className="ayuda-card-title">{cat.title}</h3>
                    <p className="ayuda-card-desc">{cat.desc}</p>
                    {cat.tags && <div className="ayuda-card-tags">{cat.tags.map((tag, j) => <span key={j} className="ayuda-tag">{tag}</span>)}</div>}
                    <button className="ayuda-tutorial-toggle" onClick={(e) => { e.stopPropagation(); setOpenTutorial(openTutorial === cat.title ? null : cat.title); }}>
                      <IconChevronDown width={16} height={16} className={`ayuda-tutorial-chevron ${openTutorial === cat.title ? 'ayuda-tutorial-chevron-open' : ''}`} />
                      <span>{openTutorial === cat.title ? 'Ocultar tutorial' : 'Ver tutorial paso a paso'}</span>
                    </button>
                    {openTutorial === cat.title && (
                      <div className="ayuda-tutorial-content">
                        <h4 className="ayuda-tutorial-title">Tutorial: {cat.title}</h4>
                        <ol className="ayuda-tutorial-steps">{getTutorialSteps(cat.title).map((step, j) => (<li key={j}><span className="ayuda-tutorial-step-num">{j + 1}</span><span className="ayuda-tutorial-step-text">{step}</span></li>))}</ol>
                        <button className="ayuda-tutorial-link" onClick={() => router.push(getTutorialRoute(cat.title))}>Ir a {cat.title} <IconArrowForward width={14} height={14} /></button>
                      </div>
                    )}
                    {cat.link && <button className="ayuda-card-link">{cat.link}</button>}
                    {cat.cta && <div className="ayuda-card-cta"><button className="ayuda-cta-btn">{cat.cta}</button></div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* VEPay Feature Highlight */}
          <section className="ayuda-section ayuda-vepay-section">
            <div className="ayuda-vepay-card">
              <div className="ayuda-vepay-header">
                <div className="ayuda-vepay-icon-wrap">
                  <span className="ayuda-vepay-icon">📱</span>
                </div>
                <div className="ayuda-vepay-title-wrap">
                  <h2 className="ayuda-vepay-title">VEPay — Captura de Comprobantes</h2>
                  <p className="ayuda-vepay-subtitle">Sistema inteligente de extracción de datos de pagos móviles venezolanos</p>
                </div>
              </div>

              <div className="ayuda-vepay-steps">
                <div className="ayuda-vepay-step">
                  <div className="ayuda-vepay-step-num">1</div>
                  <div className="ayuda-vepay-step-content">
                    <h4>Sube tu captura</h4>
                    <p>Toma una captura de pantalla de tu app bancaria (BDV, Mercantil, Provincial, Banesco, etc.) y súbela a Prosper Pro.</p>
                  </div>
                </div>
                <div className="ayuda-vepay-step">
                  <div className="ayuda-vepay-step-num">2</div>
                  <div className="ayuda-vepay-step-content">
                    <h4>OCR procesa automáticamente</h4>
                    <p>El sistema usa reconocimiento óptico de caracteres para leer el texto de la imagen. Soporta más de 20 bancos venezolanos.</p>
                  </div>
                </div>
                <div className="ayuda-vepay-step">
                  <div className="ayuda-vepay-step-num">3</div>
                  <div className="ayuda-vepay-step-content">
                    <h4>Datos extraídos</h4>
                    <p>Se extraen automáticamente: <strong>banco emisor</strong>, <strong>monto en Bs.</strong>, <strong>número de referencia</strong>, <strong>fecha y hora</strong>, <strong>teléfono y cuenta del origen</strong>, <strong>documento y nombre del destinatario</strong>, y <strong>concepto</strong>.</p>
                  </div>
                </div>
                <div className="ayuda-vepay-step">
                  <div className="ayuda-vepay-step-num">4</div>
                  <div className="ayuda-vepay-step-content">
                    <h4>Validación inteligente</h4>
                    <p>El sistema valida cada comprobante y muestra campos faltantes o advertencias. Puedes revisar el texto crudo extraído y corregir manualmente si es necesario.</p>
                  </div>
                </div>
              </div>

              <div className="ayuda-vepay-features">
                <div className="ayuda-vepay-feature">
                  <span className="ayuda-vepay-feature-icon">📊</span>
                  <span className="ayuda-vepay-feature-text">Procesamiento en lote: sube múltiples comprobantes a la vez</span>
                </div>
                <div className="ayuda-vepay-feature">
                  <span className="ayuda-vepay-feature-icon">🏦</span>
                  <span className="ayuda-vepay-feature-text">20+ bancos soportados: BDV, Mercantil, Provincial, Banesco y más</span>
                </div>
                <div className="ayuda-vepay-feature">
                  <span className="ayuda-vepay-feature-icon">✅</span>
                  <span className="ayuda-vepay-feature-text">Validación automática con resumen de completos e incompletos</span>
                </div>
                <div className="ayuda-vepay-feature">
                  <span className="ayuda-vepay-feature-icon">🔍</span>
                  <span className="ayuda-vepay-feature-text">Revisión de texto crudo OCR para correcciones manuales</span>
                </div>
              </div>

              <div className="ayuda-vepay-supported">
                <h4>Bancos soportados</h4>
                <div className="ayuda-vepay-banks">
                  {['BDV', 'Mercantil', 'Provincial', 'Banesco', 'Bancamiga', 'Bicentenario', 'Tesoro', 'Caroní', 'Exterior', 'Fondo Común', '100 Banco', 'Sofitasa', 'Plaza', 'Mi Banco', 'Activo', 'Del Sur', 'Bancaribe', 'Occidental', 'Agrícola', 'Bancrecer', 'Banfanb'].map((bank) => (
                    <span key={bank} className="ayuda-vepay-bank-tag">{bank}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="ayuda-section">
            <div className="ayuda-section-header">
              <span className="ayuda-section-icon">❓</span>
              <h2 className="ayuda-section-title">Preguntas Frecuentes</h2>
            </div>
            <div className="ayuda-faq-filters">
              {allCategories.map((cat) => (<button key={cat} className={`ayuda-filter-btn ${selectedCategory === cat ? 'active' : ''}`} onClick={() => setSelectedCategory(cat)}>{cat}</button>))}
            </div>
            <div className="ayuda-faq-list">
              {filteredFaqs.map((faq, i) => (
                <div key={i} className="ayuda-faq-item">
                  <button className="ayuda-faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span className="ayuda-faq-category">{faq.category}</span>
                    <span className="ayuda-faq-q">{faq.q}</span>
                    <IconChevronDown width={18} height={18} className={`ayuda-faq-chevron ${openFaq === i ? 'ayuda-faq-chevron-open' : ''}`} />
                  </button>
                  {openFaq === i && <div className="ayuda-faq-answer"><p>{faq.a}</p></div>}
                </div>
              ))}
              {filteredFaqs.length === 0 && <p className="ayuda-faq-empty">No se encontraron resultados.</p>}
            </div>
          </section>

          {/* Support Cards */}
          <section className="ayuda-section">
            <div className="ayuda-section-header">
              <span className="ayuda-section-icon">💬</span>
              <h2 className="ayuda-section-title">¿Necesitas más ayuda?</h2>
            </div>
            <div className="ayuda-support-grid">
              <div className="ayuda-support-card">
                <div className="ayuda-support-icon-wrap">
                  <span className="ayuda-support-emoji">📧</span>
                </div>
                <h3 className="ayuda-support-title">Contacto por Email</h3>
                <p className="ayuda-support-desc">Envíanos tu consulta y responderemos en máximo 24 horas hábiles.</p>
                <button className="ayuda-support-btn ayuda-support-btn-primary" onClick={() => window.location.href = 'mailto:soporte@prosperpro.com'}>Enviar Email</button>
              </div>
              <div className="ayuda-support-card">
                <div className="ayuda-support-icon-wrap">
                  <span className="ayuda-support-emoji">📖</span>
                </div>
                <h3 className="ayuda-support-title">Documentación</h3>
                <p className="ayuda-support-desc">Explora nuestra documentación detallada y guías completas.</p>
                <button className="ayuda-support-btn ayuda-support-btn-secondary" onClick={() => window.open('https://prosper-pro.vercel.app', '_blank')}>Ver Docs</button>
              </div>
              <div className="ayuda-support-card ayuda-support-card-chat" onClick={() => setShowChat(true)}>
                <div className="ayuda-support-icon-wrap">
                  <span className="ayuda-support-emoji">💬</span>
                </div>
                <h3 className="ayuda-support-title">Chat de Feedback</h3>
                <p className="ayuda-support-desc">Reporta bugs o envía sugerencias directamente desde aquí.</p>
                <button className="ayuda-support-btn ayuda-support-btn-chat">Abrir Chat</button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="ayuda-footer">
            <p className="ayuda-footer-label">PROSPER PRO SUPPORT ECOSYSTEM</p>
            <div className="ayuda-footer-links"><a href="#">Estado del Sistema</a><a href="#">Notas de Versión</a><a href="#">Términos</a></div>
          </footer>
        </div>

        {/* Floating Chat Window */}
        {showChat && (
          <div className="chat-overlay" onClick={() => setShowChat(false)}>
            <div className="chat-window" onClick={(e) => e.stopPropagation()}>
              <div className="chat-header">
                <div className="chat-header-info">
                  <span className="chat-header-icon">💬</span>
                  <div>
                    <h3 className="chat-header-title">Feedback & Bugs</h3>
                    <p className="chat-header-subtitle">Reporta bugs o envía sugerencias</p>
                  </div>
                </div>
                <button className="chat-close-btn" onClick={() => setShowChat(false)}>
                  <IconX width={18} height={18} />
                </button>
              </div>

              <div className="chat-type-selector">
                <button
                  className={`chat-type-btn ${chatType === 'bug' ? 'active active-bug' : ''}`}
                  onClick={() => setChatType('bug')}
                >
                  🐛 Reportar Bug
                </button>
                <button
                  className={`chat-type-btn ${chatType === 'suggestion' ? 'active active-suggestion' : ''}`}
                  onClick={() => setChatType('suggestion')}
                >
                  💡 Sugerencia
                </button>
              </div>

              <div className="chat-messages">
                {chatMessages.length === 0 && (
                  <div className="chat-empty">
                    <span className="chat-empty-icon">{chatType === 'bug' ? '🐛' : '💡'}</span>
                    <p>{chatType === 'bug' ? 'Describe el bug que encontraste' : 'Comparte tu idea o sugerencia'}</p>
                    <p className="chat-empty-hint">Sé lo más detallado posible para que podamos ayudarte mejor.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`chat-msg ${msg.type === 'user' ? 'chat-msg-user' : 'chat-msg-system'}`}>
                    <div className={`chat-msg-bubble ${msg.type === 'user' ? 'chat-msg-bubble-user' : 'chat-msg-bubble-system'}`}>
                      <p>{msg.text}</p>
                    </div>
                    <span className="chat-msg-time">{msg.time}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-area">
                <input
                  type="text"
                  className="chat-input"
                  placeholder={chatType === 'bug' ? 'Describe el bug...' : 'Escribe tu sugerencia...'}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                />
                <button className="chat-send-btn" onClick={handleSendChat} disabled={!chatMessage.trim()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .ayuda-page { max-width: 1100px; margin: 0 auto; padding: 32px 20px; }
          .ayuda-section { margin-bottom: 48px; }
          .ayuda-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
          .ayuda-section-icon { font-size: 1.5rem; }
          .ayuda-section-title { font-size: 1.375rem; font-weight: 800; color: var(--text-primary); margin: 0; }

          /* Hero */
          .ayuda-hero {
            position: relative;
            background: linear-gradient(135deg, var(--color-prosper-navy) 0%, #2A5A4E 40%, var(--color-prosper-green) 100%);
            border-radius: var(--radius-2xl, 24px);
            padding: 48px 40px;
            margin-bottom: 40px;
            overflow: hidden;
            text-align: center;
          }
          .ayuda-hero-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
          .ayuda-hero-shape { position: absolute; border-radius: 50%; opacity: 0.08; background: white; }
          .ayuda-hero-shape-1 { width: 300px; height: 300px; top: -100px; right: -80px; }
          .ayuda-hero-shape-2 { width: 200px; height: 200px; bottom: -60px; left: 5%; }
          .ayuda-hero-shape-3 { width: 150px; height: 150px; top: 30%; left: 40%; }
          .ayuda-hero-content { position: relative; z-index: 1; }
          .ayuda-hero-title { font-size: clamp(1.75rem, 5vw, 2.5rem); font-weight: 800; color: white; margin: 0 0 12px; }
          .ayuda-hero-subtitle { font-size: clamp(0.9375rem, 2.5vw, 1.125rem); color: rgba(255,255,255,0.75); margin: 0 0 28px; max-width: 550px; margin-left: auto; margin-right: auto; }
          .ayuda-search-wrapper { position: relative; max-width: 520px; margin: 0 auto; }
          .ayuda-search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--color-prosper-green); pointer-events: none; }
          .ayuda-search-input { width: 100%; padding: 16px 44px 16px 48px; border-radius: var(--radius-xl); border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.12); color: white; font-size: 1rem; outline: none; backdrop-filter: blur(8px); }
          .ayuda-search-input:focus { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.18); }
          .ayuda-search-input::placeholder { color: rgba(255,255,255,0.5); }
          .ayuda-search-clear { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; cursor: pointer; padding: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background var(--transition-fast); }
          .ayuda-search-clear:hover { background: rgba(255,255,255,0.25); }
          .ayuda-search-results { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); margin-bottom: 28px; }
          .ayuda-search-results p { margin: 0; font-size: 0.875rem; color: var(--text-secondary); font-weight: 500; }
          .ayuda-clear-search { font-size: 0.8125rem; color: var(--color-prosper-green); font-weight: 600; background: none; border: none; cursor: pointer; }

          /* Quick Links */
          .ayuda-quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
          .ayuda-quick-card {
            display: flex; align-items: center; gap: 14px;
            padding: 18px 20px;
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-xl);
            color: var(--text-primary);
            transition: all var(--transition-fast);
            cursor: pointer;
            text-decoration: none;
            font-family: inherit;
            width: 100%;
          }
          .ayuda-quick-card:hover { border-color: var(--color-prosper-green); box-shadow: var(--shadow-md); transform: translateY(-2px); }
          .ayuda-quick-card-icon { font-size: 1.5rem; flex-shrink: 0; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: var(--bg-input); border-radius: var(--radius-md); }
          .ayuda-quick-card-content { flex: 1; min-width: 0; }
          .ayuda-quick-title { font-size: 0.875rem; font-weight: 600; display: block; }
          .ayuda-quick-arrow { color: var(--text-tertiary); flex-shrink: 0; transition: transform var(--transition-fast); }
          .ayuda-quick-card:hover .ayuda-quick-arrow { transform: translateX(4px); color: var(--color-prosper-green); }

          /* Categories */
          .ayuda-categories-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
          .ayuda-card {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-xl);
            padding: 24px;
            transition: all var(--transition-fast);
            display: flex;
            flex-direction: column;
          }
          .ayuda-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-md); transform: translateY(-2px); }
          .ayuda-card-wide { grid-column: span 2; }
          .ayuda-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
          .ayuda-card-icon-wrap { width: 52px; height: 52px; border-radius: var(--radius-lg); background: rgba(61, 204, 142, 0.12); display: flex; align-items: center; justify-content: center; }
          .ayuda-card-emoji { font-size: 1.5rem; }
          .ayuda-card-badge { font-size: 0.625rem; font-weight: 700; color: var(--color-prosper-green); background: rgba(61, 204, 142, 0.12); padding: 4px 10px; border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.1em; }
          .ayuda-card-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; }
          .ayuda-card-desc { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.6; margin: 0 0 14px; }
          .ayuda-card-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
          .ayuda-tag { font-size: 0.6875rem; padding: 4px 12px; border-radius: var(--radius-full); background: var(--bg-input); color: var(--color-prosper-green); border: 1px solid rgba(61, 204, 142, 0.15); font-weight: 500; }
          .ayuda-tutorial-toggle { display: flex; align-items: center; gap: 6px; padding: 10px 0; background: none; border: none; color: var(--color-prosper-green); font-size: 0.8125rem; font-weight: 600; cursor: pointer; margin-top: auto; }
          .ayuda-tutorial-toggle:hover { opacity: 0.8; }
          .ayuda-tutorial-chevron { transition: transform var(--transition-fast); }
          .ayuda-tutorial-chevron-open { transform: rotate(180deg); }
          .ayuda-tutorial-content { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border-default); }
          .ayuda-tutorial-title { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin: 0 0 14px; }
          .ayuda-tutorial-steps { list-style: none; padding: 0; margin: 0 0 16px; }
          .ayuda-tutorial-steps li { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-default); }
          .ayuda-tutorial-steps li:last-child { border-bottom: none; }
          .ayuda-tutorial-step-num { width: 26px; height: 26px; border-radius: 50%; background: var(--color-prosper-green); color: white; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .ayuda-tutorial-step-text { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; }
          .ayuda-tutorial-link { display: inline-flex; align-items: center; gap: 6px; font-size: 0.875rem; font-weight: 600; color: var(--color-prosper-green); text-decoration: none; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; }
          .ayuda-tutorial-link:hover { opacity: 0.8; }
          .ayuda-card-link { font-size: 0.8125rem; color: var(--color-prosper-green); font-weight: 600; background: none; border: none; cursor: pointer; padding: 0; margin-top: auto; }
          .ayuda-card-cta { display: flex; justify-content: flex-end; margin-top: 16px; }
          .ayuda-cta-btn { padding: 8px 18px; background: var(--color-prosper-green); color: white; border: none; border-radius: var(--radius-md); font-size: 0.8125rem; font-weight: 600; cursor: pointer; }

          /* VEPay Section */
          .ayuda-vepay-section { margin-bottom: 48px; }
          .ayuda-vepay-card {
            background: linear-gradient(135deg, var(--bg-card) 0%, rgba(61,204,142,0.04) 100%);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-2xl, 24px);
            padding: 32px;
            position: relative;
            overflow: hidden;
          }
          .ayuda-vepay-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--color-prosper-green), var(--color-prosper-navy));
          }
          .ayuda-vepay-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 28px; }
          .ayuda-vepay-icon-wrap {
            width: 56px;
            height: 56px;
            border-radius: var(--radius-lg);
            background: linear-gradient(135deg, var(--color-prosper-green), #2BA87A);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .ayuda-vepay-icon { font-size: 1.5rem; }
          .ayuda-vepay-title-wrap { flex: 1; }
          .ayuda-vepay-title { font-size: 1.375rem; font-weight: 800; color: var(--text-primary); margin: 0 0 4px; }
          .ayuda-vepay-subtitle { font-size: 0.875rem; color: var(--text-secondary); margin: 0; }
          .ayuda-vepay-steps { display: flex; flex-direction: column; gap: 16px; margin-bottom: 28px; }
          .ayuda-vepay-step { display: flex; gap: 16px; align-items: flex-start; }
          .ayuda-vepay-step-num {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--color-prosper-green);
            color: white;
            font-size: 0.875rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .ayuda-vepay-step-content { flex: 1; }
          .ayuda-vepay-step-content h4 { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
          .ayuda-vepay-step-content p { font-size: 0.8125rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }
          .ayuda-vepay-step-content p strong { color: var(--text-primary); }
          .ayuda-vepay-features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 28px; }
          .ayuda-vepay-feature { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: var(--bg-input); border-radius: var(--radius-md); }
          .ayuda-vepay-feature-icon { font-size: 1.125rem; }
          .ayuda-vepay-feature-text { font-size: 0.8125rem; color: var(--text-primary); font-weight: 500; }
          .ayuda-vepay-supported { padding-top: 24px; border-top: 1px solid var(--border-default); }
          .ayuda-vepay-supported h4 { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin: 0 0 12px; }
          .ayuda-vepay-banks { display: flex; flex-wrap: wrap; gap: 8px; }
          .ayuda-vepay-bank-tag {
            font-size: 0.6875rem;
            padding: 5px 12px;
            border-radius: var(--radius-full);
            background: var(--bg-input);
            color: var(--text-secondary);
            border: 1px solid var(--border-default);
            font-weight: 500;
          }

          /* FAQ */
          .ayuda-faq-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
          .ayuda-filter-btn { padding: 8px 16px; border-radius: var(--radius-full); border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-secondary); font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); }
          .ayuda-filter-btn.active { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .ayuda-filter-btn:hover:not(.active) { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .ayuda-faq-list { display: flex; flex-direction: column; gap: 10px; }
          .ayuda-faq-item { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); overflow: hidden; transition: all var(--transition-fast); }
          .ayuda-faq-item:hover { border-color: var(--border-strong); }
          .ayuda-faq-question { width: 100%; display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: none; border: none; color: var(--text-primary); font-size: 0.875rem; text-align: left; cursor: pointer; }
          .ayuda-faq-category { font-size: 0.625rem; font-weight: 700; color: var(--color-prosper-green); background: rgba(61, 204, 142, 0.1); padding: 3px 10px; border-radius: var(--radius-full); white-space: nowrap; flex-shrink: 0; }
          .ayuda-faq-q { flex: 1; font-weight: 600; }
          .ayuda-faq-chevron { color: var(--text-tertiary); transition: transform var(--transition-fast); flex-shrink: 0; }
          .ayuda-faq-chevron-open { transform: rotate(180deg); }
          .ayuda-faq-answer { padding: 0 20px 18px 72px; color: var(--text-secondary); font-size: 0.875rem; line-height: 1.7; }
          .ayuda-faq-empty { text-align: center; padding: 32px; color: var(--text-tertiary); font-size: 0.875rem; }

          /* Support */
          .ayuda-support-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
          .ayuda-support-card {
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-xl);
            padding: 28px 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            transition: all var(--transition-fast);
          }
          .ayuda-support-card:hover { border-color: var(--color-prosper-green); box-shadow: var(--shadow-md); transform: translateY(-2px); }
          .ayuda-support-card-chat { cursor: pointer; }
          .ayuda-support-icon-wrap { width: 56px; height: 56px; border-radius: var(--radius-lg); background: rgba(61, 204, 142, 0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
          .ayuda-support-emoji { font-size: 1.5rem; }
          .ayuda-support-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; }
          .ayuda-support-desc { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 20px; flex: 1; }
          .ayuda-support-btn { width: 100%; padding: 12px; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; transition: all var(--transition-fast); }
          .ayuda-support-btn-primary { background: var(--color-prosper-green); color: white; }
          .ayuda-support-btn-primary:hover { filter: brightness(1.1); }
          .ayuda-support-btn-secondary { background: rgba(61, 204, 142, 0.15); color: var(--color-prosper-green); }
          .ayuda-support-btn-secondary:hover { background: rgba(61, 204, 142, 0.25); }
          .ayuda-support-btn-chat { background: linear-gradient(135deg, var(--color-prosper-green), #2BA87A); color: white; }
          .ayuda-support-btn-chat:hover { filter: brightness(1.1); transform: translateY(-1px); }

          /* Footer */
          .ayuda-footer { text-align: center; padding: 32px 0 16px; border-top: 1px solid var(--border-default); }
          .ayuda-footer-label { font-size: 0.625rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 12px; }
          .ayuda-footer-links { display: flex; justify-content: center; gap: 24px; }
          .ayuda-footer-links a { font-size: 0.75rem; color: var(--text-secondary); text-decoration: none; }
          .ayuda-footer-links a:hover { color: var(--color-prosper-green); }

          /* Floating Chat */
          .chat-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            display: flex;
            align-items: flex-end;
            justify-content: flex-end;
            padding: 24px;
            animation: chatFadeIn 0.2s ease;
          }
          @keyframes chatFadeIn { from { opacity: 0; } to { opacity: 1; } }
          .chat-window {
            width: 380px;
            max-width: calc(100vw - 48px);
            height: 520px;
            max-height: calc(100vh - 48px);
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-2xl, 24px);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 24px 80px rgba(0,0,0,0.2);
            animation: chatSlideUp 0.3s ease;
          }
          @keyframes chatSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .chat-header {
            padding: 20px 24px;
            background: linear-gradient(135deg, var(--color-prosper-navy), #2A5A4E);
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .chat-header-info { display: flex; align-items: center; gap: 12px; }
          .chat-header-icon { font-size: 1.25rem; }
          .chat-header-title { font-size: 1rem; font-weight: 700; color: white; margin: 0; }
          .chat-header-subtitle { font-size: 0.75rem; color: rgba(255,255,255,0.6); margin: 0; }
          .chat-close-btn { background: rgba(255,255,255,0.15); border: none; color: white; cursor: pointer; padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background var(--transition-fast); }
          .chat-close-btn:hover { background: rgba(255,255,255,0.25); }
          .chat-type-selector { display: flex; gap: 8px; padding: 16px 20px; border-bottom: 1px solid var(--border-default); }
          .chat-type-btn {
            flex: 1;
            padding: 10px;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-default);
            background: var(--bg-input);
            color: var(--text-secondary);
            font-size: 0.8125rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-fast);
            text-align: center;
          }
          .chat-type-btn.active-bug { background: rgba(239,68,68,0.12); border-color: var(--color-error); color: var(--color-error); }
          .chat-type-btn.active-suggestion { background: rgba(61,204,142,0.12); border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .chat-messages { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
          .chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 32px 16px; }
          .chat-empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
          .chat-empty p { font-size: 0.875rem; color: var(--text-secondary); margin: 0 0 4px; }
          .chat-empty-hint { font-size: 0.75rem; color: var(--text-tertiary); }
          .chat-msg { display: flex; flex-direction: column; }
          .chat-msg-user { align-items: flex-end; }
          .chat-msg-system { align-items: flex-start; }
          .chat-msg-bubble { max-width: 85%; padding: 12px 16px; border-radius: var(--radius-lg); }
          .chat-msg-bubble-user { background: var(--color-prosper-green); color: white; border-bottom-right-radius: 4px; }
          .chat-msg-bubble-system { background: var(--bg-input); color: var(--text-primary); border-bottom-left-radius: 4px; }
          .chat-msg-bubble p { margin: 0; font-size: 0.8125rem; line-height: 1.5; }
          .chat-msg-time { font-size: 0.625rem; color: var(--text-tertiary); margin-top: 4px; padding: 0 4px; }
          .chat-input-area { display: flex; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border-default); background: var(--bg-card); }
          .chat-input {
            flex: 1;
            padding: 12px 16px;
            border-radius: var(--radius-xl);
            border: 1px solid var(--border-default);
            background: var(--bg-input);
            color: var(--text-primary);
            font-size: 0.875rem;
            outline: none;
            font-family: inherit;
          }
          .chat-input:focus { border-color: var(--color-prosper-green); }
          .chat-input::placeholder { color: var(--text-tertiary); }
          .chat-send-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--color-prosper-green);
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all var(--transition-fast);
            flex-shrink: 0;
          }
          .chat-send-btn:hover { filter: brightness(1.1); transform: scale(1.05); }
          .chat-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

          /* Responsive */
          @media (max-width: 1024px) {
            .ayuda-vepay-features { grid-template-columns: 1fr; }
            .ayuda-support-grid { grid-template-columns: 1fr; }
          }
          @media (max-width: 768px) {
            .ayuda-page { padding: 20px 14px; }
            .ayuda-hero { padding: 32px 24px; border-radius: var(--radius-xl); }
            .ayuda-hero-title { font-size: 1.5rem; }
            .ayuda-hero-subtitle { font-size: 0.875rem; }
            .ayuda-search-input { padding: 14px 40px 14px 44px; font-size: 0.875rem; }
            .ayuda-quick-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .ayuda-categories-grid { grid-template-columns: 1fr; gap: 14px; }
            .ayuda-card-wide { grid-column: span 1; }
            .ayuda-vepay-card { padding: 24px 20px; }
            .ayuda-vepay-header { flex-direction: column; gap: 12px; }
            .ayuda-faq-question { flex-wrap: wrap; padding: 14px 16px; }
            .ayuda-faq-category { order: -1; }
            .ayuda-faq-answer { padding: 0 16px 16px 16px; }
            .chat-overlay { padding: 12px; align-items: flex-end; }
            .chat-window { width: 100%; max-width: 100%; height: 80vh; border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
          }
          @media (max-width: 480px) {
            .ayuda-page { padding: 16px 10px; }
            .ayuda-quick-grid { grid-template-columns: 1fr; }
            .ayuda-hero { padding: 24px 16px; }
            .ayuda-hero-title { font-size: 1.25rem; }
            .ayuda-quick-card { padding: 14px 16px; }
            .ayuda-card { padding: 20px; }
            .ayuda-vepay-card { padding: 20px 16px; }
            .ayuda-vepay-step { gap: 12px; }
            .ayuda-vepay-step-num { width: 30px; height: 30px; font-size: 0.75rem; }
            .ayuda-support-card { padding: 24px 20px; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
