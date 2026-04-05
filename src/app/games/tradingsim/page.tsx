
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
const TIMEFRAMES: Record<string, number> = {
  '1s': 2,
  '5s': 10,
  '10s': 20,
  '30s': 60,
  '1m': 120,
};

type Candle = { open: number; high: number; low: number; close: number };

function generateSeedCandles(startPrice: number, count: number): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    const open = price;
    let hi = open, lo = open;
    // Simulate several ticks per candle
    for (let t = 0; t < 10; t++) {
      let pct = (Math.random() - 0.5) * 0.008;
      if (Math.random() < 0.03) pct *= 4;
      price = Math.max(0.5, price * (1 + pct));
      hi = Math.max(hi, price);
      lo = Math.min(lo, price);
    }
    candles.push({ open, high: hi, low: lo, close: price });
  }
  return candles;
}

export default function TradingSimPage() {
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [stockPrice, setStockPrice] = useState(STARTING_PRICE);
  const [sharesOwned, setSharesOwned] = useState(0);
  const [avgCost, setAvgCost] = useState(0);
  const [realizedPnL, setRealizedPnL] = useState(0);
  const [gameMessage, setGameMessage] = useState('Buy low, sell high. Or don\'t.');
  const [seedData] = useState(() => {
    const seed = generateSeedCandles(STARTING_PRICE, 60);
    const lastClose = seed[seed.length - 1].close;
    return { candles: seed, lastClose };
  });
  const [candles, setCandles] = useState<Candle[]>(seedData.candles);
  const [currentCandle, setCurrentCandle] = useState<Candle>({ open: seedData.lastClose, high: seedData.lastClose, low: seedData.lastClose, close: seedData.lastClose });
  const [speed] = useState(250); // ~4 ticks per second, realistic feel
  const [timeframe, setTimeframe] = useState('5s');
  const candleTicks = TIMEFRAMES[timeframe];
  const [paused, setPaused] = useState(false);
  const [tradeCount, setTradeCount] = useState(0);
  const [lastChange, setLastChange] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef(0);
  const candleRef = useRef<Candle>({ open: seedData.lastClose, high: seedData.lastClose, low: seedData.lastClose, close: seedData.lastClose });

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
        let pctChange = (Math.random() - 0.5) * 0.008;
        if (Math.random() < 0.03) pctChange *= 4; // occasional spike
        const next = Math.max(0.5, prev * (1 + pctChange));
        setLastChange(next - prev);

        // Update current candle via ref
        const c = candleRef.current;
        c.high = Math.max(c.high, next);
        c.low = Math.min(c.low, next);
        c.close = next;
        setCurrentCandle({ ...c });

        tickRef.current += 1;
        if (tickRef.current >= candleTicks) {
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
  }, [speed, paused, candleTicks]);

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
    const PR = 68; // right padding for price axis
    const PT = 12;
    const PB = 12;

    // Background
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, W, H);

    const allCandles = [...candles, currentCandle];
    const CANDLE_W = 8; // fixed candle body width
    const GAP = 2;      // fixed gap between candles
    const candleStep = CANDLE_W + GAP;
    const maxVisible = Math.floor((W - PR) / candleStep);
    const visible = allCandles.slice(-maxVisible);

    if (visible.length === 0) return;

    let hi = -Infinity, lo = Infinity;
    for (const c of visible) {
      if (c.high > hi) hi = c.high;
      if (c.low < lo) lo = c.low;
    }
    const range = hi - lo || 1;
    const margin = range * 0.1;
    hi += margin;
    lo -= margin;

    const toY = (v: number) => PT + ((hi - v) / (hi - lo)) * (H - PT - PB);

    // Right-align candles so they grow from the right edge
    const chartWidth = W - PR;
    const totalCandlesWidth = visible.length * candleStep;
    const offsetX = chartWidth - totalCandlesWidth;

    // Price axis background
    ctx.fillStyle = '#1e222d';
    ctx.fillRect(W - PR, 0, PR, H);

    // Separator line
    ctx.strokeStyle = '#2a2e39';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W - PR, 0);
    ctx.lineTo(W - PR, H);
    ctx.stroke();

    // Horizontal grid + price labels — nice round numbers
    const rawStep = range / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const niceSteps = [1, 2, 2.5, 5, 10];
    let gridStep = niceSteps[0] * magnitude;
    for (const s of niceSteps) {
      if (s * magnitude >= rawStep) { gridStep = s * magnitude; break; }
    }

    const gridStart = Math.ceil(lo / gridStep) * gridStep;
    ctx.strokeStyle = '#1e222d';
    ctx.lineWidth = 1;
    for (let v = gridStart; v <= hi; v += gridStep) {
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W - PR, y);
      ctx.stroke();

      ctx.fillStyle = '#555e6d';
      ctx.font = '11px -apple-system, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(v.toFixed(2), W - 8, y + 4);
    }

    // Vertical grid (every 10 candles)
    ctx.strokeStyle = '#1e222d';
    for (let i = 0; i < visible.length; i += 10) {
      const x = offsetX + i * candleStep + candleStep / 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Candles
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const cx = offsetX + i * candleStep + CANDLE_W / 2;
      const x = cx - CANDLE_W / 2;
      const isUp = c.close >= c.open;

      const upColor = '#26a69a';
      const downColor = '#ef5350';
      const color = isUp ? upColor : downColor;

      const bodyTop = toY(Math.max(c.open, c.close));
      const bodyBottom = toY(Math.min(c.open, c.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, toY(c.high));
      ctx.lineTo(cx, toY(c.low));
      ctx.stroke();

      // Body
      if (isUp) {
        // Hollow candle for up
        ctx.strokeStyle = upColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, bodyTop + 0.5, CANDLE_W - 1, Math.max(1, bodyHeight - 1));
      } else {
        // Filled candle for down
        ctx.fillStyle = downColor;
        ctx.fillRect(x, bodyTop, CANDLE_W, bodyHeight);
      }
    }

    // Current price line
    const priceY = toY(stockPrice);
    const priceUp = lastChange >= 0;
    const priceColor = priceUp ? '#26a69a' : '#ef5350';

    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = priceColor + '80';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, priceY);
    ctx.lineTo(W - PR, priceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label on axis
    const labelH = 20;
    ctx.fillStyle = priceColor;
    // Rounded rect
    const lx = W - PR + 1;
    const ly = priceY - labelH / 2;
    ctx.beginPath();
    ctx.roundRect(lx, ly, PR - 2, labelH, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px -apple-system, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(stockPrice.toFixed(2), W - PR / 2, priceY + 4);

    // Avg cost line
    if (sharesOwned > 0 && avgCost >= lo && avgCost <= hi) {
      const costY = toY(avgCost);
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, costY);
      ctx.lineTo(W - PR, costY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Avg label
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(lx, costY - labelH / 2, PR - 2, labelH, 3);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px -apple-system, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('AVG ' + avgCost.toFixed(2), W - PR / 2, costY + 4);
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
    const newSeed = generateSeedCandles(STARTING_PRICE, 60);
    const lc = newSeed[newSeed.length - 1].close;
    setCandles(newSeed);
    setCurrentCandle({ open: lc, high: lc, low: lc, close: lc });
    candleRef.current = { open: lc, high: lc, low: lc, close: lc };
    tickRef.current = 0;
    setGameMessage('Fresh start.');
    setTradeCount(0);
    setLastChange(0);
  };

  const pnlColor = (v: number) => v > 0 ? 'text-green-500' : v < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#131722' }}>
      {/* Header */}
      <header className="px-3 py-2 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #2a2e39' }}>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
            <Link href="/games"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="font-bold text-sm text-gray-200">RANDOM / USD</span>
          <span className="text-[10px] text-gray-500 ml-1">Sim</span>
        </div>
        <div className="flex items-center gap-1">
          {Object.keys(TIMEFRAMES).map(tf => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'default' : 'ghost'}
              size="sm"
              className={cn("h-7 px-2 text-xs", timeframe !== tf && "text-gray-400")}
              onClick={() => {
                setTimeframe(tf);
                // Start a new candle at current price but keep history
                candleRef.current = { open: stockPrice, high: stockPrice, low: stockPrice, close: stockPrice };
                setCurrentCandle({ ...candleRef.current });
                tickRef.current = 0;
              }}
            >
              {tf}
            </Button>
          ))}
          <div className="w-px h-4 bg-gray-700 mx-1"></div>
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
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }}></canvas>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5 px-3 py-2 shrink-0" style={{ borderTop: '1px solid #2a2e39' }}>
        <div className="rounded-md p-2" style={{ background: '#1e222d' }}>
          <p className="text-[10px] text-gray-500">Cash</p>
          <p className="text-sm font-mono font-bold text-gray-200">${balance.toFixed(0)}</p>
        </div>
        <div className="rounded-md p-2" style={{ background: '#1e222d' }}>
          <p className="text-[10px] text-gray-500">Equity</p>
          <p className="text-sm font-mono font-bold text-gray-200">${equity.toFixed(0)}</p>
        </div>
        <div className="rounded-md p-2" style={{ background: '#1e222d' }}>
          <p className="text-[10px] text-gray-500">Shares</p>
          <p className="text-sm font-mono font-bold text-gray-200">{sharesOwned}</p>
        </div>
        <div className="rounded-md p-2" style={{ background: '#1e222d' }}>
          <p className="text-[10px] text-gray-500">P&L</p>
          <p className={cn("text-sm font-mono font-bold", totalPnL > 0 ? 'text-[#26a69a]' : totalPnL < 0 ? 'text-[#ef5350]' : 'text-gray-500')}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Message */}
      <p className="text-xs text-gray-500 text-center px-3 shrink-0">{gameMessage}</p>

      {/* Actions */}
      <div className="px-3 py-3 space-y-1.5 shrink-0">
        {sharesOwned > 0 && (
          <div className="flex items-center justify-between text-[10px] px-0.5 text-gray-500">
            <span>Avg: ${avgCost.toFixed(2)}</span>
            <span>Unreal: <span className={pnlColor(unrealizedPnL)}>{unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}</span></span>
            <span>Real: <span className={pnlColor(realizedPnL)}>{realizedPnL >= 0 ? '+' : ''}${realizedPnL.toFixed(2)}</span></span>
            <span>{tradeCount} trades</span>
          </div>
        )}
        <div className="grid grid-cols-4 gap-1.5">
          <Button onClick={() => buy(1)} size="sm" className="bg-[#26a69a] hover:bg-[#2bbd8e] text-white text-xs h-10">Buy 1</Button>
          <Button onClick={() => buy(5)} size="sm" className="bg-[#26a69a] hover:bg-[#2bbd8e] text-white text-xs h-10">Buy 5</Button>
          <Button onClick={() => buy(10)} size="sm" className="bg-[#26a69a] hover:bg-[#2bbd8e] text-white text-xs h-10">Buy 10</Button>
          <Button onClick={() => buy(maxShares)} size="sm" className="bg-[#26a69a] hover:bg-[#2bbd8e] text-white text-xs h-10" disabled={maxShares < 1}>All In</Button>
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
