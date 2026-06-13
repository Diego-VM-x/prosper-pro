'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { DashboardLayout, DashboardLayouts, DashboardBreakpoint, WidgetCategory, DashboardWidgetConfig } from '@/types';
import { getDashboardLayouts, updateDashboardLayouts } from '@/lib/firestore/users';
import { safeLocalStorage } from '@/lib/utils/safeStorage';
import { useAuth } from './AuthContext';

const LS_KEY = 'prosper_dashboard_layouts';
const LEGACY_LS_KEY = 'prosper_dashboard_layout';

export const DEFAULT_LAYOUT: DashboardLayout = {
  categories: [
    { id: 'cat_acciones', name: 'Acciones', icon: 'Zap', order: 0 },
    { id: 'cat_finanzas', name: 'Finanzas', icon: 'Wallet', order: 1 },
    { id: 'cat_metas', name: 'Metas', icon: 'Target', order: 2 },
    { id: 'cat_mercado', name: 'Mercado', icon: 'TrendingUp', order: 3 },
  ],
  widgets: [
    { id: 'w_welcome', categoryId: 'cat_acciones', type: 'welcome_banner', title: 'Bienvenido', size: 'large', order: 0 },
    { id: 'w_stats', categoryId: 'cat_acciones', type: 'stats_pills', title: 'Estadísticas', size: 'large', order: 1 },
    { id: 'w_today', categoryId: 'cat_acciones', type: 'today_section', title: 'Hoy', size: 'large', order: 2 },
    { id: 'w_quick', categoryId: 'cat_acciones', type: 'quick_actions', title: 'Acciones Rápidas', size: 'small', order: 3 },
    { id: 'w_tool_conv', categoryId: 'cat_acciones', type: 'tool_converter', title: 'USD/BS', size: 'small', order: 4 },
    { id: 'w_tool_inv', categoryId: 'cat_acciones', type: 'tool_invoice', title: 'Importar Factura', size: 'small', order: 5 },
    { id: 'w_tool_shop', categoryId: 'cat_acciones', type: 'tool_shopping', title: 'Listas de Compra', size: 'small', order: 6 },
    { id: 'w_tool_ai', categoryId: 'cat_acciones', type: 'tool_ai', title: 'Asistente IA', size: 'small', order: 7 },
    { id: 'w_summary', categoryId: 'cat_finanzas', type: 'monthly_summary', title: 'Resumen del Mes', size: 'small', order: 0 },
    { id: 'w_accounts', categoryId: 'cat_finanzas', type: 'accounts', title: 'Mis Cuentas', size: 'medium', order: 1 },
    { id: 'w_tx', categoryId: 'cat_finanzas', type: 'recent_transactions', title: 'Últimos Movimientos', size: 'small', order: 2 },
    { id: 'w_transfer', categoryId: 'cat_finanzas', type: 'quick_transfer', title: 'Transferencia Rápida', size: 'small', order: 3 },
    { id: 'w_plans', categoryId: 'cat_metas', type: 'active_plans', title: 'Planes Activos', size: 'small', order: 0 },
    { id: 'w_deadlines', categoryId: 'cat_metas', type: 'upcoming_deadlines', title: 'Próximos Vencimientos', size: 'small', order: 1 },
    { id: 'w_rates', categoryId: 'cat_mercado', type: 'exchange_rates', title: 'Tasas de Cambio', size: 'small', order: 0 },
    { id: 'w_chart', categoryId: 'cat_mercado', type: 'financial_chart', title: 'Rendimiento Financiero', size: 'medium', order: 1 },
  ],
};

export const DEFAULT_LAYOUTS: DashboardLayouts = {
  desktop: DEFAULT_LAYOUT,
  mobile: DEFAULT_LAYOUT,
};

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function isDashboardLayout(obj: unknown): obj is DashboardLayout {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray((obj as DashboardLayout).categories) &&
    Array.isArray((obj as DashboardLayout).widgets)
  );
}

function isDashboardLayouts(obj: unknown): obj is DashboardLayouts {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isDashboardLayout((obj as DashboardLayouts).desktop) &&
    isDashboardLayout((obj as DashboardLayouts).mobile)
  );
}

function migrateFromLegacy(layout: unknown): DashboardLayouts | null {
  if (isDashboardLayout(layout)) {
    return { desktop: layout, mobile: layout };
  }
  return null;
}

function ensureWelcomeWidget(layout: DashboardLayout): DashboardLayout {
  const hasWelcome = layout.widgets.some(w => w.type === 'welcome_banner');
  if (hasWelcome) return layout;
  const welcomeWidget: DashboardWidgetConfig = {
    id: generateId('w'),
    categoryId: layout.categories[0]?.id || '',
    type: 'welcome_banner',
    title: 'Bienvenido',
    size: 'large',
    order: -1,
  };
  return {
    ...layout,
    widgets: [welcomeWidget, ...layout.widgets],
  };
}

interface DashboardLayoutContextValue {
  layout: DashboardLayout;
  layouts: DashboardLayouts;
  breakpoint: DashboardBreakpoint;
  editingBreakpoint: DashboardBreakpoint | null;
  setEditingBreakpoint: (bp: DashboardBreakpoint | null) => void;
  isLoading: boolean;
  // Categories
  addCategory: (name: string, icon: string) => void;
  updateCategory: (id: string, updates: Partial<WidgetCategory>) => void;
  removeCategory: (id: string) => void;
  moveCategory: (id: string, direction: 'up' | 'down') => void;
  // Widgets
  addWidget: (widget: Omit<DashboardWidgetConfig, 'id' | 'order'>) => void;
  updateWidget: (id: string, updates: Partial<DashboardWidgetConfig>) => void;
  removeWidget: (id: string) => void;
  moveWidget: (id: string, direction: 'up' | 'down') => void;
  changeWidgetCategory: (widgetId: string, newCategoryId: string) => void;
  // Reset
  resetToDefault: () => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

export function useDashboardLayout() {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) throw new Error('useDashboardLayout must be used within DashboardLayoutProvider');
  return ctx;
}

export function DashboardLayoutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [layouts, setLayouts] = useState<DashboardLayouts>(DEFAULT_LAYOUTS);
  const [breakpoint, setBreakpoint] = useState<DashboardBreakpoint>('desktop');
  const [editingBreakpoint, setEditingBreakpoint] = useState<DashboardBreakpoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeBreakpoint = editingBreakpoint ?? breakpoint;

  // Detect real breakpoint
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 769px)');
    const update = () => setBreakpoint(mq.matches ? 'desktop' : 'mobile');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Load layouts on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        // Try Firestore first
        if (user?.uid) {
          const firestoreLayouts = await getDashboardLayouts(user.uid);
          if (firestoreLayouts && isDashboardLayouts(firestoreLayouts)) {
            const ensured = {
              desktop: ensureWelcomeWidget(firestoreLayouts.desktop),
              mobile: ensureWelcomeWidget(firestoreLayouts.mobile),
            };
            if (!cancelled) {
              setLayouts(ensured);
              safeLocalStorage.setItem(LS_KEY, JSON.stringify(ensured));
            }
            setIsLoading(false);
            return;
          }
        }
        // Try new localStorage key
        const saved = safeLocalStorage.getItem(LS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (isDashboardLayouts(parsed)) {
            const ensured = {
              desktop: ensureWelcomeWidget(parsed.desktop),
              mobile: ensureWelcomeWidget(parsed.mobile),
            };
            if (!cancelled) {
              setLayouts(ensured);
            }
            setIsLoading(false);
            return;
          }
        }
        // Migrate from legacy single layout
        const legacy = safeLocalStorage.getItem(LEGACY_LS_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          const migrated = migrateFromLegacy(parsed);
          if (migrated) {
            const ensured = {
              desktop: ensureWelcomeWidget(migrated.desktop),
              mobile: ensureWelcomeWidget(migrated.mobile),
            };
            if (!cancelled) {
              setLayouts(ensured);
              safeLocalStorage.setItem(LS_KEY, JSON.stringify(ensured));
              safeLocalStorage.removeItem(LEGACY_LS_KEY);
            }
            setIsLoading(false);
            return;
          }
        }
        // Fallback to default
        if (!cancelled) setLayouts(DEFAULT_LAYOUTS);
      } catch (e) {
        console.error('Error loading dashboard layouts:', e);
        if (!cancelled) setLayouts(DEFAULT_LAYOUTS);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.uid]);

  // Persist layout changes
  const persist = useCallback((nextLayouts: DashboardLayouts) => {
    safeLocalStorage.setItem(LS_KEY, JSON.stringify(nextLayouts));
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (user?.uid) {
        try {
          await updateDashboardLayouts(user.uid, nextLayouts);
        } catch (e) {
          console.error('Error saving dashboard layouts:', e);
        }
      }
    }, 1500);
  }, [user?.uid]);

  const setLayoutsAndPersist = useCallback((updater: (prev: DashboardLayouts) => DashboardLayouts) => {
    setLayouts(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const updateActiveLayout = useCallback((updater: (prev: DashboardLayout) => DashboardLayout) => {
    setLayoutsAndPersist(prev => ({
      ...prev,
      [activeBreakpoint]: ensureWelcomeWidget(updater(prev[activeBreakpoint])),
    }));
  }, [activeBreakpoint, setLayoutsAndPersist]);

  // ── Categories ──
  const addCategory = useCallback((name: string, icon: string) => {
    updateActiveLayout(prev => {
      const newCat: WidgetCategory = {
        id: generateId('cat'),
        name,
        icon,
        order: prev.categories.length,
      };
      return { ...prev, categories: [...prev.categories, newCat] };
    });
  }, [updateActiveLayout]);

  const updateCategory = useCallback((id: string, updates: Partial<WidgetCategory>) => {
    updateActiveLayout(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }, [updateActiveLayout]);

  const removeCategory = useCallback((id: string) => {
    updateActiveLayout(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id),
      widgets: prev.widgets.filter(w => w.categoryId !== id),
    }));
  }, [updateActiveLayout]);

  const moveCategory = useCallback((id: string, direction: 'up' | 'down') => {
    updateActiveLayout(prev => {
      const cats = [...prev.categories].sort((a, b) => a.order - b.order);
      const idx = cats.findIndex(c => c.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= cats.length) return prev;
      [cats[idx], cats[newIdx]] = [cats[newIdx], cats[idx]];
      return {
        ...prev,
        categories: cats.map((c, i) => ({ ...c, order: i })),
      };
    });
  }, [updateActiveLayout]);

  // ── Widgets ──
  const addWidget = useCallback((widget: Omit<DashboardWidgetConfig, 'id' | 'order'>) => {
    updateActiveLayout(prev => {
      const catWidgets = prev.widgets.filter(w => w.categoryId === widget.categoryId);
      const newWidget: DashboardWidgetConfig = {
        ...widget,
        id: generateId('w'),
        order: catWidgets.length,
      };
      return { ...prev, widgets: [...prev.widgets, newWidget] };
    });
  }, [updateActiveLayout]);

  const updateWidget = useCallback((id: string, updates: Partial<DashboardWidgetConfig>) => {
    updateActiveLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => w.id === id ? { ...w, ...updates } : w),
    }));
  }, [updateActiveLayout]);

  const removeWidget = useCallback((id: string) => {
    updateActiveLayout(prev => {
      const widget = prev.widgets.find(w => w.id === id);
      // Prevent removing the welcome banner widget
      if (widget?.type === 'welcome_banner') return prev;
      return {
        ...prev,
        widgets: prev.widgets.filter(w => w.id !== id),
      };
    });
  }, [updateActiveLayout]);

  const moveWidget = useCallback((id: string, direction: 'up' | 'down') => {
    updateActiveLayout(prev => {
      const widget = prev.widgets.find(w => w.id === id);
      if (!widget) return prev;
      const catWidgets = prev.widgets
        .filter(w => w.categoryId === widget.categoryId)
        .sort((a, b) => a.order - b.order);
      const idx = catWidgets.findIndex(w => w.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= catWidgets.length) return prev;
      [catWidgets[idx], catWidgets[newIdx]] = [catWidgets[newIdx], catWidgets[idx]];
      const reordered = catWidgets.map((w, i) => ({ ...w, order: i }));
      const otherWidgets = prev.widgets.filter(w => w.categoryId !== widget.categoryId);
      return { ...prev, widgets: [...otherWidgets, ...reordered] };
    });
  }, [updateActiveLayout]);

  const changeWidgetCategory = useCallback((widgetId: string, newCategoryId: string) => {
    updateActiveLayout(prev => {
      const widget = prev.widgets.find(w => w.id === widgetId);
      if (!widget) return prev;
      // Prevent moving welcome banner out of its category
      if (widget.type === 'welcome_banner') return prev;
      const newCatWidgets = prev.widgets.filter(w => w.categoryId === newCategoryId);
      return {
        ...prev,
        widgets: prev.widgets.map(w =>
          w.id === widgetId
            ? { ...w, categoryId: newCategoryId, order: newCatWidgets.length }
            : w
        ),
      };
    });
  }, [updateActiveLayout]);

  const resetToDefault = useCallback(() => {
    setLayoutsAndPersist(prev => ({
      ...prev,
      [activeBreakpoint]: DEFAULT_LAYOUT,
    }));
  }, [activeBreakpoint, setLayoutsAndPersist]);

  const currentLayout = layouts[activeBreakpoint];

  const value = React.useMemo(() => ({
    layout: currentLayout,
    layouts,
    breakpoint,
    editingBreakpoint,
    setEditingBreakpoint,
    isLoading,
    addCategory, updateCategory, removeCategory, moveCategory,
    addWidget, updateWidget, removeWidget, moveWidget, changeWidgetCategory,
    resetToDefault,
  }), [currentLayout, layouts, breakpoint, editingBreakpoint, isLoading, addCategory, updateCategory, removeCategory, moveCategory, addWidget, updateWidget, removeWidget, moveWidget, changeWidgetCategory, resetToDefault]);

  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}
