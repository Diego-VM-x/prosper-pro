'use client';

import React from 'react';
import type { WidgetSize } from '@/types';

interface SizeSelectorProps {
  value: WidgetSize;
  onChange: (size: WidgetSize) => void;
}

const SIZES: { value: WidgetSize; label: string; cols: number }[] = [
  { value: 'small', label: 'Pequeño', cols: 1 },
  { value: 'medium', label: 'Mediano', cols: 2 },
  { value: 'large', label: 'Grande', cols: 3 },
];

export function SizeSelector({ value, onChange }: SizeSelectorProps) {
  return (
    <div className="size-selector">
      {SIZES.map(({ value: size, label, cols }) => (
        <button
          key={size}
          type="button"
          className={`size-selector-btn ${value === size ? 'active' : ''}`}
          onClick={() => onChange(size)}
          title={`${label} (${cols} columna${cols > 1 ? 's' : ''})`}
        >
          <span className="size-selector-grid">
            {Array.from({ length: cols }).map((_, i) => (
              <span key={i} className="size-selector-cell" />
            ))}
          </span>
          <span className="size-selector-label">{label}</span>
        </button>
      ))}
    </div>
  );
}
