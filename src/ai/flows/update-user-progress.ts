
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
  async (input, _, context) => {
    const user = context?.auth;
    if (!user) {
      // For non-authenticated users, we can just return success as there is nothing to update.
      return { success: true };
    }

    try {
      const userDocRef = db.collection('users').doc(user.uid);
      
      // To prevent race conditions or overwriting unrelated progress,
      // it's often better to merge with existing data.
      // However, for a dev shortcut like this, a direct set/merge is fine.
      await userDocRef.set(input, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error updating user progress:', error);
      return { success: false };
    }
  }
);
