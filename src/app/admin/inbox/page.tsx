
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getInboundEmails, type InboundEmail } from '@/ai/flows/get-inbound-emails';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Inbox as InboxIcon, Send } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { sendTestEmail } from '@/ai/flows/send-test-email';

export default function InboxPage() {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchEmails = async () => {
    try {
      setError(null);
      const fetchedEmails = await getInboundEmails();
      setEmails(fetchedEmails);
    } catch (e: any) {
      setError(e.message || 'Failed to load emails.');
      console.error("Error fetching inbound emails: ", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);
  
  const handleSendTestEmail = async () => {
    if (!currentUser || !currentUser.email) {
      toast({
        variant: "destructive",
        title: "Not Logged In",
        description: "You must be logged in to send a test email.",
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await sendTestEmail({ recipientEmail: currentUser.email });
      if (result.success) {
        toast({
          title: "Test Email Sent",
          description: `An email has been sent to ${currentUser.email}.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Send Email",
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inbox</h1>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Your Email Route</CardTitle>
          <CardDescription>
            Click the button below to send a test email to your logged-in address ({currentUser?.email || '...loading'}). Reply to that email, and if your route is configured correctly, the reply will appear in this inbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSendTestEmail} disabled={isSending || !currentUser}>
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Test Email to Myself
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Received Emails</CardTitle>
          <CardDescription>Replies and other emails sent to your application.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Error Loading Inbox</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : emails.length === 0 ? (
             <p className="text-center text-muted-foreground p-8">Your inbox is empty.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {emails.map(email => (
                <AccordionItem key={email.id} value={email.id}>
                  <AccordionTrigger>
                    <div className="flex flex-col text-left gap-1 w-full">
                       <div className="flex justify-between items-center w-full pr-4">
                           <span className="font-semibold truncate" title={email.subject}>{email.subject}</span>
                           <span className="text-xs text-muted-foreground whitespace-nowrap">
                             {format(new Date(email.receivedAt), 'PPP p')}
                           </span>
                       </div>
                       <span className="text-sm text-muted-foreground truncate" title={email.from}>
                         From: {email.from}
                       </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="whitespace-pre-wrap">{email.body}</p>
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
