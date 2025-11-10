
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
const db = getFirestore();
const adminAuth = getAuth();


const SaveComprehensionTestInputSchema = z.object({
  answers: z.record(z.string()),
  idToken: z.string().optional(),
});
export type SaveComprehensionTestInput = z.infer<typeof SaveComprehensionTestInputSchema>;

const SaveComprehensionTestOutputSchema = z.object({
  success: z.boolean(),
});
export type SaveComprehensionTestOutput = z.infer<typeof SaveComprehensionTestOutputSchema>;

export async function saveComprehensionTest(input: SaveComprehensionTestInput): Promise<SaveComprehensionTestOutput> {
  return saveComprehensionTestFlow(input);
}

const saveComprehensionTestFlow = ai.defineFlow(
  {
    name: 'saveComprehensionTestFlow',
    inputSchema: SaveComprehensionTestInputSchema,
    outputSchema: SaveComprehensionTestOutputSchema,
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
      console.error('Error saving comprehension test answers:', error);
      return { success: false };
    }
  }
);
