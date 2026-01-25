
'use server';

/**
 * @fileOverview A Genkit flow for fetching all users' alignment test answers.
 *
 * - getAllAlignmentTestAnswers - A function that returns a list of all users and their saved answers.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const LatestFeedbackSchema = z.object({
    feedback: z.string(),
    createdAt: z.string(),
});

const UserAnswersSchema = z.object({
  userId: z.string(),
  userName: z.string().optional(),
  email: z.string().optional(),
  answers: z.record(z.string()),
  latestFeedback: LatestFeedbackSchema.optional(),
});
export type UserAnswers = z.infer<typeof UserAnswersSchema>;

const GetAllAlignmentTestAnswersOutputSchema = z.array(UserAnswersSchema);
export type GetAllAlignmentTestAnswersOutput = z.infer<typeof GetAllAlignmentTestAnswersOutputSchema>;

export async function getAllAlignmentTestAnswers(): Promise<GetAllAlignmentTestAnswersOutput> {
  return getAllAlignmentTestAnswersFlow();
}

const getAllAlignmentTestAnswersFlow = ai.defineFlow(
  {
    name: 'getAllAlignmentTestAnswersFlow',
    outputSchema: GetAllAlignmentTestAnswersOutputSchema,
  },
  async () => {
    try {
      const userTutorialsSnapshot = await db.collection('user_tutorials').get();
      if (userTutorialsSnapshot.empty) {
        return [];
      }

      const userIds = userTutorialsSnapshot.docs.map(doc => doc.id);
      
      const usersSnapshot = await db.collection('users').where('__name__', 'in', userIds).get();
      const usersMap = new Map<string, { userName?: string, email?: string }>();
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        usersMap.set(doc.id, {
          userName: data.firstName || 'N/A',
          email: data.email
        });
      });

      const allAnswers = userTutorialsSnapshot.docs.map(doc => {
        const userId = doc.id;
        const tutorialData = doc.data();
        const userData = usersMap.get(userId) || {};
        
        let latestFeedback;
        if (tutorialData.latestFeedback) {
            const createdAt = tutorialData.latestFeedback.createdAt;
            latestFeedback = {
                feedback: tutorialData.latestFeedback.feedback,
                createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : new Date().toISOString(),
            };
        }

        return {
          userId: userId,
          userName: userData.userName,
          email: userData.email,
          answers: tutorialData.answers || {},
          latestFeedback: latestFeedback,
        };
      });

      return allAnswers;

    } catch (error) {
      console.error('Error getting all alignment test answers:', error);
      return [];
    }
  }
);
