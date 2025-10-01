
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { credential } from 'firebase-admin';
import { JoinTribeInputSchema, JoinTribeOutputSchema, type JoinTribeInput, type JoinTribeOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

export async function joinTribe(input: JoinTribeInput): Promise<JoinTribeOutput> {
  return joinTribeFlow(input);
}

const joinTribeFlow = ai.defineFlow(
  {
    name: 'joinTribeFlow',
    inputSchema: JoinTribeInputSchema,
    outputSchema: JoinTribeOutputSchema,
  },
  async (input, _, context) => {
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
        createdAt: Timestamp.now(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error joining tribe:', error);
      return { success: false };
    }
  }
);
