import type { WidgetType } from '@/types';

export interface WidgetMeta {
  type: WidgetType;
  label: string;
  description: string;
  icon: string;
}

export const WIDGET_CATALOG: WidgetMeta[] = [
  { type: 'welcome_banner', label: 'Bienvenida', description: 'Banner de saludo personalizado con tu nombre', icon: 'Sparkles' },
  { type: 'stats_pills', label: 'Estadísticas', description: 'Resumen rápido de ahorros, recurrentes y metas', icon: 'BarChart3' },
  { type: 'today_section', label: 'Para Hoy', description: 'Tareas, recordatorios y vencimientos del día', icon: 'CalendarDays' },
  { type: 'quick_actions', label: 'Acciones Rápidas', description: 'Accesos directos a crear planes, cuentas y más', icon: 'Zap' },
  { type: 'tool_converter', label: 'USD/BS', description: 'Conversión rápida entre dólares y bolívares', icon: 'ArrowLeftRight' },
  { type: 'tool_invoice', label: 'Importar Factura', description: 'Escanea y registra facturas con OCR', icon: 'Receipt' },
  { type: 'tool_shopping', label: 'Listas de Compra', description: 'Crea listas inteligentes con presupuesto', icon: 'ShoppingCart' },
  { type: 'tool_ai', label: 'Asistente IA', description: 'Consulta tus finanzas con inteligencia artificial', icon: 'Bot' },
  { type: 'monthly_summary', label: 'Resumen del Mes', description: 'Ingresos, gastos y balance mensual', icon: 'Wallet' },
  { type: 'accounts', label: 'Mis Cuentas', description: 'Tus cuentas favoritas con saldos', icon: 'CreditCard' },
  { type: 'recent_transactions', label: 'Últimos Movimientos', description: 'Las transacciones más recientes', icon: 'Banknote' },
  { type: 'quick_transfer', label: 'Transferencia Rápida', description: 'Transfiere entre tus cuentas al instante', icon: 'Send' },
  { type: 'active_plans', label: 'Planes Activos', description: 'Seguimiento de tus planes y metas', icon: 'Target' },
  { type: 'upcoming_deadlines', label: 'Próximos Vencimientos', description: 'Alertas de fechas límite próximas', icon: 'Clock' },
  { type: 'exchange_rates', label: 'Tasas de Cambio', description: 'Tasas de divisas y criptomonedas', icon: 'TrendingUp' },
  { type: 'financial_chart', label: 'Rendimiento Financiero', description: 'Gráfico de tu rendimiento financiero', icon: 'BarChart3' },
  { type: 'currency_converter', label: 'Conversor de Monedas', description: 'Convierte entre divisas con tasas oficial y P2P', icon: 'ArrowLeftRight' },
];

export function getWidgetMeta(type: WidgetType): WidgetMeta {
  return WIDGET_CATALOG.find(w => w.type === type) || WIDGET_CATALOG[0];
}
