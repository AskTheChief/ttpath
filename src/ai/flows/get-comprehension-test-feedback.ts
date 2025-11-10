
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';


if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();

const ComprehensionTestFeedbackSchema = z.object({
  id: z.string(),
  feedback: z.string(),
  createdAt: z.string(),
});
export type ComprehensionTestFeedback = z.infer<typeof ComprehensionTestFeedbackSchema>;

const GetComprehensionTestFeedbackOutputSchema = z.array(ComprehensionTestFeedbackSchema);
export type GetComprehensionTestFeedbackOutput = z.infer<typeof GetComprehensionTestFeedbackOutputSchema>;

export async function getComprehensionTestFeedback(): Promise<GetComprehensionTestFeedbackOutput> {
  return getComprehensionTestFeedbackFlow();
}

const getComprehensionTestFeedbackFlow = ai.defineFlow(
  {
    name: 'getComprehensionTestFeedbackFlow',
    outputSchema: GetComprehensionTestFeedbackOutputSchema,
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
      console.error('Error getting comprehension test feedback:', error);
      return [];
    }
  }
);
