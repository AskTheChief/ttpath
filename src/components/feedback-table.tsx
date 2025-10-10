
"use client";

import { useEffect, useState } from 'react';
import { getFeedback, type Feedback } from '@/ai/flows/get-feedback';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function FeedbackTable() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeedback() {
      console.log('Attempting to load feedback...');
      try {
        const feedbackData = await getFeedback();
        console.log('Feedback data received:', feedbackData);
        setFeedback(feedbackData);
      } catch (error) {
        console.error("Error loading feedback in component:", error);
      } finally {
        console.log('Finished loading attempt.');
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
        ) : feedback.length > 0 ? (
          feedback.map(item => (
            <TableRow key={item.id}>
              <TableCell>{item.feedback}</TableCell>
              <TableCell>{item.userName || 'Anonymous'}</TableCell>
              <TableCell>{item.email || 'N/A'}</TableCell>
              <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="text-center">No feedback found.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
