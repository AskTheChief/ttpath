
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

export default function GamesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x = canvas.width / 2;
    let y = canvas.height - 30;
    let dx = 2;
    let dy = -2;
    const ballRadius = 10;

    function drawBall() {
      ctx!.beginPath();
      ctx!.arc(x, y, ballRadius, 0, Math.PI * 2);
      ctx!.fillStyle = '#60a5fa';
      ctx!.fill();
      ctx!.closePath();
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      drawBall();

      if (x + dx > canvas!.width - ballRadius || x + dx < ballRadius) {
        dx = -dx;
      }
      if (y + dy > canvas!.height - ballRadius || y + dy < ballRadius) {
        dy = -dy;
      }

      x += dx;
      y += dy;
    }

    const interval = setInterval(draw, 10);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Games</h1>
      <canvas ref={canvasRef} width="480" height="320" className="bg-gray-800 rounded-lg mb-4"></canvas>
      <p className="mb-4">More games coming soon!</p>
      <Link href="/" passHref>
        <Button>Back to Path</Button>
      </Link>
    </div>
  );
}
