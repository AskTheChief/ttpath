
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, query, collection, where, getDocs, orderBy } from 'firebase-admin/firestore';
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

const TutorialFeedbackSchema = z.object({
  id: z.string(),
  feedback: z.string(),
  passed: z.boolean(),
  createdAt: z.string(),
});
export type TutorialFeedback = z.infer<typeof TutorialFeedbackSchema>;

const GetTutorialFeedbackOutputSchema = z.array(TutorialFeedbackSchema);
export type GetTutorialFeedbackOutput = z.infer<typeof GetTutorialFeedbackOutputSchema>;

export async function getTutorialFeedback(): Promise<GetTutorialFeedbackOutput> {
  return getTutorialFeedbackFlow();
}

const getTutorialFeedbackFlow = ai.defineFlow(
  {
    name: 'getTutorialFeedbackFlow',
    outputSchema: GetTutorialFeedbackOutputSchema,
  },
  async (input, context) => {
    const user = context?.auth;
    if (!user) {
      // Return empty array for non-authenticated users
      return [];
    }

    try {
      const q = query(
        collection(db, 'tutorial_feedback'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const feedbackSnapshot = await getDocs(q);
      
      const feedback = feedbackSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          feedback: data.feedback,
          passed: data.passed,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });
      return feedback;
    } catch (error) {
      console.error('Error getting tutorial feedback:', error);
      return [];
    }
  }
);
