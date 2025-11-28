
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search, List, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSprings, animated } from '@react-spring/web';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type FaqItem = {
  date: string;
  url: string;
  contributor: string;
  ed: string;
};

const commonTopics = [
  "All", "Trading", "Feelings", "Family", "Relationships", "Process", "TTP", "Rocks", "Health", "Accountability", "Beliefs", "Intention"
];


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
                            <blockquote className="text-muted-foreground whitespace-pre-wrap">{faq.contributor}</blockquote>
                        </CardContent>
                    </Card>
                    <Card className="h-full bg-secondary/50">
                        <CardHeader>
                             <div className="text-sm text-muted-foreground flex justify-between items-center">
                                <span>Date: {faq.date}</span>
                                <a href={faq.url} target="_blank" rel="noopener noreferrer">
                                    <Badge variant="secondary" className="hover:bg-accent">View Source</Badge>
                                </a>
                            </div>
                            <CardTitle className="text-lg pt-2">Ed Says:</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap">{faq.ed}</p>
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

const BubbleView = ({ faqsByTopic }: { faqsByTopic: Record<string, FaqItem[]> }) => {
    const [viewState, setViewState] = useState<'root' | 'topics' | 'faqs'>('root');
    const [activeTopic, setActiveTopic] = useState<string | null>(null);
    const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
  
    const topics = Object.keys(faqsByTopic).filter(topic => topic !== 'All');
  
    const getItemsForView = () => {
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
          if (!activeTopic) return [];
          return (faqsByTopic[activeTopic] || []).map((faq, index) => ({
            id: `${activeTopic}-${index}`,
            label: faq.contributor.substring(0, 30) + '...',
            type: 'faq',
            data: faq,
          }));
        default:
          return [];
      }
    };
  
    const items = getItemsForView();
  
    const [springs, api] = useSprings(items.length, i => ({
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      config: { mass: 1, tension: 280, friction: 60 },
    }));
  
    useEffect(() => {
      const { width = 600, height = 600 } = containerRef.current?.getBoundingClientRect() || {};
      
      api.start(i => {
        const item = items[i];
        let x = 0, y = 0, scale = 1;
        
        if (item.type === 'root') {
          scale = 1.5;
        } else if (items.length > 1) {
          const angle = (i / (items.length)) * 2 * Math.PI;
          const radius = Math.min(width, height) / 3;
          x = Math.cos(angle) * radius;
          y = Math.sin(angle) * radius;
        }
  
        return {
          to: { x, y, scale, opacity: 1 },
          from: { x: 0, y: 0, scale: 0, opacity: 0 },
          delay: i * 50,
        };
      });
    }, [items.length, viewState, api]);
  
    const handleBubbleClick = (item: ReturnType<typeof getItemsForView>[number]) => {
      if (item.type === 'root') {
        setViewState('topics');
      } else if (item.type === 'topic') {
        setActiveTopic(item.label);
        setViewState('faqs');
      } else if (item.type === 'faq' && 'data' in item) {
        setSelectedFaq(item.data as FaqItem);
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
  
    const getBubbleSize = (item: ReturnType<typeof getItemsForView>[number]) => {
      if (item.type === 'root') return 200;
      if (item.type === 'topic') return 80 + Math.min((item.count || 0), 200) * 0.3;
      return 90;
    };
  
    return (
      <div className="relative">
        <div ref={containerRef} className="w-full h-[600px] bg-muted/30 rounded-lg relative overflow-hidden flex items-center justify-center">
          {springs.map((props, i) => {
            const item = items[i];
            const size = getBubbleSize(item);
            return (
              <animated.div
                key={item.id}
                onClick={() => handleBubbleClick(item)}
                className={cn(
                  'absolute rounded-full cursor-pointer flex items-center justify-center text-center p-2 shadow-lg transition-colors',
                  item.type === 'root' && 'bg-primary hover:bg-primary/90 text-primary-foreground',
                  item.type === 'topic' && 'bg-accent hover:bg-accent/90 text-accent-foreground',
                  item.type === 'faq' && 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                )}
                style={{
                  width: size,
                  height: size,
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
        </div>
        {viewState !== 'root' && (
            <Button variant="outline" className="absolute top-4 left-4 z-10" onClick={handleBackClick}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        )}
  
        <Dialog open={!!selectedFaq} onOpenChange={() => setSelectedFaq(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Contributor Says:</DialogTitle>
              <DialogDescription className="whitespace-pre-wrap pt-2">{selectedFaq?.contributor}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <h3 className="font-semibold mb-2">Ed Says:</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">{selectedFaq?.ed}</p>
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
