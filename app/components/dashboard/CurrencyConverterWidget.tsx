'use client';

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { CustomSelect } from '@/app/components/CustomSelect';
import { CurrencyFlag } from '@/app/components/CryptoIcons';
import { convertCurrency, CURRENCY_MAP } from '@/lib/currency';
import type { CurrencyCode } from '@/types';
import { Repeat } from 'lucide-react';

const CONVERTER_CURRENCIES: CurrencyCode[] = ['USD', 'BS', 'EUR', 'USDT', 'SOL', 'BTC', 'ETH', 'USDC', 'COP'];

interface CurrencyConverterWidgetProps {
  title?: string;
  className?: string;
}

export function CurrencyConverterWidget({ title, className = '' }: CurrencyConverterWidgetProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const { rates, p2pMode, setP2pMode, displayCurrency } = useCurrency();

  const [amount, setAmount] = useState<string>('100');
  const [from, setFrom] = useState<CurrencyCode>('USD');
  const [to, setTo] = useState<CurrencyCode>('BS');

  const effectiveRates = useMemo(() => {
    const base = rates?.rates || CURRENCY_MAP;
    if (!p2pMode) return base;
    const p2p = rates?.p2pRates || {};
    const merged: Record<CurrencyCode, number> = { ...base };
    (Object.keys(p2p) as CurrencyCode[]).forEach((code) => {
      if (p2p[code] && p2p[code] > 0) {
        merged[code] = p2p[code];
      }
    });
    return merged;
  }, [rates, p2pMode]);

  const numericAmount = useMemo(() => {
    const n = Number(amount);
    return isNaN(n) ? 0 : n;
  }, [amount]);

  const converted = useMemo(() => {
    return convertCurrency(numericAmount, from, to, effectiveRates);
  }, [numericAmount, from, to, effectiveRates]);

  const rateUsed = useMemo(() => {
    if (from === to) return 1;
    return convertCurrency(1, from, to, effectiveRates);
  }, [from, to, effectiveRates]);

  const currencyOptions = CONVERTER_CURRENCIES.map((code) => ({
    value: code,
    label: `${CURRENCY_MAP[code].flag} ${code} — ${CURRENCY_MAP[code].name}`,
  }));

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <div className={`content-card converter-widget dash-item ${className}`}>
      <div className="content-card-header">
        <div className="content-card-header-left">
          <Repeat size={18} />
          <h2 className="content-card-title">{title || t('dashboard:converter.title', { defaultValue: 'Conversor de Monedas' })}</h2>
        </div>
        <div className="converter-mode-toggle">
          <button
            className={`converter-mode-btn ${!p2pMode ? 'active' : ''}`}
            onClick={() => setP2pMode(false)}
          >
            {t('dashboard:converter.official', { defaultValue: 'Oficial' })}
          </button>
          <button
            className={`converter-mode-btn ${p2pMode ? 'active' : ''}`}
            onClick={() => setP2pMode(true)}
          >
            {t('dashboard:converter.p2p', { defaultValue: 'P2P' })}
          </button>
        </div>
      </div>

      <div className="converter-body">
        <div className="converter-field">
          <label className="converter-label">{t('dashboard:converter.amount', { defaultValue: 'Monto' })}</label>
          <div className="converter-amount-wrap">
            <span className="converter-symbol">{CURRENCY_MAP[from].symbol}</span>
            <input
              type="number"
              className="converter-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="any"
            />
          </div>
        </div>

        <div className="converter-row">
          <div className="converter-field">
            <label className="converter-label">{t('dashboard:converter.from', { defaultValue: 'De' })}</label>
            <CustomSelect value={from} onChange={(val) => setFrom(val as CurrencyCode)} options={currencyOptions} />
          </div>

          <button className="converter-swap-btn" onClick={handleSwap} title={t('dashboard:converter.swap', { defaultValue: 'Intercambiar' })}>
            <Repeat size={18} />
          </button>

          <div className="converter-field">
            <label className="converter-label">{t('dashboard:converter.to', { defaultValue: 'A' })}</label>
            <CustomSelect value={to} onChange={(val) => setTo(val as CurrencyCode)} options={currencyOptions} />
          </div>
        </div>

        <div className="converter-result">
          <div className="converter-result-main">
            <CurrencyFlag code={to} size={24} className="converter-result-flag" />
            <span className="converter-result-value">
              {CURRENCY_MAP[to].symbol}{converted.toLocaleString(CURRENCY_MAP[to].locale, { minimumFractionDigits: 2, maximumFractionDigits: CURRENCY_MAP[to].decimals })}
            </span>
          </div>
          <div className="converter-result-rate">
            1 {from} ≈ {rateUsed.toLocaleString(CURRENCY_MAP[to].locale, { maximumFractionDigits: CURRENCY_MAP[to].decimals })} {to}
          </div>
          <div className="converter-result-mode">
            {p2pMode
              ? t('dashboard:converter.usingP2P', { defaultValue: 'Usando tasa P2P' })
              : t('dashboard:converter.usingOfficial', { defaultValue: 'Usando tasa oficial' })}
          </div>
        </div>
      </div>
    </div>
  );
}
