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
import { notifyDollarChange, notifyDailyBalance, notifyAppUpdate } from '@/lib/firestore/notifications';
import { getAccountsByOwnerId } from '@/lib/firestore/accounts';
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
  /** Whether to use P2P rates for USDT/SOL */
  p2pMode: boolean;
  /** Toggle P2P rates */
  setP2pMode: (v: boolean) => void;
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
  p2pMode: false,
  setP2pMode: () => {},
});

export const useCurrency = () => useContext(CurrencyContext);

// ============================================================
// PROVIDER
// ============================================================

const DISPLAY_CURRENCY_KEY = 'prosper-display-currency';
const P2P_MODE_KEY = 'prosper-p2p-mode';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>('USD');
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);
  const [apiRates, setApiRates] = useState<ExchangeRates | null>(null);
  const [p2pMode, setP2pModeState] = useState<boolean>(() => {
    try { return localStorage.getItem(P2P_MODE_KEY) === 'true'; } catch { return false; }
  });
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
              BTC: customRates['BTC'] ?? prev.rates.BTC,
              USDC: customRates['USDC'] ?? prev.rates.USDC,
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
    async function fetchCriptoYaP2P(): Promise<number | null> {
      try {
        const res = await fetch('https://criptoya.com/api/binancep2p/usdt/ves', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.ask && data.ask > 0) return Number(data.ask);
        return null;
      } catch {
        return null;
      }
    }

    async function fetchBinanceP2PProxy(): Promise<{ USDT: number | null; SOL: number | null; BTC: number | null; USDC: number | null }> {
      try {
        const res = await fetch('/api/rates', { cache: 'no-store' });
        if (!res.ok) return { USDT: null, SOL: null, BTC: null, USDC: null };
        return await res.json();
      } catch {
        return { USDT: null, SOL: null, BTC: null, USDC: null };
      }
    }

    async function fetchRates() {
      try {
        // Fetch USD->BS from dolarapi
        const [usdRes, eurRes, cryptoRes, p2pUsdtRes, p2pRatesRes] = await Promise.allSettled([
          fetch('https://ve.dolarapi.com/v1/dolares', { cache: 'no-store' }),
          fetch('https://api.exchangerate-api.com/v4/latest/USD', { cache: 'no-store' }),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,solana,bitcoin,usd-coin&vs_currencies=usd', { cache: 'no-store' }),
          fetchCriptoYaP2P(),
          fetchBinanceP2PProxy(),
        ]);

        const p2pRatesBinance = p2pRatesRes.status === 'fulfilled' ? p2pRatesRes.value : { USDT: null, SOL: null, BTC: null, USDC: null };

        // Fallback to Binance P2P for USDT if CriptoYa fails
        let p2pUsdt = p2pUsdtRes.status === 'fulfilled' ? p2pUsdtRes.value : null;
        if (!p2pUsdt) {
          p2pUsdt = p2pRatesBinance.USDT;
        }

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
        let btcRate = 4500000;
        let usdcRate = oficialRate;
        if (cryptoRes.status === 'fulfilled' && cryptoRes.value.ok) {
          const data = await cryptoRes.value.json();
          const usdtUsd = data?.tether?.usd;
          const solUsd = data?.solana?.usd;
          const btcUsd = data?.bitcoin?.usd;
          const usdcUsd = data?.['usd-coin']?.usd;
          if (usdtUsd && usdtUsd > 0) usdtRate = Number((usdtUsd * oficialRate).toFixed(2));
          if (solUsd && solUsd > 0) solRate = Number((solUsd * oficialRate).toFixed(2));
          if (btcUsd && btcUsd > 0) btcRate = Number((btcUsd * oficialRate).toFixed(2));
          if (usdcUsd && usdcUsd > 0) usdcRate = Number((usdcUsd * oficialRate).toFixed(2));
        }

        const p2pRates: Record<string, number> = {};
        if (p2pUsdt) p2pRates.USDT = p2pUsdt;
        if (p2pRatesBinance.SOL) p2pRates.SOL = p2pRatesBinance.SOL;
        if (p2pRatesBinance.BTC) p2pRates.BTC = p2pRatesBinance.BTC;
        if (p2pRatesBinance.USDC) p2pRates.USDC = p2pRatesBinance.USDC;

        const fetched: ExchangeRates = {
          rates: {
            BS: 1.0,
            USD: oficialRate,
            EUR: eurRate,
            USDT: usdtRate,
            SOL: solRate,
            BTC: btcRate,
            USDC: usdcRate,
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
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, []);

  // Set display currency (persist to localStorage)
  const setDisplayCurrency = useCallback((code: CurrencyCode) => {
    setDisplayCurrencyState(code);
    try {
      localStorage.setItem(DISPLAY_CURRENCY_KEY, code);
    } catch {}
  }, []);

  // Set P2P mode (persist to localStorage)
  const setP2pMode = useCallback((v: boolean) => {
    setP2pModeState(v);
    try {
      localStorage.setItem(P2P_MODE_KEY, String(v));
    } catch {}
  }, []);

  // Effective rates: override crypto rates with real P2P prices when p2pMode is active
  const effectiveRates = useMemo(() => {
    const r = { ...rates.rates };
    if (p2pMode && rates.p2pRates) {
      if (rates.p2pRates.USDT) r.USDT = rates.p2pRates.USDT;
      if (rates.p2pRates.SOL) r.SOL = rates.p2pRates.SOL;
      if (rates.p2pRates.BTC) r.BTC = rates.p2pRates.BTC;
      if (rates.p2pRates.USDC) r.USDC = rates.p2pRates.USDC;
    }
    return r;
  }, [rates, p2pMode]);

  // Convert from base currency to display currency
  const convert = useCallback(
    (amount: number) => convertCurrency(amount, baseCurrency, displayCurrency, effectiveRates),
    [baseCurrency, displayCurrency, effectiveRates]
  );

  // Convert + format
  const formatAmount = useCallback(
    (amount: number) => {
      const converted = convertCurrency(amount, baseCurrency, displayCurrency, effectiveRates);
      return formatCurrencyValue(converted, displayCurrency);
    },
    [baseCurrency, displayCurrency, effectiveRates]
  );

  // Format in a specific currency (no conversion)
  const formatInCurrency = useCallback(
    (amount: number, code: CurrencyCode) => formatCurrencyValue(amount, code),
    []
  );

  // Convert between any two currencies
  const convertBetween = useCallback(
    (amount: number, from: CurrencyCode, to: CurrencyCode) =>
      convertCurrency(amount, from, to, effectiveRates),
    [effectiveRates]
  );

  // ── Notification Triggers ────────────────────────────────────

  // Dollar rate change notification
  useEffect(() => {
    if (!user?.uid || !rates?.rates?.USD || rates.source !== 'api') return;
    const lastNotifiedRate = Number(localStorage.getItem('prosper_last_usd_rate') || 0);
    if (lastNotifiedRate > 0) {
      const diff = Math.abs(rates.rates.USD - lastNotifiedRate);
      const pct = diff / lastNotifiedRate;
      if (pct >= 0.005) {
        notifyDollarChange(user.uid, lastNotifiedRate, rates.rates.USD).catch(console.error);
      }
    }
    localStorage.setItem('prosper_last_usd_rate', String(rates.rates.USD));
  }, [rates?.rates?.USD, rates?.source, user?.uid]);

  // Daily balance notification (at 12:00 local time)
  useEffect(() => {
    if (!user?.uid) return;
    const checkDailyBalance = () => {
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const lastSent = localStorage.getItem('prosper_daily_balance_sent');
      if (lastSent === todayKey) return;
      if (now.getHours() >= 12) {
        getAccountsByOwnerId(user.uid)
          .then((accounts) => {
            const totalUSD = accounts.filter((a) => a.currency === 'USD').reduce((s, a) => s + a.balance, 0);
            const totalBS = accounts.filter((a) => a.currency === 'BS').reduce((s, a) => s + a.balance, 0);
            notifyDailyBalance(user.uid, totalUSD, totalBS).catch(console.error);
            localStorage.setItem('prosper_daily_balance_sent', todayKey);
          })
          .catch(console.error);
      }
    };
    checkDailyBalance();
    const interval = setInterval(checkDailyBalance, 60000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  // App update notification
  useEffect(() => {
    if (!user?.uid) return;
    const APP_VERSION = '0.9.0';
    const lastVersion = localStorage.getItem('prosper_app_version');
    if (lastVersion && lastVersion !== APP_VERSION) {
      notifyAppUpdate(user.uid, APP_VERSION, 'Nueva versión disponible con mejoras y correcciones.').catch(console.error);
    }
    localStorage.setItem('prosper_app_version', APP_VERSION);
  }, [user?.uid]);

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
      p2pMode,
      setP2pMode,
    }),
    [baseCurrency, displayCurrency, rates, loading, setDisplayCurrency, convert, formatAmount, formatInCurrency, convertBetween, p2pMode, setP2pMode]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}
