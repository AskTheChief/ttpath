
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TradingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Trading</h1>
      <p className="mb-4">Information about the markets and Ed's passion and life's work, how to trade them successfully, will be available here soon.</p>
      <Link href="/" passHref>
        <Button>Back to Path</Button>
      </Link>
    </div>
  );
}
