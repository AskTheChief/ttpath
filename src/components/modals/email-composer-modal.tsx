
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { sendDirectEmail } from '@/ai/flows/send-direct-email';
import { Loader2 } from 'lucide-react';

type EmailComposerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail: string;
  recipientName: string;
};

export default function EmailComposerModal({ isOpen, onClose, recipientEmail, recipientName }: EmailComposerModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
    try {
      const result = await sendDirectEmail({
        recipientEmail,
        subject,
        body,
      });

      if (result.success) {
        toast({
          title: 'Email Sent!',
          description: `Your message has been sent to ${recipientName}.`,
        });
        onClose(); // Close modal on success
      } else {
        throw new Error(result.message);
      }
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>
            Compose an email to <span className="font-medium text-foreground">{recipientName}</span> ({recipientEmail}).
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
