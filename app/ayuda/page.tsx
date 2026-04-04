'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { IconSearch, IconChevronDown } from '@/app/components/icons';

const faqs = [
  // Primeros Pasos
  { category: 'Primeros Pasos', q: '¿Cómo creo mi cuenta en Prosper Pro?', a: 'Ve a la página de registro, ingresa tu email y contraseña, o usa tu cuenta de Google. Una vez registrado, podrás acceder al dashboard y comenzar a configurar tus metas financieras.' },
  { category: 'Primeros Pasos', q: '¿Cómo configuro mi perfil?', a: 'Ve a Configuración > Perfil. Ahí puedes cambiar tu nombre, foto de perfil, email y preferencias de tema (claro/oscuro).' },
  { category: 'Primeros Pasos', q: '¿Cómo vinculo mi primera cuenta bancaria?', a: 'Ve a Finanzas > Nueva Cuenta. Selecciona el tipo de cuenta (Corriente, Ahorro, Efectivo o Personalizada), asigna un nombre y balance inicial. El sistema creará automáticamente tu cuenta.' },
  { category: 'Primeros Pasos', q: '¿Cómo navego por el dashboard?', a: 'El dashboard tiene un menú lateral con acceso a: Dashboard, Metas, Calendario, Finanzas, Comunidad, Cursos, Logros y Configuración. En móvil, usa el botón hamburguesa para abrir el menú.' },
  { category: 'Primeros Pasos', q: '¿Cómo cambio entre modo claro y oscuro?', a: 'Haz clic en el icono de luna/sol en la barra superior. Tu preferencia se guarda automáticamente.' },

  // Metas
  { category: 'Metas', q: '¿Cómo creo una nueva meta de ahorro?', a: 'Ve a Metas > Nueva Meta. Define el nombre, categoría (Ahorro, Inversión, Educación), monto objetivo, fecha límite y color. El sistema calculará cuánto necesitas ahorrar por semana.' },
  { category: 'Metas', q: '¿Cómo agrego fondos a una meta?', a: 'Haz clic en una meta para ver su detalle, luego presiona "Añadir Fondos". Ingresa el monto y se creará una transacción automática vinculada a tu meta.' },
  { category: 'Metas', q: '¿Cómo edito una meta existente?', a: 'Haz clic en una meta para abrir su detalle, luego presiona el botón de editar (lápiz). Modifica los campos y guarda los cambios.' },
  { category: 'Metas', q: '¿Cómo elimino una meta?', a: 'Abre el detalle de la meta y presiona el botón de eliminar (papelera). Confirma la acción en el diálogo de confirmación.' },
  { category: 'Metas', q: '¿Qué significan los colores de las metas?', a: 'Verde: meta en buen progreso (>75%). Azul: progreso medio (50-75%). Rojo: necesita atención (<50%). Los colores se asignan automáticamente según el porcentaje de completado.' },
  { category: 'Metas', q: '¿Puedo crear categorías personalizadas para mis metas?', a: 'Sí. Al crear una meta, usa el selector de categoría y escribe un nombre personalizado. Se guardará en tus preferencias para futuras metas.' },

  // Finanzas
  { category: 'Finanzas', q: '¿Cómo registro un ingreso?', a: 'Ve a Finanzas > Nueva Transacción. Selecciona tipo "Ingreso", elige la categoría (Salario, Freelance, Inversiones, etc.), ingresa el monto y descripción. Selecciona la cuenta donde se depositará.' },
  { category: 'Finanzas', q: '¿Cómo registro un gasto?', a: 'Ve a Finanzas > Nueva Transacción. Selecciona tipo "Gasto", elige la categoría (Comida, Transporte, Vivienda, etc.), ingresa el monto y descripción.' },
  { category: 'Finanzas', q: '¿Cómo veo el balance de mis cuentas?', a: 'En la página de Finanzas, verás tarjetas con el balance de cada cuenta. El balance total se muestra en el resumen superior.' },
  { category: 'Finanzas', q: '¿Cómo filtro transacciones por cuenta?', a: 'En Finanzas, usa el selector "Todas las cuentas" para filtrar por una cuenta específica. También puedes filtrar por tipo (Ingreso, Gasto, Ahorro) y categoría.' },
  { category: 'Finanzas', q: '¿Cómo elimino una transacción?', a: 'En la tabla de transacciones, haz clic en el botón de eliminar (papelera) junto a la transacción. Confirma la acción.' },
  { category: 'Finanzas', q: '¿Cómo borro el historial de una cuenta?', a: 'En la tarjeta de la cuenta, haz clic en el icono de archivo (📦) para archivar todas las transacciones. El balance se mantiene intacto.' },
  { category: 'Finanzas', q: '¿Cómo reseteo el balance de una cuenta?', a: 'En la tarjeta de la cuenta, haz clic en el icono de reset (🔄). El balance se pondrá a $0. Esta acción no se puede deshacer.' },
  { category: 'Finanzas', q: '¿Cómo elimino una cuenta completa?', a: 'Haz clic en el botón de 3 puntos (⋮) en la tarjeta de la cuenta y selecciona "Eliminar Cuenta". Se eliminarán la cuenta y todas sus transacciones.' },
  { category: 'Finanzas', q: '¿Qué muestra la gráfica de Flujo Financiero?', a: 'Muestra ingresos, gastos y ahorros agrupados por período (Día, Semana, Mes, Año). Usa el botón 👁️/ para ocultar o mostrar los montos.' },
  { category: 'Finanzas', q: '¿Cómo importo transacciones desde CSV?', a: 'Actualmente no está disponible. Próximamente podrás importar transacciones desde archivos CSV.' },

  // Calendario
  { category: 'Calendario', q: '¿Cómo creo un recordatorio?', a: 'Ve al Calendario, selecciona un día y haz clic en "+ Recordatorio". Ingresa el título, descripción, hora y tipo (Mentor, Curso, Reunión, Otro).' },
  { category: 'Calendario', q: '¿Cómo veo mis metas en el calendario?', a: 'Las metas con fecha límite aparecen automáticamente en el calendario con el color de la meta. Haz clic en una meta para ver su detalle.' },
  { category: 'Calendario', q: '¿Cómo edito un recordatorio?', a: 'Haz clic en un recordatorio en el calendario para abrir su detalle. Modifica los campos y guarda los cambios.' },
  { category: 'Calendario', q: '¿Cómo elimino un recordatorio?', a: 'Abre el detalle del recordatorio y presiona el botón de eliminar. Confirma la acción.' },
  { category: 'Calendario', q: '¿Puedo crear tipos de recordatorio personalizados?', a: 'Sí. Al crear un recordatorio, usa el selector de tipo y escribe un nombre personalizado. Se guardará en tus preferencias.' },

  // Cursos
  { category: 'Cursos', q: '¿Cómo accedo a los cursos?', a: 'Ve a Cursos en el menú lateral. Verás una lista de cursos disponibles con tu progreso en cada uno.' },
  { category: 'Cursos', q: '¿Cómo me inscribo en un curso?', a: 'Haz clic en un curso para ver su detalle, luego presiona "Inscribirse". Comenzarás desde el primer módulo.' },
  { category: 'Cursos', q: '¿Cómo veo mi progreso en un curso?', a: 'En la página del curso, verás una barra de progreso y la lista de módulos completados y pendientes.' },
  { category: 'Cursos', q: '¿Gano XP por completar cursos?', a: 'Sí. Cada módulo completado te otorga XP que contribuye a tu nivel y logros.' },

  // Comunidad
  { category: 'Comunidad', q: '¿Qué es la Comunidad?', a: 'La Comunidad es un espacio donde puedes ver a otros miembros, su progreso y ranking. Próximamente podrás interactuar con otros usuarios.' },
  { category: 'Comunidad', q: '¿Cómo veo el ranking de usuarios?', a: 'Próximamente disponible. Podrás ver el ranking basado en XP y logros desbloqueados.' },

  // Logros
  { category: 'Logros', q: '¿Cómo desbloqueo logros?', a: 'Los logros se desbloquean automáticamente al completar acciones como: crear tu primera meta, ahorrar una cantidad específica, completar cursos, etc.' },
  { category: 'Logros', q: '¿Dónde veo mis logros?', a: 'Ve a Logros en el menú lateral. Verás una galería con logros desbloqueados y bloqueados.' },
  { category: 'Logros', q: '¿Qué es el sistema de XP?', a: 'XP (Puntos de Experiencia) se ganan al completar acciones en la app. Acumula XP para subir de nivel y desbloquear logros.' },

  // Configuración
  { category: 'Configuración', q: '¿Cómo cambio mi foto de perfil?', a: 'Ve a Configuración > Perfil. Haz clic en tu foto actual y selecciona una nueva imagen. Se comprimirá automáticamente antes de subir.' },
  { category: 'Configuración', q: '¿Cómo cambio mi nombre?', a: 'Ve a Configuración > Perfil. Edita el campo de nombre y guarda los cambios.' },
  { category: 'Configuración', q: '¿Cómo elimino mi cuenta?', a: 'Ve a Configuración > Cuenta > Zona de Peligro. Haz clic en "Eliminar mi cuenta". Se eliminarán todos tus datos permanentemente.' },
  { category: 'Configuración', q: '¿Cómo cierro sesión?', a: 'Haz clic en tu avatar en la barra superior y selecciona "Cerrar Sesión", o ve al menú lateral y haz clic en "Logout".' },

  // Seguridad
  { category: 'Seguridad', q: '¿Mis datos están seguros?', a: 'Sí. Usamos Firebase con reglas de seguridad que aíslan los datos por usuario. Solo tú puedes acceder a tu información.' },
  { category: 'Seguridad', q: '¿Cómo funciona la autenticación?', a: 'Usamos Firebase Authentication con soporte para email/contraseña y Google Sign-In. Las sesiones son seguras y se pueden cerrar desde cualquier dispositivo.' },
  { category: 'Seguridad', q: '¿Puedo usar Prosper Pro en varios dispositivos?', a: 'Sí. Tus datos se sincronizan en tiempo real a través de Firebase. Puedes acceder desde cualquier dispositivo con tu cuenta.' },

  // General
  { category: 'General', q: '¿Prosper Pro es gratuito?', a: 'Sí. Prosper Pro es completamente gratuito. Todas las funcionalidades están disponibles sin costo.' },
  { category: 'General', q: '¿Cómo contacto soporte?', a: 'Ve a Ayuda > Chat en Vivo para hablar con un asesor, o usa "Abrir Ticket" para enviar un mensaje detallado.' },
  { category: 'General', q: '¿Puedo exportar mis datos?', a: 'Próximamente podrás exportar tus transacciones y metas en formato CSV o PDF desde la página de Finanzas.' },
  { category: 'General', q: '¿Cómo reporto un error?', a: 'Ve a Ayuda > Abrir Ticket. Describe el error con el mayor detalle posible y nuestro equipo lo investigará.' },
  { category: 'General', q: '¿Prosper Pro funciona sin internet?', a: 'Actualmente necesitas conexión a internet para usar Prosper Pro. La funcionalidad offline está en desarrollo.' },
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
    title: 'Finanzas',
    desc: 'Registra ingresos y gastos, gestiona cuentas y visualiza tu flujo financiero en tiempo real.',
    icon: '💰',
    tags: ['Ingresos', 'Gastos'],
  },
  {
    title: 'Calendario y Recordatorios',
    desc: 'No pierdas ni una fecha de pago. Configura alertas inteligentes basadas en tu flujo de caja.',
    icon: '📅',
    link: 'Ver tutorial',
  },
  {
    title: 'Cursos y Educación',
    desc: 'Aprende sobre finanzas personales con cursos interactivos y gana XP por cada módulo completado.',
    icon: '📚',
    tags: ['XP', 'Logros'],
  },
  {
    title: 'Seguridad Financiera',
    desc: 'Protocolos de encriptación, autenticación y cómo protegemos tus datos personales.',
    icon: '🛡️',
    cta: 'Leer manifiesto de privacidad',
    wide: true,
  },
];

const quickLinks = [
  { icon: '🎯', title: 'Crear mi primera meta', route: '/metas' },
  { icon: '💰', title: 'Registrar un ingreso', route: '/finanzas' },
  { icon: '📅', title: 'Añadir un recordatorio', route: '/calendario' },
  { icon: '📚', title: 'Explorar cursos', route: '/cursos' },
  { icon: '⚙️', title: 'Configurar perfil', route: '/configuracion' },
  { icon: '🏆', title: 'Ver mis logros', route: '/logros' },
];

export default function AyudaPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const allCategories = ['Todas', ...Array.from(new Set(faqs.map(f => f.category)))];

  const filteredFaqs = faqs.filter(f => {
    const matchesSearch = f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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

          {/* Quick Links */}
          <section className="ayuda-quick-links">
            <h2 className="ayuda-section-title">Accesos Rápidos</h2>
            <div className="ayuda-quick-grid">
              {quickLinks.map((link, i) => (
                <a key={i} href={link.route} className="ayuda-quick-card">
                  <span className="ayuda-quick-icon">{link.icon}</span>
                  <span className="ayuda-quick-title">{link.title}</span>
                </a>
              ))}
            </div>
          </section>

          {/* Category Grid */}
          <section className="ayuda-categories">
            <h2 className="ayuda-section-title">Guías por Categoría</h2>
            <div className="ayuda-categories-grid">
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
            </div>
          </section>

          {/* FAQ Section */}
          <section className="ayuda-faq">
            <div className="ayuda-faq-header">
              <div>
                <h2 className="ayuda-faq-title">Preguntas Frecuentes</h2>
                <p className="ayuda-faq-subtitle">{faqs.length} preguntas organizadas por categoría</p>
              </div>
            </div>

            {/* Category Filter */}
            <div className="ayuda-faq-filters">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  className={`ayuda-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="ayuda-faq-list">
              {filteredFaqs.map((faq, i) => (
                <div key={i} className="ayuda-faq-item">
                  <button
                    className="ayuda-faq-question"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="ayuda-faq-category">{faq.category}</span>
                    <span className="ayuda-faq-q">{faq.q}</span>
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

          .ayuda-section-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 16px;
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

          /* Quick Links */
          .ayuda-quick-links {
            margin-bottom: 40px;
          }
          .ayuda-quick-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .ayuda-quick-card {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: var(--bg-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            text-decoration: none;
            color: var(--text-primary);
            transition: all var(--transition-fast);
          }
          .ayuda-quick-card:hover {
            border-color: var(--color-prosper-green);
            box-shadow: var(--shadow-sm);
          }
          .ayuda-quick-icon {
            font-size: 1.25rem;
            flex-shrink: 0;
          }
          .ayuda-quick-title {
            font-size: 0.8125rem;
            font-weight: 600;
          }

          /* Categories Grid */
          .ayuda-categories {
            margin-bottom: 48px;
          }
          .ayuda-categories-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
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
            margin-bottom: 16px;
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
          .ayuda-faq-filters {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 16px;
          }
          .ayuda-filter-btn {
            padding: 6px 14px;
            border-radius: var(--radius-full);
            border: 1px solid var(--border-default);
            background: var(--bg-card);
            color: var(--text-secondary);
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .ayuda-filter-btn.active {
            background: var(--color-prosper-green);
            color: white;
            border-color: var(--color-prosper-green);
          }
          .ayuda-filter-btn:hover:not(.active) {
            border-color: var(--color-prosper-green);
            color: var(--color-prosper-green);
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
            align-items: center;
            gap: 10px;
            padding: 14px 18px;
            background: none;
            border: none;
            color: var(--text-primary);
            font-size: 0.875rem;
            text-align: left;
            cursor: pointer;
          }
          .ayuda-faq-category {
            font-size: 0.625rem;
            font-weight: 700;
            color: var(--color-prosper-green);
            background: rgba(61, 204, 142, 0.1);
            padding: 2px 8px;
            border-radius: var(--radius-full);
            white-space: nowrap;
            flex-shrink: 0;
          }
          .ayuda-faq-q {
            flex: 1;
            font-weight: 600;
          }
          .ayuda-faq-chevron {
            color: var(--text-tertiary);
            transition: transform var(--transition-fast);
            flex-shrink: 0;
          }
          .ayuda-faq-chevron-open {
            transform: rotate(180deg);
          }
          .ayuda-faq-answer {
            padding: 0 18px 16px 56px;
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
            .ayuda-quick-grid { grid-template-columns: repeat(2, 1fr); }
            .ayuda-categories-grid { grid-template-columns: 1fr; gap: 12px; }
            .ayuda-card-wide { grid-column: span 1; }
            .ayuda-support { grid-template-columns: 1fr; gap: 12px; }
            .ayuda-faq-header { flex-direction: column; align-items: flex-start; }
            .ayuda-hero { margin-bottom: 28px; }
            .ayuda-card { padding: 16px; }
            .ayuda-faq-question { flex-wrap: wrap; }
            .ayuda-faq-category { order: -1; }
          }

          @media (max-width: 480px) {
            .ayuda-page { padding: 12px 8px; }
            .ayuda-quick-grid { grid-template-columns: 1fr; }
            .ayuda-hero-title { font-size: 1.375rem; }
            .ayuda-hero-subtitle { font-size: 0.8125rem; }
            .ayuda-search-input { padding: 12px 14px 12px 40px; font-size: 0.875rem; }
            .ayuda-card-title { font-size: 1rem; }
            .ayuda-card-desc { font-size: 0.75rem; }
            .ayuda-faq-title { font-size: 1.125rem; }
            .ayuda-faq-subtitle { font-size: 0.8125rem; }
            .ayuda-faq-question { padding: 12px 14px; font-size: 0.8125rem; }
            .ayuda-faq-answer { padding: 0 14px 14px 14px; }
            .ayuda-support-card { padding: 16px; }
            .ayuda-filter-btn { font-size: 0.6875rem; padding: 4px 10px; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
