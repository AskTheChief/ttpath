
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search, Edit, Trash2 } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { getAllJournalEntries } from '@/ai/flows/get-all-journal-entries';
import { saveJournalEntry, deleteJournalEntry } from '@/ai/flows/journal';
import { editJournalFeedback } from '@/ai/flows/edit-journal-feedback';
import { deleteJournalFeedback } from '@/ai/flows/delete-journal-feedback';
import Image from 'next/image';
import type { JournalEntry, JournalFeedback } from '@/lib/types';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

const commonTopics = [
  "All", "Trading", "Feelings", "Family", "Relationships", "Process", "TTP", "Rocks", "Health", "Accountability", "Beliefs", "Intention"
];

// Helper function to format text by handling newlines
const formatText = (text: string) => {
    if (!text) return '';
    return text.replace(/(?<!\n)\n(?!\n)/g, ' ').replace(/\n\s*\n/g, '\n\n');
};

const Highlight = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) {
      return <span className="whitespace-pre-wrap">{formatText(text)}</span>;
    }
    const searchWords = highlight.split(/\s+/).filter(Boolean);
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

function FaqItemCard({ faq, user, userLevel, onUpdate }: { faq: JournalEntry; user: User | null; userLevel: number, onUpdate: () => void; searchTerm: string }) {
    const { toast } = useToast();
    const [editingQuestion, setEditingQuestion] = useState(false);
    const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
    const [questionContent, setQuestionContent] = useState(faq.entryContent);
    const [answerContent, setAnswerContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isMentor = userLevel >= 6;
    
    useEffect(() => {
        // Reset state when the faq prop changes
        setEditingQuestion(false);
        setEditingAnswerId(null);
        setQuestionContent(faq.entryContent);
        setAnswerContent('');
    }, [faq]);

    const handleSaveQuestion = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const idToken = await user.getIdToken();
            await saveJournalEntry({ idToken, entryId: faq.id, entryContent: questionContent });
            toast({ title: 'Question updated' });
            setEditingQuestion(false);
            onUpdate();
        } catch (e: any) {
            toast({ title: 'Error updating question', description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAnswer = async (feedbackId: string) => {
        if (!user) return;
        setIsSaving(true);
        try {
            const idToken = await user.getIdToken();
            await editJournalFeedback({ idToken, entryId: faq.id, feedbackId: feedbackId, newFeedbackContent: answerContent });
            toast({ title: 'Answer updated' });
            setEditingAnswerId(null);
            onUpdate();
        } catch (e: any) {
            toast({ title: 'Error updating answer', description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEntry = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const idToken = await user.getIdToken();
            await deleteJournalEntry({ idToken, entryId: faq.id });
            toast({ title: 'FAQ entry deleted' });
            onUpdate();
        } catch (e: any) {
            toast({ title: 'Error deleting entry', description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteFeedbackItem = async (feedbackId: string) => {
        if (!user) return;
        setIsSaving(true);
        try {
            const idToken = await user.getIdToken();
            await deleteJournalFeedback({ idToken, entryId: faq.id, feedbackId: feedbackId });
            toast({ title: 'Feedback deleted' });
            onUpdate();
        } catch (e: any) {
            toast({ title: 'Error deleting feedback', description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle className="text-lg">Contributor Says:</CardTitle>
                    <CardDescription>{faq.userName}</CardDescription>
                </div>
                {isMentor && (
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingQuestion(p => !p)} disabled={isSaving}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" disabled={isSaving}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete this entire FAQ entry?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteEntry}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {faq.imageUrl && !editingQuestion && (
                    <div className="mb-4 relative aspect-video">
                        <Image src={faq.imageUrl} alt="FAQ Image" fill className="rounded-md object-cover" />
                    </div>
                )}
                {editingQuestion ? (
                    <div className="space-y-2">
                        <Textarea value={questionContent} onChange={e => setQuestionContent(e.target.value)} rows={6} />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveQuestion} disabled={isSaving}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingQuestion(false)}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <blockquote className="text-muted-foreground whitespace-pre-wrap">{faq.entryContent}</blockquote>
                )}
            </CardContent>
             <CardHeader>
                <CardTitle className="text-lg pt-2">Ed Says:</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {(faq.feedback || []).map(fb => (
                    <div key={fb.id} className="p-4 rounded-md bg-secondary/50">
                        {editingAnswerId === fb.id ? (
                            <div className="space-y-2">
                                <Textarea value={answerContent} onChange={e => setAnswerContent(e.target.value)} rows={4} />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleSaveAnswer(fb.id)} disabled={isSaving}>Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingAnswerId(null)}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-start">
                                    <p className="whitespace-pre-wrap text-sm">{fb.feedbackContent}</p>
                                    {isMentor && (
                                        <div className="flex gap-1 shrink-0 ml-2">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingAnswerId(fb.id); setAnswerContent(fb.feedbackContent);}} disabled={isSaving}>
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" disabled={isSaving}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Delete this answer?</AlertDialogTitle></AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteFeedbackItem(fb.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    )}
                                </div>
                                {fb.imageUrl && (
                                    <div className="mt-4 relative aspect-video">
                                        <Image src={fb.imageUrl} alt="Feedback Image" fill className="rounded-md object-cover" />
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">by {fb.mentorName} on {new Date(fb.createdAt).toLocaleDateString()}</p>
                            </div>
                        )}
                    </div>
                ))}
                {(!faq.feedback || faq.feedback.length === 0) && (
                    <p className="text-sm text-muted-foreground">No feedback yet.</p>
                )}
            </CardContent>
        </Card>
    );
}


function ListView({ faqs, searchTerm, user, userLevel, onFaqUpdate }: { faqs: JournalEntry[], searchTerm: string, user: User | null, userLevel: number, onFaqUpdate: () => void }) {
    const [selectedFaq, setSelectedFaq] = useState<JournalEntry | null>(null);

    useEffect(() => {
        // If there are FAQs, and either nothing is selected or the selected one is no longer in the list, select the first one.
        if (faqs.length > 0 && (!selectedFaq || !faqs.find(f => f.id === selectedFaq.id))) {
            setSelectedFaq(faqs[0]);
        } else if (faqs.length === 0) {
            setSelectedFaq(null);
        }
    }, [faqs, selectedFaq]);

    if (faqs.length === 0) {
        return <p className="text-center text-muted-foreground mt-8">No results found for your query.</p>;
    }
    
    const displayedFaqs = faqs.slice(0, 100);

    return (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <h2 className="text-lg font-semibold mb-4">Questions ({faqs.length > 100 ? 'Showing 100 of ' : ''}{faqs.length})</h2>
                <ScrollArea className="h-[75vh] pr-4 border rounded-lg">
                    <div className="p-2 space-y-2">
                        {displayedFaqs.map(faq => (
                            <button
                                key={faq.id}
                                onClick={() => setSelectedFaq(faq)}
                                className={cn(
                                    "w-full text-left p-3 rounded-md border transition-colors",
                                    selectedFaq?.id === faq.id ? "bg-secondary border-primary shadow-sm" : "bg-background hover:bg-secondary"
                                )}
                            >
                                <p className="font-medium truncate">{faq.entryContent}</p>
                                <p className="text-sm text-muted-foreground truncate">by {faq.userName}</p>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
                {faqs.length > 100 && (
                    <p className="text-center text-xs text-muted-foreground mt-2">More than 100 results. Refine search.</p>
                )}
            </div>
            <div className="md:col-span-2">
                {selectedFaq ? (
                     <ScrollArea className="h-[75vh] pr-4">
                        <FaqItemCard faq={selectedFaq} user={user} userLevel={userLevel} onUpdate={onFaqUpdate} searchTerm={searchTerm} />
                    </ScrollArea>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground rounded-lg border border-dashed">
                        <p>Select a question to view details.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const ITEMS_PER_PAGE = 12;

function QuestionList({ faqs, onSelectFaq }: { faqs: JournalEntry[], onSelectFaq: (faq: JournalEntry) => void }) {
    return (
      <div className="space-y-3 p-4">
        {faqs.map((faq, index) => (
          <button
            key={index}
            onClick={() => onSelectFaq(faq)}
            className="w-full text-left p-3 rounded-lg bg-background hover:bg-secondary transition-colors border"
          >
            <p className="font-medium truncate">{faq.entryContent}</p>
            <p className="text-sm text-muted-foreground truncate">Ed: {faq.feedback?.[0]?.feedbackContent || "No feedback yet."}</p>
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


const BubbleView = ({ faqsByTopic }: { faqsByTopic: Record<string, JournalEntry[]> }) => {
    const [viewState, setViewState] = useState<'root' | 'topics' | 'faqs'>('root');
    const [activeTopic, setActiveTopic] = useState<string | null>(null);
    const [selectedFaq, setSelectedFaq] = useState<JournalEntry | null>(null);
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
              <DialogDescription className="whitespace-pre-wrap pt-2">{selectedFaq ? formatText(selectedFaq.entryContent) : ''}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <h3 className="font-semibold mb-2">Ed Says:</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">{selectedFaq ? formatText(selectedFaq.feedback?.[0]?.feedbackContent || 'No feedback yet.') : ''}</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };
  
export default function FaqPage() {
  const [faqs, setFaqs] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'bubble'>('list');
  const [user, setUser] = useState<User | null>(null);
  const [userLevel, setUserLevel] = useState(0);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const journalEntries = await getAllJournalEntries();
      setFaqs(journalEntries);
    } catch (error) {
      console.error('Failed to fetch FAQ data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                setUserLevel(userDoc.data().currentUserLevel || 0);
            }
        } else {
            setUserLevel(0);
        }
    });
    return () => unsubscribe();
  }, []);

  const faqsByTopic = useMemo(() => {
    const topicsMap: Record<string, JournalEntry[]> = { "All": faqs };
    commonTopics.slice(1).forEach(topic => {
      const lowercasedTopic = topic.toLowerCase();
      topicsMap[topic] = faqs.filter(faq => 
        faq.entryContent.toLowerCase().includes(lowercasedTopic)
      );
    });
    return topicsMap;
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    let results = selectedTopic === 'All' ? faqs : (faqsByTopic[selectedTopic] || []);
    
    if (searchTerm) {
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
        results = results.filter(faq => {
            const questionText = faq.entryContent.toLowerCase();
            const answerText = (faq.feedback || []).map(fb => fb.feedbackContent).join(' ').toLowerCase();
            const combinedText = `${questionText} ${answerText}`;
            return searchWords.every(word => combinedText.includes(word));
        });
    }

    return results;
  }, [faqs, searchTerm, selectedTopic, faqsByTopic]);

  const isMentor = userLevel >= 6;

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
        <div className="flex items-center gap-4">
          {isMentor && (
            <Button asChild>
              <Link href="/my-tribe?view=mentor-dashboard#manual-faq-entry">
                <Edit className="mr-2 h-4 w-4" /> Manual FAQ Entry
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Path
            </Link>
          </Button>
        </div>
      </header>

      <Accordion type="single" collapsible defaultValue="how-to-use" className="w-full mb-8">
        <AccordionItem value="how-to-use">
          <AccordionTrigger>How to Use the FAQ</AccordionTrigger>
          <AccordionContent>
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-2">
              <p>This FAQ is a collection of community questions and answers. You can explore it in two ways:</p>
              <ul className="list-disc pl-5">
                <li>
                  <strong>List View (Default):</strong> A traditional, searchable list of all entries. Mentors can edit and delete content directly in this view.
                </li>
                <li>
                  <strong>Bubble View:</strong> An interactive way to explore topics visually. Click bubbles to navigate through categories and questions.
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
            <Label htmlFor="view-switch">Bubbles</Label>
            <Switch
                id="view-switch"
                checked={viewMode === 'list'}
                onCheckedChange={(checked) => setViewMode(checked ? 'list' : 'bubble')}
            />
            <Label htmlFor="view-switch">List</Label>
        </div>
        </div>

        {viewMode === 'list' ? (
            <ListView faqs={filteredFaqs} searchTerm={searchTerm} user={user} userLevel={userLevel} onFaqUpdate={fetchFaqs} />
        ) : (
            <BubbleView faqsByTopic={faqsByTopic} />
        )}
      </div>
    </div>
  );
}
