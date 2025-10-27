
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();
const adminAuth = getAuth();

const GetTutorialAnswersInputSchema = z.object({
  idToken: z.string().optional().describe("The user's Firebase ID token for authentication."),
});
export type GetTutorialAnswersInput = z.infer<typeof GetTutorialAnswersInputSchema>;

const LatestFeedbackSchema = z.object({
    feedback: z.string(),
    createdAt: z.string(),
});

const GetTutorialAnswersOutputSchema = z.object({
    answers: z.record(z.string()),
    latestFeedback: LatestFeedbackSchema.optional(),
});
export type GetTutorialAnswersOutput = z.infer<typeof GetTutorialAnswersOutputSchema>;

export async function getTutorialAnswers(input: GetTutorialAnswersInput): Promise<GetTutorialAnswersOutput> {
  return getTutorialAnswersFlow(input);
}

const getTutorialAnswersFlow = ai.defineFlow(
  {
    name: 'getTutorialAnswersFlow',
    inputSchema: GetTutorialAnswersInputSchema,
    outputSchema: GetTutorialAnswersOutputSchema,
  },
  async (input) => {
    if (!input.idToken) {
      return { answers: {} };
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(input.idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new Error('User not authenticated. Invalid token.');
    }
    const user = { uid: decodedToken.uid };

    try {
      const docRef = db.collection('user_tutorials').doc(user.uid);
      const doc = await docRef.get();

      if (doc.exists) {
        const data = doc.data();
        let latestFeedback;
        if (data?.latestFeedback) {
            const createdAt = data.latestFeedback.createdAt;
            latestFeedback = {
                feedback: data.latestFeedback.feedback,
                createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : new Date().toISOString(),
            };
        }
        return {
            answers: data?.answers || {},
            latestFeedback: latestFeedback,
        };
      } else {
        return { answers: {} };
      }
    } catch (error) {
      console.error('Error getting tutorial answers:', error);
      return { answers: {} };
    }
  }
);
