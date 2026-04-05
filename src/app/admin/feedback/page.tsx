
'use client';

import { useEffect, useState, useCallback } from 'react';
import { getFeedback, type Feedback } from '@/ai/flows/get-feedback';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, Bug, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmailComposerModal from '@/components/modals/email-composer-modal';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: 'Open', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
  wont_fix: { label: "Won't Fix", color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: XCircle },
};

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('open');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<{ email: string; name: string; feedback: string } | null>(null);
  const { toast } = useToast();

  const fetchFeedback = useCallback(async () => {
    try {
      const data = await getFeedback();
      setFeedback(data);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const updateFeedback = async (id: string, updates: { status?: string; notes?: string }) => {
    try {
      const resp = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await resp.json();
      if (data.success) {
        setFeedback(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
        toast({ title: 'Updated' });
      }
    } catch (error) {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const handleSaveNotes = (id: string) => {
    updateFeedback(id, { notes: notesValue });
    setEditingNotes(null);
  };

  const counts = {
    open: feedback.filter(f => !f.status || f.status === 'open').length,
    in_progress: feedback.filter(f => f.status === 'in_progress').length,
    resolved: feedback.filter(f => f.status === 'resolved').length,
    wont_fix: feedback.filter(f => f.status === 'wont_fix').length,
    all: feedback.length,
  };

  const filtered = activeTab === 'all'
    ? feedback
    : feedback.filter(f => (f.status || 'open') === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Bug className="h-7 w-7" /> Feedback & Bugs</h1>
          <p className="text-muted-foreground">{counts.open} open, {counts.in_progress} in progress, {counts.resolved} resolved</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="open">Open ({counts.open})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({counts.in_progress})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
          <TabsTrigger value="wont_fix">Won't Fix ({counts.wont_fix})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="text-center text-muted-foreground py-12">
                No feedback in this category.
              </CardContent>
            </Card>
          ) : (
            filtered.map(item => {
              const statusKey = item.status || 'open';
              const config = STATUS_CONFIG[statusKey];
              const Icon = config.icon;

              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium whitespace-pre-wrap">{item.feedback}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{item.userName || 'Anonymous'}</span>
                          {item.email && <span>{item.email}</span>}
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={config.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Select
                        value={statusKey}
                        onValueChange={(value) => updateFeedback(item.id, { status: value })}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="wont_fix">Won't Fix</SelectItem>
                        </SelectContent>
                      </Select>

                      {item.email && (
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
                          setSelectedRecipient({
                            email: item.email!,
                            name: item.userName || item.email!,
                            feedback: item.feedback,
                          });
                          setIsEmailModalOpen(true);
                        }}>
                          <Mail className="mr-1 h-3 w-3" />
                          Reply
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          if (editingNotes === item.id) {
                            handleSaveNotes(item.id);
                          } else {
                            setEditingNotes(item.id);
                            setNotesValue(item.notes || '');
                          }
                        }}
                      >
                        {editingNotes === item.id ? 'Save Notes' : (item.notes ? 'Edit Notes' : 'Add Notes')}
                      </Button>
                    </div>

                    {editingNotes === item.id && (
                      <Textarea
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        placeholder="Dev notes — what needs to happen..."
                        className="text-sm"
                        rows={2}
                      />
                    )}

                    {editingNotes !== item.id && item.notes && (
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded">{item.notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {selectedRecipient && (
        <EmailComposerModal
          isOpen={isEmailModalOpen}
          onClose={() => { setIsEmailModalOpen(false); setSelectedRecipient(null); }}
          recipientEmails={[selectedRecipient.email]}
          recipientNames={[selectedRecipient.name]}
          initialSubject="Re: Your Feedback"
          initialBody={`Hi ${selectedRecipient.name.split(' ')[0]},\n\nThank you for your feedback:\n\n"${selectedRecipient.feedback}"\n\nWe appreciate you taking the time to help us improve.\n\n- The TTpath Team`}
          contextualBugDescription={selectedRecipient.feedback}
        />
      )}
    </div>
  );
}
