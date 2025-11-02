
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, LineChart as LineChartIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, type Chart as ChartAPI } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

type OptionContract = {
  id: number;
  type: 'call' | 'put';
  strikePrice: number;
  premium: number;
};


const Ticker = () => {
  return (
    <div className="bg-gray-800 text-white p-3 overflow-hidden whitespace-nowrap w-full absolute bottom-0 left-0">
      <div className="inline-block animate-ticker">
        <span className="mx-4">AAPL 150.12 ▲</span>
        <span className="mx-4">GOOGL 2750.65 ▼</span>
        <span className="mx-4">AMZN 3400.23 ▲</span>
        <span className="mx-4">TSLA 800.34 ▼</span>
        <span className="mx-4">MSFT 299.35 ▲</span>
      </div>
      <div className="inline-block animate-ticker">
        <span className="mx-4">AAPL 150.12 ▲</span>
        <span className="mx-4">GOOGL 2750.65 ▼</span>
        <span className="mx-4">AMZN 3400.23 ▲</span>
        <span className="mx-4">TSLA 800.34 ▼</span>
        <span className="mx-4">MSFT 299.35 ▲</span>
      </div>
       <style jsx>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-ticker {
          animation: ticker-scroll 20s linear infinite;
        }
      `}</style>
    </div>
  );
};


export default function TradingSimPage() {
  const [balance, setBalance] = useState(1000);
  const [stockPrice, setStockPrice] = useState(100);
  const [sharesOwned, setSharesOwned] = useState(0);
  const [sharesShorted, setSharesShorted] = useState(0);
  const [equity, setEquity] = useState(1000);
  const [gameMessage, setGameMessage] = useState('');
  const [marginBalance, setMarginBalance] = useState(0);
  const [shortCollateral, setShortCollateral] = useState(0);
  const [optionsOwned, setOptionsOwned] = useState<OptionContract[]>([]);

  
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartAPI | null>(null);

  useEffect(() => {
    const unrealizedShortProfit = shortCollateral - (sharesShorted * stockPrice);
    const currentEquity = balance + (sharesOwned * stockPrice) - marginBalance + unrealizedShortProfit;
    setEquity(currentEquity);
  }, [balance, sharesOwned, stockPrice, marginBalance, sharesShorted, shortCollateral]);


  const updateGameDisplay = useCallback(() => {
    if (chartInstanceRef.current) {
        chartInstanceRef.current.data.datasets[0].data.push(stockPrice);
        chartInstanceRef.current.data.labels?.push(new Date().toLocaleTimeString());

        if (chartInstanceRef.current.data.datasets[0].data.length > 20) {
            chartInstanceRef.current.data.datasets[0].data.shift();
            chartInstanceRef.current.data.labels?.shift();
        }
        chartInstanceRef.current.update();
    }
  }, [stockPrice]);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstanceRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: [new Date().toLocaleTimeString()],
            datasets: [{
              label: 'Stock Price',
              data: [stockPrice],
              borderColor: 'hsl(var(--primary))',
              fill: false,
              tension: 0.1
            }]
          },
          options: {
            scales: {
              y: { beginAtZero: false }
            },
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }
    }
    return () => {
      chartInstanceRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStockPrice(prevPrice => {
        const change = (Math.random() - 0.5) * 2;
        const newPrice = prevPrice + change;
        return newPrice < 1 ? 1 : newPrice;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    updateGameDisplay();
  }, [stockPrice, updateGameDisplay]);


  const buyStock = () => {
    if (balance >= stockPrice) {
      setBalance(prev => prev - stockPrice);
      setSharesOwned(prev => prev + 1);
      setGameMessage('You bought 1 share with cash.');
    } else {
      setGameMessage('Insufficient funds. Try buying on margin.');
    }
  };

  const buyOnMargin = () => {
    setMarginBalance(prev => prev + stockPrice);
    setSharesOwned(prev => prev + 1);
    setGameMessage('You bought 1 share on margin.');
  };

  const sellStock = () => {
    if (sharesOwned > 0) {
      const saleProceeds = stockPrice;
      const repayment = Math.min(saleProceeds, marginBalance);
      
      setMarginBalance(prev => prev - repayment);
      setBalance(prev => prev + (saleProceeds - repayment));
      setSharesOwned(prev => prev - 1);
      
      setGameMessage(`You sold 1 share. Repaid $${repayment.toFixed(2)} of margin.`);
    } else {
      setGameMessage('You do not own any shares to sell.');
    }
  };

  const sellShort = () => {
    if (balance < stockPrice) {
        setGameMessage('Insufficient funds to post collateral for short.');
        return;
    }
    setBalance(prev => prev - stockPrice);
    setSharesShorted(prev => prev + 1);
    setShortCollateral(prev => prev + stockPrice);
    setGameMessage(`Sold short. $${stockPrice.toFixed(2)} held as collateral.`);
  };
  
  const coverShort = () => {
    if (sharesShorted > 0) {
      const costToCover = stockPrice;
      const collateralPerShare = shortCollateral / sharesShorted;
      const profit = collateralPerShare - costToCover;
  
      // Return collateral and settle the trade
      setBalance(prev => prev + collateralPerShare - costToCover);
      
      setSharesShorted(prev => prev - 1);
      setShortCollateral(prev => prev - collateralPerShare);
      
      setGameMessage(`Covered short. Profit: $${profit.toFixed(2)}`);
    } else {
      setGameMessage('You have no short positions to cover.');
    }
  };

  const buyOption = (type: 'call' | 'put') => {
    const premium = 5; // Simplified premium
    if (balance < premium) {
      setGameMessage('Insufficient funds to buy option.');
      return;
    }
    setBalance(prev => prev - premium);

    const strikePrice = type === 'call' 
      ? Math.ceil(stockPrice + 5) 
      : Math.floor(stockPrice - 5);
    
    const newOption: OptionContract = {
      id: Date.now(),
      type,
      strikePrice,
      premium,
    };
    
    setOptionsOwned(prev => [...prev, newOption]);
    setGameMessage(`Bought ${type.toUpperCase()} option with strike $${strikePrice.toFixed(2)}.`);
  };

  const exerciseOption = (optionId: number) => {
    const option = optionsOwned.find(o => o.id === optionId);
    if (!option) return;

    let grossProfit = 0;
    if (option.type === 'call') {
      grossProfit = Math.max(0, stockPrice - option.strikePrice);
    } else { // put
      grossProfit = Math.max(0, option.strikePrice - stockPrice);
    }
    
    // The premium was already paid, so the profit on exercise is just the gross profit.
    const netProfit = grossProfit;
    setBalance(prev => prev + netProfit);
    setOptionsOwned(prev => prev.filter(o => o.id !== optionId));
    setGameMessage(`${option.type.toUpperCase()} exercised. Net Profit: $${netProfit.toFixed(2)} (premium was $${option.premium.toFixed(2)})`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 relative pb-16">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon />
            Market Trading Game
          </CardTitle>
          <CardDescription>Practice your trading skills in this simple simulation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="relative h-80 md:h-full">
              <canvas ref={chartRef}></canvas>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                 <Card>
                  <CardHeader><CardTitle>${balance.toFixed(2)}</CardTitle><CardDescription>Cash Balance</CardDescription></CardHeader>
                </Card>
                 <Card>
                  <CardHeader><CardTitle>${marginBalance.toFixed(2)}</CardTitle><CardDescription>Margin Debt</CardDescription></CardHeader>
                </Card>
                <Card className="lg:col-span-3">
                  <CardHeader><CardTitle>${equity.toFixed(2)}</CardTitle><CardDescription>Total Equity</CardDescription></CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Price & Position</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Current Price:</span> <span className="font-bold text-primary">${stockPrice.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Shares Owned:</span> <span className="font-bold">{sharesOwned}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Shares Shorted:</span> <span className="font-bold">{sharesShorted}</span></div>
                </CardContent>
              </Card>

              <div>
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={buyStock} className="w-full">Buy Stock</Button>
                  <Button onClick={sellStock} variant="secondary" className="w-full">Sell Stock</Button>
                  <Button onClick={buyOnMargin} variant="outline" className="w-full">Buy on Margin</Button>
                  <Button onClick={sellShort} variant="destructive" className="w-full">Sell Short</Button>
                  <Button onClick={coverShort} variant="outline" className="w-full col-span-2">Cover Short</Button>
                  <Button onClick={() => buyOption('call')} className="w-full">Buy Call Option</Button>
                  <Button onClick={() => buyOption('put')} variant="secondary" className="w-full">Buy Put Option</Button>
                </div>
              </div>

              {gameMessage && <p className="text-sm text-center text-muted-foreground h-5">{gameMessage}</p>}
            </div>
          </div>
           {optionsOwned.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Your Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {optionsOwned.map(option => (
                  <Card key={option.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold">{option.type.toUpperCase()} Option</p>
                        <p className="text-sm text-muted-foreground">Strike: ${option.strikePrice.toFixed(2)}</p>
                      </div>
                      <Button size="sm" onClick={() => exerciseOption(option.id)}>Exercise</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-left w-full max-w-4xl">
         <Card>
            <CardHeader>
                <CardTitle>Trading Concepts</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
                <p><strong>Buy Stock:</strong> Purchase a stock, hoping the price increases.</p>
                <p><strong>Sell Stock:</strong> Sell a stock you own to lock in a gain or loss.</p>
                <p><strong>Buy on Margin:</strong> Borrow money to buy more stock than you can afford. This amplifies both gains and losses.</p>
                <p><strong>Sell Short:</strong> Borrow a stock and sell it, hoping the price drops so you can buy it back cheaper for a profit.</p>
                <p><strong>Cover Short:</strong> Buy back the stock you previously sold short to close your position.</p>
            </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Options Trading</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>Call Option:</strong> Gives you the right to BUY the stock at the strike price. You want the stock price to go UP.</p>
            <p><strong>Put Option:</strong> Gives you the right to SELL the stock at the strike price. You want the stock price to go DOWN.</p>
             <p><strong>Premium:</strong> The cost to buy an option contract.</p>
            <p><strong>Exercise:</strong> Use your option to buy or sell at the strike price, realizing a profit or loss.</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Price Change Formula</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm bg-muted p-2 rounded block">
              newPrice = oldPrice + (Math.random() - 0.5) * 2;
            </code>
            <CardDescription className="mt-2 text-sm">
              The stock price follows a simple random walk. Every two seconds, the price changes by a random value between -1 and +1.
            </CardDescription>
          </CardContent>
        </Card>
        <div className="flex justify-center md:col-span-2 lg:col-span-3">
            <Button asChild variant="link">
                <Link href="/games"><ArrowLeft /> Back to Game Center</Link>
            </Button>
        </div>
      </div>
      
      <Ticker />
    </div>
  );
}
