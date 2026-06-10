'use client';

import React, { useState, useMemo } from 'react';
import { NAMED_ICONS, getLucideIcon } from '@/app/components/IconMap';

const ICON_NAMES = Object.keys(NAMED_ICONS).sort();

interface IconPickerProps {
  selected: string;
  onSelect: (iconName: string) => void;
}

export function IconPicker({ selected, onSelect }: IconPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return ICON_NAMES;
    const q = search.toLowerCase();
    return ICON_NAMES.filter(name => name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="icon-picker">
      <input
        type="text"
        className="form-input"
        placeholder="Buscar icono..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div className="icon-picker-grid">
        {filtered.map(name => {
          const Icon = getLucideIcon(name);
          const isSelected = selected === name;
          return (
            <button
              key={name}
              type="button"
              className={`icon-picker-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(name)}
              title={name}
            >
              <Icon size={20} strokeWidth={2} />
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          No se encontraron iconos
        </p>
      )}
    </div>
  );
}
