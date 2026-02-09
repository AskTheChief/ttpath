
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSprings, animated } from '@react-spring/web';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDrag } from '@use-gesture/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getAllJournalEntries } from '@/ai/flows/get-all-journal-entries';


type FaqItem = {
  date: string;
  url: string;
  contributor: string;
  contributorName: string;
  ed: string;
};

const commonTopics = [
  "All", "Trading", "Feelings", "Family", "Relationships", "Process", "TTP", "Rocks", "Health", "Accountability", "Beliefs", "Intention"
];

// Helper function to format text by handling newlines
const formatText = (text: string) => {
    if (!text) return '';
    // Replace single newlines that are not preceded or followed by another newline with a space
    return text.replace(/(?<!\n)\n(?!\n)/g, ' ').replace(/\n\s*\n/g, '\n\n');
};

const Highlight = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) {
      return <span className="whitespace-pre-wrap">{formatText(text)}</span>;
    }
    const searchWords = highlight.split(/\s+/).filter(Boolean); // Split by whitespace and remove empty strings
    const regex = new RegExp(`(${searchWords.join('|')})`, 'gi');
    const parts = formatText(text).split(regex);
    
    return (
      <span className="whitespace-pre-wrap">
        {parts.map((part, i) =>
          searchWords.some(word => new RegExp(`^${word}$`, 'i').test(part)) ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 rounded-sm px-0.5">
              {part}
            </mark>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
      </span>
    );
};


function ListView({ faqs, searchTerm }: { faqs: FaqItem[], searchTerm: string }) {
    if (faqs.length === 0) {
        return <p className="text-center text-muted-foreground mt-8">No results found for your query.</p>;
    }
    
    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Showing {faqs.length > 100 ? 'the first 100 of' : ''} {faqs.length} results.</p>
            {faqs.slice(0, 100).map((faq, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-lg">Contributor Says:</CardTitle>
                            <CardDescription>{faq.contributorName}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <blockquote className="text-muted-foreground">
                                <Highlight text={faq.contributor} highlight={searchTerm} />
                            </blockquote>
                        </CardContent>
                    </Card>
                    <Card className="h-full bg-secondary/50">
                        <CardHeader>
                            <div className="text-sm text-muted-foreground flex justify-between items-center">
                               {faq.date && <span>Date: {new Date(faq.date).toLocaleDateString()}</span>}
                                {faq.url && (
                                    <a href={faq.url} target="_blank" rel="noopener noreferrer">
                                        <Badge variant="secondary" className="hover:bg-accent">View Source</Badge>
                                    </a>
                                )}
                            </div>
                            <CardTitle className="text-lg pt-2">Ed Says:</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap">
                               <Highlight text={faq.ed} highlight={searchTerm} />
                            </p>
                        </CardContent>
                    </Card>
                </div>
            ))}
            {faqs.length > 100 && (
                <p className="text-center text-muted-foreground mt-4">More than 100 results found. Refine your search to see more.</p>
            )}
        </div>
    );
}

const ITEMS_PER_PAGE = 12;

function QuestionList({ faqs, onSelectFaq }: { faqs: FaqItem[], onSelectFaq: (faq: FaqItem) => void }) {
    return (
      <div className="space-y-3 p-4">
        {faqs.map((faq, index) => (
          <button
            key={index}
            onClick={() => onSelectFaq(faq)}
            className="w-full text-left p-3 rounded-lg bg-background hover:bg-secondary transition-colors border"
          >
            <p className="font-medium truncate">{faq.contributor}</p>
            <p className="text-sm text-muted-foreground truncate">Ed: {faq.ed}</p>
          </button>
        ))}
      </div>
    );
}

const topicColors = [
    'hsl(190 80% 50%)', // Trading
    'hsl(340 80% 60%)', // Feelings
    'hsl(20 80% 60%)',  // Family
    'hsl(280 80% 60%)', // Relationships
    'hsl(110 70% 50%)', // Process
    'hsl(220 80% 65%)', // TTP
    'hsl(60 80% 50%)',  // Rocks
    'hsl(0 80% 60%)',   // Health
    'hsl(300 70% 55%)', // Accountability
    'hsl(150 70% 50%)', // Beliefs
    'hsl(250 80% 65%)', // Intention
];


const BubbleView = ({ faqsByTopic }: { faqsByTopic: Record<string, FaqItem[]> }) => {
    const [viewState, setViewState] = useState<'root' | 'topics' | 'faqs'>('root');
    const [activeTopic, setActiveTopic] = useState<string | null>(null);
    const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
  
    const topics = Object.keys(faqsByTopic).filter(topic => topic !== 'All');

    const activeTopicFaqs = activeTopic ? faqsByTopic[activeTopic] || [] : [];
    const totalPages = Math.ceil(activeTopicFaqs.length / ITEMS_PER_PAGE);
    const paginatedFaqs = activeTopicFaqs.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  
    const getItemsForView = useCallback(() => {
      switch (viewState) {
        case 'root':
          return [{ id: 'root', label: 'All Topics', type: 'root', count: faqsByTopic.All?.length || 0 }];
        case 'topics':
          return topics.map((topic, index) => ({
            id: topic,
            label: topic,
            type: 'topic',
            count: faqsByTopic[topic]?.length || 0,
            color: topicColors[index % topicColors.length],
          }));
        case 'faqs':
            return []; // Questions are now shown in a list, not as bubbles
        default:
          return [];
      }
    }, [viewState, topics, faqsByTopic]);
  
    const items = getItemsForView();

    const [springs, api] = useSprings(items.length, i => ({
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      config: { mass: 5, tension: 500, friction: 50 },
    }));

     useEffect(() => {
      if (viewState === 'faqs') return;
  
      let isCancelled = false;
  
      const animate = async () => {
        while (!isCancelled) {
          await new Promise(resolve => setTimeout(resolve, 4000));
          if (isCancelled) break;
          
          const { width = 600, height = 600 } = containerRef.current?.getBoundingClientRect() || {};
  
          api.start(i => {
              const item = items[i];
              if (!item) return {};

              let x = 0, y = 0;
              
              if (item.type === 'root') {
                // Root stays centered
              } else if (items.length > 1) {
                const angle = (i / items.length) * 2 * Math.PI;
                const baseRadius = Math.min(width, height) / 3.5;
                const randomFactor = 1 + (Math.random() - 0.5) * 0.2; // +/- 10% radius variation
                const radius = baseRadius * randomFactor;
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius;
              }
      
              return {
                to: { x, y },
                config: { mass: 10, tension: 20, friction: 50 },
                delay: i * 20,
              };
            });
        }
      };
      
      animate();
  
      return () => {
        isCancelled = true;
        api.stop();
      };
    }, [items, viewState, api]);

    const bind = useDrag(({ args: [index], active, movement: [mx, my] }) => {
        const { width = 600, height = 600 } = containerRef.current?.getBoundingClientRect() || {};

        let x = 0, y = 0, scale = 1;
        const item = items[index];
        if (!item) return;

        if (item.type === 'root') {
          scale = 1.5;
        } else if (items.length > 1) {
          const angle = (index / items.length) * 2 * Math.PI;
          const radius = Math.min(width, height) / 3.5;
          x = Math.cos(angle) * radius;
          y = Math.sin(angle) * radius;
        }

        api.start(i => {
            if (index !== i) return;
            const newX = active ? x + mx : x;
            const newY = active ? y + my : y;
            const newScale = active ? scale * 1.1 : scale;
            return { x: newX, y: newY, scale: newScale, config: { mass: 1, tension: 280, friction: 60 } };
        });
    }, {
        filterTaps: true,
        rubberband: true
    });
  
    useEffect(() => {
        if (viewState === 'faqs' || items.length === 0) return;
      
        const { width = 600, height = 600 } = containerRef.current?.getBoundingClientRect() || {};
        
        api.start(i => {
          const item = items[i];
          if (!item) return;

          let x = 0, y = 0, scale = 1;
      
          if (item.type === 'root') {
            scale = 1.5;
          } else if (items.length > 1) {
            const angle = (i / items.length) * 2 * Math.PI;
            const radius = Math.min(width, height) / 3.5;
            x = Math.cos(angle) * radius;
            y = Math.sin(angle) * radius;
          }
      
          return {
            to: { x, y, scale, opacity: 1 },
            from: { x: 0, y: 0, scale: 0, opacity: 0 },
            delay: i * 50,
          };
        });
      
    }, [items, viewState, api]);
  
    const handleBubbleClick = (item: { id: string; label: string; type: string; }) => {
      if (item.type === 'root') {
        setViewState('topics');
      } else if (item.type === 'topic') {
        setActiveTopic(item.label);
        setCurrentPage(0);
        setViewState('faqs');
      }
    };

    const handleBackClick = () => {
        if (viewState === 'faqs') {
            setViewState('topics');
            setActiveTopic(null);
        } else if (viewState === 'topics') {
            setViewState('root');
        }
    }

    const handlePageChange = (direction: 'next' | 'prev') => {
        if (direction === 'next' && currentPage < totalPages - 1) {
            setCurrentPage(p => p + 1);
        } else if (direction === 'prev' && currentPage > 0) {
            setCurrentPage(p => p - 1);
        }
    }
  
    const getBubbleSize = (item: { type: string, count?: number }) => {
      if (item.type === 'root') return 200;
      if (item.type === 'topic') return 80 + Math.min((item.count || 0), 200) * 0.3;
      return 90;
    };
  
    return (
      <div className="relative">
        <div ref={containerRef} className="w-full h-[600px] bg-muted/30 rounded-lg relative overflow-hidden flex items-center justify-center">
          {viewState === 'faqs' ? (
              <div className="w-full h-full flex flex-col">
                <div className="flex items-center justify-between p-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
                    <Button variant="outline" onClick={handleBackClick}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Topics
                    </Button>
                    <h2 className="text-xl font-bold text-center">Topic: {activeTopic}</h2>
                     {totalPages > 1 ? (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handlePageChange('prev')} disabled={currentPage === 0}>Prev</Button>
                            <span className="text-sm font-medium text-muted-foreground">
                                {currentPage + 1} / {totalPages}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => handlePageChange('next')} disabled={currentPage === totalPages - 1}>Next</Button>
                        </div>
                    ) : <div className="w-[200px]"></div> /* Placeholder to balance flexbox */}
                </div>
                 <div className="overflow-y-auto">
                    <QuestionList faqs={paginatedFaqs} onSelectFaq={setSelectedFaq} />
                 </div>
              </div>
          ) : (
            <>
              {viewState !== 'root' && (
                <Button variant="outline" className="absolute top-4 left-4 z-10" onClick={handleBackClick}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              )}
              {springs.map((props, i) => {
                const item = items[i];
                if (!item) return null;
                const size = getBubbleSize(item);
                return (
                  <animated.div
                    {...bind(i)}
                    key={item.id}
                    onClick={() => handleBubbleClick(item)}
                    className={cn(
                      'absolute rounded-full cursor-pointer flex items-center justify-center text-center p-2 shadow-lg text-primary-foreground',
                      item.type === 'root' && 'bg-primary hover:bg-primary/90',
                    )}
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: item.type === 'topic' ? item.color : undefined,
                      transform: props.scale.to(s => `translate3d(0,0,0) scale(${s})`),
                      ...props,
                    }}
                  >
                    <span className="text-xs font-semibold select-none pointer-events-none">
                      {item.label}
                      {item.type === 'topic' && <span className="block opacity-70 text-xs">({item.count})</span>}
                    </span>
                  </animated.div>
                );
              })}
            </>
          )}
        </div>
  
        <Dialog open={!!selectedFaq} onOpenChange={() => setSelectedFaq(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Contributor Says:</DialogTitle>
              <DialogDescription className="whitespace-pre-wrap pt-2">{selectedFaq ? formatText(selectedFaq.contributor) : ''}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <h3 className="font-semibold mb-2">Ed Says:</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">{selectedFaq ? formatText(selectedFaq.ed) : ''}</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };
  


export default function TheIndexPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'bubble'>('bubble');

  useEffect(() => {
    async function fetchFaqs() {
      setLoading(true);
      try {
        const journalEntries = await getAllJournalEntries();
        const mappedFaqs: FaqItem[] = journalEntries.map(entry => ({
          date: entry.createdAt,
          url: '', // No direct mapping for URL from journal entries
          contributor: entry.entryContent,
          contributorName: entry.userName,
          ed: entry.feedback?.[0]?.feedbackContent || 'No feedback yet.',
        }));
        setFaqs(mappedFaqs);
      } catch (error) {
        console.error('Failed to fetch FAQ data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFaqs();
  }, []);

  const faqsByTopic = useMemo(() => {
    const topicsMap: Record<string, FaqItem[]> = { "All": faqs };
    commonTopics.slice(1).forEach(topic => {
      const lowercasedTopic = topic.toLowerCase();
      topicsMap[topic] = faqs.filter(faq => 
        faq.contributor.toLowerCase().includes(lowercasedTopic)
      );
    });
    return topicsMap;
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    let results = selectedTopic === 'All' ? faqs : (faqsByTopic[selectedTopic] || []);
    
    if (searchTerm) {
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
        results = results.filter(faq => {
            const questionText = faq.contributor.toLowerCase();
            return searchWords.every(word => questionText.includes(word));
        });
    }

    return results;
  }, [faqs, searchTerm, selectedTopic, faqsByTopic]);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading the FAQ...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-4xl font-bold">FAQ</h1>
          <p className="text-muted-foreground">Search and explore over {faqs.length} questions and answers from past experiences.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Path
          </Link>
        </Button>
      </header>

      <Accordion type="single" collapsible defaultValue="how-to-use" className="w-full mb-8">
        <AccordionItem value="how-to-use">
          <AccordionTrigger>How to Use the FAQ</AccordionTrigger>
          <AccordionContent>
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-2">
              <p>This FAQ is a collection of community questions and answers. You can explore it in two ways:</p>
              <ul className="list-disc pl-5">
                <li>
                  <strong>Bubble View (Default):</strong> An interactive way to explore topics. Click the "All Topics" bubble to see categories. Click a category bubble (like "Trading" or "Feelings") to see a list of related questions.
                </li>
                <li>
                  <strong>List View:</strong> A traditional, searchable list of all entries. Use the toggle to switch to this view.
                </li>
              </ul>
              <p>
                Use the dropdown to filter by a major topic and the search bar to find specific keywords within the questions. The search and filters work in both views.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="space-y-8">
        <div className="flex flex-col md:flex-row gap-4 items-center">
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
          <div className="relative flex-grow w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Refine search by keyword..."
              className="w-full pl-10 text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
           <div className="flex items-center space-x-2">
            <Label htmlFor="view-switch">List</Label>
            <Switch
                id="view-switch"
                checked={viewMode === 'bubble'}
                onCheckedChange={(checked) => setViewMode(checked ? 'bubble' : 'list')}
            />
            <Label htmlFor="view-switch">Bubbles</Label>
        </div>
        </div>

        {viewMode === 'list' ? (
            <ListView faqs={filteredFaqs} searchTerm={searchTerm} />
        ) : (
            <BubbleView faqsByTopic={faqsByTopic} />
        )}
      </div>
    </div>
  );
}
