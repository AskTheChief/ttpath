
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function StorePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">The Store</h1>
      <p className="mb-4">You can buy hard copies of the book among other items sold by the Trading Tribe.</p>
      <a href="https://www.amazon.com/Trading-Tribe-Mark-Douglas/dp/097105430X" target="_blank" rel="noopener noreferrer">
        <Button>Visit the Store</Button>
      </a>
      <Link href="/" passHref>
        <Button className="mt-4">Back to Path</Button>
      </Link>
    </div>
  );
}
