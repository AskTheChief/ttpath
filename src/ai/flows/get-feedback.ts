'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { FeedbackSchema, type Feedback } from '@/lib/types';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const GetFeedbackOutputSchema = z.array(FeedbackSchema);

export async function getFeedback(): Promise<Feedback[]> {
  return getFeedbackFlow();
}

const getFeedbackFlow = ai.defineFlow(
  {
    name: 'getFeedbackFlow',
    outputSchema: GetFeedbackOutputSchema,
  },
  async () => {
    try {
      const feedbackSnapshot = await db.collection('feedback').orderBy('createdAt', 'desc').get();
      
      const feedback = feedbackSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          feedback: data.feedback,
          email: data.email,
          userName: data.userName,
          userId: data.userId,
          createdAt: data.createdAt.toDate().toISOString(),
          status: data.status || 'open',
          notes: data.notes || '',
        };
      });
      return feedback;
    } catch (error) {
      console.error('Error getting feedback:', error);
      return [];
    }
  }
);
