
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

const SaveTutorialAnswersInputSchema = z.object({
  answers: z.record(z.string()),
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
  async (input, context) => {
    const user = context?.auth;
    if (!user) {
      // For visitors, we don't save answers to the DB, but we don't want to throw an error.
      // The answers will be evaluated, and if they pass and sign up,
      // we can save their answers at that point or have them re-submit.
      // For now, just return success.
      return { success: true };
    }

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
