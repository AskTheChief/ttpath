
"use client";

import { useEffect, useState } from 'react';
import { getFeedback } from '@/ai/flows/get-feedback';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Extended Feedback type to include optional user info
type Feedback = {
  id: string;
  feedback: string;
  email?: string;
  userName?: string;
  userId?: string;
  createdAt: string;
};


export default function FeedbackTable() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeedback() {
      try {
        const feedbackData = await getFeedback();
        // The flow already returns the correct shape, but we cast it here for type safety
        setFeedback(feedbackData as Feedback[]);
      } catch (error) {
        console.error("Error loading feedback:", error);
      } finally {
        setLoading(false);
      }
    }
    loadFeedback();
  }, []);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Feedback</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center">Loading feedback...</TableCell>
          </TableRow>
        ) : feedback.map(item => (
          <TableRow key={item.id}>
            <TableCell>{item.feedback}</TableCell>
            <TableCell>{item.userName || 'Anonymous'}</TableCell>
            <TableCell>{item.email}</TableCell>
            <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
