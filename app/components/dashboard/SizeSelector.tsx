'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WidgetSize } from '@/types';

interface SizeSelectorProps {
  value: WidgetSize;
  onChange: (size: WidgetSize) => void;
}

export function SizeSelector({ value, onChange }: SizeSelectorProps) {
  const { t } = useTranslation('dashboard');
  const SIZES: { value: WidgetSize; key: string; cols: number; mobileWarning?: boolean }[] = [
    { value: 'small', key: 'small', cols: 1 },
    { value: 'medium', key: 'medium', cols: 2 },
    { value: 'large', key: 'large', cols: 3, mobileWarning: true },
  ];

  return (
    <div className="size-selector">
      {SIZES.map(({ value: size, key, cols, mobileWarning }) => {
        const label = t(`customize.widgetSize.${key}`);
        return (
          <button
            key={size}
            type="button"
            className={`size-selector-btn ${value === size ? 'active' : ''} ${mobileWarning ? 'mobile-warning' : ''}`}
            onClick={() => onChange(size)}
            title={`${label} (${t('customize.widgetSize.columns', { count: cols })})${mobileWarning ? ` — ${t('customize.largeSizeWarning')}` : ''}`}
          >
            <span className="size-selector-grid">
              {Array.from({ length: cols }).map((_, i) => (
                <span key={i} className="size-selector-cell" />
              ))}
            </span>
            <span className="size-selector-label">{label}</span>
            {mobileWarning && <span className="size-selector-warning">📱</span>}
          </button>
        );
      })}
    </div>
  );
}
