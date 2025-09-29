
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

const UpdateUserProgressInputSchema = z.object({
  currentUserLevel: z.number(),
  requirementsState: z.record(z.boolean()),
});
export type UpdateUserProgressInput = z.infer<typeof UpdateUserProgressInputSchema>;

const UpdateUserProgressOutputSchema = z.object({
  success: z.boolean(),
});
export type UpdateUserProgressOutput = z.infer<typeof UpdateUserProgressOutputSchema>;

export async function updateUserProgress(input: UpdateUserProgressInput): Promise<UpdateUserProgressOutput> {
  return updateUserProgressFlow(input);
}

const updateUserProgressFlow = ai.defineFlow(
  {
    name: 'updateUserProgressFlow',
    inputSchema: UpdateUserProgressInputSchema,
    outputSchema: UpdateUserProgressOutputSchema,
  },
  async (input, context) => {
    const user = context?.auth;
    if (!user) {
      // For guest users, we don't save progress to the DB.
      // We just return success to prevent client-side errors.
      return { success: true };
    }

    try {
      await db.collection('users').doc(user.uid).set(input, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error updating user progress:', error);
      return { success: false };
    }
  }
);
