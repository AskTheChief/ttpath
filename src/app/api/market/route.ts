import { NextResponse } from 'next/server';

const API_KEY = 'eBQjAnpsoS5cfvPckwqZbMtkMSuBuMYQ';
const TICKERS = ['SPY', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];

export async function GET() {
  try {
    const resp = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${TICKERS.join(',')}&apiKey=${API_KEY}`,
      { next: { revalidate: 30 } } // Cache 30 seconds
    );
    const data = await resp.json();

    const tickers = (data.tickers || []).map((t: any) => {
      const prev = t.prevDay || {};
      const last = t.lastTrade?.p || t.min?.c || prev.c || 0;
      const prevClose = prev.c || last;
      const change = last - prevClose;
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

      return {
        ticker: t.ticker,
        price: last,
        change,
        changePct,
        updated: t.updated ? new Date(t.updated / 1e6).toISOString() : null,
      };
    });

    return NextResponse.json({ tickers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, tickers: [] }, { status: 500 });
  }
}
