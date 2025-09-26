
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { credential } from 'firebase-admin';
import { auth } from 'firebase-admin';

if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

const CreateTribeInputSchema = z.object({
  name: z.string(),
});
export type CreateTribeInput = z.infer<typeof CreateTribeInputSchema>;

const CreateTribeOutputSchema = z.object({
  success: z.boolean(),
});
export type CreateTribeOutput = z.infer<typeof CreateTribeOutputSchema>;

export async function createTribe(input: CreateTribeInput): Promise<CreateTribeOutput> {
  return createTribeFlow(input);
}

const createTribeFlow = ai.defineFlow(
  {
    name: 'createTribeFlow',
    inputSchema: CreateTribeInputSchema,
    outputSchema: CreateTribeOutputSchema,
  },
  async (input, context) => {
    const user = context?.auth;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const tribeRef = db.collection('tribes').doc();
      await tribeRef.set({
        name: input.name,
        chief: user.uid,
        members: [user.uid],
        createdAt: new Date(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error creating tribe:', error);
      return { success: false };
    }
  }
);
