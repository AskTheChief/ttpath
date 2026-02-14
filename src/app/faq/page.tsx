
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search, Edit, Trash2, Bold, Italic, Underline, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { getAllJournalEntries } from '@/ai/flows/get-all-journal-entries';
import { getChatSessions, type ChatSession } from '@/ai/flows/get-chat-sessions';
import { saveJournalEntry, deleteJournalEntry } from '@/ai/flows/journal';
import { editJournalFeedback } from '@/ai/flows/edit-journal-feedback';
import { deleteJournalFeedback } from '@/ai/flows/delete-journal-feedback';
import { notifyFaqAuthor } from '@/ai/flows/notify-faq-author';
import Image from 'next/image';
import type { JournalEntry, JournalFeedback } from '@/lib/types';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '@/components/image-uploader';
import { Label } from '@/components/ui/label';

// Augment JournalEntry type for this component to include chatbot entries
type FaqEntry = JournalEntry & { isChatbotEntry?: boolean };

const getAuthorDisplay = (type: 'question' | 'answer', entry: FaqEntry, feedback?: JournalFeedback): string => {
    if (type === 'question') {
        const level = entry.userLevel;
        if (level === 0) return "FAQ Contributor Says -";
        if (level === 1) return "Visitor says -";
        if (level === 2) return "Guest Says -";
        if (level === 3) return "Explorer Says -";
        if (level === 4) return "Tribe Member Says -";
        if (level === 5) return "Chief Says -";
        if (level === 6) return "Mentor Says -";
        if (entry.isChatbotEntry) return "Visitor says -";
        return "Contributor Says -";
    } else { // type === 'answer'
        if (!feedback) return '';
        if (feedback.mentorId === 'chatbot-chief') return "AI Chief says";
        if (feedback.mentorName?.toLowerCase().includes('ed')) return "Ed Says";
        const level = feedback.mentorLevel;
        if (level === 5) return "Tribe Chief Says";
        if (level >= 6) return "Mentor says";
        return "Mentor says";
    }
};


const highlightText = (text: string, highlight: string): string => {
  const searchWords = highlight.trim().split(/\s+/).filter(Boolean);
  if (!text || searchWords.length === 0) {
    return text;
  }
  const escapedWords = searchWords.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
  const sanitizedText = text.replace(/<[^>]*>/g, '');
  return sanitizedText.replace(regex, `<mark class="bg-yellow-200 dark:bg-yellow-800 text-foreground rounded-sm px-0.5 py-0.5">$1</mark>`);
};


function FormattingToolbar({
  textareaRef,
  onValueChange,
  value,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onValueChange: (newValue: string) => void;
  value: string;
}) {
  const formatText = (tag: 'b' | 'i' | 'u') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      const newText = `${value.substring(0, start)}<${tag}>${selectedText}</${tag}>${value.substring(end)}`;
      onValueChange(newText);
      
      // Re-focus and select the text after update
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length + 2, end + tag.length + 2);
      }, 0);
    }
  };

  return (
    <div className="flex gap-1 mb-2 p-1 border rounded-md bg-muted">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => formatText('b')} title="Bold">
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => formatText('i')} title="Italic">
        <Italic className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => formatText('u')} title="Underline">
        <Underline className="h-4 w-4" />
      </Button>
    </div>
  );
}

function FaqItemCard({ faq, user, userLevel, onUpdate, searchTerm }: { faq: FaqEntry; user: User | null; userLevel: number, onUpdate: () => void; searchTerm: string; }) {
    const { toast } = useToast();
    const [editingQuestion, setEditingQuestion] = useState(false);
    const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
    const [questionContent, setQuestionContent] = useState(faq.entryContent);
    const [questionSubject, setQuestionSubject] = useState(faq.subject || '');
    const [questionCaption, setQuestionCaption] = useState(faq.caption || '');
    const [questionImageUrl, setQuestionImageUrl] = useState(faq.imageUrl || '');
    
    const [answerContent, setAnswerContent] = useState('');
    const [answerCaption, setAnswerCaption] = useState('');
    const [answerImageUrl, setAnswerImageUrl] = useState('');
    const [answerImageCredit, setAnswerImageCredit] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [isNotifying, setIsNotifying] = useState(false);

    const questionTextareaRef = useRef<HTMLTextAreaElement>(null);
    const answerTextareaRef = useRef<HTMLTextAreaElement>(null);
    const answerImageCreditTextareaRef = useRef<HTMLTextAreaElement>(null);

    const isMentor = userLevel >= 6;
    const canEditEntry = isMentor && !faq.isChatbotEntry;
    
    useEffect(() => {
        setEditingQuestion(false);
        setEditingAnswerId(null);
        setQuestionContent(faq.entryContent);
        setQuestionSubject(faq.subject || '');
        setQuestionCaption(faq.caption || '');
        setQuestionImageUrl(faq.imageUrl || '');
        setAnswerContent('');
        setAnswerCaption('');
        setAnswerImageUrl('');
        setAnswerImageCredit('');
    }, [faq]);

    const handleSaveQuestion = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const idToken = await user.getIdToken();
            await saveJournalEntry({ 
                idToken, 
                entryId: faq.id, 
                entryContent: questionContent, 
                subject: questionSubject,
                caption: questionCaption,
                imageUrl: questionImageUrl || undefined,
            });
            toast({ title: 'Question updated' });
            setEditingQuestion(false);
            onUpdate();
        } catch (e: any) {
            toast({ title: 'Error updating question', description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnswerImageUrlChange = (url: string) => {
        setAnswerImageUrl(url);
        if (!url) {
            setAnswerImageCredit('');
        }
    };

    const handleSaveAnswer = async (feedbackId: string, { notify = false }: { notify?: boolean } = {}) => {
        if (!user) return;

        const setLoading = notify ? setIsNotifying : setIsSaving;
        setLoading(true);
        
        try {
            const idToken = await user.getIdToken();
            const result = await editJournalFeedback({
                idToken,
                entryId: faq.id,
                feedbackId: feedbackId,
                newFeedbackContent: answerContent,
                imageUrl: answerImageUrl,
                imageCredit: answerImageCredit,
                caption: answerCaption,
                subject: questionSubject,
            });
            toast({ title: 'Answer updated' });

            if (notify && !faq.isManualEntry) {
                const result = await notifyFaqAuthor({ idToken, entryId: faq.id });
                if (!result.success) throw new Error(result.message);
                toast({ title: 'Notification Sent', description: result.message });
            }

            setEditingAnswerId(null);
            onUpdate();
        } catch (e: any) {
            toast({ title: 'An error occurred', description: (e as Error).message, variant: 'destructive' });
        } finally {
            setLoading(false);
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
    
    const questionAuthorLabel = getAuthorDisplay('question', faq);
    const questionDate = new Date(faq.createdAt).toLocaleDateString();
    
    return (
        <div id={`faq-${faq.id}`} className="grid lg:grid-cols-2 gap-6 items-start">
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div className="flex-grow">
                        <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                            <span>{questionDate}</span>
                            <span>{questionAuthorLabel}</span>
                        </div>
                        {faq.subject && <p className="font-semibold pt-2 text-foreground">{faq.subject}</p>}
                    </div>
                    {canEditEntry && (
                        <div className="flex gap-2 ml-4">
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
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this entire FAQ entry?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the question and all associated answers. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
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
                    {editingQuestion ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="question-subject">Subject</Label>
                                <Input id="question-subject" value={questionSubject} onChange={e => setQuestionSubject(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="question-content">Question</Label>
                                <FormattingToolbar textareaRef={questionTextareaRef} value={questionContent} onValueChange={setQuestionContent} />
                                <Textarea ref={questionTextareaRef} id="question-content" value={questionContent} onChange={e => setQuestionContent(e.target.value)} rows={15} />
                            </div>
                            <ImageUploader imageUrl={questionImageUrl} onImageUrlChange={setQuestionImageUrl} userId={user?.uid} />
                            <div className="space-y-2">
                                <Label htmlFor="question-caption">Caption</Label>
                                <Textarea id="question-caption" value={questionCaption} onChange={e => setQuestionCaption(e.target.value)} placeholder="Caption for the question content or image..." rows={2}/>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button size="sm" onClick={handleSaveQuestion} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingQuestion(false)}>Cancel</Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: highlightText(faq.entryContent, searchTerm).replace(/\n/g, '<br />') }} />
                            {faq.imageUrl && (
                                <div className="mt-4 relative aspect-video">
                                    <Image src={faq.imageUrl} alt="FAQ Image" fill sizes="(max-width: 1023px) 90vw, 45vw" style={{ objectFit: 'cover' }} className="rounded-md" />
                                </div>
                            )}
                             {faq.caption && <p className="text-center text-sm text-muted-foreground italic mt-2">{faq.caption}</p>}
                        </>
                    )}
                </CardContent>
            </Card>

            <Card className="flex flex-col">
                <CardContent className="space-y-4 flex-grow pt-6">
                    {(faq.feedback || []).map(fb => {
                         const answerAuthorLabel = getAuthorDisplay('answer', faq, fb);
                         const feedbackDate = new Date(fb.createdAt).toLocaleDateString();
                         const canEditFeedback = isMentor && fb.mentorId !== 'chatbot-chief';
                         return (
                            <div key={fb.id} className="p-4 rounded-md bg-secondary/50">
                                {editingAnswerId === fb.id ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="answer-content">Answer</Label>
                                            <FormattingToolbar textareaRef={answerTextareaRef} value={answerContent} onValueChange={setAnswerContent} />
                                            <Textarea ref={answerTextareaRef} id="answer-content" value={answerContent} onChange={e => setAnswerContent(e.target.value)} rows={15} />
                                        </div>
                                        <ImageUploader imageUrl={answerImageUrl} onImageUrlChange={handleAnswerImageUrlChange} userId={user?.uid} label="Answer Image" />
                                        {answerImageUrl && (
                                            <div className="space-y-2">
                                                <Label htmlFor="answer-credit">Image Credit</Label>
                                                <FormattingToolbar textareaRef={answerImageCreditTextareaRef} value={answerImageCredit} onValueChange={setAnswerImageCredit} />
                                                <Textarea ref={answerImageCreditTextareaRef} id="answer-credit" value={answerImageCredit} onChange={e => setAnswerImageCredit(e.target.value)} placeholder="e.g., Photo by Jane Doe" rows={2}/>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label htmlFor="answer-caption">Caption</Label>
                                            <Textarea id="answer-caption" value={answerCaption} onChange={e => setAnswerCaption(e.target.value)} placeholder="Caption for the answer content or image..." rows={2}/>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button size="sm" variant="ghost" onClick={() => setEditingAnswerId(null)} disabled={isSaving || isNotifying}>Cancel</Button>
                                            <Button size="sm" variant="secondary" onClick={() => handleSaveAnswer(fb.id, { notify: false })} disabled={isSaving || isNotifying}>
                                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                                Save
                                            </Button>
                                            {!faq.isManualEntry && (
                                                <Button size="sm" onClick={() => handleSaveAnswer(fb.id, { notify: true })} disabled={isSaving || isNotifying}>
                                                    {isNotifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Mail className="mr-2 h-4 w-4"/>}
                                                    Save & Notify
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                                            <span>{feedbackDate}</span>
                                            <span>{answerAuthorLabel}</span>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <div className="text-sm prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: highlightText(fb.feedbackContent, searchTerm).replace(/\n/g, '<br />') }} />
                                            {canEditFeedback && (
                                                <div className="flex gap-1 shrink-0 ml-2">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingAnswerId(fb.id); setAnswerContent(fb.feedbackContent); setAnswerImageUrl(fb.imageUrl || ''); setAnswerImageCredit(fb.imageCredit || ''); setAnswerCaption(fb.caption || ''); }} disabled={isSaving}>
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
                                            <div className="mt-4">
                                                <div className="relative aspect-video">
                                                    <Image src={fb.imageUrl} alt="Feedback Image" fill sizes="(max-width: 1023px) 45vw, (min-width: 1024px) 40vw" style={{ objectFit: 'cover' }} className="rounded-md" />
                                                </div>
                                                {fb.imageCredit && <div className="text-xs text-muted-foreground text-center mt-1" dangerouslySetInnerHTML={{ __html: highlightText(fb.imageCredit, searchTerm).replace(/\n/g, '<br />') }} />}
                                            </div>
                                        )}
                                        {fb.caption && <p className="text-center text-sm text-muted-foreground italic mt-2">{fb.caption}</p>}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    {(!faq.feedback || faq.feedback.length === 0) && (
                        <p className="text-sm text-muted-foreground">No feedback yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [userLevel, setUserLevel] = useState(0);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const [journalEntries, chatSessions] = await Promise.all([
        getAllJournalEntries(),
        getChatSessions()
      ]);

      const chatbotFaqs: FaqEntry[] = chatSessions.map(session => ({
        id: `chatbot-${session.id}`,
        userId: session.userId || 'anonymous-chatbot-user',
        userName: session.userName || 'Anonymous',
        userLevel: 1, // Treat as Guest
        entryContent: session.question.replace(/<[^>]*>/g, ''),
        createdAt: session.createdAt,
        feedback: [
          {
            id: `feedback-chatbot-${session.id}`,
            mentorId: 'chatbot-chief',
            mentorName: 'The Chief',
            mentorLevel: 7, // Special level for the chief
            feedbackContent: session.answer,
            createdAt: session.createdAt
          }
        ],
        isChatbotEntry: true,
      }));

      const allFaqs = [...journalEntries, ...chatbotFaqs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setFaqs(allFaqs);
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

  const filteredFaqs = useMemo(() => {
    let results = faqs;
    
    if (searchTerm) {
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
        results = results.filter(faq => {
            const questionText = faq.entryContent.replace(/<[^>]*>/g, '').toLowerCase();
            const answerText = (faq.feedback || []).map(fb => fb.feedbackContent.replace(/<[^>]*>/g, '')).join(' ').toLowerCase();
            const combinedText = `${questionText} ${answerText}`;
            return searchWords.every(word => combinedText.includes(word));
        });
    }

    return results;
  }, [faqs, searchTerm]);

  const isMentor = userLevel >= 6;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading the FAQ...</p>
      </div>
    );
  }

  if (!isMentor) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle>Access Restricted</CardTitle>
                    <CardDescription>
                        This page is currently under review and is only available to Mentors.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>We are working on anonymizing all entries before making them public. Thank you for your patience.</p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Path
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
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

      <div className="space-y-8">
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
        
        {filteredFaqs.length > 0 ? (
           <div className="space-y-12">
            {filteredFaqs.map(faq => (
                <FaqItemCard key={faq.id} faq={faq} user={user} userLevel={userLevel} onUpdate={fetchFaqs} searchTerm={searchTerm} />
            ))}
        </div>
        ) : (
            <div className="text-center py-16 text-muted-foreground">
                <p>No results found for your query.</p>
            </div>
        )}
      </div>
    </div>
  );
}
