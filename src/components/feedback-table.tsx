
"use client";

import { useEffect, useState } from 'react';
import { getFeedback, type Feedback } from '@/ai/flows/get-feedback';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import EmailComposerModal from '@/components/modals/email-composer-modal';

export default function FeedbackTable() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<{ email: string; name: string, feedback: string } | null>(null);

  useEffect(() => {
    async function loadFeedback() {
      try {
        const feedbackData = await getFeedback();
        setFeedback(feedbackData);
      } catch (error) {
        console.error("Error loading feedback in component:", error);
      } finally {
        setLoading(false);
      }
    }
    loadFeedback();
  }, []);

  const handleOpenEmailModal = (item: Feedback) => {
    if (item.email) {
      setSelectedRecipient({
        email: item.email,
        name: item.userName || item.email,
        feedback: item.feedback,
      });
      setIsEmailModalOpen(true);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feedback</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">Loading feedback...</TableCell>
            </TableRow>
          ) : feedback.length > 0 ? (
            feedback.map(item => (
              <TableRow key={item.id}>
                <TableCell className="max-w-sm truncate">{item.feedback}</TableCell>
                <TableCell>{item.userName || 'Anonymous'}</TableCell>
                <TableCell>{item.email || 'N/A'}</TableCell>
                <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {item.email && (
                    <Button variant="outline" size="sm" onClick={() => handleOpenEmailModal(item)}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email User
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center">No feedback found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {selectedRecipient && (
        <EmailComposerModal
          isOpen={isEmailModalOpen}
          onClose={() => {
            setIsEmailModalOpen(false);
            setSelectedRecipient(null);
          }}
          recipientEmails={[selectedRecipient.email]}
          recipientNames={[selectedRecipient.name]}
          initialSubject={`Re: Your Feedback`}
          initialBody={`Hi ${selectedRecipient.name.split(' ')[0]},\n\nThank you for your feedback:\n\n"${selectedRecipient.feedback}"\n\nWe appreciate you taking the time to help us improve.\n\n- The TTpath Team`}
          contextualBugDescription={selectedRecipient.feedback}
        />
      )}
    </>
  );
}
