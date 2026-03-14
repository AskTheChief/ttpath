
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search, Edit, Trash2, Bold, Italic, Underline, Mail, PlusCircle, Sparkles, FileText, User as UserIcon, BookHeart, Send, Lightbulb, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getAllJournalEntries } from '@/ai/flows/get-all-journal-entries';
import { getChatSessions, type ChatSession } from '@/ai/flows/get-chat-sessions';
import { saveJournalEntry, deleteJournalEntry } from '@/ai/flows/journal';
import { addJournalFeedback } from '@/ai/flows/add-journal-feedback';
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
import ChatbotModal from '@/components/modals/chatbot-modal';
import { cn } from '@/lib/utils';

// Augment JournalEntry type for this component to include chatbot entries
type ForumEntry = JournalEntry & { isChatbotEntry?: boolean };

const getAuthorDisplay = (type: 'question' | 'answer', entry: ForumEntry, feedback?: JournalFeedback): string => {
    if (type === 'question') {
        const level = Number(entry.userLevel || 0);
        if (level === 0) return "Forum Contributor:";
        if (level === 1) return "Visitor Says:";
        if (level === 2) return "Guest Says:";
        if (level === 3) return "Applicant Says:";
        if (level === 4) return "Tribe Member Says:";
        if (level === 5) return "Chief Says:";
        if (level === 6) return "Mentor Says:";
        if (entry.isChatbotEntry) return "Visitor Says:";
        return "Contributor:";
    } else { // type === 'answer'
        const qLevel = Number(entry.userLevel || 0);
        if (qLevel === 0) return "Ed Says:";
        
        if (qLevel === 6) {
            return "Mentor's Mentor Says:";
        }

        if (!feedback) return '';
        if (feedback.mentorId === 'chatbot-chief') return "AI Chief Says:";
        if (feedback.mentorName?.toLowerCase().includes('ed')) return "Ed Says:";
        
        const level = Number(feedback.mentorLevel || 0);
        if (level === 5) return "Tribe Chief Says:";
        if (level >= 6) return "Mentor Says:";
        return "Mentor Says:"; 
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

function FeedbackForm({
  entryId,
  onActionComplete,
  user,
  editingFeedback,
  onCancelEdit,
}: {
  entryId: string;
  onActionComplete: () => void;
  user: User | null;
  editingFeedback?: JournalFeedback | null;
  onCancelEdit?: () => void;
}) {
  const [feedbackContent, setFeedbackContent] = useState(editingFeedback ? editingFeedback.feedbackContent : '');
  const [imageUrl, setImageUrl] = useState(editingFeedback?.imageUrl || '');
  const [imageCredit, setImageCredit] = useState(editingFeedback?.imageCredit || '');
  const [caption, setCaption] = useState(editingFeedback?.caption || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditMode = !!editingFeedback;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageCreditTextareaRef = useRef<HTMLTextAreaElement>(null);
  const captionTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setFeedbackContent(editingFeedback ? editingFeedback.feedbackContent : '');
    setImageUrl(editingFeedback?.imageUrl || '');
    setImageCredit(editingFeedback?.imageCredit || '');
    setCaption(editingFeedback?.caption || '');
  }, [editingFeedback]);

  const handleSubmit = async () => {
    if (!feedbackContent.trim() || !user) {
      return;
    }
    setIsSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      if (isEditMode && editingFeedback) {
        const result = await editJournalFeedback({
          idToken,
          entryId,
          feedbackId: editingFeedback.id,
          newFeedbackContent: feedbackContent,
          imageUrl: imageUrl,
          imageCredit: imageCredit,
          caption: caption,
        });
        if (result.success) {
          toast({ title: 'Feedback Updated' });
        } else {
          throw new Error(result.message);
        }
      } else {
        const result = await addJournalFeedback({
          idToken,
          entryId,
          feedbackContent,
          imageUrl: imageUrl,
          imageCredit: imageCredit,
          caption: caption,
        });
        if (result.success) {
          toast({ title: 'Feedback Added' });
          setFeedbackContent('');
          setImageUrl('');
          setImageCredit('');
          setCaption('');
        } else {
          throw new Error(result.message);
        }
      }
      onActionComplete();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <p className="text-sm text-muted-foreground">You must be logged in to provide feedback.</p>;
  }

  return (
    <div className="mt-4 space-y-4 p-4 border rounded-lg bg-background">
      <h4 className="font-semibold">{isEditMode ? 'Edit Your Feedback' : 'Add Feedback'}</h4>
      <FormattingToolbar textareaRef={textareaRef} value={feedbackContent} onValueChange={setFeedbackContent} />
      <Textarea
        ref={textareaRef}
        placeholder="Write your feedback..."
        value={feedbackContent}
        onChange={(e) => setFeedbackContent(e.target.value)}
        rows={3}
      />
      <div className="space-y-4">
        <ImageUploader imageUrl={imageUrl} onImageUrlChange={setImageUrl} userId={user?.uid} label="Feedback Image" />
        {imageUrl && (
          <div className="space-y-1">
              <Label htmlFor="imageCredit" className="text-xs">Image Credit</Label>
              <FormattingToolbar textareaRef={imageCreditTextareaRef} value={imageCredit} onValueChange={setImageCredit} />
              <Textarea ref={imageCreditTextareaRef} id="imageCredit" value={imageCredit} onChange={e => setImageCredit(e.target.value)} placeholder="e.g., Photo by Jane Doe" rows={2}/>
          </div>
        )}
        <div className="space-y-1">
            <Label htmlFor="caption" className="text-xs">Caption</Label>
            <FormattingToolbar textareaRef={captionTextareaRef} value={caption} onValueChange={setCaption} />
            <Textarea ref={captionTextareaRef} id="caption" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption for content or image..." rows={2}/>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={isSubmitting || !feedbackContent.trim()}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? null : <Send className="mr-2 h-4 w-4" />}
          {isEditMode ? 'Update Feedback' : 'Submit Feedback'}
        </Button>
        {isEditMode && (
          <Button variant="ghost" onClick={onCancelEdit}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function ForumItemCard({ faq, user, userLevel, onUpdate, searchTerm, isPendingView = false }: { faq: ForumEntry; user: User | null; userLevel: number, onUpdate: () => void; searchTerm: string; isPendingView?: boolean; }) {
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
    const [contributorEmail, setContributorEmail] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [isNotifying, setIsNotifying] = useState(false);

    const questionTextareaRef = useRef<HTMLTextAreaElement>(null);
    const answerTextareaRef = useRef<HTMLTextAreaElement>(null);
    const answerImageCreditTextareaRef = useRef<HTMLTextAreaElement>(null);
    const answerCaptionTextareaRef = useRef<HTMLTextAreaElement>(null);
    const questionCaptionTextareaRef = useRef<HTMLTextAreaElement>(null);

    const isMentor = Number(userLevel) >= 6;
    const canEditEntry = isMentor && !faq.isChatbotEntry;
    const isManualOrContributor = faq.isManualEntry || Number(faq.userLevel) === 0;

    
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

            if (notify) {
                 if (isManualOrContributor && !contributorEmail.trim()) {
                    toast({
                        title: 'Email Required',
                        description: "Please enter the contributor's email address to send a notification.",
                        variant: 'destructive',
                    });
                } else {
                    const notifyResult = await notifyFaqAuthor({
                        idToken,
                        entryId: faq.id,
                        recipientEmail: isManualOrContributor ? contributorEmail.trim() : undefined,
                    });
                    if (notifyResult.success) {
                        toast({ title: 'Notification Sent', description: notifyResult.message });
                    } else {
                        throw new Error(notifyResult.message);
                    }
                }
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
            toast({ title: 'Forum entry deleted' });
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
        <div id={`faq-card-${faq.id}`} className={cn("grid lg:grid-cols-2 gap-6 items-start", isPendingView && "bg-background p-4 pt-0")}>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{questionAuthorLabel}</span>
                            {faq.recipient === 'Ed' && (
                                <span className="flex items-center text-xs text-primary font-bold px-2 py-0.5 rounded-full bg-primary/10 ring-1 ring-primary/20">TO ED</span>
                            )}
                            {faq.recipient === 'Suggestion' && (
                                <span className="flex items-center text-xs text-accent-foreground font-bold px-2 py-0.5 rounded-full bg-accent ring-1 ring-accent">SUGGESTION</span>
                            )}
                        </div>
                        <span className="text-muted-foreground">{questionDate}</span>
                    </div>
                     <div className="flex justify-between items-start">
                        {faq.subject && <p className="font-semibold pt-2 text-foreground">{faq.subject}</p>}
                        {canEditEntry && (
                            <div className="flex gap-2 ml-auto">
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
                                            <AlertDialogTitle>Delete this entire Forum entry?</AlertDialogTitle>
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
                    </div>
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
                                <FormattingToolbar textareaRef={questionCaptionTextareaRef} value={questionCaption} onValueChange={setQuestionCaption} />
                                <Textarea ref={questionCaptionTextareaRef} id="question-caption" value={questionCaption} onChange={e => setQuestionCaption(e.target.value)} placeholder="Caption for the question content or image..." rows={2}/>
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
                                    <Image src={faq.imageUrl} alt="Forum Image" fill sizes="(max-width: 1023px) 90vw, 45vw" style={{ objectFit: 'contain' }} className="rounded-md" />
                                </div>
                            )}
                             {faq.caption && <div className="text-center text-sm text-muted-foreground italic mt-4" dangerouslySetInnerHTML={{ __html: faq.caption.replace(/\n/g, '<br />')}}/>}
                        </>
                    )}
                </CardContent>
            </Card>

            <Card className="flex flex-col">
                <CardContent className="space-y-4 flex-grow pt-6">
                    {(faq.feedback || []).map(fb => {
                         const answerAuthorLabel = getAuthorDisplay('answer', faq, fb);
                         // Enable editing if user is a mentor, EVEN IF it's a chatbot entry.
                         const canEditFeedback = isMentor;
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
                                            <FormattingToolbar textareaRef={answerCaptionTextareaRef} value={answerCaption} onValueChange={setAnswerCaption} />
                                            <Textarea ref={answerCaptionTextareaRef} id="answer-caption" value={answerCaption} onChange={e => setAnswerCaption(e.target.value)} placeholder="Caption for the answer content or image..." rows={2}/>
                                        </div>

                                        {isManualOrContributor && (
                                            <div className="space-y-2 pt-4 border-t">
                                                <Label htmlFor={`contributor-email-${faq.id}`}>Notify Contributor by Email</Label>
                                                <Input
                                                    id={`contributor-email-${faq.id}`}
                                                    type="email"
                                                    value={contributorEmail}
                                                    onChange={(e) => setContributorEmail(e.target.value)}
                                                    placeholder="contributor@example.com"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Enter email here to use the "Save & Notify" button.
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button size="sm" variant="ghost" onClick={() => setEditingAnswerId(null)} disabled={isSaving || isNotifying}>Cancel</Button>
                                            <Button size="sm" variant="secondary" onClick={() => handleSaveAnswer(fb.id, { notify: false })} disabled={isSaving || isNotifying}>
                                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                                Save
                                            </Button>
                                            <Button size="sm" onClick={() => handleSaveAnswer(fb.id, { notify: true })} disabled={isSaving || isNotifying}>
                                                {isNotifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Mail className="mr-2 h-4 w-4"/>}
                                                Save & Notify
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex justify-between items-center text-sm mb-2">
                                            <span className="font-bold text-foreground">{answerAuthorLabel}</span>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-sm prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: highlightText(fb.feedbackContent, searchTerm).replace(/\n/g, '<br />') }} />
                                            </div>
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
                                                    <Image src={fb.imageUrl} alt="Feedback Image" fill sizes="(max-width: 1023px) 45vw, (min-width: 1024px) 40vw" style={{ objectFit: 'contain' }} className="rounded-md" />
                                                </div>
                                                {fb.imageCredit && <div className="text-center text-xs text-muted-foreground italic mt-2" dangerouslySetInnerHTML={{ __html: highlightText(fb.imageCredit, searchTerm).replace(/\n/g, '<br />') }} />}
                                                {fb.caption && <div className="text-center text-sm text-muted-foreground italic mt-4" dangerouslySetInnerHTML={{ __html: fb.caption.replace(/\n/g, '<br />')}}/>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                         )
                    })}
                    {(!faq.feedback || faq.feedback.length === 0) && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">No feedback yet.</p>
                            {isMentor && (
                                <FeedbackForm
                                    entryId={faq.id}
                                    user={user}
                                    onActionComplete={onUpdate}
                                />
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function ForumPage() {
  const [faqs, setFaqs] = useState<ForumEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [userLevel, setUserLevel] = useState(0);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [userTribe, setUserTribe] = useState<any>(null);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const [journalEntries, chatSessions] = await Promise.all([
        getAllJournalEntries(),
        getChatSessions()
      ]);

      const chatbotFaqs: ForumEntry[] = chatSessions.map(session => ({
        id: `chatbot-${session.id}`,
        userId: session.userId || 'anonymous-chatbot-user',
        userName: session.userName || 'Anonymous',
        userLevel: 1, // Treat as Visitor
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
      console.error('Failed to fetch forum data:', error);
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
                setUserLevel(Number(userDoc.data().currentUserLevel || 0));
            }
        } else {
            setUserLevel(0);
        }
        setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isMentor = Number(userLevel) >= 6;

  const { pendingFaqs, pendingSuggestions, answeredFaqs } = useMemo(() => {
    const unanswered = faqs.filter(faq => !faq.feedback || faq.feedback.length === 0);
    const suggestions = unanswered.filter(faq => faq.recipient === 'Suggestion');
    const questions = unanswered.filter(faq => faq.recipient !== 'Suggestion');
    const answered = faqs.filter(faq => faq.feedback && faq.feedback.length > 0);
    return { pendingFaqs: questions, pendingSuggestions: suggestions, answeredFaqs: answered };
  }, [faqs]);

  const filteredAnsweredFaqs = useMemo(() => {
    let results = answeredFaqs;
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
  }, [answeredFaqs, searchTerm]);

  const NavigationButtons = () => (
    <div className="flex flex-wrap gap-3 mb-8">
      <Button asChild variant="secondary" className="shadow-sm border border-border/50">
        <Link href="/my-tribe?view=faq#ask-ed">
          <PlusCircle className="mr-2 h-4 w-4 text-primary" /> Ask Ed
        </Link>
      </Button>
      
      {Number(userLevel) === 4 && (
        <Button asChild variant="secondary" className="shadow-sm border border-border/50">
          <Link href="/my-tribe?view=faq#ask-chief">
            <PlusCircle className="mr-2 h-4 w-4 text-primary" /> Report to my Chief
          </Link>
        </Button>
      )}

      {Number(userLevel) >= 5 && (
        <Button asChild variant="secondary" className="shadow-sm border border-border/50">
          <Link href="/my-tribe?view=faq#ask-mentor">
            <PlusCircle className="mr-2 h-4 w-4 text-primary" /> Report to my Mentor
          </Link>
        </Button>
      )}

      <Button asChild variant="secondary" className="shadow-sm border border-border/50">
        <Link href="/my-tribe?view=faq#suggestion-box">
          <Lightbulb className="mr-2 h-4 w-4 text-primary" /> Suggestion Box
        </Link>
      </Button>

      <Button variant="secondary" onClick={() => setIsChatbotOpen(true)} className="shadow-sm border border-border/50">
        <Sparkles className="mr-2 h-4 w-4 text-primary" /> Ask the AI Chief
      </Button>
      
      <Button asChild variant="secondary" className="shadow-sm border border-border/50">
        <Link href="/relationships">
          <Heart className="mr-2 h-4 w-4 text-primary" /> Trading Tribe Customs
        </Link>
      </Button>
      
      {Number(userLevel) >= 4 && (
        <Button asChild variant="secondary" className="shadow-sm border border-border/50">
          <Link href="/my-tribe?view=meeting-reports">
            <FileText className="mr-2 h-4 w-4 text-primary" /> Write Tribe Report
          </Link>
        </Button>
      )}
    </div>
  );

  if (loading || isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading The Forum...</p>
      </div>
    );
  }

  if (!isMentor) {
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col items-center justify-center">
            <div className="max-w-4xl w-full">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold">The Forum</h1>
                    <Button asChild variant="outline">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Path
                        </Link>
                    </Button>
                </header>

                <NavigationButtons />

                <Card className="max-w-md mx-auto text-center">
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
            <ChatbotModal isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-4xl font-bold">The Forum</h1>
          <p className="text-muted-foreground">Search and explore over {faqs.length} entries in the forum.</p>
        </div>
        <div className="flex items-center gap-4">
          {isMentor && (
            <Button asChild>
              <Link href="/my-tribe?view=mentor-dashboard#manual-faq-entry">
                <Edit className="mr-2 h-4 w-4" /> Ed's Manual Forum Entry
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

      <NavigationButtons />

      {/* MENTOR ONLY PENDING SECTION */}
      {isMentor && (pendingFaqs.length > 0 || pendingSuggestions.length > 0) && (
        <section className="mb-16 space-y-12">
            {pendingSuggestions.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b pb-4">
                        <div className="bg-accent/20 p-2 rounded-full">
                            <Lightbulb className="h-6 w-6 text-accent-foreground" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-accent-foreground">Pending Suggestions</h2>
                            <p className="text-sm text-muted-foreground">Review and comment on user suggestions to move them to the public archive.</p>
                        </div>
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                        {pendingSuggestions.map(faq => (
                            <AccordionItem key={faq.id} value={faq.id} className="border-b-0 mb-4">
                                <AccordionTrigger className="hover:no-underline bg-accent/10 px-4 rounded-t-xl border border-accent/20 shadow-sm data-[state=closed]:rounded-xl transition-all">
                                    <div className="flex flex-col items-start text-left gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-foreground">{getAuthorDisplay('question', faq)}</span>
                                            <span className="text-xs text-muted-foreground ml-2">{new Date(faq.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        {faq.subject && <p className="font-semibold text-sm line-clamp-1">{faq.subject}</p>}
                                        <p className="text-sm text-muted-foreground line-clamp-1">{faq.entryContent.replace(/<[^>]*>/g, '')}</p>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-0 px-0">
                                    <ForumItemCard 
                                        faq={faq} 
                                        user={user} 
                                        userLevel={userLevel} 
                                        onUpdate={fetchFaqs} 
                                        searchTerm={searchTerm} 
                                        isPendingView={true}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            )}

            {pendingFaqs.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b pb-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <BookHeart className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-primary">Pending Forum Entries</h2>
                            <p className="text-sm text-muted-foreground">Answer these questions to make them visible in the public archive.</p>
                        </div>
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                        {pendingFaqs.map(faq => (
                            <AccordionItem key={faq.id} value={faq.id} className="border-b-0 mb-4">
                                <AccordionTrigger className="hover:no-underline bg-primary/5 px-4 rounded-t-xl border border-primary/20 shadow-sm data-[state=closed]:rounded-xl transition-all">
                                    <div className="flex flex-col items-start text-left gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-foreground">{getAuthorDisplay('question', faq)}</span>
                                            {faq.recipient === 'Ed' && (
                                                <span className="flex items-center text-xs text-primary font-bold px-2 py-0.5 rounded-full bg-primary/10 ring-1 ring-primary/20">TO ED</span>
                                            )}
                                            <span className="text-xs text-muted-foreground ml-2">{new Date(faq.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        {faq.subject && <p className="font-semibold text-sm line-clamp-1">{faq.subject}</p>}
                                        <p className="text-sm text-muted-foreground line-clamp-1">{faq.entryContent.replace(/<[^>]*>/g, '')}</p>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-0 px-0">
                                    <ForumItemCard 
                                        faq={faq} 
                                        user={user} 
                                        userLevel={userLevel} 
                                        onUpdate={fetchFaqs} 
                                        searchTerm={searchTerm} 
                                        isPendingView={true}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            )}
        </section>
      )}

      <div className="space-y-8">
        <div className="flex items-center gap-3 border-b pb-4">
            <div className="bg-muted p-2 rounded-full">
                <UserIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
                <h2 className="text-2xl font-bold">Public Archive</h2>
                <p className="text-sm text-muted-foreground">Explore all answered questions and community knowledge.</p>
            </div>
        </div>

        <div className="relative flex-grow w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Refine archive search by keyword..."
              className="w-full pl-10 text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        {filteredAnsweredFaqs.length > 0 ? (
           <div className="space-y-12">
            {filteredAnsweredFaqs.map(faq => (
                <ForumItemCard key={faq.id} faq={faq} user={user} userLevel={userLevel} onUpdate={fetchFaqs} searchTerm={searchTerm} />
            ))}
        </div>
        ) : (
            <div className="text-center py-16 text-muted-foreground">
                <p>{searchTerm ? 'No results found for your archive query.' : 'No public entries yet.'}</p>
            </div>
        )}
      </div>
      <ChatbotModal isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
    </div>
  );
}
