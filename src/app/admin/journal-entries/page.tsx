
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getAllJournalEntries } from '@/ai/flows/get-all-journal-entries';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, MessageSquare, Send, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { type JournalEntry, type JournalFeedback } from '@/lib/types';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { addJournalFeedback } from '@/ai/flows/add-journal-feedback';
import { editJournalFeedback } from '@/ai/flows/edit-journal-feedback';
import { deleteJournalFeedback } from '@/ai/flows/delete-journal-feedback';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditMode = !!editingFeedback;

  useEffect(() => {
    setFeedbackContent(editingFeedback ? editingFeedback.feedbackContent : '');
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
        });
        if (result.success) {
          toast({ title: 'Feedback Added' });
          setFeedbackContent('');
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
    <div className="mt-4 space-y-2 p-4 border rounded-lg bg-background">
      <h4 className="font-semibold">{isEditMode ? 'Edit Your Feedback' : 'Add Feedback'}</h4>
      <Textarea
        placeholder="Write your feedback..."
        value={feedbackContent}
        onChange={(e) => setFeedbackContent(e.target.value)}
        rows={3}
      />
      <div className="flex gap-2">
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

export default function AllJournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const fetchedEntries = await getAllJournalEntries();
      setEntries(fetchedEntries);
    } catch (error) {
      console.error("Error fetching all journal entries: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleDeleteFeedback = async (entryId: string, feedbackId: string) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const result = await deleteJournalFeedback({ idToken, entryId, feedbackId });
      if (result.success) {
        toast({ title: 'Feedback Deleted' });
        fetchEntries();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">All FAQ 2.1 Entries</h1>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User Questions (FAQ 2.1)</CardTitle>
          <CardDescription>A chronological log of all questions submitted by users via the FAQ 2.1 system.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
             <p className="text-center text-muted-foreground p-8">No questions have been submitted yet.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {entries.map(entry => (
                <AccordionItem key={entry.id} value={entry.id}>
                  <AccordionTrigger>
                    <div className="grid w-full gap-1 text-left">
                      <div className="flex w-full justify-between">
                        <span className="font-semibold">{entry.userName}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(entry.createdAt), 'PPP p')}</span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground break-words pr-4">
                        {entry.entryContent}
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="whitespace-pre-wrap break-words">{entry.entryContent}</p>
                    <div className="mt-6 space-y-4">
                        <h4 className="font-semibold text-md">Feedback</h4>
                        {entry.feedback && entry.feedback.length > 0 ? (
                           <div className="space-y-4">
                                {entry.feedback.map((fb, index) => (
                                  editingFeedbackId === fb.id ? (
                                    <FeedbackForm
                                      key={fb.id}
                                      entryId={entry.id}
                                      user={user}
                                      editingFeedback={fb}
                                      onActionComplete={() => {
                                        setEditingFeedbackId(null);
                                        fetchEntries();
                                      }}
                                      onCancelEdit={() => setEditingFeedbackId(null)}
                                    />
                                  ) : (
                                    <Alert key={fb.id || index} className="bg-muted/50 relative group">
                                      <MessageSquare className="h-4 w-4" />
                                      <AlertTitle>Feedback from {fb.mentorName}</AlertTitle>
                                      <AlertDescription>
                                          <p className="whitespace-pre-wrap break-words">{fb.feedbackContent}</p>
                                          <p className="text-xs text-muted-foreground mt-2">
                                            {format(new Date(fb.createdAt), 'PPP p')}
                                            {fb.updatedAt && ` (edited ${format(new Date(fb.updatedAt), 'PPP p')})`}
                                          </p>
                                      </AlertDescription>
                                      {user?.uid === fb.mentorId && (
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingFeedbackId(fb.id)}>
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete this feedback. This action cannot be undone.</AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteFeedback(entry.id, fb.id)}>Delete</AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      )}
                                    </Alert>
                                  )
                                ))}
                           </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No feedback yet.</p>
                        )}
                        {editingFeedbackId === null && (
                          <FeedbackForm
                            entryId={entry.id}
                            onActionComplete={fetchEntries}
                            user={user}
                          />
                        )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
