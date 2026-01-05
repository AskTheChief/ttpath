
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getAllJournalEntries } from '@/ai/flows/get-all-journal-entries';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { type JournalEntry } from '@/lib/types';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { addJournalFeedback } from '@/ai/flows/add-journal-feedback';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function FeedbackForm({ entryId, onFeedbackAdded }: { entryId: string, onFeedbackAdded: () => void }) {
    const [feedbackContent, setFeedbackContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    const handleSubmit = async () => {
        if (!feedbackContent.trim() || !user) {
            return;
        }
        setIsSubmitting(true);
        try {
            const idToken = await user.getIdToken();
            const result = await addJournalFeedback({
                idToken,
                entryId,
                feedbackContent,
            });
            if (result.success) {
                toast({ title: 'Feedback Added' });
                setFeedbackContent('');
                onFeedbackAdded();
            } else {
                throw new Error(result.message);
            }
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
        <div className="mt-4 space-y-2">
            <Textarea
                placeholder="Write your feedback..."
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                rows={3}
            />
            <Button onClick={handleSubmit} disabled={isSubmitting || !feedbackContent.trim()}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Feedback
            </Button>
        </div>
    );
}

export default function AllJournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
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

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">All Journal Entries</h1>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User Journals</CardTitle>
          <CardDescription>A chronological log of all journal entries submitted by users.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
             <p className="text-center text-muted-foreground p-8">No journal entries have been submitted yet.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {entries.map(entry => (
                <AccordionItem key={entry.id} value={entry.id}>
                  <AccordionTrigger>
                    <div className="flex flex-col text-left gap-1 w-full pr-4">
                       <span className="font-semibold">{entry.userName}</span>
                       <span className="text-xs text-muted-foreground">
                         {format(new Date(entry.createdAt), 'PPP p')}
                       </span>
                        <p className="text-sm text-muted-foreground text-left truncate pt-1">
                          {entry.entryContent}
                        </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="whitespace-pre-wrap">{entry.entryContent}</p>
                    <div className="mt-6 space-y-4">
                        <h4 className="font-semibold text-md">Feedback</h4>
                        {entry.feedback && entry.feedback.length > 0 ? (
                           <div className="space-y-4">
                                {entry.feedback.map((fb, index) => (
                                     <Alert key={index} className="bg-muted/50">
                                        <MessageSquare className="h-4 w-4" />
                                        <AlertTitle>Feedback from {fb.mentorName}</AlertTitle>
                                        <AlertDescription>
                                            <p className="whitespace-pre-wrap">{fb.feedbackContent}</p>
                                            <p className="text-xs text-muted-foreground mt-2">{format(new Date(fb.createdAt), 'PPP p')}</p>
                                        </AlertDescription>
                                    </Alert>
                                ))}
                           </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No feedback yet.</p>
                        )}
                        <FeedbackForm entryId={entry.id} onFeedbackAdded={fetchEntries} />
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
