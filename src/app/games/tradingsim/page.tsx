
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

  const [priceHistory, setPriceHistory] = useState<number[]>([100]);
  const [timeHistory, setTimeHistory] = useState<string[]>([new Date().toLocaleTimeString()]);
  const [chartTimeframe, setChartTimeframe] = useState(20);

  
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartAPI | null>(null);

  useEffect(() => {
    const unrealizedShortProfit = shortCollateral - (sharesShorted * stockPrice);
    const currentEquity = balance + (sharesOwned * stockPrice) - marginBalance + unrealizedShortProfit;
    setEquity(currentEquity);
  }, [balance, sharesOwned, stockPrice, marginBalance, sharesShorted, shortCollateral]);


  const updateGameDisplay = useCallback(() => {
    if (chartInstanceRef.current) {
        const labelsToShow = timeHistory.slice(-chartTimeframe);
        const dataToShow = priceHistory.slice(-chartTimeframe);

        chartInstanceRef.current.data.labels = labelsToShow;
        chartInstanceRef.current.data.datasets[0].data = dataToShow;
        chartInstanceRef.current.update();
    }
  }, [priceHistory, timeHistory, chartTimeframe]);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstanceRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: [],
            datasets: [{
              label: 'Stock Price',
              data: [],
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
        const finalPrice = newPrice < 1 ? 1 : newPrice;

        setPriceHistory(prev => [...prev, finalPrice]);
        setTimeHistory(prev => [...prev, new Date().toLocaleTimeString()]);
        
        return finalPrice;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    updateGameDisplay();
  }, [stockPrice, chartTimeframe, updateGameDisplay]);


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
      
      setBalance(prev => prev + collateralPerShare - costToCover);
      
      setSharesShorted(prev => prev - 1);
      setShortCollateral(prev => prev - collateralPerShare);
      
      const profit = collateralPerShare - costToCover;
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
    
    const netProfit = grossProfit;
    setBalance(prev => prev + grossProfit);
    setOptionsOwned(prev => prev.filter(o => o.id !== optionId));
    setGameMessage(`${option.type.toUpperCase()} exercised. Net gain: $${netProfit.toFixed(2)} (gross profit $${grossProfit.toFixed(2)} on a $${option.premium.toFixed(2)} premium).`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 relative pb-16">
        <header className="w-full max-w-7xl mx-auto mb-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <LineChartIcon className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold">Market Trading Game</h1>
                    <p className="text-muted-foreground">Practice your trading skills in this simple simulation.</p>
                </div>
            </div>
             <Button asChild variant="outline">
                <Link href="/games"><ArrowLeft /> Back to Game Center</Link>
            </Button>
        </header>

        <div className="w-full max-w-7xl mx-auto space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Market Price: <span className="text-primary font-mono">${stockPrice.toFixed(2)}</span></CardTitle>
                        <CardDescription>Price updates every 2 seconds.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">View:</span>
                        {[10, 20, 50, 100].map(points => (
                            <Button
                                key={points}
                                variant={chartTimeframe === points ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setChartTimeframe(points)}
                            >
                                {points}
                            </Button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="h-80">
                    <canvas ref={chartRef}></canvas>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader><CardTitle>${balance.toFixed(2)}</CardTitle><CardDescription>Cash Balance</CardDescription></CardHeader>
                </Card>
                 <Card>
                  <CardHeader><CardTitle>${equity.toFixed(2)}</CardTitle><CardDescription>Total Equity</CardDescription></CardHeader>
                </Card>
                 <Card>
                  <CardHeader><CardTitle>${marginBalance.toFixed(2)}</CardTitle><CardDescription>Margin Debt</CardDescription></CardHeader>
                </Card>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Your Positions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">Shares Owned:</span> <span className="font-bold text-lg">{sharesOwned}</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">Shares Shorted:</span> <span className="font-bold text-lg">{sharesShorted}</span></div>
                        </div>
                        {optionsOwned.length > 0 && (
                            <div>
                            <h3 className="text-md font-semibold mb-2 border-t pt-4">Options Contracts</h3>
                            <div className="space-y-2">
                                {optionsOwned.map(option => (
                                <div key={option.id} className="text-sm p-2 border rounded-md flex items-center justify-between">
                                    <div>
                                    <p className="font-bold">{option.type.toUpperCase()} Option</p>
                                    <p className="text-muted-foreground">Strike: ${option.strikePrice.toFixed(2)}</p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => exerciseOption(option.id)}>Exercise</Button>
                                </div>
                                ))}
                            </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        {gameMessage && <CardDescription className="h-5">{gameMessage}</CardDescription>}
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <Button onClick={buyStock} className="w-full">Buy Stock</Button>
                        <Button onClick={sellStock} variant="secondary" className="w-full">Sell Stock</Button>
                        <Button onClick={buyOnMargin} variant="outline" className="w-full">Buy on Margin</Button>
                        <Button onClick={sellShort} variant="destructive" className="w-full">Sell Short</Button>
                        <Button onClick={coverShort} variant="outline" className="w-full">Cover Short</Button>
                        <div className="h-px bg-border col-span-full my-2"></div>
                        <Button onClick={() => buyOption('call')} className="w-full">Buy Call Option</Button>
                        <Button onClick={() => buyOption('put')} variant="secondary" className="w-full">Buy Put Option</Button>
                    </CardContent>
                </Card>
            </div>


            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-left w-full">
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
            </div>
        </div>
      <Ticker />
    </div>
  );
}

    