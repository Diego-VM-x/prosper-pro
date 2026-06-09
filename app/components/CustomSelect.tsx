'use client';

import React, { useState, useRef, useEffect } from 'react';

interface CustomSelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  allowCustom?: boolean;
  onAddCustom?: (value: string, label: string) => void;
  customPlaceholder?: string;
  className?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  allowCustom = false,
  onAddCustom,
  customPlaceholder = 'Nombre personalizado',
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomInput(false);
        setCustomValue('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  const handleSelect = (optionValue: string) => {
    if (optionValue === '__custom__') {
      setShowCustomInput(true);
    } else {
      onChange(optionValue);
      setIsOpen(false);
      setShowCustomInput(false);
      setCustomValue('');
    }
  };

  const handleAddCustom = () => {
    if (!customValue.trim()) return;
    const normalizedValue = customValue.trim().toLowerCase().replace(/\s+/g, '-');
    if (onAddCustom) {
      onAddCustom(normalizedValue, customValue.trim());
    }
    onChange(normalizedValue);
    setShowCustomInput(false);
    setCustomValue('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddCustom();
    if (e.key === 'Escape') {
      setShowCustomInput(false);
      setCustomValue('');
    }
  };

  return (
    <div className={`custom-select-wrapper ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => { setIsOpen(!isOpen); setShowCustomInput(false); }}
      >
        <span className={`custom-select-value ${!selectedOption ? 'placeholder' : ''}`}>
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="custom-select-icon">{selectedOption.icon}</span>}
              {selectedOption.label}
            </>
          ) : (
            placeholder
          )}
        </span>
        <svg className={`custom-select-arrow ${isOpen ? 'rotated' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div className="custom-select-dropdown">
          {showCustomInput ? (
            <div className="custom-select-custom-input">
              <input
                ref={customInputRef}
                type="text"
                className="custom-input-field"
                placeholder={customPlaceholder}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="custom-input-actions">
                <button className="custom-btn-cancel" onClick={() => { setShowCustomInput(false); setCustomValue(''); }}>
                  ✕
                </button>
                <button className={`custom-btn-add ${!customValue.trim() ? 'disabled' : ''}`} onClick={handleAddCustom} disabled={!customValue.trim()}>
                  ✓ Añadir
                </button>
              </div>
            </div>
          ) : (
            <>
              {options.map((option) => (
                <button
                  key={option.value}
                  className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.icon && <span className="custom-select-icon">{option.icon}</span>}
                  {option.label}
                  {value === option.value && <span className="custom-select-check">✓</span>}
                </button>
              ))}
              {allowCustom && (
                <button
                  className="custom-select-option custom-select-add-new"
                  onClick={() => handleSelect('__custom__')}
                >
                  <span className="custom-select-icon">+</span>
                  Añadir personalizado...
                </button>
              )}
            </>
          )}
        </div>
      )}

      <style>{`
        .custom-select-wrapper { position: relative; }
        .custom-select-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-default);
          background: var(--bg-input);
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          outline: none;
          box-sizing: border-box;
        }
        .custom-select-trigger:hover { border-color: var(--color-prosper-green); }
        .custom-select-trigger.open { border-color: var(--color-prosper-green); box-shadow: 0 0 0 3px rgba(61,204,142,0.15); }
        .custom-select-value { display: flex; align-items: center; gap: 8px; flex: 1; }
        .custom-select-value.placeholder { color: var(--text-tertiary); }
        .custom-select-icon { font-size: 1rem; }
        .custom-select-arrow {
          color: var(--text-secondary);
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        .custom-select-arrow.rotated { transform: rotate(180deg); }

        .custom-select-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          z-index: 10000;
          background: #ffffff;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          max-height: 240px;
          overflow-y: auto;
          animation: dropdownFadeIn 0.15s ease;
        }
        [data-theme="dark"] .custom-select-dropdown {
          background: #0a1628;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        }
        [data-theme="amoled"] .custom-select-dropdown {
          background: #0a0a0a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.9);
        }
        @media (max-width: 768px) {
          .custom-select-dropdown { position: fixed; top: auto; bottom: 0; left: 0; right: 0; max-height: 60dvh; border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
        }

        .custom-select-option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border: none;
          background: transparent;
          color: var(--text-primary);
          font-size: 0.875rem;
          text-align: left;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .custom-select-option:hover { background: var(--bg-input); }
        .custom-select-option.selected { background: rgba(61,204,142,0.1); color: var(--color-prosper-green); font-weight: 600; }
        .custom-select-check { margin-left: auto; color: var(--color-prosper-green); font-weight: 700; }

        .custom-select-add-new {
          border-top: 1px solid var(--border-default);
          color: var(--color-prosper-green);
          font-weight: 600;
        }
        .custom-select-add-new:hover { background: rgba(61,204,142,0.08) !important; }

        .custom-select-custom-input {
          padding: 12px;
        }
        .custom-input-field {
          width: 100%;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-default);
          background: var(--bg-input);
          color: var(--text-primary);
          font-size: 0.875rem;
          outline: none;
          box-sizing: border-box;
          margin-bottom: 8px;
        }
        .custom-input-field:focus { border-color: var(--color-prosper-green); }
        .custom-input-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .custom-btn-cancel,
        .custom-btn-add {
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all var(--transition-fast);
        }
        .custom-btn-cancel {
          background: var(--bg-input);
          color: var(--text-secondary);
        }
        .custom-btn-cancel:hover { background: var(--border-default); }
        .custom-btn-add {
          background: var(--color-prosper-green);
          color: white;
        }
        .custom-btn-add:hover { filter: brightness(1.1); }
        .custom-btn-add.disabled { opacity: 0.5; cursor: not-allowed; }

        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
