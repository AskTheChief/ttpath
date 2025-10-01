
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { credential } from 'firebase-admin';

if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();
const adminAuth = getAuth();

const GetTutorialAnswersInputSchema = z.object({
  idToken: z.string().optional().describe("The user's Firebase ID token for authentication."),
});
export type GetTutorialAnswersInput = z.infer<typeof GetTutorialAnswersInputSchema>;

const GetTutorialAnswersOutputSchema = z.record(z.string());
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
      // Return empty if no user is authenticated.
      return {};
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
        return doc.data()?.answers || {};
      } else {
        return {};
      }
    } catch (error) {
      console.error('Error getting tutorial answers:', error);
      return {};
    }
  }
);
