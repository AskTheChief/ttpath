
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
      const writeBatch = db.batch();

      // Reset user's level to Explorer and clear their requirements state
      const userRef = db.collection('users').doc(user.uid);
      writeBatch.set(userRef, {
        currentUserLevel: 3,
        requirementsState: {
            'sign-up': true,
            'read-book': true,
            'register-as-explorer': true,
        },
      }, { merge: true });

      // Remove user from any tribes they are a member of (including as chief)
      const memberOfTribesSnapshot = await db.collection('tribes').where('members', 'array-contains', user.uid).get();
      memberOfTribesSnapshot.forEach(doc => {
        writeBatch.update(doc.ref, { members: FieldValue.arrayRemove(user.uid) });
      });
      
      // Delete any pending applications the user has submitted
      const myApplicationsSnapshot = await db.collection('tribe_applications').where('applicantId', '==', user.uid).get();
      myApplicationsSnapshot.forEach(doc => {
        writeBatch.delete(doc.ref);
      });

      await writeBatch.commit();

      return { success: true };
    } catch (error) {
      console.error('Error resetting user progress:', error);
      return { success: false };
    }
  }
);
