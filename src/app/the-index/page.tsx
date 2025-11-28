
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FaqItem = {
  date: string;
  url: string;
  contributor: string;
  ed: string;
};

const commonTopics = [
  "All", "Trading", "Feelings", "Family", "Relationships", "Process", "TTP", "Rocks", "Health", "Accountability", "Beliefs", "Intention"
];

export default function TheIndexPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');

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
    let results = faqs;

    // Filter by selected topic first
    if (selectedTopic !== 'All') {
        const lowercasedTopic = selectedTopic.toLowerCase();
        results = results.filter(faq =>
            faq.contributor.toLowerCase().includes(lowercasedTopic) ||
            faq.ed.toLowerCase().includes(lowercasedTopic)
        );
    }
    
    // Then filter by search term
    if (searchTerm) {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        results = results.filter(faq =>
            faq.contributor.toLowerCase().includes(lowercasedSearchTerm) ||
            faq.ed.toLowerCase().includes(lowercasedSearchTerm)
        );
    }

    return results;
  }, [faqs, searchTerm, selectedTopic]);

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
        <div className="flex flex-col md:flex-row gap-4">
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Select a topic" />
            </SelectTrigger>
            <SelectContent>
              {commonTopics.map(topic => (
                <SelectItem key={topic} value={topic}>{topic}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Refine search by keyword..."
              className="w-full pl-10 text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div>
            <p className="text-sm text-muted-foreground mb-4">Showing {filteredFaqs.length > 100 ? 'the first 100 of' : ''} {filteredFaqs.length} results.</p>
            <div className="space-y-6">
                {filteredFaqs.slice(0, 100).map((faq, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        {/* Question Column */}
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="text-lg">Contributor Says:</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <blockquote className="text-muted-foreground whitespace-pre-wrap">{faq.contributor}</blockquote>
                            </CardContent>
                        </Card>
                        {/* Answer Column */}
                        <Card className="h-full bg-secondary/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Ed Says:</CardTitle>
                                <CardDescription className="flex justify-between items-center">
                                    <span>Date: {faq.date}</span>
                                    <a href={faq.url} target="_blank" rel="noopener noreferrer">
                                        <Badge variant="secondary" className="hover:bg-accent">View Source</Badge>
                                    </a>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap">{faq.ed}</p>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
            {filteredFaqs.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-8">No results found for your query.</p>
            )}
            {filteredFaqs.length > 100 && (
                <p className="text-center text-muted-foreground mt-4">More than 100 results found. Refine your search to see more.</p>
            )}
        </div>
      </div>
    </div>
  );
}
