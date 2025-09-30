
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

const GetTutorialAnswersInputSchema = z.object({});
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
  async (input, _, context) => {
    const user = context?.auth;
    if (!user) {
      return {};
    }

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
