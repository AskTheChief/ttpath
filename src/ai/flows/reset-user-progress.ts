
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();
const adminAuth = getAuth();

const ResetUserProgressInputSchema = z.object({
  idToken: z.string().describe("The user's Firebase ID token for authentication."),
});
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
  async ({ idToken }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new Error('User not authenticated. Invalid token.');
    }
    const user = { uid: decodedToken.uid };

    try {
      // Reset user progress
      await db.collection('users').doc(user.uid).set({
        currentUserLevel: 1,
        requirementsState: {},
      }, { merge: true });

      // Remove user from tribes they are a member of
      const memberOfTribesSnapshot = await db.collection('tribes').where('members', 'array-contains', user.uid).get();
      const batch = db.batch();
      memberOfTribesSnapshot.forEach(doc => {
        batch.update(doc.ref, { members: FieldValue.arrayRemove(user.uid) });
      });

      // Delete tribes where the user is the chief
      const chiefOfTribesSnapshot = await db.collection('tribes').where('chief', '==', user.uid).get();
      chiefOfTribesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error('Error resetting user progress:', error);
      return { success: false };
    }
  }
);
