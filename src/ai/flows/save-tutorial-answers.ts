
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


const SaveTutorialAnswersInputSchema = z.object({
  answers: z.record(z.string()),
  idToken: z.string().optional(),
});
export type SaveTutorialAnswersInput = z.infer<typeof SaveTutorialAnswersInputSchema>;

const SaveTutorialAnswersOutputSchema = z.object({
  success: z.boolean(),
});
export type SaveTutorialAnswersOutput = z.infer<typeof SaveTutorialAnswersOutputSchema>;

export async function saveTutorialAnswers(input: SaveTutorialAnswersInput): Promise<SaveTutorialAnswersOutput> {
  return saveTutorialAnswersFlow(input);
}

const saveTutorialAnswersFlow = ai.defineFlow(
  {
    name: 'saveTutorialAnswersFlow',
    inputSchema: SaveTutorialAnswersInputSchema,
    outputSchema: SaveTutorialAnswersOutputSchema,
  },
  async (input) => {
    if (!input.idToken) {
        // Silently succeed if no user is authenticated, as there's nothing to save.
        return { success: true };
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
      await docRef.set({ answers: input.answers }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error saving tutorial answers:', error);
      return { success: false };
    }
  }
);
