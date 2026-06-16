import type { WidgetType } from '@/types';

export interface WidgetMeta {
  type: WidgetType;
  label: string;
  description: string;
  icon: string;
}

export const WIDGET_CATALOG: WidgetMeta[] = [
  { type: 'welcome_banner', label: 'widgets.welcomeBanner.label', description: 'widgets.welcomeBanner.description', icon: 'Sparkles' },
  { type: 'stats_pills', label: 'widgets.statsPills.label', description: 'widgets.statsPills.description', icon: 'BarChart3' },
  { type: 'today_section', label: 'widgets.todaySection.label', description: 'widgets.todaySection.description', icon: 'CalendarDays' },
  { type: 'quick_actions', label: 'widgets.quickActions.label', description: 'widgets.quickActions.description', icon: 'Zap' },
  { type: 'tool_invoice', label: 'widgets.toolInvoice.label', description: 'widgets.toolInvoice.description', icon: 'Receipt' },
  { type: 'tool_shopping', label: 'widgets.toolShopping.label', description: 'widgets.toolShopping.description', icon: 'ShoppingCart' },
  { type: 'tool_ai', label: 'widgets.toolAi.label', description: 'widgets.toolAi.description', icon: 'Bot' },
  { type: 'monthly_summary', label: 'widgets.monthlySummary.label', description: 'widgets.monthlySummary.description', icon: 'Wallet' },
  { type: 'accounts', label: 'widgets.accounts.label', description: 'widgets.accounts.description', icon: 'CreditCard' },
  { type: 'recent_transactions', label: 'widgets.recentTransactions.label', description: 'widgets.recentTransactions.description', icon: 'Banknote' },
  { type: 'quick_transfer', label: 'widgets.quickTransfer.label', description: 'widgets.quickTransfer.description', icon: 'Send' },
  { type: 'active_plans', label: 'widgets.activePlans.label', description: 'widgets.activePlans.description', icon: 'Target' },
  { type: 'upcoming_deadlines', label: 'widgets.upcomingDeadlines.label', description: 'widgets.upcomingDeadlines.description', icon: 'Clock' },
  { type: 'exchange_rates', label: 'widgets.exchangeRates.label', description: 'widgets.exchangeRates.description', icon: 'TrendingUp' },
  { type: 'financial_chart', label: 'widgets.financialChart.label', description: 'widgets.financialChart.description', icon: 'BarChart3' },
  { type: 'currency_converter', label: 'widgets.currencyConverter.label', description: 'widgets.currencyConverter.description', icon: 'ArrowLeftRight' },
];

export function getWidgetMeta(type: WidgetType): WidgetMeta {
  return WIDGET_CATALOG.find(w => w.type === type) || WIDGET_CATALOG[0];
}
