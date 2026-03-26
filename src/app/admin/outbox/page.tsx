
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getOutboxEmails, type OutboundEmail } from '@/ai/flows/get-outbox-emails';
import { getMailgunStats, type GetMailgunStatsOutput } from '@/ai/flows/get-mailgun-stats';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send, Users, CheckCircle2, XCircle, Eye, MousePointerClick, MailOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function OutboxPage() {
  const [emails, setEmails] = useState<OutboundEmail[]>([]);
  const [stats, setStats] = useState<GetMailgunStatsOutput['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    }
    try {
      setError(null);
      const [fetchedEmails, fetchedStats] = await Promise.all([
        getOutboxEmails(),
        getMailgunStats()
      ]);
      setEmails(fetchedEmails);
      if (fetchedStats.success) {
        setStats(fetchedStats.stats || null);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load emails.');
      console.error("Error fetching outbound emails: ", e);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchEmails(true); // Initial fetch
    const interval = setInterval(() => {
      fetchEmails(false); // Subsequent background fetches
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [fetchEmails]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Outbox</h1>
        <Button asChild variant="outline">
          <Link href="/admin/crm">
            <Users className="h-4 w-4 mr-2" />
            Back to CRM
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent (Accepted)</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.accepted !== undefined ? stats.accepted : '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.delivered !== undefined ? stats.delivered : '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opened</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.opened !== undefined ? stats.opened : '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicked</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.clicked !== undefined ? stats.clicked : '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed/Bounced</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.failed !== undefined ? stats.failed : '-'}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Sent Emails</CardTitle>
          <CardDescription>A log of emails sent from the application. Refreshes every 10 seconds.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Error Loading Outbox</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : emails.length === 0 ? (
             <p className="text-center text-muted-foreground p-8">Your outbox is empty.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {emails.map(email => (
                <AccordionItem key={email.id} value={email.id}>
                  <AccordionTrigger>
                    <div className="flex flex-col text-left gap-1 w-full pr-4">
                       <div className="flex justify-between items-center w-full">
                           <span className="font-semibold truncate" title={email.subject}>{email.subject}</span>
                           <span className="text-xs text-muted-foreground whitespace-nowrap">
                             {format(new Date(email.sentAt), 'PPP p')}
                           </span>
                       </div>
                       <span className="text-sm text-muted-foreground truncate" title={email.recipientEmail}>
                         To: {email.recipientName ? `${email.recipientName} <${email.recipientEmail}>` : email.recipientEmail}
                       </span>
                        <p className="text-sm text-muted-foreground text-left truncate pt-1">
                          {email.body.replace(/<[^>]+>/g, '').split('\n')[0]}
                        </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: email.body }} />
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
