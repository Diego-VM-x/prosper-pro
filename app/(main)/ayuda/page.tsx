'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  IconSearch,
  IconChevronDown,
  IconArrowForward,
  IconX,
} from '@/app/components/icons';
import { submitFeedback, getFeedbackByOwner } from '@/lib/firestore/feedback';

const faqs = [
  // Primeros Pasos (6)
  { category: 'Primeros Pasos', q: '¿Cómo creo mi cuenta en Prosper Pro?', a: 'Puedes registrarte con tu dirección de correo electrónico y una contraseña, o usar el inicio de sesión rápido con Google. Una vez completado el registro, accederás automáticamente al dashboard principal.' },
  { category: 'Primeros Pasos', q: '¿Puedo usar la app sin iniciar sesión?', a: 'Sí. El modo Invitado (Guest) te permite explorar la app y ver todas las funcionalidades sin necesidad de crear una cuenta. Cuando estés listo, puedes registrarte y conservar tus datos.' },
  { category: 'Primeros Pasos', q: '¿Cómo cambio el idioma de la app?', a: 'Ve a Configuración y usa el selector de idioma para cambiar entre Español e Inglés. La preferencia se guarda automáticamente y se aplica de inmediato en toda la interfaz.' },
  { category: 'Primeros Pasos', q: '¿Cómo cambio entre modo claro y oscuro?', a: 'Haz clic en el icono de luna o sol en la barra superior. Puedes elegir entre modo claro, oscuro o AMOLED negro puro. Tu preferencia se guarda automáticamente en tu perfil.' },
  { category: 'Primeros Pasos', q: '¿Cómo configuro mi perfil y privacidad?', a: 'Ve a Configuración > Perfil. Allí puedes cambiar tu nombre, foto de perfil, moneda de visualización predeterminada y configurar si tu perfil es público o privado. Un perfil privado solo puede ser encontrado por email exacto.' },
  { category: 'Primeros Pasos', q: '¿Cómo navego por la aplicación?', a: 'El menú lateral te da acceso a Dashboard, Planes Financieros, Calendario, Finanzas, Configuración y Ayuda. En móvil, usa el botón de menú hamburguesa. La barra superior incluye acceso rápido a notificaciones, búsqueda y cambio de tema.' },

  // Cuentas y Monedas (4)
  { category: 'Cuentas y Monedas', q: '¿Cómo creo cuentas en diferentes monedas?', a: 'Ve a Finanzas > Nueva Cuenta. Selecciona la moneda deseada al crear la cuenta. Puedes tener múltiples cuentas en distintas monedas simultáneamente, cada una con su propio balance independiente.' },
  { category: 'Cuentas y Monedas', q: '¿Qué monedas y criptomonedas soporta la app?', a: 'Soportamos monedas fiduciarias: Dólar estadounidense (USD), Bolívar soberano (VES), Euro (EUR) y Peso colombiano (COP). También criptomonedas: Tether (USDT), Solana (SOL), Bitcoin (BTC) y USD Coin (USDC) con precios en tiempo real de Binance.' },
  { category: 'Cuentas y Monedas', q: '¿Puedo convertir saldos entre monedas?', a: 'Sí. En la sección de Finanzas puedes ver tus saldos convertidos a tu moneda de visualización preferida usando la tasa oficial del BCV o el precio P2P del mercado (Binance), según tu configuración.' },
  { category: 'Cuentas y Monedas', q: '¿Qué pasa con las transacciones si elimino una cuenta?', a: 'Al eliminar una cuenta, todas las transacciones asociadas a esa cuenta también se eliminan permanentemente. Te recomendamos exportar o revisar tu historial antes de borrar una cuenta. Esta acción no se puede deshacer.' },

  // Finanzas (7)
  { category: 'Finanzas', q: '¿Cómo registro una transacción?', a: 'Ve a Finanzas y haz clic en "Nueva Transacción". Selecciona el tipo (Ingreso, Gasto o Transferencia), la cuenta, la categoría, el monto y una descripción opcional. También puedes usar VEPay para capturar comprobantes automáticamente.' },
  { category: 'Finanzas', q: '¿Cómo veo y oculto los balances de mis cuentas?', a: 'En Finanzas verás el balance de cada cuenta en tarjetas. Puedes tocar el icono del ojo junto a cualquier balance para ocultarlo o mostrarlo. Esto es útil en público o al compartir pantalla.' },
  { category: 'Finanzas', q: '¿Cómo hago transferencias rápidas entre cuentas?', a: 'Usa la función "Transferencia Rápida" en Finanzas. Selecciona la cuenta de origen, la cuenta destino y el monto. El sistema registra automáticamente una salida en una cuenta y un ingreso en la otra.' },
  { category: 'Finanzas', q: '¿Cómo filtro y busco transacciones?', a: 'Usa la barra de filtros superiores para filtrar por cuenta, tipo de transacción y categoría. También puedes usar el campo de búsqueda para encontrar transacciones por descripción, monto o fecha. El historial se carga de 5 en 5 para mayor velocidad.' },
  { category: 'Finanzas', q: '¿Qué son las cuentas favoritas?', a: 'Puedes marcar hasta 3 cuentas como favoritas desde la sección Finanzas. El widget "Mis Cuentas" del Dashboard mostrará únicamente estas cuentas para una vista más limpia y enfocada. Puedes quitarlas de favoritos en cualquier momento.' },
  { category: 'Finanzas', q: '¿Qué muestra la gráfica financiera?', a: 'La gráfica compara tus ingresos versus gastos en el período seleccionado (día, semana, mes o año). Usa barras de colores para visualizar tendencias y ver tu evolución financiera de un vistazo.' },
  { category: 'Finanzas', q: '¿Qué es VEPay y cómo capturo comprobantes?', a: 'VEPay es el sistema OCR de Prosper Pro para capturar comprobantes de pago móvil venezolanos. Sube una captura de pantalla de tu app bancaria y el sistema extrae automáticamente el banco, monto, referencia, fecha, origen, destinatario y concepto.' },

  // Planes Financieros (7)
  { category: 'Planes Financieros', q: '¿Cómo creo un plan de ahorro?', a: 'Ve a Planes Financieros > Nuevo Plan. Selecciona tipo "Ahorro", define un nombre, categoría, monto objetivo y fecha límite. El plan aparecerá en tu dashboard y calendario para que hagas seguimiento de tu progreso.' },
  { category: 'Planes Financieros', q: '¿Qué es un gasto planificado?', a: 'Es un plan tipo "Gasto" para organizar pagos futuros. Puedes abonar gradualmente y ver el progreso de pago en tiempo real. Ideal para organizar compras grandes, viajes o deudas.' },
  { category: 'Planes Financieros', q: '¿Cómo funcionan los pagos recurrentes?', a: 'Crea un plan tipo "Recurrente" y elige la frecuencia: diaria, semanal, quincenal, mensual, trimestral o anual. El sistema calcula automáticamente la próxima fecha de vencimiento y te permite registrar cada pago.' },
  { category: 'Planes Financieros', q: '¿Cómo añado fondos a un plan?', a: 'Haz clic en un plan de ahorro y presiona "Añadir Fondos". Selecciona la cuenta de origen y el monto. Se crea una transacción automáticamente y el progreso del plan se actualiza al instante.' },
  { category: 'Planes Financieros', q: '¿Puedo compartir gastos con otros usuarios?', a: 'Sí. Dentro de un plan, usa la opción "Compartir" e ingresa el nombre o email del usuario. Se envía una solicitud que puede aceptar o rechazar. Los planes compartidos muestran quién aportó y cuánto.' },
  { category: 'Planes Financieros', q: '¿Puedo usar categorías personalizadas?', a: 'Sí. Al crear un plan puedes elegir entre categorías predefinidas o escribir una nueva categoría personalizada. Esto te permite organizar tus planes exactamente como lo necesites.' },
  { category: 'Planes Financieros', q: '¿Qué estados pueden tener los planes?', a: 'Los planes pueden estar: Pendiente (sin fondos aún), En Progreso (con al menos un abono), Completado (objetivo alcanzado) o Cancelado (archivado sin completar). Puedes filtrar por estado en la lista de planes.' },

  // Calendario y Recordatorios (4)
  { category: 'Calendario y Recordatorios', q: '¿Cómo creo un recordatorio?', a: 'Ve al Calendario, selecciona un día y haz clic en "+ Recordatorio". Ingresa título, descripción, hora y tipo. También puedes configurar recordatorios recurrentes para que se repitan automáticamente.' },
  { category: 'Calendario y Recordatorios', q: '¿Cómo veo mis metas y planes en el calendario?', a: 'Los planes con fecha límite y los recordatorios aparecen automáticamente en el calendario con sus colores originales. Puedes ver de un vistazo qué días tienen actividad financiera programada.' },
  { category: 'Calendario y Recordatorios', q: '¿Puedo crear tipos de recordatorio personalizados?', a: 'Sí. Al crear un recordatorio, escribe un nombre nuevo en el selector de tipo si no encuentras el que necesitas. Tu tipo personalizado quedará disponible para futuros recordatorios.' },
  { category: 'Calendario y Recordatorios', q: '¿Cómo funcionan los recordatorios recurrentes?', a: 'Al crear un recordatorio, activa la opción de recurrencia y selecciona la frecuencia (diaria, semanal, mensual, etc.). El sistema generará automáticamente las instancias futuras en el calendario.' },

  // Configuración (5)
  { category: 'Configuración', q: '¿Qué puedo configurar en mi perfil?', a: 'En Configuración > Perfil puedes cambiar tu nombre completo, foto de avatar, moneda de visualización predeterminada, idioma de la interfaz (español/inglés) y el tema visual (claro, oscuro o AMOLED).' },
  { category: 'Configuración', q: '¿Cómo cambio el idioma entre español e inglés?', a: 'En Configuración encontrarás el selector de idioma. Al cambiarlo, toda la interfaz se traduce al instante, incluyendo menús, botones, notificaciones y contenido de ayuda. La preferencia se guarda en tu perfil.' },
  { category: 'Configuración', q: '¿Cómo configuro la privacidad de mi perfil?', a: 'En Configuración > Perfil usa el toggle Público/Privado. Si tu perfil es privado, otros usuarios solo podrán encontrarte si conocen tu email exacto. Esto protege tu identidad al compartir planes.' },
  { category: 'Configuración', q: '¿Qué diferencia hay entre tasa BCV y P2P?', a: 'La tasa BCV es la referencia oficial del Banco Central de Venezuela. La tasa P2P es el precio real del mercado según Binance. Puedes elegir cuál usar para convertir tus saldos en bolívares desde Configuración > Preferencias.' },
  { category: 'Configuración', q: '¿Cómo borro todos mis datos?', a: 'En Configuración > Zona de Peligro encontrarás la opción para eliminar tu cuenta y todos tus datos permanentemente de Firestore y Storage. También puedes usar "Vaciar todo" en Gestión Contable para resetear transacciones sin borrar la cuenta.' },

  // Notificaciones (3)
  { category: 'Notificaciones', q: '¿Qué son las alertas de cambio de tasa BCV?', a: 'Recibes una notificación cuando la tasa oficial del BCV experimenta una variación significativa. Esto te ayuda a estar al tanto de cambios importantes que afectan el valor de tus saldos en bolívares.' },
  { category: 'Notificaciones', q: '¿Qué es el resumen diario de balance?', a: 'Es una notificación automática que recibes al final del día con un resumen de tus balances totales, movimientos del día y estado de tus planes. Puedes activarla o desactivarla desde Configuración > Notificaciones.' },
  { category: 'Notificaciones', q: '¿Cómo activo las notificaciones del navegador?', a: 'En Configuración > Notificaciones encontrarás el toggle para habilitar las notificaciones push del navegador. El sistema te pedirá permiso y luego podrá enviarte alertas incluso con la app cerrada.' },

  // Seguridad (3)
  { category: 'Seguridad', q: '¿Mis datos están seguros?', a: 'Sí. Usamos Firebase con reglas de seguridad estrictas que aíslan los datos por ownerId. Solo tú puedes acceder a tu información. Las contraseñas se manejan mediante Firebase Auth con encriptación estándar de la industria.' },
  { category: 'Seguridad', q: '¿Puedo usar Prosper Pro en varios dispositivos?', a: 'Sí. Tus datos se sincronizan en tiempo real a través de Firestore. Puedes acceder desde tu celular, tablet o computadora y verás la misma información actualizada instantáneamente en todos los dispositivos.' },
  { category: 'Seguridad', q: '¿Cómo elimino mi cuenta permanentemente?', a: 'Ve a Configuración > Zona de Peligro y haz clic en "Eliminar mi cuenta para siempre". Se eliminarán todos tus datos de Firestore, Storage y Authentication. Esta acción es irreversible.' },

  // General (2)
  { category: 'General', q: '¿Prosper Pro es gratuito?', a: 'Sí. Todas las funcionalidades actuales y futuras de Prosper Pro están disponibles sin costo. No hay planes de pago ni límites ocultos en el uso de la aplicación.' },
  { category: 'General', q: '¿En qué URL está el dashboard?', a: 'El dashboard principal está en la raíz (/). Cuando inicias sesión, la página de inicio se convierte automáticamente en tu panel de control personalizado.' },
];

const categories = [
  { title: 'Primeros Pasos', desc: 'Crea tu cuenta, explora el modo invitado y personaliza tu experiencia.', icon: '🚀', tag: 'Guía Esencial' },
  { title: 'Cuentas y Monedas', desc: 'Gestiona múltiples monedas fiduciarias y criptomonedas.', icon: '💱', tags: ['USD', 'EUR', 'VES', 'Crypto'] },
  { title: 'Finanzas', desc: 'Registra transacciones, gestiona cuentas, favoritos y captura comprobantes.', icon: '💰', tags: ['Cuentas', 'Transacciones', 'VEPay'] },
  { title: 'Planes Financieros', desc: 'Crea planes de ahorro, gastos planificados y pagos recurrentes.', icon: '🎯', tags: ['Ahorro', 'Gastos', 'Recurrentes'] },
  { title: 'Calendario y Recordatorios', desc: 'Configura recordatorios y visualiza vencimientos.', icon: '📅', tags: ['Recordatorios', 'Recurrentes'] },
  { title: 'Configuración', desc: 'Personaliza perfil, idioma, tema, privacidad y preferencias de tasas.', icon: '⚙️', tags: ['Perfil', 'Idioma', 'Privacidad'] },
  { title: 'Notificaciones', desc: 'Alertas de tasas, resumen diario y notificaciones del navegador.', icon: '🔔', tags: ['BCV', 'Push'] },
  { title: 'Seguridad', desc: 'Protocolos de encriptación, sincronización y protección de datos.', icon: '🛡️' },
  { title: 'General', desc: 'Información general sobre precios y acceso.', icon: '❓' },
];

const quickLinks = [
  { icon: '🎯', title: 'Crear plan', route: '/metas' },
  { icon: '💰', title: 'Registrar transacción', route: '/finanzas' },
  { icon: '📅', title: 'Añadir recordatorio', route: '/calendario' },
  { icon: '🏦', title: 'Nueva cuenta', route: '/finanzas' },
  { icon: '⚙️', title: 'Configurar perfil', route: '/configuracion' },
  { icon: '📊', title: 'Ver tasas', route: '/' },
];

function getTutorialSteps(category: string): string[] {
  const t: Record<string, string[]> = {
    'Primeros Pasos': [
      'Crea tu cuenta con email o Google, o usa el modo Invitado.',
      'Configura tu perfil, foto y privacidad en Configuración.',
      'Elige tu idioma (ES/EN) y tema visual preferido.',
      'Explora el dashboard y familiarízate con el menú lateral.',
      'En móvil, usa el botón hamburguesa para navegar entre secciones.',
    ],
    'Cuentas y Monedas': [
      'Ve a Finanzas > Nueva Cuenta.',
      'Selecciona la moneda: USD, EUR, VES, COP, USDT, SOL, BTC o USDC.',
      'Asigna un nombre descriptivo y un balance inicial.',
      'Crea tantas cuentas como necesites en diferentes monedas.',
      'Usa el selector de tasa BCV o P2P para ver conversiones en bolívares.',
    ],
    'Finanzas': [
      'Revisa tus cuentas favoritas en el Dashboard.',
      'Registra transacciones: Ingreso, Gasto o Transferencia.',
      'Usa filtros y búsqueda para encontrar movimientos específicos.',
      'Consulta la gráfica de rendimiento financiero por período.',
      'Usa VEPay para capturar comprobantes de pago automáticamente.',
    ],
    'Planes Financieros': [
      'Ve a Planes Financieros y haz clic en "Nuevo Plan".',
      'Selecciona el tipo: Ahorro, Gasto Planificado o Recurrente.',
      'Define nombre, categoría (personalizada si quieres) y monto objetivo.',
      'Establece una fecha límite y, para recurrentes, la frecuencia.',
      'Comparte el plan con otros usuarios para dividir gastos.',
    ],
    'Calendario y Recordatorios': [
      'Ve al Calendario y selecciona un día.',
      'Haz clic en "+ Recordatorio" para crear uno nuevo.',
      'Define título, descripción, hora y tipo (personalizado si lo necesitas).',
      'Activa la recurrencia para recordatorios periódicos.',
      'Los planes con fecha aparecen automáticamente en el calendario.',
    ],
    'Configuración': [
      'Accede a Configuración > Perfil para tu nombre, avatar y moneda.',
      'Usa el selector de idioma para cambiar entre Español e Inglés.',
      'Configura tu privacidad como Pública o Privada.',
      'Elige tu tasa preferida: BCV oficial o P2P de Binance.',
      'Personaliza el tema visual: Claro, Oscuro o AMOLED.',
    ],
    'Notificaciones': [
      'Ve a Configuración > Notificaciones.',
      'Activa las alertas de cambio de tasa BCV.',
      'Habilita el resumen diario de balance.',
      'Concede permiso para notificaciones push del navegador.',
    ],
    'Seguridad': [
      'Usa una contraseña fuerte y única para tu cuenta.',
      'Mantén tu perfil en privado si no quieres ser encontrado fácilmente.',
      'Cierra sesión en dispositivos compartidos.',
      'Reporta actividad sospechosa desde el chat de ayuda.',
    ],
    'General': [
      'Prosper Pro es completamente gratuito.',
      'El dashboard está en la raíz (/).',
    ],
  };
  return t[category] || ['Tutorial no disponible.'];
}

function getTutorialRoute(category: string): string {
  const r: Record<string, string> = {
    'Primeros Pasos': '/configuracion',
    'Cuentas y Monedas': '/finanzas',
    'Finanzas': '/finanzas',
    'Planes Financieros': '/metas',
    'Calendario y Recordatorios': '/calendario',
    'Configuración': '/configuracion',
    'Notificaciones': '/configuracion',
    'Seguridad': '/configuracion',
    'General': '/',
  };
  return r[category] || '/';
}

export default function AyudaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [openFaqCategory, setOpenFaqCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [openTutorial, setOpenTutorial] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatType, setChatType] = useState<'suggestion' | 'bug'>('bug');
  const [chatMessages, setChatMessages] = useState<{ type: 'user' | 'system'; text: string; time: string }[]>([]);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (showChat && user?.uid && chatMessages.length === 0) {
      setLoadingHistory(true);
      getFeedbackByOwner(user.uid).then(history => {
        const messages: { type: 'user' | 'system'; text: string; time: string }[] = [];
        [...history].reverse().forEach(item => {
          const date = new Date(item.createdAt);
          const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          messages.push({ type: 'user', text: item.message, time });
          const label = item.type === 'bug' ? '🐛 Bug reportado' : '💡 Sugerencia enviada';
          messages.push({ type: 'system', text: `${label}. Gracias por tu feedback. Lo revisaremos pronto.`, time });
        });
        setChatMessages(messages);
      }).catch(err => {
        console.error('Error loading feedback history:', err);
      }).finally(() => {
        setLoadingHistory(false);
      });
    }
  }, [showChat, user?.uid, chatMessages.length]);

  const allCategories = ['Todas', ...Array.from(new Set(faqs.map(f => f.category)))];
  const searchLower = searchQuery.toLowerCase().trim();

  const groupedFaqs = useMemo(() => {
    let filtered = faqs;
    if (searchLower) {
      filtered = faqs.filter(f =>
        f.q.toLowerCase().includes(searchLower) ||
        f.a.toLowerCase().includes(searchLower) ||
        f.category.toLowerCase().includes(searchLower)
      );
    }
    if (selectedCategory !== 'Todas') {
      filtered = filtered.filter(f => f.category === selectedCategory);
    }
    const groups: Record<string, typeof faqs> = {};
    filtered.forEach(f => {
      if (!groups[f.category]) groups[f.category] = [];
      groups[f.category].push(f);
    });
    return groups;
  }, [searchLower, selectedCategory]);

  const filteredCategories = useMemo(() => {
    if (!searchLower) return categories;
    return categories.filter(c => c.title.toLowerCase().includes(searchLower) || c.desc.toLowerCase().includes(searchLower));
  }, [searchLower]);

  const filteredQuickLinks = useMemo(() => {
    if (!searchLower) return quickLinks;
    return quickLinks.filter(l => l.title.toLowerCase().includes(searchLower));
  }, [searchLower]);

  const totalFaqs = Object.values(groupedFaqs).reduce((sum, arr) => sum + arr.length, 0);
  const hasResults = totalFaqs > 0 || filteredCategories.length > 0 || filteredQuickLinks.length > 0;

  const handleSendChat = async () => {
    if (!chatMessage.trim() || !user?.uid) return;
    setSendingFeedback(true);
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setChatMessages(prev => [...prev, { type: 'user', text: chatMessage, time }]);

    try {
      await submitFeedback({
        ownerId: user.uid,
        type: chatType,
        message: chatMessage,
        page: '/ayuda',
      });
      const label = chatType === 'bug' ? '🐛 Bug reportado' : '💡 Sugerencia enviada';
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          type: 'system',
          text: `${label}. Gracias por tu feedback. Lo revisaremos pronto.`,
          time: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
        }]);
      }, 600);
    } catch (err) {
      setChatMessages(prev => [...prev, {
        type: 'system',
        text: '❌ Error al enviar. Inténtalo de nuevo.',
        time: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
      }]);
    }

    setChatMessage('');
    setSendingFeedback(false);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="ayuda-page">
          {/* Hero */}
          <section className="ayuda-hero">
            <div className="ayuda-hero-bg">
              <div className="ayuda-hero-shape ayuda-hero-shape-1" />
              <div className="ayuda-hero-shape ayuda-hero-shape-2" />
            </div>
            <div className="ayuda-hero-content">
              <h1 className="ayuda-hero-title">Centro de Ayuda</h1>
              <p className="ayuda-hero-subtitle">Todo lo que necesitas saber para aprovechar Prosper Pro.</p>
              <div className="ayuda-search-wrapper">
                <IconSearch className="ayuda-search-icon" width={18} height={18} />
                <input type="text" placeholder="Buscar guías, preguntas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ayuda-search-input" />
                {searchQuery && (
                  <button className="ayuda-search-clear" onClick={() => setSearchQuery('')}>
                    <IconX width={14} height={14} />
                  </button>
                )}
              </div>
            </div>
          </section>

          {searchQuery && (
            <div className="ayuda-search-results">
              <p>{hasResults ? `${totalFaqs + filteredCategories.length + filteredQuickLinks.length} resultado${(totalFaqs + filteredCategories.length + filteredQuickLinks.length) !== 1 ? 's' : ''}` : `No se encontraron resultados para "${searchQuery}"`}</p>
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
                    <span className="ayuda-quick-title">{link.title}</span>
                    <IconArrowForward width={14} height={14} className="ayuda-quick-arrow" />
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
                  <div key={i} className="ayuda-card">
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
                      <IconChevronDown width={14} height={14} className={`ayuda-tutorial-chevron ${openTutorial === cat.title ? 'ayuda-tutorial-chevron-open' : ''}`} />
                      <span>{openTutorial === cat.title ? 'Ocultar tutorial' : 'Ver tutorial'}</span>
                    </button>
                    {openTutorial === cat.title && (
                      <div className="ayuda-tutorial-content">
                        <ol className="ayuda-tutorial-steps">{getTutorialSteps(cat.title).map((step, j) => (<li key={j}><span className="ayuda-tutorial-step-num">{j + 1}</span><span className="ayuda-tutorial-step-text">{step}</span></li>))}</ol>
                        <button className="ayuda-tutorial-link" onClick={() => router.push(getTutorialRoute(cat.title))}>Ir a {cat.title} <IconArrowForward width={12} height={12} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* VEPay Section */}
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
                    <p>El sistema usa reconocimiento óptico de caracteres para leer el texto. Soporta más de 20 bancos venezolanos.</p>
                  </div>
                </div>
                <div className="ayuda-vepay-step">
                  <div className="ayuda-vepay-step-num">3</div>
                  <div className="ayuda-vepay-step-content">
                    <h4>Datos extraídos</h4>
                    <p>Se extraen: <strong>banco</strong>, <strong>monto en Bs.</strong>, <strong>referencia</strong>, <strong>fecha</strong>, <strong>origen</strong>, <strong>destinatario</strong> y <strong>concepto</strong>.</p>
                  </div>
                </div>
                <div className="ayuda-vepay-step">
                  <div className="ayuda-vepay-step-num">4</div>
                  <div className="ayuda-vepay-step-content">
                    <h4>Validación inteligente</h4>
                    <p>El sistema valida cada comprobante y muestra campos faltantes. Puedes revisar el texto crudo y corregir.</p>
                  </div>
                </div>
              </div>
              <div className="ayuda-vepay-supported">
                <h4>Bancos soportados</h4>
                <div className="ayuda-vepay-banks">
                  {['BDV', 'Mercantil', 'Provincial', 'Banesco', 'Bancamiga', 'Bicentenario', 'Tesoro', 'Caroní', 'Exterior', 'Sofitasa', 'Plaza', 'Activo', 'Del Sur', 'Banfanb'].map((bank) => (
                    <span key={bank} className="ayuda-vepay-bank-tag">{bank}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQ - Grouped by Category */}
          <section className="ayuda-section">
            <div className="ayuda-section-header">
              <span className="ayuda-section-icon">❓</span>
              <h2 className="ayuda-section-title">Preguntas Frecuentes</h2>
            </div>
            <div className="ayuda-faq-filters">
              {allCategories.map((cat) => (<button key={cat} className={`ayuda-filter-btn ${selectedCategory === cat ? 'active' : ''}`} onClick={() => setSelectedCategory(cat)}>{cat}</button>))}
            </div>
            <div className="ayuda-faq-grouped">
              {Object.entries(groupedFaqs).map(([category, items]) => (
                <div key={category} className="ayuda-faq-group">
                  <button className="ayuda-faq-group-header" onClick={() => setOpenFaqCategory(openFaqCategory === category ? null : category)}>
                    <span className="ayuda-faq-group-title">{category}</span>
                    <span className="ayuda-faq-group-count">{items.length}</span>
                    <IconChevronDown width={16} height={16} className={`ayuda-faq-group-chevron ${openFaqCategory === category ? 'ayuda-faq-chevron-open' : ''}`} />
                  </button>
                  {openFaqCategory === category && (
                    <div className="ayuda-faq-group-list">
                      {items.map((faq, i) => (
                        <div key={i} className="ayuda-faq-item">
                          <button className="ayuda-faq-question" onClick={() => setOpenFaqCategory(`${category}-${i}`)}>
                            <span className="ayuda-faq-q">{faq.q}</span>
                            <IconChevronDown width={16} height={16} className={`ayuda-faq-chevron ${openFaqCategory === `${category}-${i}` ? 'ayuda-faq-chevron-open' : ''}`} />
                          </button>
                          {openFaqCategory === `${category}-${i}` && <div className="ayuda-faq-answer"><p>{faq.a}</p></div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {totalFaqs === 0 && <p className="ayuda-faq-empty">No se encontraron resultados.</p>}
            </div>
          </section>

          {/* Support */}
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
                <h3 className="ayuda-support-title">Email <span style={{fontSize:'0.6rem',marginLeft:'6px',padding:'2px 8px',borderRadius:'999px',background:'rgba(61,204,142,0.15)',color:'#3DCC8E',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.04em',verticalAlign:'middle'}}>En Desarrollo</span></h3>
                <p className="ayuda-support-desc">Respuesta en 24h hábiles.</p>
                <button className="ayuda-support-btn ayuda-support-btn-primary" onClick={() => window.location.href = 'mailto:soporte@prosperpro.com'}>Enviar</button>
              </div>
              <div className="ayuda-support-card">
                <div className="ayuda-support-icon-wrap">
                  <span className="ayuda-support-emoji">📖</span>
                </div>
                <h3 className="ayuda-support-title">Documentación</h3>
                <p className="ayuda-support-desc">Guías completas y tutoriales.</p>
                <button className="ayuda-support-btn ayuda-support-btn-secondary" onClick={() => window.open('https://prosper-pro.vercel.app', '_blank')}>Ver</button>
              </div>
              <div className="ayuda-support-card ayuda-support-card-chat" onClick={() => setShowChat(true)}>
                <div className="ayuda-support-icon-wrap">
                  <span className="ayuda-support-emoji">💬</span>
                </div>
                <h3 className="ayuda-support-title">Feedback</h3>
                <p className="ayuda-support-desc">Reporta bugs o envía sugerencias.</p>
                <button className="ayuda-support-btn ayuda-support-btn-chat">Abrir Chat</button>
              </div>
            </div>
          </section>

          <footer className="ayuda-footer">
            <p className="ayuda-footer-label">PROSPER PRO SUPPORT</p>
            <div className="ayuda-footer-links"><a href="#">Estado del Sistema</a><Link href="/ayuda/notas-version">Notas de Versión</Link><a href="#">Términos</a></div>
          </footer>
        </div>

        {/* Floating Chat */}
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
                  <IconX width={16} height={16} />
                </button>
              </div>
              <div className="chat-type-selector">
                <button className={`chat-type-btn ${chatType === 'bug' ? 'active active-bug' : ''}`} onClick={() => setChatType('bug')}>🐛 Bug</button>
                <button className={`chat-type-btn ${chatType === 'suggestion' ? 'active active-suggestion' : ''}`} onClick={() => setChatType('suggestion')}>💡 Sugerencia</button>
              </div>
              <div className="chat-messages">
                {loadingHistory ? (
                  <div className="chat-empty">
                    <p>Cargando historial...</p>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="chat-empty">
                    <span className="chat-empty-icon">{chatType === 'bug' ? '🐛' : '💡'}</span>
                    <p>{chatType === 'bug' ? 'Describe el bug que encontraste' : 'Comparte tu idea o sugerencia'}</p>
                    <p className="chat-empty-hint">Sé detallado para que podamos ayudarte mejor.</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`chat-msg ${msg.type === 'user' ? 'chat-msg-user' : 'chat-msg-system'}`}>
                      <div className={`chat-msg-bubble ${msg.type === 'user' ? 'chat-msg-bubble-user' : 'chat-msg-bubble-system'}`}>
                        <p>{msg.text}</p>
                      </div>
                      <span className="chat-msg-time">{msg.time}</span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="chat-input-area">
                <input type="text" className="chat-input" placeholder={chatType === 'bug' ? 'Describe el bug...' : 'Escribe tu sugerencia...'} value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} disabled={sendingFeedback} />
                <button className="chat-send-btn" onClick={handleSendChat} disabled={!chatMessage.trim() || sendingFeedback}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .ayuda-page { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
          .ayuda-section { margin-bottom: 36px; }
          .ayuda-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
          .ayuda-section-icon { font-size: 1.25rem; }
          .ayuda-section-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }

          /* Hero */
          .ayuda-hero { position: relative; background: linear-gradient(135deg, var(--color-prosper-navy) 0%, #2A5A4E 40%, var(--color-prosper-green) 100%); border-radius: var(--radius-xl, 20px); padding: 32px 28px; margin-bottom: 28px; overflow: hidden; text-align: center; }
          .ayuda-hero-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
          .ayuda-hero-shape { position: absolute; border-radius: 50%; opacity: 0.08; background: white; }
          .ayuda-hero-shape-1 { width: 200px; height: 200px; top: -80px; right: -60px; }
          .ayuda-hero-shape-2 { width: 150px; height: 150px; bottom: -50px; left: 5%; }
          .ayuda-hero-content { position: relative; z-index: 1; }
          .ayuda-hero-title { font-size: clamp(1.375rem, 4vw, 1.75rem); font-weight: 800; color: white; margin: 0 0 8px; }
          .ayuda-hero-subtitle { font-size: clamp(0.8125rem, 2vw, 0.9375rem); color: rgba(255,255,255,0.7); margin: 0 0 20px; }
          .ayuda-search-wrapper { position: relative; max-width: 440px; margin: 0 auto; }
          .ayuda-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--color-prosper-green); pointer-events: none; }
          .ayuda-search-input { width: 100%; padding: 12px 38px 12px 40px; border-radius: var(--radius-lg); border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.12); color: white; font-size: 0.875rem; outline: none; backdrop-filter: blur(8px); }
          .ayuda-search-input:focus { border-color: rgba(255,255,255,0.5); }
          .ayuda-search-input::placeholder { color: rgba(255,255,255,0.5); }
          .ayuda-search-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; cursor: pointer; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
          .ayuda-search-results { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); margin-bottom: 20px; }
          .ayuda-search-results p { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }
          .ayuda-clear-search { font-size: 0.75rem; color: var(--color-prosper-green); font-weight: 600; background: none; border: none; cursor: pointer; }

          /* Quick Links */
          .ayuda-quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .ayuda-quick-card { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); color: var(--text-primary); transition: all var(--transition-fast); cursor: pointer; font-family: inherit; width: 100%; }
          .ayuda-quick-card:hover { border-color: var(--color-prosper-green); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
          .ayuda-quick-card-icon { font-size: 1.25rem; flex-shrink: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg-input); border-radius: var(--radius-md); }
          .ayuda-quick-title { font-size: 0.8125rem; font-weight: 600; flex: 1; text-align: left; }
          .ayuda-quick-arrow { color: var(--text-tertiary); flex-shrink: 0; transition: transform var(--transition-fast); }
          .ayuda-quick-card:hover .ayuda-quick-arrow { transform: translateX(3px); color: var(--color-prosper-green); }

          /* Categories */
          .ayuda-categories-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .ayuda-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; transition: all var(--transition-fast); display: flex; flex-direction: column; }
          .ayuda-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-sm); }
          .ayuda-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
          .ayuda-card-icon-wrap { width: 40px; height: 40px; border-radius: var(--radius-md); background: rgba(61, 204, 142, 0.12); display: flex; align-items: center; justify-content: center; }
          .ayuda-card-emoji { font-size: 1.125rem; }
          .ayuda-card-badge { font-size: 0.5625rem; font-weight: 700; color: var(--color-prosper-green); background: rgba(61, 204, 142, 0.12); padding: 3px 8px; border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.1em; }
          .ayuda-card-title { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
          .ayuda-card-desc { font-size: 0.75rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 10px; }
          .ayuda-card-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 10px; }
          .ayuda-tag { font-size: 0.625rem; padding: 2px 8px; border-radius: var(--radius-full); background: var(--bg-input); color: var(--color-prosper-green); border: 1px solid rgba(61, 204, 142, 0.15); font-weight: 500; }
          .ayuda-tutorial-toggle { display: flex; align-items: center; gap: 4px; padding: 6px 0; background: none; border: none; color: var(--color-prosper-green); font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-top: auto; }
          .ayuda-tutorial-chevron { transition: transform var(--transition-fast); }
          .ayuda-tutorial-chevron-open { transform: rotate(180deg); }
          .ayuda-tutorial-content { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-default); }
          .ayuda-tutorial-steps { list-style: none; padding: 0; margin: 0 0 10px; }
          .ayuda-tutorial-steps li { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border-default); }
          .ayuda-tutorial-steps li:last-child { border-bottom: none; }
          .ayuda-tutorial-step-num { width: 20px; height: 20px; border-radius: 50%; background: var(--color-prosper-green); color: white; font-size: 0.625rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .ayuda-tutorial-step-text { font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4; }
          .ayuda-tutorial-link { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8125rem; font-weight: 600; color: var(--color-prosper-green); background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; }

          /* VEPay */
          .ayuda-vepay-section { margin-bottom: 36px; }
          .ayuda-vepay-card { background: linear-gradient(135deg, var(--bg-card) 0%, rgba(61,204,142,0.04) 100%); border: 1px solid var(--border-default); border-radius: var(--radius-xl, 20px); padding: 24px; position: relative; overflow: hidden; }
          .ayuda-vepay-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--color-prosper-green), var(--color-prosper-navy)); }
          .ayuda-vepay-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
          .ayuda-vepay-icon-wrap { width: 44px; height: 44px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--color-prosper-green), #2BA87A); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .ayuda-vepay-icon { font-size: 1.25rem; }
          .ayuda-vepay-title-wrap { flex: 1; }
          .ayuda-vepay-title { font-size: 1.125rem; font-weight: 800; color: var(--text-primary); margin: 0 0 2px; }
          .ayuda-vepay-subtitle { font-size: 0.8125rem; color: var(--text-secondary); margin: 0; }
          .ayuda-vepay-steps { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
          .ayuda-vepay-step { display: flex; gap: 10px; align-items: flex-start; }
          .ayuda-vepay-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--color-prosper-green); color: white; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .ayuda-vepay-step-content { flex: 1; }
          .ayuda-vepay-step-content h4 { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; }
          .ayuda-vepay-step-content p { font-size: 0.75rem; color: var(--text-secondary); margin: 0; line-height: 1.4; }
          .ayuda-vepay-step-content p strong { color: var(--text-primary); }
          .ayuda-vepay-supported { padding-top: 16px; border-top: 1px solid var(--border-default); }
          .ayuda-vepay-supported h4 { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 10px; }
          .ayuda-vepay-banks { display: flex; flex-wrap: wrap; gap: 6px; }
          .ayuda-vepay-bank-tag { font-size: 0.625rem; padding: 4px 10px; border-radius: var(--radius-full); background: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-default); font-weight: 500; }

          /* FAQ Grouped */
          .ayuda-faq-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
          .ayuda-filter-btn { padding: 6px 12px; border-radius: var(--radius-full); border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); }
          .ayuda-filter-btn.active { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .ayuda-filter-btn:hover:not(.active) { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .ayuda-faq-grouped { display: flex; flex-direction: column; gap: 8px; }
          .ayuda-faq-group { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }
          .ayuda-faq-group-header { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: none; border: none; color: var(--text-primary); cursor: pointer; transition: background var(--transition-fast); }
          .ayuda-faq-group-header:hover { background: var(--bg-input); }
          .ayuda-faq-group-title { font-size: 0.875rem; font-weight: 700; flex: 1; text-align: left; }
          .ayuda-faq-group-count { font-size: 0.6875rem; font-weight: 600; color: var(--text-secondary); background: var(--bg-input); padding: 2px 8px; border-radius: var(--radius-full); }
          .ayuda-faq-group-chevron { color: var(--text-tertiary); transition: transform var(--transition-fast); flex-shrink: 0; }
          .ayuda-faq-group-list { padding: 0 12px 8px; }
          .ayuda-faq-item { border-bottom: 1px solid var(--border-default); }
          .ayuda-faq-item:last-child { border-bottom: none; }
          .ayuda-faq-question { width: 100%; display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: none; border: none; color: var(--text-primary); font-size: 0.8125rem; text-align: left; cursor: pointer; }
          .ayuda-faq-q { flex: 1; font-weight: 500; }
          .ayuda-faq-chevron { color: var(--text-tertiary); transition: transform var(--transition-fast); flex-shrink: 0; }
          .ayuda-faq-chevron-open { transform: rotate(180deg); }
          .ayuda-faq-answer { padding: 0 12px 12px 12px; color: var(--text-secondary); font-size: 0.8125rem; line-height: 1.6; }
          .ayuda-faq-empty { text-align: center; padding: 24px; color: var(--text-tertiary); font-size: 0.8125rem; }

          /* Support */
          .ayuda-support-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .ayuda-support-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px 16px; display: flex; flex-direction: column; align-items: center; text-align: center; transition: all var(--transition-fast); }
          .ayuda-support-card:hover { border-color: var(--color-prosper-green); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
          .ayuda-support-card-chat { cursor: pointer; }
          .ayuda-support-icon-wrap { width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(61, 204, 142, 0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
          .ayuda-support-emoji { font-size: 1.25rem; }
          .ayuda-support-title { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
          .ayuda-support-desc { font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 14px; flex: 1; }
          .ayuda-support-btn { width: 100%; padding: 10px; border-radius: var(--radius-md); font-size: 0.8125rem; font-weight: 600; cursor: pointer; border: none; transition: all var(--transition-fast); }
          .ayuda-support-btn-primary { background: var(--color-prosper-green); color: white; }
          .ayuda-support-btn-primary:hover { filter: brightness(1.1); }
          .ayuda-support-btn-secondary { background: rgba(61, 204, 142, 0.15); color: var(--color-prosper-green); }
          .ayuda-support-btn-secondary:hover { background: rgba(61, 204, 142, 0.25); }
          .ayuda-support-btn-chat { background: linear-gradient(135deg, var(--color-prosper-green), #2BA87A); color: white; }
          .ayuda-support-btn-chat:hover { filter: brightness(1.1); }

          /* Footer */
          .ayuda-footer { text-align: center; padding: 24px 0 12px; border-top: 1px solid var(--border-default); }
          .ayuda-footer-label { font-size: 0.5625rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px; }
          .ayuda-footer-links { display: flex; justify-content: center; gap: 20px; }
          .ayuda-footer-links a { font-size: 0.6875rem; color: var(--text-secondary); text-decoration: none; }
          .ayuda-footer-links a:hover { color: var(--color-prosper-green); }

          /* Chat */
          .chat-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: flex-end; justify-content: flex-end; padding: 16px; animation: chatFadeIn 0.2s ease; }
          @keyframes chatFadeIn { from { opacity: 0; } to { opacity: 1; } }
          .chat-window { width: 340px; max-width: calc(100vw - 32px); height: 460px; max-height: calc(100dvh - 32px); background: #ffffff; border: 1px solid var(--border-default); border-radius: var(--radius-xl, 20px); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: chatSlideUp 0.3s ease; }
          [data-theme="dark"] .chat-window { background: #0a1628; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6); }
          [data-theme="amoled"] .chat-window { background: #0a0a0a; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9); }
          @keyframes chatSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          .chat-header { padding: 16px 18px; background: linear-gradient(135deg, var(--color-prosper-navy), #2A5A4E); display: flex; align-items: center; justify-content: space-between; }
          .chat-header-info { display: flex; align-items: center; gap: 10px; }
          .chat-header-icon { font-size: 1.125rem; }
          .chat-header-title { font-size: 0.875rem; font-weight: 700; color: white; margin: 0; }
          .chat-header-subtitle { font-size: 0.6875rem; color: rgba(255,255,255,0.6); margin: 0; }
          .chat-close-btn { background: rgba(255,255,255,0.15); border: none; color: white; cursor: pointer; padding: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
          .chat-close-btn:hover { background: rgba(255,255,255,0.25); }
          .chat-type-selector { display: flex; gap: 6px; padding: 12px 16px; border-bottom: 1px solid var(--border-default); }
          .chat-type-btn { flex: 1; padding: 8px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; cursor: pointer; text-align: center; }
          .chat-type-btn.active-bug { background: rgba(239,68,68,0.12); border-color: var(--color-error); color: var(--color-error); }
          .chat-type-btn.active-suggestion { background: rgba(61,204,142,0.12); border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .chat-messages { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
          .chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px 12px; }
          .chat-empty-icon { font-size: 2rem; margin-bottom: 8px; }
          .chat-empty p { font-size: 0.8125rem; color: var(--text-secondary); margin: 0 0 2px; }
          .chat-empty-hint { font-size: 0.6875rem; color: var(--text-tertiary); }
          .chat-msg { display: flex; flex-direction: column; }
          .chat-msg-user { align-items: flex-end; }
          .chat-msg-system { align-items: flex-start; }
          .chat-msg-bubble { max-width: 85%; padding: 10px 14px; border-radius: var(--radius-lg); }
          .chat-msg-bubble-user { background: var(--color-prosper-green); color: white; border-bottom-right-radius: 4px; }
          .chat-msg-bubble-system { background: var(--bg-input); color: var(--text-primary); border-bottom-left-radius: 4px; }
          .chat-msg-bubble p { margin: 0; font-size: 0.75rem; line-height: 1.4; }
          .chat-msg-time { font-size: 0.5625rem; color: var(--text-tertiary); margin-top: 2px; padding: 0 4px; }
          .chat-input-area { display: flex; gap: 6px; padding: 12px 16px; border-top: 1px solid var(--border-default); }
          .chat-input { flex: 1; padding: 10px 14px; border-radius: var(--radius-xl); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.8125rem; outline: none; font-family: inherit; }
          .chat-input:focus { border-color: var(--color-prosper-green); }
          .chat-input::placeholder { color: var(--text-tertiary); }
          .chat-send-btn { width: 38px; height: 38px; border-radius: 50%; background: var(--color-prosper-green); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .chat-send-btn:hover { filter: brightness(1.1); }
          .chat-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

          /* Responsive */
          @media (max-width: 768px) {
            .ayuda-page { padding: 16px 12px; }
            .ayuda-hero { padding: 24px 18px; }
            .ayuda-hero-title { font-size: 1.25rem; }
            .ayuda-quick-grid { grid-template-columns: repeat(2, 1fr); }
            .ayuda-categories-grid { grid-template-columns: repeat(2, 1fr); }
            .ayuda-vepay-steps { grid-template-columns: 1fr; }
            .ayuda-support-grid { grid-template-columns: 1fr; }
            .ayuda-faq-question { flex-wrap: wrap; }
            .chat-overlay { padding: 8px; }
            .chat-window { width: 100%; max-width: 100%; height: 75vh; border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
          }
          @media (max-width: 480px) {
            .ayuda-page { padding: 12px 8px; }
            .ayuda-quick-grid { grid-template-columns: 1fr; }
            .ayuda-categories-grid { grid-template-columns: 1fr; }
            .ayuda-hero { padding: 20px 14px; }
            .ayuda-hero-title { font-size: 1.125rem; }
            .ayuda-search-input { padding: 10px 34px 10px 36px; font-size: 0.8125rem; }
            .ayuda-vepay-card { padding: 18px 14px; }
            .ayuda-support-card { padding: 16px 12px; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
