import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 60;

const BINANCE_P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

async function fetchBinanceP2P(asset: string): Promise<number | null> {
  const res = await fetch(BINANCE_P2P_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asset, fiat: 'VES', tradeType: 'SELL', page: 1, rows: 10 }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data?.data) || data.data.length === 0) return null;
  const prices = data.data
    .slice(0, 5)
    .map((adv: any) => parseFloat(adv.adv.price))
    .filter((p: number) => p > 0);
  if (prices.length === 0) return null;
  return Number((prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(2));
}

export async function GET() {
  try {
    const [usdt, sol, btc, usdc] = await Promise.all([
      fetchBinanceP2P('USDT'),
      fetchBinanceP2P('SOL'),
      fetchBinanceP2P('BTC'),
      fetchBinanceP2P('USDC'),
    ]);
    return NextResponse.json({ USDT: usdt, SOL: sol, BTC: btc, USDC: usdc });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 });
  }
}
