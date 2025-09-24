'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

const FeedbackSchema = z.object({
  id: z.string(),
  feedback: z.string(),
  email: z.string().optional(),
  createdAt: z.string(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

const GetFeedbackOutputSchema = z.array(FeedbackSchema);
export type GetFeedbackOutput = z.infer<typeof GetFeedbackOutputSchema>;

export async function getFeedback(): Promise<GetFeedbackOutput> {
  return getFeedbackFlow();
}

const getFeedbackFlow = ai.defineFlow(
  {
    name: 'getFeedbackFlow',
    outputSchema: GetFeedbackOutputSchema,
  },
  async () => {
    try {
      const feedbackSnapshot = await db.collection('feedback').get();
      const feedback = feedbackSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          feedback: data.feedback,
          email: data.email,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });
      return feedback;
    } catch (error) {
      console.error('Error getting feedback:', error);
      return [];
    }
  }
);
