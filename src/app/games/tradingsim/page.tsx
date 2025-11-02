
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, LineChart as LineChartIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chart, type ChartAPI } from 'chart.js';

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
  
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartAPI | null>(null);

  useEffect(() => {
    const currentEquity = (balance + (sharesOwned * stockPrice)) - marginBalance - (sharesShorted * stockPrice);
    setEquity(currentEquity);
  }, [balance, sharesOwned, sharesShorted, stockPrice, marginBalance]);


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
              x: { display: false },
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
      let saleProceeds = stockPrice;
      if (marginBalance > 0) {
        const repayment = Math.min(saleProceeds, marginBalance);
        setMarginBalance(prev => prev - repayment);
        saleProceeds -= repayment;
        setGameMessage(`You sold 1 share, repaying $${repayment.toFixed(2)} of your margin.`);
      } else {
        setGameMessage('You sold 1 share.');
      }
      setBalance(prev => prev + saleProceeds);
      setSharesOwned(prev => prev - 1);
    } else {
      setGameMessage('You do not own any shares to sell.');
    }
  };

  const sellShort = () => {
    setBalance(prev => prev + stockPrice);
    setSharesShorted(prev => prev + 1);
    setGameMessage('You sold 1 share short.');
  };

  const coverShort = () => {
    if (sharesShorted > 0 && balance >= stockPrice) {
      setBalance(prev => prev - stockPrice);
      setSharesShorted(prev => prev - 1);
      setGameMessage('You covered 1 short share.');
    } else if (sharesShorted === 0) {
      setGameMessage('You have no short positions to cover.');
    } else {
      setGameMessage('Insufficient funds to cover your short position.');
    }
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
          <div className="grid md:grid-cols-2 gap-6 text-center">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <p className="text-xl font-bold">Balance: ${balance.toFixed(2)}</p>
                    <p className="text-xl font-bold">Equity: ${equity.toFixed(2)}</p>
                </div>
              <p className="text-xl">Current Stock Price: <span className="font-semibold text-primary">${stockPrice.toFixed(2)}</span></p>
              <div className="grid grid-cols-2 gap-4">
                <p className="text-lg">Shares Owned: {sharesOwned}</p>
                <p className="text-lg">Shares Shorted: {sharesShorted}</p>
              </div>
               <div className="grid grid-cols-2 gap-4">
                 <p className="text-lg">Margin Balance: ${marginBalance.toFixed(2)}</p>
               </div>
              <div className="flex justify-center gap-4 flex-wrap">
                <Button onClick={buyStock}>Buy</Button>
                <Button onClick={buyOnMargin} variant="outline">Buy on Margin</Button>
                <Button onClick={sellStock} variant="secondary">Sell</Button>
                <Button onClick={sellShort} variant="destructive">Sell Short</Button>
                <Button onClick={coverShort} variant="outline">Cover Short</Button>
              </div>
              {gameMessage && <p className="text-sm text-muted-foreground h-5">{gameMessage}</p>}
            </div>
            <div className="relative h-64">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-8 space-y-4 text-center w-full max-w-4xl">
         <Card>
          <CardHeader>
            <CardTitle>Margin Trading</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm bg-muted p-2 rounded">
              Equity = (Balance + (Shares * Price)) - Margin Balance
            </code>
            <CardDescription className="mt-2">
              Buying on margin allows you to borrow money to purchase shares. Your equity is your net worth. If it drops too low, you may face a margin call. When you sell shares, the proceeds first pay back your margin loan.
            </CardDescription>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Price Change Formula</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm bg-muted p-2 rounded">
              newPrice = oldPrice + (Math.random() - 0.5) * 2;
            </code>
            <CardDescription className="mt-2">
              The stock price follows a simple random walk. Every two seconds, the price changes by a random value between -1 and +1.
            </CardDescription>
          </CardContent>
        </Card>
        <div className="flex justify-center">
            <Button asChild variant="link">
                <Link href="/games"><ArrowLeft /> Back to Game Center</Link>
            </Button>
        </div>
      </div>
      
      <Ticker />
    </div>
  );
}
