
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';


if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const AlignmentTestFeedbackSchema = z.object({
  id: z.string(),
  feedback: z.string(),
  createdAt: z.string(),
});
export type AlignmentTestFeedback = z.infer<typeof AlignmentTestFeedbackSchema>;

const GetAlignmentTestFeedbackOutputSchema = z.array(AlignmentTestFeedbackSchema);
export type GetAlignmentTestFeedbackOutput = z.infer<typeof GetAlignmentTestFeedbackOutputSchema>;

export async function getAlignmentTestFeedback(): Promise<GetAlignmentTestFeedbackOutput> {
  return getAlignmentTestFeedbackFlow();
}

const getAlignmentTestFeedbackFlow = ai.defineFlow(
  {
    name: 'getAlignmentTestFeedbackFlow',
    outputSchema: GetAlignmentTestFeedbackOutputSchema,
  },
  async (_, __, context) => {
    const user = context?.auth;
    if (!user) {
      return [];
    }

    try {
      const q = db.collection('tutorial_feedback')
        .where('userId', '==', user.uid)
        .orderBy('createdAt', 'desc');
      const feedbackSnapshot = await q.get();
      
      const feedback = feedbackSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          feedback: data.feedback,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });
      return feedback;
    } catch (error) {
      console.error('Error getting alignment test feedback:', error);
      return [];
    }
  }
);
