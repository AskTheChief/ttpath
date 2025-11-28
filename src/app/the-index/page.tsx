

'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSprings, animated } from '@react-spring/web';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDrag } from '@use-gesture/react';

type FaqItem = {
  date: string;
  url: string;
  contributor: string;
  ed: string;
};

const commonTopics = [
  "All", "Trading", "Feelings", "Family", "Relationships", "Process", "TTP", "Rocks", "Health", "Accountability", "Beliefs", "Intention"
];

// Helper function to format text by handling newlines
const formatText = (text: string) => {
    if (!text) return '';
    return text.replace(/(?<!\n)\n(?!\n)/g, ' ').replace(/\n\s*\n/g, '\n\n');
};


function ListView({ faqs }: { faqs: FaqItem[] }) {
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
                        </CardHeader>
                        <CardContent>
                            <blockquote className="text-muted-foreground whitespace-pre-wrap">{formatText(faq.contributor)}</blockquote>
                        </CardContent>
                    </Card>
                    <Card className="h-full bg-secondary/50">
                        <CardHeader>
                            <div className="text-sm text-muted-foreground flex justify-between items-center">
                               {faq.date !== 'Unknown Date' && <span>Date: {faq.date}</span>}
                                <a href={faq.url} target="_blank" rel="noopener noreferrer">
                                    <Badge variant="secondary" className="hover:bg-accent">View Source</Badge>
                                </a>
                            </div>
                            <CardTitle className="text-lg pt-2">Ed Says:</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap">{formatText(faq.ed)}</p>
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
          return topics.map(topic => ({
            id: topic,
            label: topic,
            type: 'topic',
            count: faqsByTopic[topic]?.length || 0,
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

    const bind = useDrag(({ args: [index], active, movement: [mx, my] }) => {
        const item = items[index];
        const { width = 600, height = 600 } = containerRef.current?.getBoundingClientRect() || {};

        let x = 0, y = 0, scale = 1;
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
      const { width = 600, height = 600 } = containerRef.current?.getBoundingClientRect() || {};
      
      const interval = setInterval(() => {
        api.start(i => {
            const item = items[i];
            let x = 0, y = 0;
            if (item.type === 'root') {
                // Root stays centered
            } else if (items.length > 1) {
                const angle = (i / items.length) * 2 * Math.PI;
                const radius = Math.min(width, height) / 3.5;
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius;
            }

            const currentX = springs[i].x.get();
            const currentY = springs[i].y.get();
            const newX = currentX + (Math.random() - 0.5) * 2;
            const newY = currentY + (Math.random() - 0.5) * 2;

            // Simple boundary check to prevent drifting too far
            if (Math.sqrt(newX*newX + newY*newY) > Math.min(width, height) / 2) {
                return { to: { x, y } }; // Snap back
            }

            return { to: { x: newX, y: newY }, config: { duration: 2000 } };
        });
      }, 2000);

      api.start(i => {
        const item = items[i];
        let x = 0, y = 0, scale = 1;
        
        if (item.type === 'root') {
          scale = 1.5;
        } else if (items.length > 1) {
          const angle = (i / (items.length)) * 2 * Math.PI;
          const radius = Math.min(width, height) / 3.5;
          x = Math.cos(angle) * radius;
          y = Math.sin(angle) * radius;
        }
  
        return {
          to: { x, y, scale, opacity: 1 },
          from: { x: Math.random() * 100 - 50, y: Math.random() * 100 - 50, scale: 0, opacity: 0 },
          delay: i * 30,
        };
      });

      return () => clearInterval(interval);

    }, [items, viewState, api, springs]);
  
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
              <div className="w-full h-full overflow-y-auto">
                 <h2 className="text-xl font-bold p-4 sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                    Topic: {activeTopic}
                </h2>
                <QuestionList faqs={paginatedFaqs} onSelectFaq={setSelectedFaq} />
              </div>
          ) : (
            springs.map((props, i) => {
              const item = items[i];
              const size = getBubbleSize(item);
              return (
                <animated.div
                  {...bind(i)}
                  key={item.id}
                  onClick={() => handleBubbleClick(item)}
                  className={cn(
                    'absolute rounded-full cursor-pointer flex items-center justify-center text-center p-2 shadow-lg transition-colors',
                    item.type === 'root' && 'bg-primary hover:bg-primary/90 text-primary-foreground',
                    item.type === 'topic' && 'bg-accent hover:bg-accent/90 text-accent-foreground',
                  )}
                  style={{
                    width: size,
                    height: size,
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
            })
          )}
        </div>
        
        {viewState !== 'root' && (
            <Button variant="outline" className="absolute top-4 left-4 z-10" onClick={handleBackClick}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        )}

        {viewState === 'faqs' && totalPages > 1 && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-background/70 p-1 rounded-md">
                <Button variant="outline" size="sm" onClick={() => handlePageChange('prev')} disabled={currentPage === 0}>Prev</Button>
                <span className="text-sm font-medium text-muted-foreground">
                    Page {currentPage + 1} of {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => handlePageChange('next')} disabled={currentPage === totalPages - 1}>Next</Button>
            </div>
        )}
  
        <Dialog open={!!selectedFaq} onOpenChange={() => setSelectedFaq(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Contributor Says:</DialogTitle>
              <CardDescription className="whitespace-pre-wrap pt-2">{selectedFaq ? formatText(selectedFaq.contributor) : ''}</CardDescription>
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
  const [viewMode, setViewMode] = useState<'list' | 'bubble'>('list');

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
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        results = results.filter(faq =>
            faq.contributor.toLowerCase().includes(lowercasedSearchTerm)
        );
    }

    return results;
  }, [faqs, searchTerm, selectedTopic, faqsByTopic]);


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
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
          </Link>
        </Button>
      </header>

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
              placeholder="Refine search by keyword in questions..."
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
            <ListView faqs={filteredFaqs} />
        ) : (
            <BubbleView faqsByTopic={faqsByTopic} />
        )}
      </div>
    </div>
  );
}
