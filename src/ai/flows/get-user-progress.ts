
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

const GetUserProgressInputSchema = z.object({
  idToken: z.string().optional(),
});
export type GetUserProgressInput = z.infer<typeof GetUserProgressInputSchema>;

const GetUserProgressOutputSchema = z.object({
  currentUserLevel: z.number(),
  requirementsState: z.record(z.boolean()),
});
export type GetUserProgressOutput = z.infer<typeof GetUserProgressOutputSchema>;

export async function getUserProgress(input: GetUserProgressInput): Promise<GetUserProgressOutput> {
  return getUserProgressFlow(input);
}

const getUserProgressFlow = ai.defineFlow(
  {
    name: 'getUserProgressFlow',
    inputSchema: GetUserProgressInputSchema,
    outputSchema: GetUserProgressOutputSchema,
  },
  async (input) => {
    if (!input.idToken) {
      return {
        currentUserLevel: 1,
        requirementsState: {},
      };
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(input.idToken);
    } catch (error) {
      console.error("Error verifying ID token in getUserProgressFlow:", error);
      // If token is invalid, return default state
      return {
        currentUserLevel: 1,
        requirementsState: {},
      };
    }
    
    const user = { uid: decodedToken.uid };

    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        return {
          currentUserLevel: data?.currentUserLevel || 1,
          requirementsState: data?.requirementsState || {},
        };
      } else {
        // If user document doesn't exist, they are a new user at level 1
        return {
          currentUserLevel: 1,
          requirementsState: {},
        };
      }
    } catch (error) {
      console.error('Error getting user progress from Firestore:', error);
      return {
        currentUserLevel: 1,
        requirementsState: {},
      };
    }
  }
);
