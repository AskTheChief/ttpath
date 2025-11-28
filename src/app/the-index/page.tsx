
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
import { useDrag } from '@use-gesture/react';
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

function BubbleView({ faqsByTopic, filteredFaqs }: { faqsByTopic: Record<string, FaqItem[]>, filteredFaqs: FaqItem[] }) {
    const [activeTopic, setActiveTopic] = useState<string | null>(null);
    const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
  
    const topics = Object.keys(faqsByTopic).filter(topic => topic !== 'All');
  
    const items = activeTopic
      ? (faqsByTopic[activeTopic] || []).map(faq => ({ type: 'faq', data: faq, id: faq.url }))
      : topics.map(topic => ({ type: 'topic', data: { name: topic, count: faqsByTopic[topic].length }, id: topic }));
  
    const [springs, api] = useSprings(items.length, i => ({
      x: Math.random() * 500,
      y: Math.random() * 300,
      scale: 1,
      config: { mass: 5, tension: 550, friction: 140 },
    }));
  
    const bind = useDrag(({ args: [index], down, movement: [mx, my] }) => {
      api.start(i => {
        if (index !== i) return;
        return {
          x: mx,
          y: my,
          scale: down ? 1.1 : 1,
        };
      });
    });

    const handleBubbleClick = (item: typeof items[number]) => {
        if (item.type === 'topic') {
            setActiveTopic(item.data.name);
        } else {
            setSelectedFaq(item.data);
        }
    };
    
    useEffect(() => {
        const interval = setInterval(() => {
          api.start(i => ({
            x: springs[i].x.get() + (Math.random() - 0.5) * 5,
            y: springs[i].y.get() + (Math.random() - 0.5) * 5,
          }));
        }, 3000);
        return () => clearInterval(interval);
    }, [api, springs]);

    const getBubbleSize = (item: typeof items[number]) => {
        if (item.type === 'topic') {
            return 80 + Math.min(item.data.count, 200) * 0.5; // Scale size by count, with a max
        }
        return 90; // FAQ bubble size
    };

    return (
        <div className="relative">
            <div ref={containerRef} className="w-full h-[600px] bg-muted/30 rounded-lg relative overflow-hidden touch-none">
                 {springs.map((props, i) => {
                    const item = items[i];
                    const size = getBubbleSize(item);
                    return (
                        <animated.div
                            {...bind(i)}
                            key={item.id}
                            onClick={() => handleBubbleClick(item)}
                            className={cn(
                                'absolute rounded-full cursor-pointer flex items-center justify-center text-center p-2 shadow-lg transition-colors',
                                item.type === 'topic' ? 'bg-primary/80 hover:bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                            )}
                            style={{
                                width: size,
                                height: size,
                                transform: props.x.to((x, s) => `translate3d(${x}px,0,0) scale(${s})`).interpolate(x => x),
                                top: props.y,
                                left: `calc(50% - ${size/2}px)`,
                                ...props,
                            }}
                        >
                            <span className="text-xs font-semibold select-none pointer-events-none">
                                {item.type === 'topic' ? item.data.name : (item.data as FaqItem).contributor.substring(0, 30) + '...'}
                            </span>
                        </animated.div>
                    );
                 })}

                {activeTopic && (
                    <Button variant="outline" className="absolute top-4 left-4" onClick={() => setActiveTopic(null)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Topics
                    </Button>
                )}
            </div>

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
}


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
            <BubbleView faqsByTopic={faqsByTopic} filteredFaqs={filteredFaqs} />
        )}
      </div>
    </div>
  );
}
