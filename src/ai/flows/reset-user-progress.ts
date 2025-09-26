
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

const ResetUserProgressInputSchema = z.object({});
export type ResetUserProgressInput = z.infer<typeof ResetUserProgressInputSchema>;

const ResetUserProgressOutputSchema = z.object({
  success: z.boolean(),
});
export type ResetUserProgressOutput = z.infer<typeof ResetUserProgressOutputSchema>;

export async function resetUserProgress(input: ResetUserProgressInput): Promise<ResetUserProgressOutput> {
  return resetUserProgressFlow(input);
}

const resetUserProgressFlow = ai.defineFlow(
  {
    name: 'resetUserProgressFlow',
    inputSchema: ResetUserProgressInputSchema,
    outputSchema: ResetUserProgressOutputSchema,
  },
  async (input, context) => {
    const user = context?.auth;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Reset user progress
      await db.collection('users').doc(user.uid).set({
        currentUserLevel: 1,
        requirementsState: {},
      });

      // Remove user from tribes they are a member of
      const memberOfTribesSnapshot = await db.collection('tribes').where('members', 'array-contains', user.uid).get();
      for (const doc of memberOfTribesSnapshot.docs) {
        await doc.ref.update({
          members: FieldValue.arrayRemove(user.uid),
        });
      }

      // Delete tribes where the user is the chief
      const chiefOfTribesSnapshot = await db.collection('tribes').where('chief', '==', user.uid).get();
      for (const doc of chiefOfTribesSnapshot.docs) {
        await doc.ref.delete();
      }

      return { success: true };
    } catch (error) {
      console.error('Error resetting user progress:', error);
      return { success: false };
    }
  }
);
