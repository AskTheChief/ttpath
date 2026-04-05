
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, RotateCcw, Play, Pause, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const STARTING_BALANCE = 10000;

type TickerData = { ticker: string; price: number; change: number; changePct: number };

function LiveTicker() {
  const [tickers, setTickers] = useState<TickerData[]>([]);

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const resp = await fetch('/api/market');
        const data = await resp.json();
        if (data.tickers) setTickers(data.tickers);
      } catch (e) { /* silent */ }
    };
    fetchTickers();
    const interval = setInterval(fetchTickers, 30000);
    return () => clearInterval(interval);
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
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker-scroll {
          animation: ticker-scroll 25s linear infinite;
        }
      `}</style>
    </div>
  );
}
const STARTING_PRICE = 100;
const CANDLE_TICKS = 5; // Ticks per candle

type Candle = { open: number; high: number; low: number; close: number };

export default function TradingSimPage() {
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [stockPrice, setStockPrice] = useState(STARTING_PRICE);
  const [sharesOwned, setSharesOwned] = useState(0);
  const [avgCost, setAvgCost] = useState(0);
  const [realizedPnL, setRealizedPnL] = useState(0);
  const [gameMessage, setGameMessage] = useState('Buy low, sell high. Or don\'t.');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentCandle, setCurrentCandle] = useState<Candle>({ open: STARTING_PRICE, high: STARTING_PRICE, low: STARTING_PRICE, close: STARTING_PRICE });
  const [speed, setSpeed] = useState(800);
  const [paused, setPaused] = useState(false);
  const [tradeCount, setTradeCount] = useState(0);
  const [lastChange, setLastChange] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef(0);
  const candleRef = useRef<Candle>({ open: STARTING_PRICE, high: STARTING_PRICE, low: STARTING_PRICE, close: STARTING_PRICE });

  // Derived
  const equity = balance + sharesOwned * stockPrice;
  const unrealizedPnL = sharesOwned > 0 ? (stockPrice - avgCost) * sharesOwned : 0;
  const totalPnL = realizedPnL + unrealizedPnL;
  const maxShares = Math.floor(balance / stockPrice);

  // Price engine — uses refs to avoid stale closures
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setStockPrice(prev => {
        let pctChange = (Math.random() - 0.5) * 0.025;
        if (Math.random() < 0.04) pctChange *= 3.5;
        const next = Math.max(0.5, prev * (1 + pctChange));
        setLastChange(next - prev);

        // Update current candle via ref
        const c = candleRef.current;
        c.high = Math.max(c.high, next);
        c.low = Math.min(c.low, next);
        c.close = next;
        setCurrentCandle({ ...c });

        tickRef.current += 1;
        if (tickRef.current >= CANDLE_TICKS) {
          // Finalize candle
          setCandles(prev => [...prev, { ...c }].slice(-120));
          // Start new candle
          candleRef.current = { open: next, high: next, low: next, close: next };
          setCurrentCandle({ open: next, high: next, low: next, close: next });
          tickRef.current = 0;
        }

        return next;
      });
    }, speed);
    return () => clearInterval(interval);
  }, [speed, paused]);

  // Draw candles
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

    const W = rect.width;
    const H = rect.height;
    const PADDING_RIGHT = 60;
    const PADDING_TOP = 8;
    const PADDING_BOTTOM = 8;

    ctx.clearRect(0, 0, W, H);

    const allCandles = [...candles, currentCandle];
    const maxVisible = Math.floor((W - PADDING_RIGHT) / 8);
    const visible = allCandles.slice(-maxVisible);

    if (visible.length === 0) return;

    let hi = -Infinity, lo = Infinity;
    for (const c of visible) {
      if (c.high > hi) hi = c.high;
      if (c.low < lo) lo = c.low;
    }
    const range = hi - lo || 1;
    const margin = range * 0.08;
    hi += margin;
    lo -= margin;

    const toY = (v: number) => PADDING_TOP + ((hi - v) / (hi - lo)) * (H - PADDING_TOP - PADDING_BOTTOM);

    const candleWidth = Math.max(3, Math.floor((W - PADDING_RIGHT) / visible.length) - 2);
    const gap = Math.max(1, Math.floor(candleWidth * 0.3));

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const v = lo + (range + 2 * margin) * (i / gridSteps);
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W - PADDING_RIGHT, y);
      ctx.stroke();

      ctx.fillStyle = '#555';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('$' + v.toFixed(2), W - PADDING_RIGHT + 6, y + 4);
    }

    // Candles
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = i * (candleWidth + gap);
      const isUp = c.close >= c.open;
      const color = isUp ? '#22c55e' : '#ef4444';
      const bodyTop = toY(Math.max(c.open, c.close));
      const bodyBottom = toY(Math.min(c.open, c.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, toY(c.high));
      ctx.lineTo(x + candleWidth / 2, toY(c.low));
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      if (isUp) {
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.strokeRect(x, bodyTop, candleWidth, bodyHeight);
      } else {
        ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
      }
    }

    // Current price line
    const priceY = toY(stockPrice);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = visible[visible.length - 1].close >= visible[visible.length - 1].open ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, priceY);
    ctx.lineTo(W - PADDING_RIGHT, priceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label
    const labelColor = lastChange >= 0 ? '#22c55e' : '#ef4444';
    ctx.fillStyle = labelColor;
    ctx.fillRect(W - PADDING_RIGHT, priceY - 10, PADDING_RIGHT, 20);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('$' + stockPrice.toFixed(2), W - PADDING_RIGHT + 4, priceY + 4);

    // Avg cost line if holding
    if (sharesOwned > 0 && avgCost >= lo && avgCost <= hi) {
      const costY = toY(avgCost);
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, costY);
      ctx.lineTo(W - PADDING_RIGHT, costY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#fbbf2480';
      ctx.font = '10px monospace';
      ctx.fillText('avg $' + avgCost.toFixed(2), 4, costY - 4);
    }

  }, [candles, currentCandle, stockPrice, lastChange, sharesOwned, avgCost]);

  useEffect(() => { drawChart(); }, [drawChart, stockPrice]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => drawChart();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  // Actions
  const buy = (qty: number) => {
    const actualQty = Math.min(qty, maxShares);
    if (actualQty < 1) { setGameMessage('Not enough cash.'); return; }
    const cost = actualQty * stockPrice;
    const totalCost = avgCost * sharesOwned + cost;
    const totalShares = sharesOwned + actualQty;
    setAvgCost(totalShares > 0 ? totalCost / totalShares : 0);
    setBalance(prev => prev - cost);
    setSharesOwned(prev => prev + actualQty);
    setTradeCount(prev => prev + 1);
    setGameMessage(`Bought ${actualQty} @ $${stockPrice.toFixed(2)}`);
  };

  const sell = (qty: number) => {
    const actualQty = Math.min(qty, sharesOwned);
    if (actualQty < 1) { setGameMessage('No shares to sell.'); return; }
    const proceeds = actualQty * stockPrice;
    const costBasis = actualQty * avgCost;
    const pnl = proceeds - costBasis;
    setRealizedPnL(prev => prev + pnl);
    setBalance(prev => prev + proceeds);
    setSharesOwned(prev => prev - actualQty);
    if (sharesOwned - actualQty === 0) setAvgCost(0);
    setTradeCount(prev => prev + 1);
    setGameMessage(`Sold ${actualQty} @ $${stockPrice.toFixed(2)} (${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)})`);
  };

  const reset = () => {
    setBalance(STARTING_BALANCE);
    setStockPrice(STARTING_PRICE);
    setSharesOwned(0);
    setAvgCost(0);
    setRealizedPnL(0);
    setCandles([]);
    setCurrentCandle({ open: STARTING_PRICE, high: STARTING_PRICE, low: STARTING_PRICE, close: STARTING_PRICE });
    candleRef.current = { open: STARTING_PRICE, high: STARTING_PRICE, low: STARTING_PRICE, close: STARTING_PRICE };
    tickRef.current = 0;
    setGameMessage('Fresh start.');
    setTradeCount(0);
    setLastChange(0);
  };

  const pnlColor = (v: number) => v > 0 ? 'text-green-500' : v < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/games"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="font-bold text-sm">Trading Sim</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setPaused(!paused)}>
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button variant={speed === 800 ? 'default' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setSpeed(800)}>1x</Button>
          <Button variant={speed === 400 ? 'default' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setSpeed(400)}>2x</Button>
          <Button variant={speed === 150 ? 'default' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setSpeed(150)}>
            <Zap className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={reset}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </header>

      {/* Price */}
      <div className="px-3 pt-2 pb-1 shrink-0 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-mono font-bold">${stockPrice.toFixed(2)}</span>
        <span className={cn("text-xs font-mono font-medium flex items-center gap-0.5", lastChange >= 0 ? 'text-green-500' : 'text-red-500')}>
          {lastChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {lastChange >= 0 ? '+' : ''}{lastChange.toFixed(2)} ({stockPrice > 0 ? ((lastChange / (stockPrice - lastChange)) * 100).toFixed(2) : '0.00'}%)
        </span>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 px-2">
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }}></canvas>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5 px-3 py-2 shrink-0">
        <div className="bg-muted/50 rounded-md p-2">
          <p className="text-[10px] text-muted-foreground">Cash</p>
          <p className="text-sm font-mono font-bold">${balance.toFixed(0)}</p>
        </div>
        <div className="bg-muted/50 rounded-md p-2">
          <p className="text-[10px] text-muted-foreground">Equity</p>
          <p className="text-sm font-mono font-bold">${equity.toFixed(0)}</p>
        </div>
        <div className="bg-muted/50 rounded-md p-2">
          <p className="text-[10px] text-muted-foreground">Shares</p>
          <p className="text-sm font-mono font-bold">{sharesOwned}</p>
        </div>
        <div className="bg-muted/50 rounded-md p-2">
          <p className="text-[10px] text-muted-foreground">P&L</p>
          <p className={cn("text-sm font-mono font-bold", pnlColor(totalPnL))}>
            {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Message */}
      <p className="text-xs text-muted-foreground text-center px-3 shrink-0">{gameMessage}</p>

      {/* Actions */}
      <div className="px-3 py-3 space-y-1.5 shrink-0">
        {sharesOwned > 0 && (
          <div className="flex items-center justify-between text-[10px] px-0.5 text-muted-foreground">
            <span>Avg: ${avgCost.toFixed(2)}</span>
            <span>Unreal: <span className={pnlColor(unrealizedPnL)}>{unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}</span></span>
            <span>Real: <span className={pnlColor(realizedPnL)}>{realizedPnL >= 0 ? '+' : ''}${realizedPnL.toFixed(2)}</span></span>
            <span>{tradeCount} trades</span>
          </div>
        )}
        <div className="grid grid-cols-4 gap-1.5">
          <Button onClick={() => buy(1)} size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-10">Buy 1</Button>
          <Button onClick={() => buy(5)} size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-10">Buy 5</Button>
          <Button onClick={() => buy(10)} size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-10">Buy 10</Button>
          <Button onClick={() => buy(maxShares)} size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-10" disabled={maxShares < 1}>All In</Button>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <Button onClick={() => sell(1)} size="sm" variant="destructive" className="text-xs h-10">Sell 1</Button>
          <Button onClick={() => sell(5)} size="sm" variant="destructive" className="text-xs h-10">Sell 5</Button>
          <Button onClick={() => sell(10)} size="sm" variant="destructive" className="text-xs h-10">Sell 10</Button>
          <Button onClick={() => sell(sharesOwned)} size="sm" variant="destructive" className="text-xs h-10" disabled={sharesOwned < 1}>Sell All</Button>
        </div>
      </div>

      {/* Live ticker */}
      <LiveTicker />
    </div>
  );
}
