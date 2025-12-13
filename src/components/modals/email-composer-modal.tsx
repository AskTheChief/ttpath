
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { sendDirectEmail } from '@/ai/flows/send-direct-email';
import { Loader2, Sparkles } from 'lucide-react';
import { sendBugFinderDiploma } from '@/ai/flows/send-bug-finder-diploma';

type EmailComposerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  recipientEmails: string[];
  recipientNames: string[];
  initialSubject?: string;
  initialBody?: string;
  contextualBugDescription?: string;
};

export default function EmailComposerModal({ 
  isOpen, 
  onClose, 
  recipientEmails, 
  recipientNames, 
  initialSubject = '', 
  initialBody = '',
  contextualBugDescription 
}: EmailComposerModalProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingDiploma, setIsSendingDiploma] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSubject(initialSubject);
      setBody(initialBody);
    }
  }, [isOpen, initialSubject, initialBody]);

  const recipientDescription = useMemo(() => {
    if (recipientNames.length === 0) return '';
    if (recipientNames.length === 1) return recipientNames[0];
    if (recipientNames.length === 2) return `${recipientNames[0]} and ${recipientNames[1]}`;
    return `${recipientNames.length} selected users`;
  }, [recipientNames]);


  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Email',
        description: 'Please provide a subject and a message body.',
      });
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    try {
        for (let i = 0; i < recipientEmails.length; i++) {
             const recipientEmail = recipientEmails[i].trim();
             const recipientName = recipientNames[i].trim();

             const result = await sendDirectEmail({
                recipientEmail,
                recipientName,
                subject,
                body,
            });
             if (!result.success) {
                console.error(`Failed to send email to ${recipientEmail}: ${result.message}`);
             } else {
                successCount++;
             }
        }

        toast({
          title: `Email Process Complete`,
          description: `${successCount} of ${recipientEmails.length} messages sent. Check the Outbox for details.`,
        });
        onClose();
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send Email',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendCertificate = async () => {
    if (recipientEmails.length !== 1) {
        toast({ variant: 'destructive', title: 'Invalid Action', description: 'Certificates can only be sent to one user at a time.' });
        return;
    }
    setIsSendingDiploma(true);
    try {
        const result = await sendBugFinderDiploma({
            recipientEmail: recipientEmails[0],
            recipientName: recipientNames[0],
            bugDescription: contextualBugDescription,
        });
        if (result.success) {
            toast({ title: 'Certificate Sent!', description: `A Bug Finder certificate has been sent to ${recipientNames[0]}.` });
            onClose();
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to Send Certificate', description: error.message });
    } finally {
        setIsSendingDiploma(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>
            Compose an email to <span className="font-medium text-foreground">{recipientDescription}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={10}
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between w-full">
           <div>
            {contextualBugDescription && recipientEmails.length === 1 && (
              <Button onClick={handleSendCertificate} variant="secondary" disabled={isSendingDiploma}>
                {isSendingDiploma ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Send Bug Finder Certificate
              </Button>
            )}
           </div>
           <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSend} disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send Email'}
              </Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
