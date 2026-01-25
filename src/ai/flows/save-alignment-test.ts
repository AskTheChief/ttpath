
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();


const SaveAlignmentTestInputSchema = z.object({
  answers: z.record(z.string()),
  idToken: z.string().optional(),
});
export type SaveAlignmentTestInput = z.infer<typeof SaveAlignmentTestInputSchema>;

const SaveAlignmentTestOutputSchema = z.object({
  success: z.boolean(),
});
export type SaveAlignmentTestOutput = z.infer<typeof SaveAlignmentTestOutputSchema>;

export async function saveAlignmentTest(input: SaveAlignmentTestInput): Promise<SaveAlignmentTestOutput> {
  return saveAlignmentTestFlow(input);
}

const saveAlignmentTestFlow = ai.defineFlow(
  {
    name: 'saveAlignmentTestFlow',
    inputSchema: SaveAlignmentTestInputSchema,
    outputSchema: SaveAlignmentTestOutputSchema,
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
      console.error('Error saving alignment test answers:', error);
      return { success: false };
    }
  }
);
