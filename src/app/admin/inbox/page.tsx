
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getInboundEmails, type InboundEmail } from '@/ai/flows/get-inbound-emails';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Inbox as InboxIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function InboxPage() {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmails() {
      try {
        const fetchedEmails = await getInboundEmails();
        setEmails(fetchedEmails);
      } catch (e: any) {
        setError(e.message || 'Failed to load emails.');
        console.error("Error fetching inbound emails: ", e);
      } finally {
        setLoading(false);
      }
    }

    fetchEmails();
  }, []);

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
      
      <Alert>
          <InboxIcon className="h-4 w-4" />
          <AlertTitle>How this works</AlertTitle>
          <AlertDescription>
            This page displays emails sent to your system's reply-to address. To enable this, your Mailgun domain needs to be configured with an Inbound Route that forwards parsed email data to a webhook endpoint, which then saves the data to the `inbound_emails` collection in Firestore.
          </AlertDescription>
      </Alert>
      
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
            <p className="text-center text-destructive p-8">{error}</p>
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
