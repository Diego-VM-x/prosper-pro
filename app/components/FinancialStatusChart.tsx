'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { subscribeToTransactions } from '@/lib/firestore/transactions';
import type { Transaction } from '@/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type TimeRange = '1D' | '1S' | '1M' | '3M' | '6M' | 'YTD';

interface ChartDataPoint {
  date: string;
  label: string;
  balance: number;
}

const TIME_RANGES: { key: TimeRange; label: string; days: number }[] = [
  { key: '1D', label: '1D', days: 1 },
  { key: '1S', label: '1S', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 180 },
  { key: 'YTD', label: 'YTD', days: 365 },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(timestamp: number, range: TimeRange): string {
  const date = new Date(timestamp);
  switch (range) {
    case '1D':
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    case '1S':
    case '1M':
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    case '3M':
    case '6M':
      return date.toLocaleDateString('es-ES', { month: 'short' });
    case 'YTD':
      return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    default:
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: 'var(--shadow-md)',
      }}>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</p>
        <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-prosper-green)' }}>
          {formatCurrency(payload[0].value)}
        </p>
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

export function FinancialStatusChart() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    const unsubscribe = subscribeToTransactions(user.uid, (txs) => {
      setTransactions(txs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const chartData = useMemo((): ChartDataPoint[] => {
    if (transactions.length === 0) return [];

    const now = Date.now();
    const rangeConfig = TIME_RANGES.find(r => r.key === selectedRange);
    const cutoffDate = now - (rangeConfig?.days ?? 30) * 86400000;

    const filtered = transactions
      .filter(t => t.date >= cutoffDate)
      .sort((a, b) => a.date - b.date);

    if (filtered.length === 0) return [];

    let runningBalance = 0;
    const dataMap = new Map<string, number>();

    filtered.forEach(tx => {
      const dateKey = new Date(tx.date).toISOString().split('T')[0];
      const amount = tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : tx.amount;
      runningBalance += amount;
      dataMap.set(dateKey, runningBalance);
    });

    return Array.from(dataMap.entries()).map(([dateStr, balance]) => ({
      date: dateStr,
      label: formatDateLabel(new Date(dateStr).getTime(), selectedRange),
      balance,
    }));
  }, [transactions, selectedRange]);

  const currentBalance = chartData.length > 0 ? chartData[chartData.length - 1].balance : 0;
  const previousBalance = chartData.length > 1 ? chartData[chartData.length - 2].balance : 0;
  const change = currentBalance - previousBalance;
  const changePercent = previousBalance !== 0 ? ((change / previousBalance) * 100).toFixed(2) : '0.00';

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
            Progreso Financiero
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Saldo Neto Total
          </p>
        </div>

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

      {/* Balance Summary */}
      <div style={{
        display: 'flex',
        gap: '24px',
        marginBottom: '16px',
        flexWrap: 'wrap',
      }}>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Balance Actual
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatCurrency(currentBalance)}
          </p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Cambio
          </span>
          <p style={{
            margin: '4px 0 0',
            fontSize: '16px',
            fontWeight: 600,
            color: change >= 0 ? 'var(--color-prosper-green)' : 'var(--color-red-500)',
          }}>
            {change >= 0 ? '+' : ''}{formatCurrency(change)} ({changePercent}%)
          </p>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <SkeletonChart />
      ) : chartData.length === 0 ? (
        <div style={{
          height: '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)',
          fontSize: '14px',
        }}>
          No hay datos para el período seleccionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-prosper-green)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--color-prosper-green)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              axisLine={{ stroke: 'var(--border-default)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="var(--color-prosper-green)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorBalance)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
