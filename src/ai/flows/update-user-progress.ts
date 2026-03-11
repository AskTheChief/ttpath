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
const adminAuth = getAuth();
const db = getFirestore();

const UpdateUserProgressInputSchema = z.object({
  currentUserLevel: z.number(),
  requirementsState: z.record(z.boolean()),
  idToken: z.string().optional(),
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
  async (input) => {
    let user;

    if (input.idToken) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(input.idToken);
        user = { uid: decodedToken.uid };
      } catch (error) {
        console.error('Error verifying ID token:', error);
        return { success: false };
      }
    } else {
        console.warn('updateUserProgress called without idToken. Progress cannot be saved.');
        return { success: false };
    }

    if (!user) {
      return { success: false };
    }

    try {
      const userDocRef = db.collection('users').doc(user.uid);
      const { idToken, ...progressData } = input;
      
      await userDocRef.set(progressData, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error updating user progress:', error);
      return { success: false };
    }
  }
);
