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
              EUR: customRates['EUR'] ?? prev.rates.EUR,
              USDT: customRates['USDT'] ?? prev.rates.USDT,
              SOL: customRates['SOL'] ?? prev.rates.SOL,
              COP: customRates['COP'] ?? prev.rates.COP,
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

  // Load cached rates from localStorage then fetch fresh
  useEffect(() => {
    try {
      const cached = localStorage.getItem('prosper_exchange_rates');
      if (cached) {
        const parsed = JSON.parse(cached) as ExchangeRates;
        setApiRates(parsed);
        setRates((prev) => prev.source === 'manual' ? prev : parsed);
      }
    } catch {}
    async function fetchBinanceP2P(asset: string): Promise<number | null> {
      try {
        const res = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset, fiat: 'VES', tradeType: 'SELL', page: 1, rows: 10 }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!Array.isArray(data?.data) || data.data.length === 0) return null;
        const prices = data.data.slice(0, 5).map((adv: any) => parseFloat(adv.adv.price)).filter((p: number) => p > 0);
        if (prices.length === 0) return null;
        return Number((prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(2));
      } catch {
        return null;
      }
    }

    async function fetchRates() {
      try {
        // Fetch USD->BS from dolarapi
        const [usdRes, eurRes, cryptoRes, p2pUsdtRes, p2pSolRes] = await Promise.allSettled([
          fetch('https://ve.dolarapi.com/v1/dolares', { cache: 'no-store' }),
          fetch('https://api.exchangerate-api.com/v4/latest/USD', { cache: 'no-store' }),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,solana&vs_currencies=usd', { cache: 'no-store' }),
          fetchBinanceP2P('USDT'),
          fetchBinanceP2P('SOL'),
        ]);

        let oficialRate = 40;
        let updatedAt = Date.now();

        if (usdRes.status === 'fulfilled' && usdRes.value.ok) {
          const data = await usdRes.value.json();
          if (Array.isArray(data)) {
            const oficial = data.find((d: any) => d.fuente === 'oficial');
            const paralelo = data.find((d: any) => d.fuente === 'paralelo');
            if (oficial?.promedio) oficialRate = oficial.promedio;
            if (paralelo?.fechaActualizacion || oficial?.fechaActualizacion) {
              updatedAt = new Date(paralelo?.fechaActualizacion || oficial?.fechaActualizacion).getTime();
            }
          }
        }

        let eurRate = 48.5;
        let copRate = 0.0105;
        if (eurRes.status === 'fulfilled' && eurRes.value.ok) {
          const data = await eurRes.value.json();
          const eurToUsd = data?.rates?.EUR;
          const copToUsd = data?.rates?.COP;
          if (eurToUsd && eurToUsd > 0) {
            eurRate = Number((oficialRate / eurToUsd).toFixed(2));
          }
          if (copToUsd && copToUsd > 0) {
            copRate = Number((oficialRate / copToUsd).toFixed(4));
          }
        }

        let usdtRate = oficialRate;
        let solRate = 9000;
        if (cryptoRes.status === 'fulfilled' && cryptoRes.value.ok) {
          const data = await cryptoRes.value.json();
          const usdtUsd = data?.tether?.usd;
          const solUsd = data?.solana?.usd;
          if (usdtUsd && usdtUsd > 0) usdtRate = Number((usdtUsd * oficialRate).toFixed(2));
          if (solUsd && solUsd > 0) solRate = Number((solUsd * oficialRate).toFixed(2));
        }

        const p2pRates: Record<string, number> = {};
        if (p2pUsdtRes.status === 'fulfilled' && p2pUsdtRes.value) p2pRates.USDT = p2pUsdtRes.value;
        if (p2pSolRes.status === 'fulfilled' && p2pSolRes.value) p2pRates.SOL = p2pSolRes.value;

        const fetched: ExchangeRates = {
          rates: {
            BS: 1.0,
            USD: oficialRate,
            EUR: eurRate,
            USDT: usdtRate,
            SOL: solRate,
            COP: copRate,
          },
          p2pRates,
          updatedAt,
          source: 'api',
        };
        setApiRates(fetched);
        setRates((prev) => {
          if (prev.source === 'manual') return prev;
          return fetched;
        });
        try { localStorage.setItem('prosper_exchange_rates', JSON.stringify(fetched)); } catch {}
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
