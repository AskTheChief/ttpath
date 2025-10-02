
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, credential } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { JoinTribeInputSchema, JoinTribeOutputSchema, type JoinTribeInput, type JoinTribeOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();
const adminAuth = getAuth();

export async function joinTribe(input: JoinTribeInput): Promise<JoinTribeOutput> {
  return joinTribeFlow(input);
}

const joinTribeFlow = ai.defineFlow(
  {
    name: 'joinTribeFlow',
    inputSchema: JoinTribeInputSchema,
    outputSchema: JoinTribeOutputSchema,
  },
  async (input) => {
    if (!input.idToken) {
        throw new Error('Authentication token is missing.');
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
