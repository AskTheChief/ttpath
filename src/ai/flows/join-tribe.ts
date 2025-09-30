
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

const JoinTribeInputSchema = z.object({
  tribeId: z.string(),
});
export type JoinTribeInput = z.infer<typeof JoinTribeInputSchema>;

const JoinTribeOutputSchema = z.object({
  success: z.boolean(),
});
export type JoinTribeOutput = z.infer<typeof JoinTribeOutputSchema>;

export async function joinTribe(input: JoinTribeInput): Promise<JoinTribeOutput> {
  return joinTribeFlow(input);
}

export const joinTribeFlow: Flow<typeof JoinTribeInputSchema, typeof JoinTribeOutputSchema> = ai.defineFlow(
  {
    name: 'joinTribeFlow',
    inputSchema: JoinTribeInputSchema,
    outputSchema: JoinTribeOutputSchema,
  },
  async (input: JoinTribeInput, _, context: FlowContext) => {
    const user = context?.auth;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      const applicationRef = db.collection('tribe_applications').doc();
      await applicationRef.set({
        tribeId: input.tribeId,
        applicantId: user.uid,
        status: 'pending',
        createdAt: new Date(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error joining tribe:', error);
      return { success: false };
    }
  }
);
