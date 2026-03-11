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
        <span className="text-sm font-normal text-muted-foreground/60 bg-muted px-2 py-0.5 rounded-full">v1.0</span>
      </h2>

      <Accordion type="single" collapsible className="w-full max-w-4xl mb-8">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-center justify-center text-muted-foreground">
            Overview
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-sm text-center">
            <p className="mb-4">
              An individual Trading Tribe has about eight members who meet to support each other in working through issues and devoting to serving others. This app connects people who wish to join or start a Tribe in their area. Follow the wheel to find out how you might fit with the Trading Tribe, and how to participate.
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
