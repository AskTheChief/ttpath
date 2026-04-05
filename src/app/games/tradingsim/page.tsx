
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, RotateCcw, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

const STARTING_BALANCE = 10000;
const STARTING_PRICE = 100;
const TIMEFRAMES: Record<string, number> = { '1s': 2, '5s': 10, '10s': 20, '30s': 60, '1m': 120 };

type TickerData = { ticker: string; price: number; change: number; changePct: number };
type Candle = { open: number; high: number; low: number; close: number };
type Tick = { price: number; time: number };
type Trade = { type: 'buy' | 'sell'; price: number; qty: number; time: number; pnl?: number };

function LiveTicker() {
  const [tickers, setTickers] = useState<TickerData[]>([]);
  useEffect(() => {
    const f = async () => { try { const r = await fetch('/api/market'); const d = await r.json(); if (d.tickers) setTickers(d.tickers); } catch {} };
    f(); const i = setInterval(f, 30000); return () => clearInterval(i);
  }, []);
  if (tickers.length === 0) return null;
  return (
    <div className="bg-black/80 border-t border-white/10 overflow-hidden whitespace-nowrap shrink-0">
      <div className="inline-flex animate-ticker-scroll py-1.5">
        {[...tickers, ...tickers].map((t, i) => (
          <span key={i} className="mx-4 text-xs font-mono">
            <span className="text-white/70 font-medium">{t.ticker}</span>{' '}
            <span className="text-white">${t.price.toFixed(2)}</span>{' '}
            <span className={t.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              {t.change >= 0 ? '+' : ''}{t.change.toFixed(2)} ({t.changePct >= 0 ? '+' : ''}{t.changePct.toFixed(2)}%)
            </span>
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-ticker-scroll { animation: ticker-scroll 25s linear infinite; }
      `}</style>
    </div>
  );
}

function generateSeedTicks(startPrice: number, seconds: number): Tick[] {
  const ticks: Tick[] = [];
  let price = startPrice;
  const now = Date.now();
  const total = seconds * 4;
  for (let i = total; i > 0; i--) {
    let pct = (Math.random() - 0.5) * 0.006;
    if (Math.random() < 0.03) pct *= 4;
    price = Math.max(0.5, price * (1 + pct));
    ticks.push({ price, time: now - i * 250 });
  }
  return ticks;
}

function ticksToCandles(ticks: Tick[], intervalMs: number): Candle[] {
  if (ticks.length === 0) return [];
  const candles: Candle[] = [];
  let bs = ticks[0].time;
  let o = ticks[0].price, h = o, l = o, c = o;
  for (const t of ticks) {
    if (t.time >= bs + intervalMs) {
      candles.push({ open: o, high: h, low: l, close: c });
      bs += intervalMs * Math.floor((t.time - bs) / intervalMs);
      o = t.price; h = t.price; l = t.price; c = t.price;
    } else {
      h = Math.max(h, t.price); l = Math.min(l, t.price); c = t.price;
    }
  }
  candles.push({ open: o, high: h, low: l, close: c });
  return candles;
}

export default function TradingSimPage() {
  const [mounted, setMounted] = useState(false);
  const [initialTicks] = useState(() => generateSeedTicks(STARTING_PRICE, 7200));
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [stockPrice, setStockPrice] = useState(STARTING_PRICE);

  // Init price from seed on mount (avoids hydration mismatch)
  useEffect(() => {
    setStockPrice(initialTicks[initialTicks.length - 1].price);
    setMounted(true);
  }, []);
  const [sharesOwned, setSharesOwned] = useState(0);
  const [avgCost, setAvgCost] = useState(0);
  const [realizedPnL, setRealizedPnL] = useState(0);
  const [gameMessage, setGameMessage] = useState('Buy low, sell high. Or don\'t.');
  const [timeframe, setTimeframe] = useState('5s');
  const intervalMs = TIMEFRAMES[timeframe] * 500;
  const [paused, setPaused] = useState(false);
  const [lastChange, setLastChange] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [equityHistory, setEquityHistory] = useState<{ time: number; equity: number }[]>([]);
  const [peakEquity, setPeakEquity] = useState(STARTING_BALANCE);
  const [maxDrawdown, setMaxDrawdown] = useState(0);
  const [flash, setFlash] = useState<'buy' | 'sell' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const equityCanvasRef = useRef<HTMLCanvasElement>(null);
  const ticksRef = useRef<Tick[]>(initialTicks);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  // Derived
  const equity = balance + sharesOwned * stockPrice;
  const unrealizedPnL = sharesOwned > 0 ? (stockPrice - avgCost) * sharesOwned : 0;
  const totalPnL = realizedPnL + unrealizedPnL;
  const maxShares = Math.floor(balance / stockPrice);
  const winningTrades = trades.filter(t => t.type === 'sell' && (t.pnl || 0) > 0).length;
  const losingTrades = trades.filter(t => t.type === 'sell' && (t.pnl || 0) < 0).length;
  const totalSells = trades.filter(t => t.type === 'sell').length;
  const winRate = totalSells > 0 ? (winningTrades / totalSells * 100) : 0;
  const returnPct = ((equity - STARTING_BALANCE) / STARTING_BALANCE * 100);

  // Track equity + drawdown
  useEffect(() => {
    if (trades.length === 0 && equityHistory.length === 0) return;
    const now = Date.now();
    setEquityHistory(prev => [...prev, { time: now, equity }].slice(-500));
    if (equity > peakEquity) setPeakEquity(equity);
    const dd = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
    if (dd > maxDrawdown) setMaxDrawdown(dd);
  }, [stockPrice]);

  // Price engine
  useEffect(() => {
    if (paused) { if (timeoutRef.current) clearTimeout(timeoutRef.current); return; }
    const tick = () => {
      setStockPrice(prev => {
        const a = Math.random();
        let pct = a < 0.15 ? 0 : a < 0.85 ? (Math.random() - 0.5) * 0.006 : a < 0.97 ? (Math.random() - 0.5) * 0.015 : (Math.random() - 0.5) * 0.04;
        const next = Math.max(0.5, prev * (1 + pct));
        if (pct !== 0) setLastChange(next - prev);
        ticksRef.current.push({ price: next, time: Date.now() });
        if (ticksRef.current.length > 60000) ticksRef.current = ticksRef.current.slice(-50000);
        setRenderTick(t => t + 1);
        return next;
      });
      const delay = 100 + Math.random() * 400 + (Math.random() < 0.1 ? 800 : 0);
      timeoutRef.current = setTimeout(tick, delay);
    };
    timeoutRef.current = setTimeout(tick, 200);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [paused]);

  const candles = ticksToCandles(ticksRef.current, intervalMs);

  // Draw main chart
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width, H = rect.height;
    const PR = 68, PT = 12, PB = 12;

    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, W, H);

    const CW = 8, GAP = 2, step = CW + GAP;
    const maxVis = Math.floor((W - PR) / step);
    const visible = candles.slice(-maxVis);
    if (visible.length === 0) return;

    let hi = -Infinity, lo = Infinity;
    for (const c of visible) { if (c.high > hi) hi = c.high; if (c.low < lo) lo = c.low; }
    const range = hi - lo || 1;
    hi += range * 0.1; lo -= range * 0.1;

    const toY = (v: number) => PT + ((hi - v) / (hi - lo)) * (H - PT - PB);
    const chartW = W - PR;
    const offsetX = chartW - visible.length * step;

    // Price axis bg
    ctx.fillStyle = '#1e222d';
    ctx.fillRect(W - PR, 0, PR, H);
    ctx.strokeStyle = '#2a2e39';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W - PR, 0); ctx.lineTo(W - PR, H); ctx.stroke();

    // Grid
    const rawStep = range / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    let gridStep = mag;
    for (const s of [1, 2, 2.5, 5, 10]) { if (s * mag >= rawStep) { gridStep = s * mag; break; } }
    ctx.strokeStyle = '#1e222d'; ctx.lineWidth = 1;
    for (let v = Math.ceil(lo / gridStep) * gridStep; v <= hi; v += gridStep) {
      const y = toY(v);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
      ctx.fillStyle = '#555e6d'; ctx.font = '11px monospace'; ctx.textAlign = 'right';
      ctx.fillText(v.toFixed(2), W - 8, y + 4);
    }
    for (let i = 0; i < visible.length; i += 10) {
      const x = offsetX + i * step + step / 2;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Candles
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const cx = offsetX + i * step + CW / 2;
      const x = cx - CW / 2;
      const up = c.close >= c.open;
      const color = up ? '#26a69a' : '#ef5350';
      const bt = toY(Math.max(c.open, c.close));
      const bb = toY(Math.min(c.open, c.close));
      const bh = Math.max(1, bb - bt);

      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, toY(c.high)); ctx.lineTo(cx, toY(c.low)); ctx.stroke();

      if (up) {
        ctx.strokeStyle = '#26a69a'; ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, bt + 0.5, CW - 1, Math.max(1, bh - 1));
      } else {
        ctx.fillStyle = '#ef5350';
        ctx.fillRect(x, bt, CW, bh);
      }
    }

    // Trade markers on chart
    const candleStartIdx = candles.length - visible.length;
    for (const trade of trades) {
      // Find which candle this trade falls in
      const tradeTime = trade.time;
      let candleIdx = -1;
      const allTicks = ticksRef.current;
      // Map trade time to approximate candle index
      for (let ci = candleStartIdx; ci < candles.length; ci++) {
        const bucketStart = allTicks[0].time + ci * intervalMs;
        if (tradeTime >= bucketStart && tradeTime < bucketStart + intervalMs) {
          candleIdx = ci - candleStartIdx;
          break;
        }
      }
      if (candleIdx < 0 || candleIdx >= visible.length) continue;

      const cx = offsetX + candleIdx * step + CW / 2;
      const isBuy = trade.type === 'buy';
      const my = isBuy ? toY(visible[candleIdx].low) + 12 : toY(visible[candleIdx].high) - 12;

      // Triangle marker
      ctx.fillStyle = isBuy ? '#26a69a' : '#ef5350';
      ctx.beginPath();
      if (isBuy) {
        ctx.moveTo(cx, my - 6); ctx.lineTo(cx - 5, my + 4); ctx.lineTo(cx + 5, my + 4);
      } else {
        ctx.moveTo(cx, my + 6); ctx.lineTo(cx - 5, my - 4); ctx.lineTo(cx + 5, my - 4);
      }
      ctx.closePath(); ctx.fill();
    }

    // Current price line
    const priceY = toY(stockPrice);
    const priceColor = lastChange >= 0 ? '#26a69a' : '#ef5350';
    ctx.setLineDash([3, 3]); ctx.strokeStyle = priceColor + '80'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, priceY); ctx.lineTo(chartW, priceY); ctx.stroke();
    ctx.setLineDash([]);

    // Price label
    const lx = W - PR + 1, lh = 20;
    ctx.fillStyle = priceColor;
    ctx.beginPath(); ctx.roundRect(lx, priceY - lh / 2, PR - 2, lh, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText(stockPrice.toFixed(2), W - PR / 2, priceY + 4);

    // Avg cost line
    if (sharesOwned > 0 && avgCost >= lo && avgCost <= hi) {
      const cy = toY(avgCost);
      ctx.setLineDash([2, 4]); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(chartW, cy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.roundRect(lx, cy - lh / 2, PR - 2, lh, 3); ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('AVG ' + avgCost.toFixed(2), W - PR / 2, cy + 4);
    }
  }, [candles, stockPrice, lastChange, sharesOwned, avgCost, renderTick, trades, intervalMs]);

  // Draw equity curve
  const drawEquity = useCallback(() => {
    const canvas = equityCanvasRef.current;
    if (!canvas || equityHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width, H = rect.height;
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, W, H);

    const pts = equityHistory;
    let hi = -Infinity, lo = Infinity;
    for (const p of pts) { if (p.equity > hi) hi = p.equity; if (p.equity < lo) lo = p.equity; }
    // Include starting balance in range
    hi = Math.max(hi, STARTING_BALANCE); lo = Math.min(lo, STARTING_BALANCE);
    const range = hi - lo || 1;
    hi += range * 0.05; lo -= range * 0.05;

    const toX = (i: number) => (i / (pts.length - 1)) * W;
    const toY = (v: number) => 2 + ((hi - v) / (hi - lo)) * (H - 4);

    // Starting balance line
    const baseY = toY(STARTING_BALANCE);
    ctx.setLineDash([2, 4]); ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(W, baseY); ctx.stroke();
    ctx.setLineDash([]);

    // Fill under curve
    const lastEq = pts[pts.length - 1].equity;
    const curveColor = lastEq >= STARTING_BALANCE ? '#26a69a' : '#ef5350';

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(pts[0].equity));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(toX(i), toY(pts[i].equity));
    ctx.lineTo(toX(pts.length - 1), H);
    ctx.lineTo(toX(0), H);
    ctx.closePath();
    ctx.fillStyle = curveColor + '15';
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(pts[0].equity));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(toX(i), toY(pts[i].equity));
    ctx.strokeStyle = curveColor; ctx.lineWidth = 1.5; ctx.stroke();
  }, [equityHistory]);

  useEffect(() => { drawChart(); drawEquity(); }, [drawChart, drawEquity, stockPrice]);
  useEffect(() => {
    const h = () => { drawChart(); drawEquity(); };
    window.addEventListener('resize', h); return () => window.removeEventListener('resize', h);
  }, [drawChart, drawEquity]);

  // Flash effect
  useEffect(() => {
    if (flash) {
      const t = setTimeout(() => setFlash(null), 300);
      return () => clearTimeout(t);
    }
  }, [flash]);

  // Actions
  const buy = (qty: number) => {
    const actual = Math.min(qty, maxShares);
    if (actual < 1) { setGameMessage('Not enough cash.'); return; }
    const cost = actual * stockPrice;
    const tc = avgCost * sharesOwned + cost;
    const ts = sharesOwned + actual;
    setAvgCost(ts > 0 ? tc / ts : 0);
    setBalance(prev => prev - cost);
    setSharesOwned(prev => prev + actual);
    setTrades(prev => [...prev, { type: 'buy', price: stockPrice, qty: actual, time: Date.now() }]);
    setFlash('buy');
    setGameMessage(`Bought ${actual} @ $${stockPrice.toFixed(2)}`);
  };

  const sell = (qty: number) => {
    const actual = Math.min(qty, sharesOwned);
    if (actual < 1) { setGameMessage('No shares to sell.'); return; }
    const proceeds = actual * stockPrice;
    const costBasis = actual * avgCost;
    const pnl = proceeds - costBasis;
    setRealizedPnL(prev => prev + pnl);
    setBalance(prev => prev + proceeds);
    setSharesOwned(prev => prev - actual);
    if (sharesOwned - actual === 0) setAvgCost(0);
    setTrades(prev => [...prev, { type: 'sell', price: stockPrice, qty: actual, time: Date.now(), pnl }]);
    setFlash('sell');
    setGameMessage(`Sold ${actual} @ $${stockPrice.toFixed(2)} (${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)})`);
  };

  const reset = () => {
    setBalance(STARTING_BALANCE);
    setStockPrice(STARTING_PRICE);
    setSharesOwned(0); setAvgCost(0); setRealizedPnL(0);
    ticksRef.current = generateSeedTicks(STARTING_PRICE, 7200);
    setTrades([]); setEquityHistory([]);
    setPeakEquity(STARTING_BALANCE); setMaxDrawdown(0);
    setRenderTick(t => t + 1); setLastChange(0);
    setGameMessage('Fresh start.');
  };

  const pc = (v: number) => v > 0 ? 'text-[#26a69a]' : v < 0 ? 'text-[#ef5350]' : 'text-gray-500';

  return (
    <div
      className={cn("flex flex-col h-screen overflow-hidden transition-colors duration-300")}
      style={{
        background: flash === 'buy' ? '#0a1f1a' : flash === 'sell' ? '#1f0a0a' : '#131722',
      }}
    >
      {/* Header */}
      <header className="px-3 py-2 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #2a2e39' }}>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
            <Link href="/games"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="font-bold text-sm text-gray-200">TT / USD</span>
        </div>
        <div className="flex items-center gap-1">
          {Object.keys(TIMEFRAMES).map(tf => (
            <Button key={tf} variant={timeframe === tf ? 'default' : 'ghost'} size="sm"
              className={cn("h-7 px-2 text-xs", timeframe !== tf && "text-gray-400")}
              onClick={() => { setTimeframe(tf); setRenderTick(t => t + 1); }}>
              {tf}
            </Button>
          ))}
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-400 hover:text-white" onClick={() => setPaused(!paused)}>
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-400 hover:text-white" onClick={reset}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </header>

      {/* Price */}
      <div className="px-3 pt-2 pb-1 shrink-0 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-mono font-bold text-gray-100">${stockPrice.toFixed(2)}</span>
        <span className={cn("text-xs font-mono font-medium flex items-center gap-0.5", lastChange >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]')}>
          {lastChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {lastChange >= 0 ? '+' : ''}{lastChange.toFixed(2)} ({stockPrice > 0 ? ((lastChange / (stockPrice - lastChange)) * 100).toFixed(2) : '0.00'}%)
        </span>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 px-2">
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>

      {/* Equity curve */}
      {equityHistory.length > 2 && (
        <div className="h-16 px-2 shrink-0" style={{ borderTop: '1px solid #1e222d' }}>
          <canvas ref={equityCanvasRef} className="w-full h-full" style={{ display: 'block' }} />
        </div>
      )}

      {/* Stats */}
      <div className="px-3 py-1.5 shrink-0" style={{ borderTop: '1px solid #2a2e39' }}>
        <div className="grid grid-cols-6 gap-1">
          <div className="rounded p-1.5" style={{ background: '#1e222d' }}>
            <p className="text-[9px] text-gray-500">Cash</p>
            <p className="text-xs font-mono font-bold text-gray-200">${balance.toFixed(0)}</p>
          </div>
          <div className="rounded p-1.5" style={{ background: '#1e222d' }}>
            <p className="text-[9px] text-gray-500">Equity</p>
            <p className="text-xs font-mono font-bold text-gray-200">${equity.toFixed(0)}</p>
          </div>
          <div className="rounded p-1.5" style={{ background: '#1e222d' }}>
            <p className="text-[9px] text-gray-500">Return</p>
            <p className={cn("text-xs font-mono font-bold", pc(returnPct))}>
              {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded p-1.5" style={{ background: '#1e222d' }}>
            <p className="text-[9px] text-gray-500">Win Rate</p>
            <p className="text-xs font-mono font-bold text-gray-200">{totalSells > 0 ? `${winRate.toFixed(0)}%` : '—'}</p>
          </div>
          <div className="rounded p-1.5" style={{ background: '#1e222d' }}>
            <p className="text-[9px] text-gray-500">Max DD</p>
            <p className="text-xs font-mono font-bold text-[#ef5350]">{maxDrawdown > 0 ? `-${maxDrawdown.toFixed(1)}%` : '—'}</p>
          </div>
          <div className="rounded p-1.5" style={{ background: '#1e222d' }}>
            <p className="text-[9px] text-gray-500">Trades</p>
            <p className="text-xs font-mono font-bold text-gray-200">
              {totalSells > 0 ? <><span className="text-[#26a69a]">{winningTrades}W</span> <span className="text-[#ef5350]">{losingTrades}L</span></> : `${trades.length}`}
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      <p className="text-xs text-gray-500 text-center px-3 shrink-0">{gameMessage}</p>

      {/* Actions */}
      <div className="px-3 py-2 space-y-1.5 shrink-0">
        {sharesOwned > 0 && (
          <div className="flex items-center justify-between text-[10px] px-0.5 text-gray-500">
            <span>{sharesOwned} shares @ ${avgCost.toFixed(2)}</span>
            <span className={pc(unrealizedPnL)}>Unreal: {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}</span>
            <span className={pc(realizedPnL)}>Real: {realizedPnL >= 0 ? '+' : ''}${realizedPnL.toFixed(2)}</span>
          </div>
        )}
        <div className="grid grid-cols-4 gap-1.5">
          <Button onClick={() => buy(1)} size="sm" className="bg-[#26a69a] hover:bg-[#2bbd8e] text-white text-xs h-9">Buy 1</Button>
          <Button onClick={() => buy(5)} size="sm" className="bg-[#26a69a] hover:bg-[#2bbd8e] text-white text-xs h-9">Buy 5</Button>
          <Button onClick={() => buy(10)} size="sm" className="bg-[#26a69a] hover:bg-[#2bbd8e] text-white text-xs h-9">Buy 10</Button>
          <Button onClick={() => buy(maxShares)} size="sm" className="bg-[#26a69a] hover:bg-[#2bbd8e] text-white text-xs h-9" disabled={maxShares < 1}>All In</Button>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <Button onClick={() => sell(1)} size="sm" variant="destructive" className="text-xs h-9">Sell 1</Button>
          <Button onClick={() => sell(5)} size="sm" variant="destructive" className="text-xs h-9">Sell 5</Button>
          <Button onClick={() => sell(10)} size="sm" variant="destructive" className="text-xs h-9">Sell 10</Button>
          <Button onClick={() => sell(sharesOwned)} size="sm" variant="destructive" className="text-xs h-9" disabled={sharesOwned < 1}>Sell All</Button>
        </div>
      </div>

      <LiveTicker />
    </div>
  );
}
