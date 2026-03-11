
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Meeting, MeetingReport } from "@/lib/types";
import { submitMeetingReport } from "@/ai/flows/submit-meeting-report";
import { auth } from "@/lib/firebase";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  tribeId: string;
  userId: string;
  existingReport?: MeetingReport;
  onReportSubmitted: () => void;
};

export default function ReportModal({ isOpen, onClose, meeting, tribeId, userId, existingReport, onReportSubmitted }: ReportModalProps) {
  const [reportContent, setReportContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (existingReport) {
      setReportContent(existingReport.reportContent);
    } else {
      setReportContent("");
    }
  }, [existingReport, isOpen]);

  const handleSubmit = async () => {
    if (!reportContent.trim()) {
      toast({ title: "Report is empty", description: "Please write something in your report.", variant: "destructive" });
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        toast({ title: "Not Authenticated", description: "You must be logged in to submit a report.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const result = await submitMeetingReport({
        tribeId,
        meetingId: meeting.id,
        reportContent,
        idToken,
      });

      if (result.success) {
        toast({ title: "Report Submitted", description: "Your meeting report has been saved." });
        onReportSubmitted();
      } else {
        throw new Error(result.message || "Failed to submit report.");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Meeting Report</DialogTitle>
          <DialogDescription>
            For the meeting on {format(new Date(meeting.date), "PPP")}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="report-content" className="sr-only">Report Content</Label>
          <Textarea
            id="report-content"
            rows={15}
            value={reportContent}
            onChange={(e) => setReportContent(e.target.value)}
            placeholder="Describe your experience at the meeting..."
            readOnly={!!existingReport}
            disabled={isLoading}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {existingReport ? "Close" : "Cancel"}
          </Button>
          {!existingReport && (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Report"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
