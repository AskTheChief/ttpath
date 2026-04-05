
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, RotateCcw, Play, Pause, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = {
  name: string;
  bg: string;
  panel: string;
  grid: string;
  border: string;
  text: string;
  textMuted: string;
  up: string;
  down: string;
  flashBuy: string;
  flashSell: string;
};

const THEMES: Record<string, Theme> = {
  midnight: {
    name: 'Midnight', bg: '#131722', panel: '#1e222d', grid: '#1e222d', border: '#2a2e39',
    text: '#d1d4dc', textMuted: '#555e6d', up: '#26a69a', down: '#ef5350',
    flashBuy: '#0a1f1a', flashSell: '#1f0a0a',
  },
  forest: {
    name: 'Forest', bg: '#0a1a0f', panel: '#112215', grid: '#15291a', border: '#1e3a24',
    text: '#c8e6c9', textMuted: '#5a7d5e', up: '#4caf50', down: '#e57373',
    flashBuy: '#0d2a12', flashSell: '#2a0d0d',
  },
  light: {
    name: 'Light', bg: '#fafafa', panel: '#f0f0f0', grid: '#e8e8e8', border: '#ddd',
    text: '#1a1a1a', textMuted: '#888', up: '#16a34a', down: '#dc2626',
    flashBuy: '#ecfdf5', flashSell: '#fef2f2',
  },
  ocean: {
    name: 'Ocean', bg: '#0c1929', panel: '#132238', grid: '#16293f', border: '#1e3a55',
    text: '#b8d4e8', textMuted: '#4a7a9d', up: '#00bcd4', down: '#ff7043',
    flashBuy: '#0a2233', flashSell: '#220a0a',
  },
};

const STARTING_BALANCE = 10000;
const STARTING_PRICE = 100;
const TIMEFRAMES: Record<string, number> = { '1s': 2, '5s': 10, '10s': 20, '30s': 60, '1m': 120 };

type TickerData = { ticker: string; price: number; change: number; changePct: number };
type Candle = { open: number; high: number; low: number; close: number };
type Tick = { price: number; time: number };
type Trade = { type: 'buy' | 'sell' | 'short' | 'cover'; price: number; qty: number; time: number; pnl?: number };

function LiveTicker() {
  const [tickers, setTickers] = useState<TickerData[]>([]);
  useEffect(() => {
    // Simulated ticker data — no real market data (licensing)
    const allTickers = [
      'FOMO','HODL','YOLO','MOON','BAGS','DIPS','REKT','WHIP','PUMP','DUMP','BULL','BEAR','STONK','TENDZ',
      'LAMBO','BRRRR','CHAD','COPE','SHILL','WAGMI','NGMI','GWEI','SATS','DEFI','NOPE','OOPS','PANIC',
      'CHILL','VIBES','SNACK','TACO','PIZZA','DONUT','BAGEL','SUSHI','RAMEN','WAFFLE','BACON','TOAST',
      'GRAVY','BEANS','STEAK','FRIES','NACHO','SALSA','GUAC','MANGO','PEACH','LEMON','GRAPE','MELON',
      'BERRY','PLUM','KIWI','FIG','LIME','PEAR','APPLE','CHERRY','OLIVE','ONION','CORN','RICE','WHEAT',
      'OATS','HONEY','SUGAR','SPICE','COCOA','MOCHA','LATTE','BREW','FOAM','DRIP','SIPPY','GULP','CHUG',
      'BURP','HICCUP','SNEEZ','YAWN','BLINK','WINK','GRIN','SMIRK','BLUSH','FROWN','POUT','GIGGL',
      'LAUGH','SNORT','HOWL','GROWL','PURR','MEOW','WOOF','BARK','QUACK','OINK','MOO','NEIGH','ROAR',
      'HISS','CHIRP','TWEET','HONK','CROAK','BUZZ','STING','SWARM','HIVE','NEST','BURRO','LLAMA',
      'ALPCA','PANDA','KOALA','SLOTH','OTTER','BEAVR','MOOSE','GOOSE','DUCKY','BUNNY','PUPPY','KITTY',
      'FISHY','SHRIMP','SQUID','CRAB','CLAM','SNAIL','SLUG','WORM','FROG','TOAD','NEWT','GECKO',
      'CHAML','IGUNA','COBRA','VIPER','PYTHON','HAWK','EAGLE','RAVEN','CROW','ROBIN','FINCH','WREN',
      'DOVE','SWAN','CRANE','HERON','STORK','PELIC','TOUCN','MACAW','DODO','EMU','KIWIB','OWLET',
      'NINJA','PIRAT','ROBOT','ALIEN','GHOST','WITCH','DWARF','GIANT','TITAN','HYDRA','DRAGO','PHOENIX',
      'GOBLN','TROLL','FAIRY','GNOME','PIXIE','SPRIT','DEMON','ANGEL','SAINT','KNIGT','QUEEN','JOKER',
      'WIZARD','MAGE','DRUID','BARD','MONK','ROGUE','CLERIC','PALLY',
      'BRICK','BLOCK','STACK','TOWER','VAULT','FORGE','ANVIL','SWORD','ARROW','SPEAR','SHIELD','HELM',
      'ARMOR','CLOAK','BOOTS','GLOVE','RING','CROWN','STAFF','WAND','SCROLL','POTION','ELIXR','CHARM',
      'RUNE','SIGIL','GLYPH','TOTEM','AMULET','TALIS',
      'SPEED','TURBO','NITRO','BOOST','BLAST','FLASH','SPARK','FLAME','BLAZE','EMBER','SMOKE','STEAM',
      'FROST','CHILL','FREEZE','THAW','MELT','DRIZZL','STORM','FLOOD','SURGE','WAVE','TIDE','DRIFT',
      'BREEZ','GUST','WIND','TWIRL','SWIRL','SPIN','TWIST','FLIP','BOUNCE','WOBBL','JIGGL','WIGGL',
      'SHAKE','QUAKE','RUMBL','THUMP','STOMP','CRASH','SMASH','BONK','CLONK','BOING','SPLAT','SPLSH',
      'PLOP','DROOL','OOZE','GLOB','SLIME','GOOP','FUZZ','FLUFF','PUFF','CHUNK','CLUMP','LUMP',
      'BLOB','NUGGT','MORSL','CRUMB','SCRAP','SHARD','SPLNTR','CHIP','DENT','DING','SCRATCH',
      'SPARKL','SHIMR','GLEAM','GLOW','SHINE','LUSTRE','GLITZ','BLING','SWAG','DRIP2','FRESH','CRISP',
      'SNAZZY','FANCY','RITZY','PLUSH','CUSHY','COZY','COMFY','SNUG','TOASTY','WARM','FUZZY','SOFT',
      'SMOOTH','SILKY','VELVET','SATIN','DENIM','TWEED','PLAID','STRIP','CHECK','POLKA','NEON','RETRO',
      'DISCO','FUNKY','JAZZY','BLUES','ROCK','METAL','PUNK','INDIE','FOLK','TECHNO','HOUSE','TRANCE',
      'BEATS','BASS','DRUM','SYNTH','KEYS','CHORD','RIFF','SOLO','DUET','TRIO','QUAD','OCTET',
      'TEMPO','PITCH','SCALE','SHARP','FLAT','MAJOR','MINOR','MODAL','TONAL','SONIC','AUDIO','VINYL',
      'TAPE','MIXER','LOOP','SAMPL','REMIX','MASH','DROP','FADE','ECHO2','REVERB','DELAY','PHASER',
      'FLANGR','CHORUS','WHAMMY','FUZZ2','DRIVE','CRUNCH','CLEAN','LOUD','QUIET','MUTE','HUSH',
      'WHSPR','SHOUT','YELL','SCREAM','ROAR2','CHEER','CLAP','SNAP','POP','CRACK','SIZZL','FIZZL',
      'BUBBL','FROTH','CHURN','GRIND','CRUSH','PRESS','SQEEZ','PINCH','POKE','NUDGE','SHOVE','PUSH',
      'PULL','DRAG','LIFT','HEAVE','TOSS','FLING','HURL','CHUCK','LOFT','VOLLY','SERVE','SMASH2',
      'DUNK','SWISH','SCORE','GOAL','WIN','LOSE','DRAW','MATCH','ROUND','GAME','PLAY','PAUSE2',
      'START','RESET','LEVEL','BONUS','COMBO','ULTRA','MEGA','SUPER','HYPER','TURB2','WARP','ZOOM',
      'DASH','SPRINT','BOLT','LEAP','VAULT2','CLIMB','SCALE2','PEAK','SUMIT','CREST','RIDGE','SLOPE',
      'HILL','DUNE','MESA','CLIFF','GORGE','CANYON','RIVER','CREEK','BROOK','POND','LAKE','MARSH',
      'SWAMP','BOG','FERN2','MOSS','VINE','ROOT','TRUNK','BARK2','LEAF','BLOOM','PETAL','THORN',
      'SEED','SPROUT','SHOOT','GROVE','COPSE','THICKT','FOREST','GLADE2','MEADOW','FIELD','PLAIN',
      'PRAIR','STEPPE','TUNDRA','TAIGA','OASIS','DESERT','DUNE2','BEACH','SHORE','COAST','COVE',
      'REEF','ATOLL','ISLE','FJORD','INLET','BAY','GULF','STRAIT','CHANNEL','HARBOR','JETTY','PIER',
      'DOCK','YACHT','CANOE','KAYAK','RAFT','FERRY','CARGO','TANKER','FLEET','MAST','SAIL','ANCHOR',
      'BUOY','BEACON','LIGHTH','TOWER2','FORT','CASTLE','MOAT','DRAWB','TURRET','SPIRE','DOME',
      'ARCH','PILLAR','COLUMN','BEAM','TRUSS','RIVET','BOLT2','SCREW','NAIL','PLANK','BOARD','PANEL',
      'FRAME','JOIST','RAFTER','SHINGLE','SLATE','TILE','BRICK2','STONE','MARBLE','GRANITE','BASALT',
      'QUARTZ','CRYSTAL','PRISM','LENS','MIRROR','GLASS',
    ];
    // Pick 15 random tickers each refresh
    const shuffled = [...allTickers].sort(() => Math.random() - 0.5);
    const symbols = shuffled.slice(0, 15).map(t => ({
      ticker: t, base: Math.round(1 + Math.random() * 999),
    }));
    const generate = () => symbols.map(s => {
      const change = (Math.random() - 0.48) * s.base * 0.03;
      return { ticker: s.ticker, price: s.base + (Math.random() - 0.5) * s.base * 0.1, change, changePct: (change / s.base) * 100 };
    });
    setTickers(generate());
    const i = setInterval(() => setTickers(generate()), 5000);
    return () => clearInterval(i);
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

type CandleWithTime = Candle & { startTime: number };

function ticksToCandles(ticks: Tick[], intervalMs: number): CandleWithTime[] {
  if (ticks.length === 0) return [];
  const candles: CandleWithTime[] = [];
  let bs = ticks[0].time;
  let o = ticks[0].price, h = o, l = o, c = o;
  for (const t of ticks) {
    if (t.time >= bs + intervalMs) {
      candles.push({ open: o, high: h, low: l, close: c, startTime: bs });
      bs += intervalMs * Math.floor((t.time - bs) / intervalMs);
      o = t.price; h = t.price; l = t.price; c = t.price;
    } else {
      h = Math.max(h, t.price); l = Math.min(l, t.price); c = t.price;
    }
  }
  candles.push({ open: o, high: h, low: l, close: c, startTime: bs });
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
  const [sharesShort, setSharesShort] = useState(0);
  const [avgShortPrice, setAvgShortPrice] = useState(0);
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
  const [themeKey, setThemeKey] = useState('midnight');
  const theme = THEMES[themeKey];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const equityCanvasRef = useRef<HTMLCanvasElement>(null);
  const ticksRef = useRef<Tick[]>(initialTicks);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  // Derived
  const unrealizedLong = sharesOwned > 0 ? (stockPrice - avgCost) * sharesOwned : 0;
  const unrealizedShort = sharesShort > 0 ? (avgShortPrice - stockPrice) * sharesShort : 0;
  // Equity = cash + long value + short unrealized P&L
  // Balance already includes short sale proceeds, so we subtract current cost to cover
  const equity = balance + sharesOwned * stockPrice - sharesShort * stockPrice;
  const unrealizedPnL = unrealizedLong + unrealizedShort;
  const totalPnL = realizedPnL + unrealizedPnL;
  const maxShares = Math.floor(balance / stockPrice);
  const closedTrades = trades.filter(t => (t.type === 'sell' || t.type === 'cover') && t.pnl !== undefined);
  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
  const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0).length;
  const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length * 100) : 0;
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

    ctx.fillStyle = theme.bg;
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
    ctx.fillStyle = theme.panel;
    ctx.fillRect(W - PR, 0, PR, H);
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W - PR, 0); ctx.lineTo(W - PR, H); ctx.stroke();

    // Grid
    const rawStep = range / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    let gridStep = mag;
    for (const s of [1, 2, 2.5, 5, 10]) { if (s * mag >= rawStep) { gridStep = s * mag; break; } }
    ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
    for (let v = Math.ceil(lo / gridStep) * gridStep; v <= hi; v += gridStep) {
      const y = toY(v);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
      ctx.fillStyle = theme.textMuted; ctx.font = '11px monospace'; ctx.textAlign = 'right';
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
      const color = up ? theme.up : theme.down;
      const bt = toY(Math.max(c.open, c.close));
      const bb = toY(Math.min(c.open, c.close));
      const bh = Math.max(1, bb - bt);

      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, toY(c.high)); ctx.lineTo(cx, toY(c.low)); ctx.stroke();

      if (up) {
        ctx.strokeStyle = theme.up; ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, bt + 0.5, CW - 1, Math.max(1, bh - 1));
      } else {
        ctx.fillStyle = theme.down;
        ctx.fillRect(x, bt, CW, bh);
      }
    }

    // Trade markers — match trade time to candle bucket
    for (const trade of trades) {
      let candleIdx = -1;
      for (let vi = 0; vi < visible.length; vi++) {
        const cs = visible[vi].startTime;
        if (trade.time >= cs && trade.time < cs + intervalMs) {
          candleIdx = vi;
          break;
        }
      }
      if (candleIdx < 0) continue;

      const cx = offsetX + candleIdx * step + CW / 2;
      const isBuy = trade.type === 'buy' || trade.type === 'cover';
      const my = isBuy ? toY(visible[candleIdx].low) + 14 : toY(visible[candleIdx].high) - 14;

      ctx.fillStyle = isBuy ? theme.up : theme.down;
      ctx.beginPath();
      if (isBuy) {
        ctx.moveTo(cx, my - 6); ctx.lineTo(cx - 4, my + 3); ctx.lineTo(cx + 4, my + 3);
      } else {
        ctx.moveTo(cx, my + 6); ctx.lineTo(cx - 4, my - 3); ctx.lineTo(cx + 4, my - 3);
      }
      ctx.closePath(); ctx.fill();
    }

    // Current price line
    const priceY = toY(stockPrice);
    const priceColor = lastChange >= 0 ? theme.up : theme.down;
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

    // Short avg price line
    if (sharesShort > 0 && avgShortPrice >= lo && avgShortPrice <= hi) {
      const sy = toY(avgShortPrice);
      ctx.setLineDash([2, 4]); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(chartW, sy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.roundRect(lx, sy - lh / 2, PR - 2, lh, 3); ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('SHT ' + avgShortPrice.toFixed(2), W - PR / 2, sy + 4);
    }
  }, [candles, stockPrice, lastChange, sharesOwned, avgCost, sharesShort, avgShortPrice, renderTick, trades, intervalMs, theme]);

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
    ctx.fillStyle = theme.bg;
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
    const curveColor = lastEq >= STARTING_BALANCE ? theme.up : theme.down;

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

  const short = (qty: number) => {
    // Need 50% collateral
    const collateral = qty * stockPrice * 0.5;
    const actual = Math.min(qty, Math.floor(balance / (stockPrice * 0.5)));
    if (actual < 1) { setGameMessage('Not enough collateral to short.'); return; }
    // Receive sale proceeds
    const proceeds = actual * stockPrice;
    const totalShortValue = avgShortPrice * sharesShort + proceeds;
    const totalShort = sharesShort + actual;
    setAvgShortPrice(totalShort > 0 ? totalShortValue / totalShort : 0);
    setBalance(prev => prev + proceeds);
    setSharesShort(prev => prev + actual);
    setTrades(prev => [...prev, { type: 'short', price: stockPrice, qty: actual, time: Date.now() }]);
    setFlash('sell');
    setGameMessage(`Shorted ${actual} @ $${stockPrice.toFixed(2)}`);
  };

  const cover = (qty: number) => {
    const actual = Math.min(qty, sharesShort);
    if (actual < 1) { setGameMessage('No short position to cover.'); return; }
    const costToCover = actual * stockPrice;
    if (balance < costToCover) { setGameMessage('Not enough cash to cover.'); return; }
    const pnl = (avgShortPrice - stockPrice) * actual;
    setRealizedPnL(prev => prev + pnl);
    setBalance(prev => prev - costToCover);
    setSharesShort(prev => prev - actual);
    if (sharesShort - actual === 0) setAvgShortPrice(0);
    setTrades(prev => [...prev, { type: 'cover', price: stockPrice, qty: actual, time: Date.now(), pnl }]);
    setFlash('buy');
    setGameMessage(`Covered ${actual} @ $${stockPrice.toFixed(2)} (${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)})`);
  };

  const reset = () => {
    setBalance(STARTING_BALANCE);
    setStockPrice(STARTING_PRICE);
    setSharesOwned(0); setAvgCost(0); setSharesShort(0); setAvgShortPrice(0); setRealizedPnL(0);
    ticksRef.current = generateSeedTicks(STARTING_PRICE, 7200);
    setTrades([]); setEquityHistory([]);
    setPeakEquity(STARTING_BALANCE); setMaxDrawdown(0);
    setRenderTick(t => t + 1); setLastChange(0);
    setGameMessage('Fresh start.');
  };

  const pc = (v: number) => v > 0 ? 'text-[#26a69a]' : v < 0 ? 'text-[#ef5350]' : 'text-gray-500/80';
  const [showRules, setShowRules] = useState(false);

  return (
    <div
      className={cn("flex flex-col h-screen overflow-hidden transition-colors duration-300")}
      style={{
        background: flash === 'buy' ? theme.flashBuy : flash === 'sell' ? theme.flashSell : theme.bg,
      }}
    >
      {/* Header */}
      <header className="px-3 py-2 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" style={{ color: theme.textMuted }}>
            <Link href="/games"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <img src="/logo/logo.png" alt="TT" className="h-6 w-6 rounded-full object-cover" style={{ clipPath: 'circle(50%)' }} />
          <span className="font-bold text-sm" style={{ color: theme.text }}>TT / USD</span>
        </div>
        <div className="flex items-center gap-1">
          {Object.keys(TIMEFRAMES).map(tf => (
            <Button key={tf} variant={timeframe === tf ? 'default' : 'ghost'} size="sm"
              className={cn("h-7 px-2 text-xs")}
              style={{ color: timeframe !== tf ? theme.textMuted : undefined }}
              onClick={() => { setTimeframe(tf); setRenderTick(t => t + 1); }}>
              {tf}
            </Button>
          ))}
          <div className="w-px h-4 mx-1" style={{ background: theme.border }} />
          <Button variant="ghost" size="sm" className="h-7 px-2" style={{ color: theme.textMuted }}
            onClick={() => setShowRules(!showRules)} title="Ed's Rules">
            <span className="text-[10px] font-bold">RULES</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2" style={{ color: theme.textMuted }}
            onClick={() => { const keys = Object.keys(THEMES); setThemeKey(keys[(keys.indexOf(themeKey) + 1) % keys.length]); }}>
            <Palette className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2" style={{ color: theme.textMuted }} onClick={() => setPaused(!paused)}>
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2" style={{ color: theme.textMuted }} onClick={reset}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </header>

      {/* Ed's 4 Rules */}
      {showRules && (
        <div className="px-4 py-3 text-xs space-y-1 shrink-0" style={{ background: theme.panel, borderBottom: `1px solid ${theme.border}`, color: theme.text }}>
          <p className="font-bold text-[11px]" style={{ color: theme.up }}>The Whipsaw Song — Ed Seykota</p>
          <p>1. Ride your winners — "We ride that trend right to the end"</p>
          <p>2. Cut your losses — "We give that dag-gone loss a toss"</p>
          <p>3. Manage your risk — "We make a lot of money and we sleep at night"</p>
          <p>4. Use stops — "Our stops are in so there's nothing to do"</p>
          <p>5. Stick to the system — "Stick to the plan and pull the trigger"</p>
          <p>6. One good trend pays for them all — "You get a whip and I get a saw"</p>
        </div>
      )}

      {/* Price */}
      <div className="px-3 pt-2 pb-1 shrink-0 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-mono font-bold" style={{ color: theme.text }}>${stockPrice.toFixed(2)}</span>
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
        <div className="h-16 px-2 shrink-0" style={{ borderTop: `1px solid ${theme.grid}` }}>
          <canvas ref={equityCanvasRef} className="w-full h-full" style={{ display: 'block' }} />
        </div>
      )}

      {/* Stats */}
      <div className="px-3 py-1.5 shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
        <div className="grid grid-cols-6 gap-1">
          <div className="rounded p-1.5" style={{ background: theme.panel }}>
            <p className="text-[9px] text-gray-500/80">Cash</p>
            <p className="text-xs font-mono font-bold text-gray-200">${balance.toFixed(0)}</p>
          </div>
          <div className="rounded p-1.5" style={{ background: theme.panel }}>
            <p className="text-[9px] text-gray-500/80">Equity</p>
            <p className="text-xs font-mono font-bold text-gray-200">${equity.toFixed(0)}</p>
          </div>
          <div className="rounded p-1.5" style={{ background: theme.panel }}>
            <p className="text-[9px] text-gray-500/80">Return</p>
            <p className={cn("text-xs font-mono font-bold", pc(returnPct))}>
              {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded p-1.5" style={{ background: theme.panel }}>
            <p className="text-[9px] text-gray-500/80">Win Rate</p>
            <p className="text-xs font-mono font-bold text-gray-200">{closedTrades.length > 0 ? `${winRate.toFixed(0)}%` : '—'}</p>
          </div>
          <div className="rounded p-1.5" style={{ background: theme.panel }}>
            <p className="text-[9px] text-gray-500/80">Max DD</p>
            <p className="text-xs font-mono font-bold text-[#ef5350]">{maxDrawdown > 0 ? `-${maxDrawdown.toFixed(1)}%` : '—'}</p>
          </div>
          <div className="rounded p-1.5" style={{ background: theme.panel }}>
            <p className="text-[9px] text-gray-500/80">Trades</p>
            <p className="text-xs font-mono font-bold text-gray-200">
              {closedTrades.length > 0 ? <><span className="text-[#26a69a]">{winningTrades}W</span> <span className="text-[#ef5350]">{losingTrades}L</span></> : `${trades.length}`}
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      <p className="text-xs text-gray-500/80 text-center px-3 shrink-0">{gameMessage}</p>

      {/* Actions */}
      <div className="px-3 py-2 space-y-1.5 shrink-0">
        {(sharesOwned > 0 || sharesShort > 0) && (
          <div className="flex items-center justify-between text-[10px] px-0.5 text-gray-500/80">
            {sharesOwned > 0 && <span className="text-[#26a69a]">{sharesOwned} long @ ${avgCost.toFixed(2)}</span>}
            {sharesShort > 0 && <span className="text-[#f97316]">{sharesShort} short @ ${avgShortPrice.toFixed(2)}</span>}
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
        <div className="grid grid-cols-4 gap-1.5">
          <Button onClick={() => short(1)} size="sm" className="bg-[#f97316] hover:bg-[#fb923c] text-white text-xs h-9">Short 1</Button>
          <Button onClick={() => short(5)} size="sm" className="bg-[#f97316] hover:bg-[#fb923c] text-white text-xs h-9">Short 5</Button>
          <Button onClick={() => cover(1)} size="sm" className="bg-[#6366f1] hover:bg-[#818cf8] text-white text-xs h-9">Cover 1</Button>
          <Button onClick={() => cover(sharesShort)} size="sm" className="bg-[#6366f1] hover:bg-[#818cf8] text-white text-xs h-9" disabled={sharesShort < 1}>Cover All</Button>
        </div>
      </div>

      <LiveTicker />
    </div>
  );
}
