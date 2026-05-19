'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToUserProfile } from '@/lib/firestore/users';
import {
  convertCurrency,
  formatCurrencyValue,
  DEFAULT_RATES,
  CURRENCY_MAP,
  CURRENCY_LIST,
} from '@/lib/currency';
import type { CurrencyCode, ExchangeRates } from '@/types';

// ============================================================
// CONTEXT INTERFACE
// ============================================================

interface CurrencyContextType {
  /** User's base currency (from profile, persisted in Firestore) */
  baseCurrency: CurrencyCode;
  /** Currently displayed currency (visual only, stored in localStorage) */
  displayCurrency: CurrencyCode;
  /** Exchange rates */
  rates: ExchangeRates;
  /** Whether rates are still loading */
  loading: boolean;
  /** Change the visual display currency */
  setDisplayCurrency: (code: CurrencyCode) => void;
  /** Convert an amount from base currency to display currency */
  convert: (amount: number) => number;
  /** Convert + format an amount (from base to display currency) */
  formatAmount: (amount: number) => string;
  /** Format amount in a specific currency (no conversion) */
  formatInCurrency: (amount: number, code: CurrencyCode) => string;
  /** Convert between any two currencies */
  convertBetween: (amount: number, from: CurrencyCode, to: CurrencyCode) => number;
  /** Available currencies */
  currencies: typeof CURRENCY_LIST;
  /** Currency config map */
  currencyMap: typeof CURRENCY_MAP;
}

const CurrencyContext = createContext<CurrencyContextType>({
  baseCurrency: 'USD',
  displayCurrency: 'USD',
  rates: DEFAULT_RATES,
  loading: true,
  setDisplayCurrency: () => {},
  convert: (a) => a,
  formatAmount: (a) => `$${a}`,
  formatInCurrency: (a) => `$${a}`,
  convertBetween: (a) => a,
  currencies: CURRENCY_LIST,
  currencyMap: CURRENCY_MAP,
});

export const useCurrency = () => useContext(CurrencyContext);

// ============================================================
// PROVIDER
// ============================================================

const DISPLAY_CURRENCY_KEY = 'prosper-display-currency';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>('USD');
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);
  const [apiRates, setApiRates] = useState<ExchangeRates | null>(null);
  const apiRatesRef = React.useRef<ExchangeRates | null>(null);

  useEffect(() => {
    apiRatesRef.current = apiRates;
  }, [apiRates]);

  // Load display currency from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DISPLAY_CURRENCY_KEY) as CurrencyCode | null;
      if (saved && CURRENCY_LIST.includes(saved)) {
        setDisplayCurrencyState(saved);
      }
    } catch {}
  }, []);

  // Subscribe to user profile to get base currency and custom rates
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const unsub = subscribeToUserProfile(user.uid, (profile) => {
      if (profile) {
        const userCurrency = (profile.currency as CurrencyCode) || 'USD';
        setBaseCurrency(userCurrency);

        // If user has custom rates, use them instead of defaults
        const customRates = (profile as any).customRates as Record<string, number> | undefined;
        if (customRates && Object.keys(customRates).length > 0) {
          setRates((prev) => ({
            ...prev,
            rates: {
              BS: 1.0,
              USD: customRates['USD'] ?? prev.rates.USD,
            },
            source: 'manual',
          }));
        } else {
          // If custom rates were removed or don't exist, restore API rates if available
          setRates((prev) => {
            if (apiRatesRef.current) {
              return apiRatesRef.current;
            }
            return {
              ...prev,
              source: 'api',
            };
          });
        }

        // If no saved display currency, default to user's base currency
        try {
          const saved = localStorage.getItem(DISPLAY_CURRENCY_KEY);
          if (!saved) {
            setDisplayCurrencyState(userCurrency);
          }
        } catch {}
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  // Fetch API rates
  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch('/api/exchange-rates');
        if (res.ok) {
          const data = await res.json();
          const fetched: ExchangeRates = {
            rates: data.rates,
            updatedAt: data.updatedAt,
            source: 'api',
          };
          setApiRates(fetched);
          setRates((prev) => {
            // Only update if user is not using manual override for USD
            if (prev.source === 'manual') {
              return prev;
            }
            return fetched;
          });
        }
      } catch (err) {
        console.error('Failed to fetch exchange rates:', err);
      }
    }
    fetchRates();
  }, []);

  // Set display currency (persist to localStorage)
  const setDisplayCurrency = useCallback((code: CurrencyCode) => {
    setDisplayCurrencyState(code);
    try {
      localStorage.setItem(DISPLAY_CURRENCY_KEY, code);
    } catch {}
  }, []);

  // Convert from base currency to display currency
  const convert = useCallback(
    (amount: number) => convertCurrency(amount, baseCurrency, displayCurrency, rates.rates),
    [baseCurrency, displayCurrency, rates.rates]
  );

  // Convert + format
  const formatAmount = useCallback(
    (amount: number) => {
      const converted = convertCurrency(amount, baseCurrency, displayCurrency, rates.rates);
      return formatCurrencyValue(converted, displayCurrency);
    },
    [baseCurrency, displayCurrency, rates.rates]
  );

  // Format in a specific currency (no conversion)
  const formatInCurrency = useCallback(
    (amount: number, code: CurrencyCode) => formatCurrencyValue(amount, code),
    []
  );

  // Convert between any two currencies
  const convertBetween = useCallback(
    (amount: number, from: CurrencyCode, to: CurrencyCode) =>
      convertCurrency(amount, from, to, rates.rates),
    [rates.rates]
  );

  const value = useMemo(
    () => ({
      baseCurrency,
      displayCurrency,
      rates,
      loading,
      setDisplayCurrency,
      convert,
      formatAmount,
      formatInCurrency,
      convertBetween,
      currencies: CURRENCY_LIST,
      currencyMap: CURRENCY_MAP,
    }),
    [baseCurrency, displayCurrency, rates, loading, setDisplayCurrency, convert, formatAmount, formatInCurrency, convertBetween]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}
