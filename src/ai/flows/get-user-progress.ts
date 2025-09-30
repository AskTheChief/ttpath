
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { credential } from 'firebase-admin';
import type { Flow, FlowContext } from 'genkit/flow';

if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

const GetUserProgressInputSchema = z.object({});
export type GetUserProgressInput = z.infer<typeof GetUserProgressInputSchema>;

const GetUserProgressOutputSchema = z.object({
  currentUserLevel: z.number(),
  requirementsState: z.record(z.boolean()),
});
export type GetUserProgressOutput = z.infer<typeof GetUserProgressOutputSchema>;

export async function getUserProgress(input: GetUserProgressInput): Promise<GetUserProgressOutput> {
  return getUserProgressFlow(input);
}

const getUserProgressFlow: Flow<typeof GetUserProgressInputSchema, typeof GetUserProgressOutputSchema> = ai.defineFlow(
  {
    name: 'getUserProgressFlow',
    inputSchema: GetUserProgressInputSchema,
    outputSchema: GetUserProgressOutputSchema,
  },
  async (input: GetUserProgressInput, _, context: FlowContext) => {
    const user = context?.auth;
    if (!user) {
      return {
        currentUserLevel: 1,
        requirementsState: {},
      };
    }

    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        return {
          currentUserLevel: data?.currentUserLevel || 1,
          requirementsState: data?.requirementsState || {},
        };
      } else {
        return {
          currentUserLevel: 1,
          requirementsState: {},
        };
      }
    } catch (error) {
      console.error('Error getting user progress:', error);
      return {
        currentUserLevel: 1,
        requirementsState: {},
      };
    }
  }
);
