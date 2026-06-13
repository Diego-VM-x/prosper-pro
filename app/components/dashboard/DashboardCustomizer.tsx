'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardLayout } from '@/lib/contexts/DashboardLayoutContext';
import { IconPicker } from './IconPicker';
import { SizeSelector } from './SizeSelector';
import { WIDGET_CATALOG, getWidgetMeta } from './widgetMeta';
import { InlineIcon, getLucideIcon } from '@/app/components/IconMap';
import type { WidgetSize, WidgetType, DashboardWidgetConfig, WidgetCategory } from '@/types';
import { ArrowUp, ArrowDown, Trash2, Plus, Settings, LayoutGrid, Puzzle, ArrowLeft, X, ArrowRight, Lock } from 'lucide-react';
import { CustomSelect } from '@/app/components/CustomSelect';
import { useRouter } from 'next/navigation';

type TabKey = 'categories' | 'catalog' | 'widgets';

const WELCOME_WIDGET_ID = 'w_welcome';
const UNGROUPED_CATEGORY_ID = 'ungrouped';

export function DashboardCustomizer() {
  const router = useRouter();
  const { t } = useTranslation('dashboard');
  const {
    layout,
    addCategory, updateCategory, removeCategory, moveCategory,
    addWidget, updateWidget, removeWidget, moveWidget, changeWidgetCategory,
    resetToDefault,
  } = useDashboardLayout();

  const [activeTab, setActiveTab] = useState<TabKey>('widgets');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [newCatForm, setNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('LayoutGrid');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  const [addingWidget, setAddingWidget] = useState<WidgetType | null>(null);
  const [addWidgetCat, setAddWidgetCat] = useState('');
  const [addWidgetSize, setAddWidgetSize] = useState<WidgetSize>('small');

  const handleAddCategory = useCallback(() => {
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim(), newCatIcon);
    setNewCatName('');
    setNewCatIcon('LayoutGrid');
    setNewCatForm(false);
  }, [newCatName, newCatIcon, addCategory]);

  const handleStartAddWidget = useCallback((type: WidgetType) => {
    setAddingWidget(type);
    // Default to ungrouped if available, otherwise first category
    setAddWidgetCat(UNGROUPED_CATEGORY_ID);
    setAddWidgetSize('small');
  }, []);

  const handleConfirmAddWidget = useCallback(() => {
    if (!addingWidget || !addWidgetCat) return;
    const meta = getWidgetMeta(addingWidget);
    addWidget({
      categoryId: addWidgetCat === UNGROUPED_CATEGORY_ID ? '' : addWidgetCat,
      type: addingWidget,
      title: meta.label,
      size: addWidgetSize,
    });
    setAddingWidget(null);
  }, [addingWidget, addWidgetCat, addWidgetSize, addWidget]);

  const sortedCategories = [...layout.categories].sort((a, b) => a.order - b.order);

  // Separate ungrouped widgets (empty categoryId)
  const ungroupedWidgets = layout.widgets
    .filter(w => !w.categoryId)
    .sort((a, b) => a.order - b.order);

  const isWelcomeWidget = (widget: DashboardWidgetConfig) => widget.type === 'welcome_banner';
  const isFixedWidget = (widget: DashboardWidgetConfig) => isWelcomeWidget(widget);

  return (
    <div className="dashboard-customizer-page">
      {/* Header */}
      <div className="dashboard-customizer-header">
        <div className="dashboard-customizer-header-left">
          <button
            className="dashboard-back-btn"
            onClick={() => router.push('/')}
            title={t('common:buttons.back', { defaultValue: 'Volver' })}
          >
            <ArrowLeft size={18} />
            <span>{t('common:buttons.back', { defaultValue: 'Volver' })}</span>
          </button>
          <h1 className="dashboard-customizer-title">{t('customize.title', { defaultValue: 'Personalizar Dashboard' })}</h1>
        </div>
        <button
          className="btn btn-primary btn-sm dashboard-back-btn-mobile"
          onClick={() => router.push('/')}
        >
          <ArrowRight size={14} /> {t('common:buttons.back', { defaultValue: 'Volver' })}
        </button>
      </div>

        {/* Tabs */}
        <div className="customizer-tabs">
          <button className={`customizer-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
            <Settings size={16} /> {t('customize.categories', { defaultValue: 'Categorías' })}
          </button>
          <button className={`customizer-tab ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}>
            <LayoutGrid size={16} /> {t('customize.catalog', { defaultValue: 'Catálogo' })}
          </button>
          <button className={`customizer-tab ${activeTab === 'widgets' ? 'active' : ''}`} onClick={() => setActiveTab('widgets')}>
            <Puzzle size={16} /> {t('customize.myWidgets', { defaultValue: 'Mis Widgets' })}
          </button>
        </div>

        {/* Content */}
        <div className="customizer-body">
          {/* ── TAB: Categorías ── */}
          {activeTab === 'categories' && (
            <div className="customizer-tab-content">
              <div className="customizer-section-header">
                <h3>{t('customize.categories', { defaultValue: 'Categorías' })}</h3>
                {!newCatForm && (
                  <button className="btn btn-primary btn-sm" onClick={() => setNewCatForm(true)}>
                    <Plus size={14} /> {t('customize.newCategory', { defaultValue: 'Nueva' })}
                  </button>
                )}
              </div>

              {newCatForm && (
                <div className="customizer-form">
                  <input
                    className="form-input"
                    placeholder={t('customize.categoryName', { defaultValue: 'Nombre de categoría' })}
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                  <div className="customizer-form-row">
                    <span className="form-label">{t('customize.icon', { defaultValue: 'Icono' })}</span>
                    <IconPicker selected={newCatIcon} onSelect={setNewCatIcon} />
                  </div>
                  <div className="customizer-form-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => { setNewCatForm(false); setNewCatName(''); }}>
                      {t('common:buttons.cancel', { defaultValue: 'Cancelar' })}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleAddCategory} disabled={!newCatName.trim()}>
                      {t('customize.add', { defaultValue: 'Agregar' })}
                    </button>
                  </div>
                </div>
              )}

              <div className="customizer-list">
                {sortedCategories.map((cat, idx) => (
                  <div key={cat.id} className="customizer-list-item">
                    <div className="customizer-list-item-left">
                      <span className="customizer-list-icon">
                        <InlineIcon icon={cat.icon} size={18} />
                      </span>
                      {editingCat === cat.id ? (
                        <input
                          className="form-input"
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          onBlur={() => {
                            if (editCatName.trim()) updateCategory(cat.id, { name: editCatName.trim() });
                            setEditingCat(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editCatName.trim()) updateCategory(cat.id, { name: editCatName.trim() });
                              setEditingCat(null);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="customizer-list-name" onClick={() => { setEditingCat(cat.id); setEditCatName(cat.name); }}>
                          {cat.name}
                        </span>
                      )}
                    </div>
                    <div className="customizer-list-actions">
                      <button className="customizer-list-btn" onClick={() => moveCategory(cat.id, 'up')} disabled={idx === 0} title="Subir">
                        <ArrowUp size={14} />
                      </button>
                      <button className="customizer-list-btn" onClick={() => moveCategory(cat.id, 'down')} disabled={idx === sortedCategories.length - 1} title="Bajar">
                        <ArrowDown size={14} />
                      </button>
                      <button className="customizer-list-btn" onClick={() => { setEditingCat(cat.id); setEditCatName(cat.name); }} title="Editar">
                        <InlineIcon icon="Pencil" size={14} />
                      </button>
                      <button
                        className="customizer-list-btn danger"
                        onClick={() => {
                          const hasWidgets = layout.widgets.some(w => w.categoryId === cat.id);
                          if (hasWidgets) {
                            if (confirm(t('customize.deleteCategoryConfirm', { defaultValue: 'Esta categoría tiene widgets. ¿Eliminar de todos modos?' }))) {
                              removeCategory(cat.id);
                            }
                          } else {
                            removeCategory(cat.id);
                          }
                        }}
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: Catálogo ── */}
          {activeTab === 'catalog' && (
            <div className="customizer-tab-content">
              <h3>{t('customize.catalog', { defaultValue: 'Catálogo de Widgets' })}</h3>
              <p className="customizer-desc">{t('customize.catalogDesc', { defaultValue: 'Haz clic en un widget para agregarlo a tu dashboard.' })}</p>
              <div className="widget-catalog-grid">
                {WIDGET_CATALOG.map(meta => {
                  const isAdded = layout.widgets.some(w => w.type === meta.type);
                  const Icon = getLucideIcon(meta.icon);
                  return (
                    <button
                      key={meta.type}
                      className={`widget-catalog-card ${isAdded ? 'added' : ''}`}
                      onClick={() => !isAdded && handleStartAddWidget(meta.type)}
                      disabled={isAdded}
                    >
                      <span className="widget-catalog-icon">
                        <Icon size={24} />
                      </span>
                      <span className="widget-catalog-name">{meta.label}</span>
                      <span className="widget-catalog-desc">{meta.description}</span>
                      {isAdded && (
                        <span className="widget-catalog-badge">{t('customize.added', { defaultValue: 'Agregado' })}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB: Mis Widgets ── */}
          {activeTab === 'widgets' && (
            <div className="customizer-tab-content">
              <div className="customizer-section-header">
                <h3>{t('customize.myWidgets', { defaultValue: 'Mis Widgets' })}</h3>
                <button className="btn btn-outline btn-sm" onClick={resetToDefault}>
                  {t('customize.reset', { defaultValue: 'Restaurar' })}
                </button>
              </div>

              {/* Ungrouped widgets section */}
              <div className="customizer-ungrouped-section">
                <h4 className="customizer-ungrouped-section-title">
                  <LayoutGrid size={16} /> {t('customize.ungrouped', { defaultValue: 'Sin Grupo' })}
                </h4>
                <div className="customizer-widget-list">
                  {ungroupedWidgets.length === 0 && (
                    <p className="customizer-ungrouped-section-empty">
                      {t('customize.noUngrouped', { defaultValue: 'No hay widgets sin grupo' })}
                    </p>
                  )}
                  {ungroupedWidgets.map((widget, idx) => (
                    <div
                      key={widget.id}
                      className={`customizer-widget-item ${isFixedWidget(widget) ? 'fixed-widget' : ''}`}
                    >
                      <div className="customizer-widget-item-left">
                        <span className="customizer-widget-item-icon">
                          <InlineIcon icon={getWidgetMeta(widget.type).icon} size={16} />
                        </span>
                        <input
                          className="customizer-widget-item-title"
                          value={widget.title}
                          onChange={(e) => !isFixedWidget(widget) && updateWidget(widget.id, { title: e.target.value })}
                          readOnly={isFixedWidget(widget)}
                        />
                      </div>
                      <div className="customizer-widget-item-controls">
                        <SizeSelector
                          value={widget.size}
                          onChange={(size) => updateWidget(widget.id, { size })}
                        />
                        <CustomSelect
                          value={widget.categoryId || UNGROUPED_CATEGORY_ID}
                          onChange={(val) => {
                            const newCat = val === UNGROUPED_CATEGORY_ID ? '' : val;
                            if (!isFixedWidget(widget)) {
                              changeWidgetCategory(widget.id, newCat);
                            }
                          }}
                          options={[
                            { value: UNGROUPED_CATEGORY_ID, label: t('customize.ungrouped', { defaultValue: 'Sin Grupo' }) },
                            ...sortedCategories.map(c => ({ value: c.id, label: c.name })),
                          ]}
                          className="widget-category-select"
                        />
                        {!isFixedWidget(widget) && (
                          <>
                            <button className="customizer-list-btn" onClick={() => moveWidget(widget.id, 'up')} disabled={idx === 0} title="Subir">
                              <ArrowUp size={14} />
                            </button>
                            <button className="customizer-list-btn" onClick={() => moveWidget(widget.id, 'down')} disabled={idx === ungroupedWidgets.length - 1} title="Bajar">
                              <ArrowDown size={14} />
                            </button>
                            <button
                              className="customizer-list-btn danger"
                              onClick={() => {
                                if (confirm(t('customize.removeWidgetConfirm', { defaultValue: '¿Eliminar este widget?' }))) {
                                  removeWidget(widget.id);
                                }
                              }}
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {sortedCategories.map(cat => {
                const catWidgets = layout.widgets
                  .filter(w => w.categoryId === cat.id)
                  .sort((a, b) => a.order - b.order);
                if (catWidgets.length === 0) return null;
                return (
                  <div key={cat.id} className="customizer-widget-group">
                    <h4 className="customizer-widget-group-title">
                      <InlineIcon icon={cat.icon} size={16} /> {cat.name}
                    </h4>
                    <div className="customizer-widget-list">
                      {catWidgets.map((widget, idx) => (
                        <div
                          key={widget.id}
                          className={`customizer-widget-item ${isFixedWidget(widget) ? 'fixed-widget' : ''}`}
                        >
                          <div className="customizer-widget-item-left">
                            <span className="customizer-widget-item-icon">
                              <InlineIcon icon={getWidgetMeta(widget.type).icon} size={16} />
                            </span>
                            <input
                              className="customizer-widget-item-title"
                              value={widget.title}
                              onChange={(e) => !isFixedWidget(widget) && updateWidget(widget.id, { title: e.target.value })}
                              readOnly={isFixedWidget(widget)}
                            />
                          </div>
                          <div className="customizer-widget-item-controls">
                            <SizeSelector
                              value={widget.size}
                              onChange={(size) => updateWidget(widget.id, { size })}
                            />
                            <CustomSelect
                              value={widget.categoryId || UNGROUPED_CATEGORY_ID}
                              onChange={(val) => {
                                const newCat = val === UNGROUPED_CATEGORY_ID ? '' : val;
                                if (!isFixedWidget(widget)) {
                                  changeWidgetCategory(widget.id, newCat);
                                }
                              }}
                              options={[
                                { value: UNGROUPED_CATEGORY_ID, label: t('customize.ungrouped', { defaultValue: 'Sin Grupo' }) },
                                ...sortedCategories.map(c => ({ value: c.id, label: c.name })),
                              ]}
                              className="widget-category-select"
                            />
                            {!isFixedWidget(widget) && (
                              <>
                                <button className="customizer-list-btn" onClick={() => moveWidget(widget.id, 'up')} disabled={idx === 0} title="Subir">
                                  <ArrowUp size={14} />
                                </button>
                                <button className="customizer-list-btn" onClick={() => moveWidget(widget.id, 'down')} disabled={idx === catWidgets.length - 1} title="Bajar">
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  className="customizer-list-btn danger"
                                  onClick={() => {
                                    if (confirm(t('customize.removeWidgetConfirm', { defaultValue: '¿Eliminar este widget?' }))) {
                                      removeWidget(widget.id);
                                    }
                                  }}
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add widget confirmation (from catalog) */}
        {addingWidget && (
          <div className="modal-overlay" onClick={() => setAddingWidget(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="modal-header">
                <h3 className="modal-title">{t('customize.addWidget', { defaultValue: 'Agregar Widget' })}</h3>
                <button className="modal-close" onClick={() => setAddingWidget(null)}><X size={20} /></button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <InlineIcon icon={getWidgetMeta(addingWidget).icon} size={24} />
                  <span style={{ fontWeight: 600 }}>{getWidgetMeta(addingWidget).label}</span>
                </div>
                <label className="form-label">{t('customize.category', { defaultValue: 'Categoría' })}</label>
                <div style={{ marginBottom: 12 }}>
                  <CustomSelect
                    value={addWidgetCat}
                    onChange={setAddWidgetCat}
                    options={[
                      { value: UNGROUPED_CATEGORY_ID, label: t('customize.ungrouped', { defaultValue: 'Sin Grupo' }) },
                      ...sortedCategories.map(c => ({ value: c.id, label: c.name })),
                    ]}
                    className="widget-category-select"
                  />
                </div>
                <label className="form-label">{t('customize.size', { defaultValue: 'Tamaño' })}</label>
                <SizeSelector value={addWidgetSize} onChange={setAddWidgetSize} />
                {addWidgetSize === 'large' && (
                  <p className="size-warning-text">
                    {t('customize.largeSizeWarning', { defaultValue: 'El tamaño Grande ocupa 3 columnas y no se verá correctamente en pantallas de celular.' })}
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline btn-sm" onClick={() => setAddingWidget(null)}>
            {t('common:buttons.cancel', { defaultValue: 'Cancelar' })}
          </button>
                <button className="btn btn-primary btn-sm" onClick={handleConfirmAddWidget}>
                  {t('customize.add', { defaultValue: 'Agregar' })}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
