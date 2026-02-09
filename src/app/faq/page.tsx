
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search, Edit, Trash2, Bold, Italic, Underline } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { ImageUploader } from '@/components/image-uploader';
import { Label } from '@/components/ui/label';

const levelMap: Record<number, string> = {
  1: "Visitor",
  2: "Guest",
  3: "Explorer",
  4: "Member",
  5: "Chief",
  6: "Mentor",
};

const getRoleName = (level?: number) => {
    if (level === 0) return 'Contributor';
    if (!level || level < 1 || level > 6) return 'Contributor';
    return levelMap[level];
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

function FaqItemCard({ faq, user, userLevel, onUpdate }: { faq: JournalEntry; user: User | null; userLevel: number, onUpdate: () => void; }) {
    const { toast } = useToast();
    const [editingQuestion, setEditingQuestion] = useState(false);
    const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
    const [questionContent, setQuestionContent] = useState(faq.entryContent);
    const [questionImageUrl, setQuestionImageUrl] = useState(faq.imageUrl || '');
    const [answerContent, setAnswerContent] = useState('');
    const [answerImageUrl, setAnswerImageUrl] = useState('');
    const [answerImageCredit, setAnswerImageCredit] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const questionTextareaRef = useRef<HTMLTextAreaElement>(null);
    const answerTextareaRef = useRef<HTMLTextAreaElement>(null);

    const isMentor = userLevel >= 6;
    
    useEffect(() => {
        setEditingQuestion(false);
        setEditingAnswerId(null);
        setQuestionContent(faq.entryContent);
        setQuestionImageUrl(faq.imageUrl || '');
        setAnswerContent('');
        setAnswerImageUrl('');
        setAnswerImageCredit('');
    }, [faq]);

    const handleSaveQuestion = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const idToken = await user.getIdToken();
            await saveJournalEntry({ idToken, entryId: faq.id, entryContent: questionContent, imageUrl: questionImageUrl });
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

    const handleSaveAnswer = async (feedbackId: string) => {
        if (!user) return;
        setIsSaving(true);
        try {
            const idToken = await user.getIdToken();
            await editJournalFeedback({
                idToken,
                entryId: faq.id,
                feedbackId: feedbackId,
                newFeedbackContent: answerContent,
                imageUrl: answerImageUrl || undefined,
                imageCredit: answerImageCredit || undefined
            });
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
    
    const contributorRole = getRoleName(faq.userLevel);
    
    return (
        <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{contributorRole} Says:</CardTitle>
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
                    {faq.imageUrl && !editingQuestion && (
                        <div className="mb-4 relative aspect-video">
                            <Image src={faq.imageUrl} alt="FAQ Image" fill sizes="(max-width: 1023px) 90vw, 45vw" style={{ objectFit: 'cover' }} className="rounded-md" />
                        </div>
                    )}
                    {editingQuestion ? (
                        <div className="space-y-2">
                            <FormattingToolbar textareaRef={questionTextareaRef} value={questionContent} onValueChange={setQuestionContent} />
                            <Textarea ref={questionTextareaRef} value={questionContent} onChange={e => setQuestionContent(e.target.value)} rows={18} />
                            <ImageUploader imageUrl={questionImageUrl} onImageUrlChange={setQuestionImageUrl} userId={user?.uid} />
                            <div className="flex gap-2 pt-2">
                                <Button size="sm" onClick={handleSaveQuestion} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingQuestion(false)}>Cancel</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: faq.entryContent.replace(/\n/g, '<br />') }} />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Ed Says:</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {(faq.feedback || []).map(fb => {
                         const feedbackAuthor = fb.mentorName?.toLowerCase().includes('ed') ? 'Ed' : getRoleName(fb.mentorLevel);
                         return (
                            <div key={fb.id} className="p-4 rounded-md bg-secondary/50">
                                {editingAnswerId === fb.id ? (
                                    <div className="space-y-2">
                                        <FormattingToolbar textareaRef={answerTextareaRef} value={answerContent} onValueChange={setAnswerContent} />
                                        <Textarea ref={answerTextareaRef} value={answerContent} onChange={e => setAnswerContent(e.target.value)} rows={15} />
                                        <ImageUploader imageUrl={answerImageUrl} onImageUrlChange={handleAnswerImageUrlChange} userId={user?.uid} label="Answer Image" />
                                        {answerImageUrl && (
                                            <div>
                                                <Label htmlFor="answer-credit" className="text-xs">Image Credit</Label>
                                                <Input id="answer-credit" value={answerImageCredit} onChange={e => setAnswerImageCredit(e.target.value)} placeholder="e.g., Photo by Jane Doe" />
                                            </div>
                                        )}
                                        <div className="flex gap-2 pt-2">
                                            <Button size="sm" onClick={() => handleSaveAnswer(fb.id)} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save</Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingAnswerId(null)}>Cancel</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <div className="text-sm prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: fb.feedbackContent.replace(/\n/g, '<br />') }} />
                                            {isMentor && (
                                                <div className="flex gap-1 shrink-0 ml-2">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingAnswerId(fb.id); setAnswerContent(fb.feedbackContent); setAnswerImageUrl(fb.imageUrl || ''); setAnswerImageCredit(fb.imageCredit || ''); }} disabled={isSaving}>
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
                                            <>
                                                <div className="mt-4 relative aspect-video">
                                                    <Image src={fb.imageUrl} alt="Feedback Image" fill sizes="(max-width: 1023px) 90vw, 45vw" style={{ objectFit: 'cover' }} className="rounded-md" />
                                                </div>
                                                {fb.imageCredit && <p className="text-xs text-muted-foreground text-right mt-1">Credit: {fb.imageCredit}</p>}
                                            </>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-2">by {feedbackAuthor} on {new Date(fb.createdAt).toLocaleDateString()}</p>
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
  const [faqs, setFaqs] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredFaqs = useMemo(() => {
    let results = faqs;
    
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
              <p>This FAQ is a collection of community questions and answers. Mentors can edit and delete content directly in this view.</p>
              <p>
                Use the search bar to find specific keywords within the questions.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
           <Accordion type="single" collapsible className="w-full space-y-4">
            {filteredFaqs.map(faq => (
                <AccordionItem value={faq.id} key={faq.id} className="border-b-0 rounded-lg">
                    <Card>
                        <AccordionTrigger className="p-6 hover:no-underline w-full">
                            <div className="grid w-full gap-1 text-left">
                                <div className="flex w-full justify-between">
                                    <span className="font-semibold">{getRoleName(faq.userLevel)}</span>
                                    <span className="text-xs text-muted-foreground">{new Date(faq.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="truncate text-sm text-muted-foreground break-words pr-4">{faq.entryContent}</p>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="px-6 pb-6">
                                <div className="pt-6 border-t">
                                    <FaqItemCard faq={faq} user={user} userLevel={userLevel} onUpdate={fetchFaqs} />
                                </div>
                            </div>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            ))}
        </Accordion>
        ) : (
            <div className="text-center py-16 text-muted-foreground">
                <p>No results found for your query.</p>
            </div>
        )}
      </div>
    </div>
  );
}
