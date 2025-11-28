
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type FaqItem = {
  date: string;
  url: string;
  contributor: string;
  ed: string;
};

export default function TheIndexPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const response = await fetch('/Faq/faq-database.json');
        if (!response.ok) {
          throw new Error('Failed to load FAQ database.');
        }
        const data = await response.json();
        setFaqs(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchFaqs();
  }, []);

  const filteredFaqs = useMemo(() => {
    if (!searchTerm) {
      return faqs;
    }
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return faqs.filter(faq =>
        faq.contributor.toLowerCase().includes(lowercasedSearchTerm) ||
        faq.ed.toLowerCase().includes(lowercasedSearchTerm)
    );
  }, [faqs, searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading The Index...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">The Index</h1>
          <p className="text-muted-foreground">Search and explore over {faqs.length} questions and answers.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Path
          </Link>
        </Button>
      </header>

      <div className="space-y-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by keyword (e.g., family, anger, process)..."
            className="w-full pl-10 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
            <p className="text-sm text-muted-foreground mb-4">Showing {filteredFaqs.length > 100 ? 'the first 100 of' : ''} {filteredFaqs.length} results.</p>
            <Accordion type="single" collapsible className="w-full">
            {filteredFaqs.slice(0, 100).map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="truncate">{faq.contributor}</span>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-6">
                        <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-2">Contributor Says:</p>
                            <blockquote className="border-l-2 pl-4 italic text-muted-foreground whitespace-pre-wrap">{faq.contributor}</blockquote>
                        </div>
                         <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-2">Ed Says:</p>
                            <p className="whitespace-pre-wrap">{faq.ed}</p>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground pt-4 border-t">
                             <span>Date: {faq.date}</span>
                             <a href={faq.url} target="_blank" rel="noopener noreferrer">
                                <Badge variant="secondary" className="hover:bg-accent">View Source</Badge>
                            </a>
                        </div>
                    </div>
                </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
            {filteredFaqs.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-8">No results found for "{searchTerm}".</p>
            )}
            {filteredFaqs.length > 100 && (
                <p className="text-center text-muted-foreground mt-4">More than 100 results found. Refine your search to see more.</p>
            )}
        </div>
      </div>
    </div>
  );
}
