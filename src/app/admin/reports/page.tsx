
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getAllMeetingReports, type AdminMeetingReport } from '@/ai/flows/get-all-meeting-reports';
import { processReportsToForum } from '@/ai/flows/process-reports-to-forum';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export default function AllReportsPage() {
  const [reports, setReports] = useState<AdminMeetingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const fetchedReports = await getAllMeetingReports();
        setReports(fetchedReports);
      } catch (error) {
        console.error("Error fetching all reports: ", error);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">All Meeting Reports</h1>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              setProcessing(true);
              setProcessResult(null);
              try {
                const result = await processReportsToForum();
                setProcessResult(`Processed: ${result.processed}, Skipped: ${result.skipped}, Errors: ${result.errors}`);
              } catch (err) {
                setProcessResult('Error running pipeline.');
                console.error(err);
              } finally {
                setProcessing(false);
              }
            }}
            disabled={processing}
          >
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {processing ? 'Processing...' : 'Anonymize & Post to Forum'}
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Link>
          </Button>
        </div>
      </div>
      {processResult && (
        <p className="text-sm text-muted-foreground bg-muted px-4 py-2 rounded">{processResult}</p>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>All Reports</CardTitle>
          <CardDescription>A chronological log of all meeting reports submitted by members of all tribes.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
             <p className="text-center text-muted-foreground p-8">No reports have been submitted yet.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {reports.map(report => (
                <AccordionItem key={report.id} value={report.id}>
                  <AccordionTrigger>
                    <div className="flex flex-col text-left gap-1 w-full">
                       <span className="font-semibold">{report.userName} - {report.tribeName}</span>
                       <span className="text-xs text-muted-foreground">
                         {format(new Date(report.submittedAt), 'PPP p')}
                       </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="whitespace-pre-wrap">{report.reportContent}</p>
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
