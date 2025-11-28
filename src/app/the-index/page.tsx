
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type FaqItem = {
  question: string;
  answer: string;
  topic: string;
};

export default function TheIndexPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

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

  const topics = useMemo(() => {
    if (loading) return {};
    const topicCount: { [key: string]: number } = {};
    faqs.forEach(faq => {
      const topics = faq.topic.split(',').map(t => t.trim());
      topics.forEach(topic => {
        if (topic) {
          topicCount[topic] = (topicCount[topic] || 0) + 1;
        }
      });
    });
    return topicCount;
  }, [faqs, loading]);

  const sortedTopics = useMemo(() => {
    return Object.entries(topics).sort(([, a], [, b]) => b - a);
  }, [topics]);

  const filteredFaqs = useMemo(() => {
    let results = faqs;

    if (selectedTopic) {
      results = results.filter(faq =>
        faq.topic.split(',').map(t => t.trim()).includes(selectedTopic)
      );
    }
    
    if (searchTerm) {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        results = results.filter(faq =>
            faq.question.toLowerCase().includes(lowercasedSearchTerm) ||
            faq.answer.toLowerCase().includes(lowercasedSearchTerm) ||
            faq.topic.toLowerCase().includes(lowercasedSearchTerm)
        );
    }
    
    return results;
  }, [faqs, searchTerm, selectedTopic]);

  const getTopicSize = (count: number) => {
    if (count > 50) return 'text-2xl';
    if (count > 25) return 'text-xl';
    if (count > 10) return 'text-lg';
    if (count > 5) return 'text-base';
    return 'text-sm';
  };

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Tag /> Topic Cloud</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
            {sortedTopics.slice(0, 50).map(([topic, count]) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic === selectedTopic ? null : topic)}
                className={cn(
                  "font-semibold transition-colors duration-200 hover:text-primary",
                  getTopicSize(count),
                  selectedTopic === topic ? 'text-primary underline' : 'text-muted-foreground'
                )}
              >
                {topic}
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by keyword (e.g., family, anger, process)..."
            className="w-full pl-10 text-base"
            value={searchTerm}
            onChange={(e) => {
                setSearchTerm(e.target.value);
                if (selectedTopic) setSelectedTopic(null);
            }}
          />
        </div>

        <div>
            <p className="text-sm text-muted-foreground mb-4">Showing {filteredFaqs.length} results.</p>
            <Accordion type="single" collapsible className="w-full">
            {filteredFaqs.slice(0, 100).map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-4">
                        <p className="whitespace-pre-wrap">{faq.answer}</p>
                        <Badge variant="secondary">{faq.topic}</Badge>
                    </div>
                </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
            {filteredFaqs.length > 100 && (
                <p className="text-center text-muted-foreground mt-4">More than 100 results found. Refine your search to see more.</p>
            )}
        </div>
      </div>
    </div>
  );
}
