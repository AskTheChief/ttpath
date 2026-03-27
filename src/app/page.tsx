'use client';

import PathJourney from '@/components/path-journey';
import { Toaster } from '@/components/ui/toaster';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="journey-title text-4xl font-bold flex items-center gap-3">
        The Trading Tribe Path
        <span className="text-sm font-normal text-muted-foreground/60 bg-muted px-2 py-0.5 rounded-full">v1.41</span>
      </h2>

      <Accordion type="single" collapsible className="w-full max-w-4xl mb-8">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-center justify-center text-muted-foreground">
            Overview
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-sm text-center">
            <p className="mb-4">
              The Trading Tribe associates individual Tribes from all over the world. Individual Tribes contain about eight members each, who support each other in identifying their gifts and in sharing them with others. To learn more about the Trading Tribe, get on the path by clicking on Visitor, below.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="w-full max-w-7xl">
        <Suspense fallback={<div className="h-96 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
          <PathJourney />
        </Suspense>
      </div>
      <Toaster />
    </main>
  );
}
