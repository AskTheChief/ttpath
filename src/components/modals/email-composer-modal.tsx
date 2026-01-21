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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { getEmailTemplates, saveEmailTemplate } from '@/ai/flows/email-templates';
import type { EmailTemplate } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

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
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSubject(initialSubject);
      setBody(initialBody);
      setSaveAsTemplate(false);
      setNewTemplateName('');

      async function fetchTemplates() {
        try {
          const fetchedTemplates = await getEmailTemplates();
          setTemplates(fetchedTemplates);
        } catch (error) {
          console.error("Failed to fetch email templates:", error);
          toast({ title: 'Could not load templates', variant: 'destructive' });
        }
      }
      fetchTemplates();
    }
  }, [isOpen, initialSubject, initialBody, toast]);

  const recipientDescription = useMemo(() => {
    if (recipientNames.length === 0) return '';
    if (recipientNames.length === 1) return recipientNames[0];
    if (recipientNames.length === 2) return `${recipientNames[0]} and ${recipientNames[1]}`;
    return `${recipientNames.length} selected users`;
  }, [recipientNames]);


  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
        setSubject('');
        setBody('');
        return;
    }

    let finalBody = template.body;
    if (recipientNames.length === 1) {
        const firstName = recipientNames[0].split(' ')[0] || 'there';
        finalBody = template.body.replace(/\[Name\]/g, firstName);
    }
    
    setSubject(template.subject);
    setBody(finalBody);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Email',
        description: 'Please provide a subject and a message body.',
      });
      return;
    }
    
    if (saveAsTemplate && !newTemplateName.trim()) {
        toast({ variant: 'destructive', title: 'Template name required', description: 'Please provide a name for the new template.' });
        return;
    }

    setIsLoading(true);
    let successCount = 0;
    try {
        if (saveAsTemplate) {
            await saveEmailTemplate({
                name: newTemplateName,
                subject,
                body,
            });
            toast({ title: 'Template Saved!', description: `"${newTemplateName}" is now available for reuse.`});
        }
        
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
            Compose an email to <span className="font-medium text-foreground">{recipientDescription}</span>. You can start from a template, preview your message, and save it as a new template for future use.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger id="template">
                    <SelectValue placeholder="Start from a template..." />
                </SelectTrigger>
                <SelectContent>
                    {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>
          <Tabs defaultValue="compose" className="space-y-2">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="compose">Compose</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="compose">
                <Label htmlFor="body" className="sr-only">Message Body</Label>
                <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message here. HTML is supported."
                    rows={10}
                />
            </TabsContent>
            <TabsContent value="preview">
                 <Label className="sr-only">Email Preview</Label>
                <div className="h-64 w-full rounded-md border border-input bg-white p-4">
                    <ScrollArea className="h-full w-full">
                        <div
                            className="prose dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3"
                            dangerouslySetInnerHTML={{ __html: body }}
                        />
                    </ScrollArea>
                </div>
            </TabsContent>
          </Tabs>
           <div className="pt-4 space-y-3">
            <div className="flex items-center space-x-2">
                <Checkbox id="save-as-template" checked={saveAsTemplate} onCheckedChange={(checked) => setSaveAsTemplate(!!checked)} />
                <Label htmlFor="save-as-template" className="font-medium">Save this email as a new template</Label>
            </div>
            {saveAsTemplate && (
                <div className="grid gap-2 pl-6">
                <Label htmlFor="new-template-name">New Template Name</Label>
                <Input
                    id="new-template-name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Follow-up Invitation"
                />
                </div>
            )}
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
