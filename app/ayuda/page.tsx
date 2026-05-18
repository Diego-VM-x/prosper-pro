'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { IconSearch, IconChevronDown, IconArrowForward } from '@/app/components/icons';

const faqs = [
  { category: 'Primeros Pasos', q: '¿Cómo creo mi cuenta en Prosper Pro?', a: 'Ve a la página de registro, ingresa tu email y contraseña, o usa tu cuenta de Google. Una vez registrado, accederás al dashboard en /dashboard.' },
  { category: 'Primeros Pasos', q: '¿Cómo configuro mi perfil?', a: 'Ve a Configuración > Perfil. Ahí puedes cambiar tu nombre, foto de perfil, email y preferencias de tema (claro/oscuro).' },
  { category: 'Primeros Pasos', q: '¿Cómo vinculo mi primera cuenta financiera?', a: 'Ve a Finanzas > Nueva Cuenta. Selecciona el tipo (Corriente, Ahorro, Efectivo), asigna un nombre y balance inicial.' },
  { category: 'Primeros Pasos', q: '¿Cómo navego por el dashboard?', a: 'El dashboard tiene un menú lateral con acceso a: Dashboard, Planes Financieros, Calendario, Finanzas, Configuración y Ayuda. En móvil, usa el botón hamburguesa.' },
  { category: 'Primeros Pasos', q: '¿Cómo cambio entre modo claro y oscuro?', a: 'Haz clic en el icono de luna/sol en la barra superior. Tu preferencia se guarda automáticamente.' },
  { category: 'Planes Financieros', q: '¿Qué son los Planes Financieros?', a: 'Son tu sistema central de gestión financiera. Reemplazan las metas tradicionales e incluyen planes de ahorro, gastos planificados y pagos recurrentes.' },
  { category: 'Planes Financieros', q: '¿Cómo creo un plan de ahorro?', a: 'Ve a Planes Financieros > Nuevo Plan. Selecciona tipo "Ahorro", define nombre, categoría, monto objetivo y fecha límite.' },
  { category: 'Planes Financieros', q: '¿Cómo añado fondos a un plan?', a: 'Haz clic en un plan de ahorro y presiona "Añadir Fondos". Selecciona la cuenta de origen y el monto. Se crea una transacción automática.' },
  { category: 'Planes Financieros', q: '¿Qué es un gasto planificado?', a: 'Es un plan tipo "expense" para跟踪 gastos futuros. Puedes abonar gradualmente y ver el progreso de pago.' },
  { category: 'Planes Financieros', q: '¿Cómo funcionan los pagos recurrentes?', a: 'Crea un plan tipo "recurring" con frecuencia (semanal, quincenal, mensual, trimestral, anual). Registra pagos y el sistema calcula la próxima fecha de vencimiento.' },
  { category: 'Planes Financieros', q: '¿Puedo compartir gastos con otros usuarios?', a: 'Sí. En un plan, usa la opción "Compartir" e ingresa el email del usuario. Se envía una solicitud que puede aceptar o rechazar.' },
  { category: 'Planes Financieros', q: '¿Cómo acepto una solicitud de gasto compartido?', a: 'Ve a Planes Financieros. Las solicitudes recibidas aparecen en la parte superior. Presiona "Aceptar" o "Rechazar".' },
  { category: 'Finanzas', q: '¿Cómo registro una transacción?', a: 'Ve a Finanzas > Nueva Transacción. Selecciona tipo (Ingreso, Gasto, Ahorro), cuenta, categoría, monto y descripción.' },
  { category: 'Finanzas', q: '¿Cómo veo el balance de mis cuentas?', a: 'En Finanzas verás tarjetas con el balance de cada cuenta. El balance total se calcula automáticamente desde todas las cuentas.' },
  { category: 'Finanzas', q: '¿Cómo filtro transacciones?', a: 'Usa los selectores de cuenta, tipo y categoría en la barra de filtros superiores.' },
  { category: 'Finanzas', q: '¿Qué es la Gestión Contable?', a: 'Es un modal accesible desde Finanzas que permite acciones globales: vaciar todo, vaciar por tipo, recalcular balances, y acciones por cuenta individual.' },
  { category: 'Finanzas', q: '¿Cómo recalcular el balance de una cuenta?', a: 'Abre Gestión Contable y usa "Recalcular balances". El sistema recalcula desde las transacciones activas (ingresos +, gastos -, ahorros -).' },
  { category: 'Finanzas', q: '¿Cómo elimino transacciones por tipo?', a: 'En Gestión Contable, selecciona "Vaciar ingresos/gastos/ahorros" globalmente o por cuenta específica.' },
  { category: 'Finanzas', q: '¿Qué muestra la gráfica financiera?', a: 'Ingresos, gastos y ahorros por período (Día, Semana, Mes, Año) con barras de colores y totales.' },
  { category: 'Finanzas', q: '¿Puedo crear categorías personalizadas?', a: 'Sí. Al crear una transacción, usa el selector de categoría y escribe un nombre nuevo.' },
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
  { title: 'Calendario', desc: 'Configura recordatorios y visualiza vencimientos.', icon: '📅', link: 'Ver tutorial' },
  { title: 'Gestión Contable', desc: 'Acciones avanzadas: vaciar, recalcular, limpiar historial.', icon: '📊', tags: ['Avanzado'] },
  { title: 'Seguridad', desc: 'Protocolos de encriptación y protección de datos.', icon: '🛡️', cta: 'Leer manifiesto', wide: true },
];

const quickLinks = [
  { icon: '🎯', title: 'Crear plan financiero', route: '/metas' },
  { icon: '💰', title: 'Registrar transacción', route: '/finanzas' },
  { icon: '📅', title: 'Añadir recordatorio', route: '/calendario' },
  { icon: '🏦', title: 'Nueva cuenta', route: '/finanzas' },
  { icon: '⚙️', title: 'Configurar perfil', route: '/configuracion' },
  { icon: '📊', title: 'Gestión contable', route: '/finanzas' },
];

function getTutorialSteps(category: string): string[] {
  const t: Record<string, string[]> = {
    'Primeros Pasos': ['Crea tu cuenta con email o Google.', 'Configura tu perfil en Configuración.', 'Vincula tu primera cuenta en Finanzas.', 'Explora el dashboard y el menú lateral.', 'Activa modo oscuro/claro desde la barra superior.'],
    'Planes Financieros': ['Ve a Planes Financieros y haz clic en "Nuevo Plan".', 'Selecciona el tipo: Ahorro, Gasto o Recurrente.', 'Define nombre, categoría y monto objetivo.', 'Establece una fecha límite.', 'Para recurrentes: elige la frecuencia (semanal, mensual, etc.).'],
    'Finanzas': ['Revisa tus cuentas en Finanzas.', 'Registra transacciones: Nueva Transacción.', 'Selecciona tipo: Ingreso, Gasto o Ahorro.', 'Usa filtros para ver por cuenta o categoría.', 'Consulta la gráfica de rendimiento financiero.'],
    'Calendario': ['Ve al Calendario y selecciona un día.', 'Haz clic en "+ Recordatorio".', 'Ingresa título, descripción y hora.', 'Los planes con fecha aparecen automáticamente.'],
    'Gestión Contable': ['Ve a Finanzas y haz clic en "Gestión Contable".', 'Acciones globales: vaciar todo, por tipo, recalcular.', 'Acciones por cuenta: vaciar, recalcular individual.', 'Cada acción muestra confirmación con impacto contable.', 'Eliminar ingresos resta del balance, eliminar gastos suma.'],
    'Seguridad': ['Usa una contraseña fuerte.', 'Nunca compartas tu contraseña.', 'Cierra sesión en dispositivos compartidos.', 'Reporta actividad sospechosa desde Ayuda.'],
  };
  return t[category] || ['Tutorial no disponible.'];
}

function getTutorialRoute(category: string): string {
  const r: Record<string, string> = { 'Primeros Pasos': '/configuracion', 'Planes Financieros': '/metas', 'Finanzas': '/finanzas', 'Calendario': '/calendario', 'Gestión Contable': '/finanzas', 'Seguridad': '/configuracion' };
  return r[category] || '/';
}

export default function AyudaPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [openTutorial, setOpenTutorial] = useState<string | null>(null);

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

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="ayuda-page">
          <section className="ayuda-hero">
            <h1 className="ayuda-hero-title">¿Cómo podemos ayudarte?</h1>
            <p className="ayuda-hero-subtitle">Busca guías, tutoriales y respuestas rápidas.</p>
            <div className="ayuda-search-wrapper">
              <IconSearch className="ayuda-search-icon" width={20} height={20} />
              <input type="text" placeholder="Escribe tu pregunta aquí..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ayuda-search-input" />
            </div>
          </section>

          {searchQuery && (
            <div className="ayuda-search-results">
              <p>{hasResults ? `${totalResults} resultado${totalResults !== 1 ? 's' : ''} para "${searchQuery}"` : `No se encontraron resultados para "${searchQuery}"`}</p>
              <button className="ayuda-clear-search" onClick={() => setSearchQuery('')}>Limpiar</button>
            </div>
          )}

          {filteredQuickLinks.length > 0 && (
            <section className="ayuda-quick-links">
              <h2 className="ayuda-section-title">Accesos Rápidos</h2>
              <div className="ayuda-quick-grid">
                {filteredQuickLinks.map((link, i) => (
                  <button key={i} className="ayuda-quick-card" onClick={() => router.push(link.route)}>
                    <span className="ayuda-quick-icon">{link.icon}</span>
                    <span className="ayuda-quick-title">{link.title}</span>
                    <IconArrowForward width={14} height={14} className="ayuda-quick-arrow" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {filteredCategories.length > 0 && (
            <section className="ayuda-categories">
              <h2 className="ayuda-section-title">Guías por Categoría</h2>
              <div className="ayuda-categories-grid">
                {filteredCategories.map((cat, i) => (
                  <div key={i} className={`ayuda-card ${cat.wide ? 'ayuda-card-wide' : ''}`}>
                    <div className="ayuda-card-header">
                      <div className="ayuda-card-icon">{cat.icon}</div>
                      {cat.tag && <span className="ayuda-card-tag">{cat.tag}</span>}
                    </div>
                    <h3 className="ayuda-card-title">{cat.title}</h3>
                    <p className="ayuda-card-desc">{cat.desc}</p>
                    {cat.tags && <div className="ayuda-card-tags">{cat.tags.map((tag, j) => <span key={j} className="ayuda-tag">{tag}</span>)}</div>}
                    <button className="ayuda-tutorial-toggle" onClick={(e) => { e.stopPropagation(); setOpenTutorial(openTutorial === cat.title ? null : cat.title); }}>
                      <IconChevronDown width={16} height={16} className={`ayuda-tutorial-chevron ${openTutorial === cat.title ? 'ayuda-tutorial-chevron-open' : ''}`} />
                      <span>{openTutorial === cat.title ? 'Ocultar tutorial' : 'Ver tutorial'}</span>
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

          <section className="ayuda-faq">
            <div className="ayuda-faq-header">
              <div>
                <h2 className="ayuda-faq-title">Preguntas Frecuentes</h2>
                <p className="ayuda-faq-subtitle">{faqs.length} preguntas organizadas por categoría</p>
              </div>
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

          <section className="ayuda-support">
            <div className="ayuda-support-card">
              <div className="ayuda-support-header">
                <div className="ayuda-support-icon">📧</div>
                <div><h3 className="ayuda-support-title">Contacto por Email</h3><p className="ayuda-support-subtitle">Envíanos tu consulta</p></div>
              </div>
              <p className="ayuda-support-desc">Respuesta en máximo 24 horas hábiles.</p>
              <button className="ayuda-support-btn ayuda-support-btn-primary" onClick={() => window.location.href = 'mailto:soporte@prosperpro.com'}>Enviar Email</button>
            </div>
            <div className="ayuda-support-card">
              <div className="ayuda-support-header">
                <div className="ayuda-support-icon">📖</div>
                <div><h3 className="ayuda-support-title">Documentación</h3><p className="ayuda-support-subtitle">Guías completas y tutoriales</p></div>
              </div>
              <p className="ayuda-support-desc">Explora nuestra documentación detallada.</p>
              <button className="ayuda-support-btn ayuda-support-btn-secondary" onClick={() => window.open('https://prosper-pro.vercel.app', '_blank')}>Ver Docs</button>
            </div>
          </section>

          <footer className="ayuda-footer">
            <p className="ayuda-footer-label">PROSPER PRO SUPPORT ECOSYSTEM</p>
            <div className="ayuda-footer-links"><a href="#">Estado del Sistema</a><a href="#">Notas de Versión</a><a href="#">Términos</a></div>
          </footer>
        </div>

        <style>{`
          .ayuda-page { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
          .ayuda-section-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 16px; }
          .ayuda-hero { text-align: center; margin-bottom: 40px; }
          .ayuda-hero-title { font-size: clamp(1.5rem, 5vw, 2.25rem); font-weight: 800; color: var(--text-primary); margin: 0 0 8px; }
          .ayuda-hero-subtitle { font-size: clamp(0.875rem, 2.5vw, 1rem); color: var(--text-secondary); margin: 0 0 24px; max-width: 500px; margin-left: auto; margin-right: auto; }
          .ayuda-search-wrapper { position: relative; max-width: 500px; margin: 0 auto; }
          .ayuda-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--color-prosper-green); pointer-events: none; }
          .ayuda-search-input { width: 100%; padding: 14px 16px 14px 44px; border-radius: var(--radius-lg); border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-primary); font-size: 0.9375rem; outline: none; }
          .ayuda-search-input:focus { border-color: var(--color-prosper-green); }
          .ayuda-search-input::placeholder { color: var(--text-tertiary); }
          .ayuda-search-results { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); margin-bottom: 24px; }
          .ayuda-search-results p { margin: 0; font-size: 0.875rem; color: var(--text-secondary); }
          .ayuda-clear-search { font-size: 0.8125rem; color: var(--color-prosper-green); font-weight: 600; background: none; border: none; cursor: pointer; }
          .ayuda-quick-links { margin-bottom: 40px; }
          .ayuda-quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .ayuda-quick-card { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-primary); transition: all var(--transition-fast); cursor: pointer; text-decoration: none; font-family: inherit; width: 100%; }
          .ayuda-quick-card:hover { border-color: var(--color-prosper-green); box-shadow: var(--shadow-sm); }
          .ayuda-quick-icon { font-size: 1.25rem; flex-shrink: 0; }
          .ayuda-quick-title { font-size: 0.8125rem; font-weight: 600; flex: 1; text-align: left; }
          .ayuda-quick-arrow { color: var(--text-tertiary); flex-shrink: 0; }
          .ayuda-categories { margin-bottom: 48px; }
          .ayuda-categories-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
          .ayuda-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px; transition: all var(--transition-fast); }
          .ayuda-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-sm); }
          .ayuda-card-wide { grid-column: span 2; }
          .ayuda-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
          .ayuda-card-icon { width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(61, 204, 142, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
          .ayuda-card-tag { font-size: 0.625rem; font-weight: 700; color: var(--color-prosper-green); text-transform: uppercase; letter-spacing: 0.1em; }
          .ayuda-card-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; }
          .ayuda-card-desc { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 12px; }
          .ayuda-card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
          .ayuda-tag { font-size: 0.6875rem; padding: 3px 10px; border-radius: var(--radius-full); background: var(--bg-input); color: var(--color-prosper-green); border: 1px solid rgba(61, 204, 142, 0.2); }
          .ayuda-card-link { font-size: 0.8125rem; color: var(--color-prosper-green); font-weight: 600; background: none; border: none; cursor: pointer; padding: 0; }
          .ayuda-card-cta { display: flex; justify-content: flex-end; margin-top: 16px; }
          .ayuda-cta-btn { padding: 8px 16px; background: var(--color-prosper-green); color: white; border: none; border-radius: var(--radius-md); font-size: 0.8125rem; font-weight: 600; cursor: pointer; }
          .ayuda-tutorial-toggle { display: flex; align-items: center; gap: 6px; padding: 8px 0; background: none; border: none; color: var(--color-prosper-green); font-size: 0.8125rem; font-weight: 600; cursor: pointer; margin-top: 12px; }
          .ayuda-tutorial-toggle:hover { text-decoration: underline; }
          .ayuda-tutorial-chevron { transition: transform var(--transition-fast); }
          .ayuda-tutorial-chevron-open { transform: rotate(180deg); }
          .ayuda-tutorial-content { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-default); }
          .ayuda-tutorial-title { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin: 0 0 12px; }
          .ayuda-tutorial-steps { list-style: none; padding: 0; margin: 0 0 16px; }
          .ayuda-tutorial-steps li { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-default); }
          .ayuda-tutorial-steps li:last-child { border-bottom: none; }
          .ayuda-tutorial-step-num { width: 24px; height: 24px; border-radius: 50%; background: var(--color-prosper-green); color: white; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .ayuda-tutorial-step-text { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; }
          .ayuda-tutorial-link { display: inline-flex; align-items: center; gap: 6px; font-size: 0.875rem; font-weight: 600; color: var(--color-prosper-green); text-decoration: none; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; }
          .ayuda-tutorial-link:hover { text-decoration: underline; }
          .ayuda-faq { margin-bottom: 48px; }
          .ayuda-faq-header { margin-bottom: 16px; }
          .ayuda-faq-title { font-size: 1.375rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
          .ayuda-faq-subtitle { font-size: 0.875rem; color: var(--text-secondary); margin: 0; }
          .ayuda-faq-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
          .ayuda-filter-btn { padding: 6px 14px; border-radius: var(--radius-full); border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; cursor: pointer; }
          .ayuda-filter-btn.active { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .ayuda-filter-btn:hover:not(.active) { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .ayuda-faq-list { display: flex; flex-direction: column; gap: 8px; }
          .ayuda-faq-item { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }
          .ayuda-faq-question { width: 100%; display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: none; border: none; color: var(--text-primary); font-size: 0.875rem; text-align: left; cursor: pointer; }
          .ayuda-faq-category { font-size: 0.625rem; font-weight: 700; color: var(--color-prosper-green); background: rgba(61, 204, 142, 0.1); padding: 2px 8px; border-radius: var(--radius-full); white-space: nowrap; flex-shrink: 0; }
          .ayuda-faq-q { flex: 1; font-weight: 600; }
          .ayuda-faq-chevron { color: var(--text-tertiary); transition: transform var(--transition-fast); flex-shrink: 0; }
          .ayuda-faq-chevron-open { transform: rotate(180deg); }
          .ayuda-faq-answer { padding: 0 18px 16px 56px; color: var(--text-secondary); font-size: 0.875rem; line-height: 1.6; }
          .ayuda-faq-empty { text-align: center; padding: 24px; color: var(--text-tertiary); font-size: 0.875rem; }
          .ayuda-support { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 48px; }
          .ayuda-support-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 24px; display: flex; flex-direction: column; }
          .ayuda-support-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
          .ayuda-support-icon { width: 40px; height: 40px; border-radius: 50%; background: rgba(61, 204, 142, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.125rem; flex-shrink: 0; }
          .ayuda-support-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
          .ayuda-support-subtitle { font-size: 0.75rem; color: var(--text-secondary); margin: 0; }
          .ayuda-support-desc { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 20px; flex: 1; }
          .ayuda-support-desc strong { color: var(--color-prosper-green); }
          .ayuda-support-btn { width: 100%; padding: 12px; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; }
          .ayuda-support-btn-primary { background: var(--color-prosper-green); color: white; }
          .ayuda-support-btn-secondary { background: rgba(61, 204, 142, 0.2); color: var(--color-prosper-green); }
          .ayuda-footer { text-align: center; padding: 24px 0; border-top: 1px solid var(--border-default); }
          .ayuda-footer-label { font-size: 0.625rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 12px; }
          .ayuda-footer-links { display: flex; justify-content: center; gap: 24px; }
          .ayuda-footer-links a { font-size: 0.75rem; color: var(--text-secondary); text-decoration: none; }
          .ayuda-footer-links a:hover { color: var(--color-prosper-green); }
          @media (max-width: 768px) {
            .ayuda-page { padding: 16px 12px; }
            .ayuda-quick-grid { grid-template-columns: repeat(2, 1fr); }
            .ayuda-categories-grid { grid-template-columns: 1fr; gap: 12px; }
            .ayuda-card-wide { grid-column: span 1; }
            .ayuda-support { grid-template-columns: 1fr; gap: 12px; }
            .ayuda-faq-question { flex-wrap: wrap; }
            .ayuda-faq-category { order: -1; }
          }
          @media (max-width: 480px) {
            .ayuda-page { padding: 12px 8px; }
            .ayuda-quick-grid { grid-template-columns: 1fr; }
            .ayuda-hero-title { font-size: 1.375rem; }
            .ayuda-search-input { padding: 12px 14px 12px 40px; font-size: 0.875rem; }
            .ayuda-faq-answer { padding: 0 14px 14px 14px; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
