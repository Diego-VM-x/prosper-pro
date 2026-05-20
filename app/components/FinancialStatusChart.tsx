'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { subscribeToTransactions } from '@/lib/firestore/transactions';
import { subscribeToAccounts } from '@/lib/firestore/accounts';
import type { Transaction, FinancialAccount, CurrencyCode } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type TimeRange = 'day' | 'week' | 'month' | 'year';

interface ChartDataPoint {
  label: string;
  income: number;
  expense: number;
  saving: number;
}

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'day', label: 'Día' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year', label: 'Año' },
];

function CustomTooltip({ active, payload, label, formatter }: { active?: boolean; payload?: { value: number; dataKey: string; color: string }[]; label?: string; formatter?: (v: number) => string }) {
  const fmt = formatter || ((v: number) => `$${v}`);
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: 'var(--shadow-md)',
      }}>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ margin: '2px 0', fontSize: '12px', color: p.color }}>
            {p.dataKey === 'income' ? '📥 Ingresos' : p.dataKey === 'expense' ? '📤 Gastos' : '💰 Ahorro'}: {fmt(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function SkeletonChart() {
  return (
    <div style={{
      width: '100%',
      height: '280px',
      background: 'var(--bg-input)',
      borderRadius: 'var(--radius-md)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  color: string;
  showAmounts: boolean;
  altValue: number;
  showConversion: boolean;
  altCurrency: CurrencyCode;
  formatInCurrency: (amount: number, code: CurrencyCode) => string;
  displayCurrency: CurrencyCode;
  isBalance?: boolean;
}

function SummaryCard({ label, value, color, showAmounts, altValue, showConversion, altCurrency, formatInCurrency, displayCurrency, isBalance }: SummaryCardProps) {
  return (
    <div>
      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      <p style={{
        margin: '4px 0 0',
        fontSize: '18px',
        fontWeight: 700,
        color: showAmounts ? color : 'var(--text-tertiary)',
        lineHeight: 1.2,
      }}>
        {showAmounts ? formatInCurrency(value, displayCurrency) : '••••••'}
      </p>
      {showConversion && showAmounts && (
        <p style={{
          margin: '2px 0 0',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          opacity: 0.8,
        }}>
          ≈ {formatInCurrency(altValue, altCurrency)} {altCurrency}
        </p>
      )}
    </div>
  );
}

export function FinancialStatusChart() {
  const { user } = useAuth();
  const { formatAmount, formatInCurrency, displayCurrency, convertBetween } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('week');
  const [showAmounts, setShowAmounts] = useState(true);
  const [showConversion, setShowConversion] = useState(false);
  const [chartHeight, setChartHeight] = useState(280);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const unsubscribe = subscribeToTransactions(user.uid, (txs) => {
      setTransactions(txs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToAccounts(user.uid, (accs) => setAccounts(accs));
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const updateHeight = () => {
      if (typeof window !== 'undefined') {
        setChartHeight(window.innerWidth < 480 ? 200 : window.innerWidth < 768 ? 240 : 280);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const chartData = useMemo((): ChartDataPoint[] => {
    if (transactions.length === 0) return [];

    const now = new Date();
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    let periods: { key: string; label: string; start: Date; end: Date }[] = [];

    switch (selectedRange) {
      case 'day': {
        for (let i = 23; i >= 0; i--) {
          const d = new Date(now);
          d.setHours(d.getHours() - i, 0, 0, 0);
          const end = new Date(d);
          end.setHours(end.getHours() + 1);
          periods.push({ key: `${d.getHours()}:00`, label: `${d.getHours()}:00`, start: d, end });
        }
        break;
      }
      case 'week': {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          d.setHours(0, 0, 0, 0);
          const end = new Date(d);
          end.setDate(end.getDate() + 1);
          periods.push({ key: d.toISOString().split('T')[0], label: dayNames[d.getDay()], start: d, end });
        }
        break;
      }
      case 'month': {
        for (let i = 3; i >= 0; i--) {
          const end = new Date(now);
          end.setDate(end.getDate() - i * 7);
          end.setHours(23, 59, 59, 999);
          const start = new Date(end);
          start.setDate(start.getDate() - 6);
          start.setHours(0, 0, 0, 0);
          periods.push({ key: `w${i}`, label: `Sem ${4 - i}`, start, end });
        }
        break;
      }
      case 'year': {
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
          periods.push({ key: d.toISOString().slice(0, 7), label: monthNames[d.getMonth()], start: d, end });
        }
        break;
      }
    }

    return periods.map((period) => {
      const periodTxs = transactions.filter((t) => {
        const txDate = new Date(t.date);
        return txDate >= period.start && txDate <= period.end;
      });

      const convertTx = (t: Transaction) => {
        const account = accounts.find((a) => a.id === t.accountId);
        const txCurrency = account?.currency || 'USD';
        return convertBetween(t.amount, txCurrency, displayCurrency);
      };

      return {
        label: period.label,
        income: periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + convertTx(t), 0),
        expense: periodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + convertTx(t), 0),
        saving: periodTxs.filter(t => t.type === 'saving').reduce((s, t) => s + convertTx(t), 0),
      };
    });
  }, [transactions, selectedRange, accounts, displayCurrency, convertBetween]);

  const totals = useMemo(() => {
    const convertTx = (t: Transaction) => {
      const account = accounts.find((a) => a.id === t.accountId);
      const txCurrency = account?.currency || 'USD';
      return convertBetween(t.amount, txCurrency, displayCurrency);
    };
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + convertTx(t), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + convertTx(t), 0);
    const saving = transactions.filter(t => t.type === 'saving').reduce((s, t) => s + convertTx(t), 0);
    return { income, expense, saving, balance: income - expense - saving };
  }, [transactions, accounts, displayCurrency, convertBetween]);

  const altCurrency: CurrencyCode = displayCurrency === 'USD' ? 'BS' : 'USD';
  const altTotals = useMemo(() => ({
    income: convertBetween(totals.income, displayCurrency, altCurrency),
    expense: convertBetween(totals.expense, displayCurrency, altCurrency),
    saving: convertBetween(totals.saving, displayCurrency, altCurrency),
    balance: convertBetween(totals.balance, displayCurrency, altCurrency),
  }), [totals, displayCurrency, altCurrency, convertBetween]);

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      border: '1px solid var(--border-default)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Flujo Financiero
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Ingresos vs Gastos vs Ahorro
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Toggle Amounts */}
          <button
            onClick={() => setShowAmounts(!showAmounts)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'var(--transition-fast)',
            }}
            title={showAmounts ? 'Ocultar montos' : 'Mostrar montos'}
          >
            {showAmounts ? '👁️' : '🙈'} {showAmounts ? 'Ocultar' : 'Mostrar'}
          </button>

          {/* Time Range Selector */}
          <div style={{
            display: 'flex',
            gap: '4px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-full)',
            padding: '3px',
          }}>
            {TIME_RANGES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedRange(key)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: selectedRange === key ? 600 : 400,
                  color: selectedRange === key ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  background: selectedRange === key ? 'var(--bg-accent)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px',
          flex: 1,
        }}>
          <SummaryCard label="Ingresos" value={totals.income} color="var(--color-prosper-green)" showAmounts={showAmounts} altValue={altTotals.income} showConversion={showConversion} altCurrency={altCurrency} formatInCurrency={formatInCurrency} displayCurrency={displayCurrency} />
          <SummaryCard label="Gastos" value={totals.expense} color="var(--color-error)" showAmounts={showAmounts} altValue={altTotals.expense} showConversion={showConversion} altCurrency={altCurrency} formatInCurrency={formatInCurrency} displayCurrency={displayCurrency} />
          <SummaryCard label="Ahorro" value={totals.saving} color="var(--color-pine-500)" showAmounts={showAmounts} altValue={altTotals.saving} showConversion={showConversion} altCurrency={altCurrency} formatInCurrency={formatInCurrency} displayCurrency={displayCurrency} />
          <SummaryCard label="Balance" value={totals.balance} color={totals.balance >= 0 ? 'var(--color-prosper-green)' : 'var(--color-error)'} showAmounts={showAmounts} altValue={altTotals.balance} showConversion={showConversion} altCurrency={altCurrency} formatInCurrency={formatInCurrency} displayCurrency={displayCurrency} isBalance />
        </div>

        <button
          onClick={() => setShowConversion(!showConversion)}
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 500,
            color: showConversion ? 'var(--color-prosper-green)' : 'var(--text-secondary)',
            background: showConversion ? 'rgba(61,204,142,0.1)' : 'var(--bg-input)',
            border: `1px solid ${showConversion ? 'var(--color-prosper-green)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'var(--transition-fast)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          title={showConversion ? 'Ocultar conversión' : 'Ver conversión'}
        >
          ⇄ {showConversion ? 'BS/USD' : 'Convertir'}
        </button>
      </div>

      {/* Chart */}
      {loading ? (
        <SkeletonChart />
      ) : chartData.length === 0 ? (
        <div style={{
          height: `${chartHeight}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)',
          fontSize: '14px',
        }}>
          No hay datos para el período seleccionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              axisLine={{ stroke: 'var(--border-default)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`}
              width={40}
            />
            <Tooltip content={<CustomTooltip formatter={(v) => formatInCurrency(v, displayCurrency)} />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
              formatter={(value) => value === 'income' ? '📥 Ingresos' : value === 'expense' ? '📤 Gastos' : '💰 Ahorro'}
            />
            {showAmounts && (
              <>
                <Bar dataKey="income" fill="#3DCC8E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saving" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
