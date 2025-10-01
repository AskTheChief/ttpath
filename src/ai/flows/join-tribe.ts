
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
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
      const tribeRef = db.collection('tribes').doc(input.tribeId);
      const tribeDoc = await tribeRef.get();

      if (!tribeDoc.exists) {
        throw new Error('Tribe not found.');
      }

      const tribeData = tribeDoc.data();
      const hasMembers = tribeData?.members && tribeData.members.length > 0;

      if (!hasMembers) {
        // If tribe has no members, make the applicant the new chief.
        await tribeRef.update({
          chief: user.uid,
          members: FieldValue.arrayUnion(user.uid),
        });
      } else {
        // If tribe has members, create an application.
        const applicationRef = db.collection('tribe_applications').doc();
        await applicationRef.set({
          tribeId: input.tribeId,
          applicantId: user.uid,
          status: 'pending',
          createdAt: Timestamp.now(),
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error joining tribe:', error);
      return { success: false };
    }
  }
);
