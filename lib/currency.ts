'use client';

import type { CurrencyCode, ExchangeRates } from '@/types';

// ============================================================
// CURRENCY CONFIGURATION
// ============================================================

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  locale: string;
  decimals: number;
}

export const CURRENCY_MAP: Record<CurrencyCode, CurrencyConfig> = {
  BS: { code: 'BS', symbol: 'Bs.', name: 'Bolívar', flag: '🇻🇪', locale: 'es-VE', decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'Dólar', flag: '🇺🇸', locale: 'en-US', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', locale: 'de-DE', decimals: 2 },
  USDT: { code: 'USDT', symbol: '₮', name: 'Tether', flag: '💎', locale: 'en-US', decimals: 2 },
  SOL: { code: 'SOL', symbol: '◎', name: 'Solana', flag: '☀️', locale: 'en-US', decimals: 2 },
};

export const CURRENCY_LIST: CurrencyCode[] = ['USD', 'BS', 'EUR', 'USDT', 'SOL'];

// ============================================================
// DEFAULT EXCHANGE RATES (fallback / initial values)
// All rates expressed as: 1 unit of currency X = rates[X] BS
// Example: 1 USD = 92.50 BS → rates.USD = 92.50
// ============================================================

export const DEFAULT_RATES: ExchangeRates = {
  rates: {
    BS: 1.0,
    USD: 45.00,   // 1 USD = 45.00 BS (fallback)
    EUR: 48.50,   // 1 EUR = 48.50 BS (fallback)
    USDT: 45.00,  // 1 USDT ≈ 1 USD (fallback)
    SOL: 9000.00, // 1 SOL ≈ 200 USD * 45 BS (fallback)
  },
  updatedAt: Date.now(),
  source: 'api',
};

// ============================================================
// CONVERSION FUNCTION
// Formula: A_target = A_source × (R_source / R_target)
// Where R_X = how many BS 1 unit of X is worth
// ============================================================

/**
 * Convert an amount from one currency to another using exchange rates.
 * All rates are expressed relative to BS (R_BS = 1.0).
 *
 * @param amount - The amount to convert
 * @param source - Source currency code
 * @param target - Target currency code
 * @param rates - Exchange rates object
 * @returns Converted amount with appropriate precision
 */
export function convertCurrency(
  amount: number,
  source: CurrencyCode,
  target: CurrencyCode,
  rates: ExchangeRates['rates']
): number {
  if (source === target) return amount;

  const rSource = rates[source] ?? 1;
  const rTarget = rates[target] ?? 1;

  if (rTarget === 0) return 0; // prevent division by zero

  const converted = amount * (rSource / rTarget);
  const decimals = CURRENCY_MAP[target]?.decimals ?? 2;

  return Number(converted.toFixed(decimals));
}

// ============================================================
// FORMAT CURRENCY
// ============================================================

/**
 * Format a number as a currency string using the appropriate locale and symbol.
 *
 * @param amount - The numeric amount to format
 * @param currencyCode - The currency code to format as
 * @param compact - If true, use compact notation for large numbers
 * @returns Formatted currency string
 */
export function formatCurrencyValue(
  amount: number,
  currencyCode: CurrencyCode = 'USD',
  compact = false
): string {
  const config = CURRENCY_MAP[currencyCode];
  if (!config) {
    return `$${amount.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }



  // For BS, use custom formatting (VES Intl is buggy in some browsers)
  if (currencyCode === 'BS') {
    const formatted = compact && Math.abs(amount) >= 1000
      ? `${(amount / 1000).toFixed(1)}k`
      : amount.toLocaleString('es-VE', {
          minimumFractionDigits: 0,
          maximumFractionDigits: config.decimals,
        });
    return `${config.symbol}${formatted}`;
  }

  // For standard currencies (USD, EUR) use Intl.NumberFormat
  try {
    if (compact && Math.abs(amount) >= 1000) {
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: currencyCode,
        notation: 'compact',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(amount);
    }

    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: config.decimals,
    }).format(amount);
  } catch {
    return `${config.symbol}${amount.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: config.decimals })}`;
  }
}
