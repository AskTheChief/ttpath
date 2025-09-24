"use client";

import { useEffect, useState } from 'react';
import { getFeedback, Feedback } from '@/ai/flows/get-feedback';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function FeedbackTable() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  useEffect(() => {
    async function loadFeedback() {
      const feedback = await getFeedback();
      setFeedback(feedback);
    }
    loadFeedback();
  }, []);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Feedback</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {feedback.map(item => (
          <TableRow key={item.id}>
            <TableCell>{item.feedback}</TableCell>
            <TableCell>{item.email}</TableCell>
            <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
