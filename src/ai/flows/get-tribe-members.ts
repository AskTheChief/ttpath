
'use server';

/**
 * @fileOverview A Genkit flow for fetching member profiles of a specific tribe.
 *
 * - getTribeMembers - A function that returns a list of member profiles for a given tribe.
 */

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { GetTribeMembersInputSchema, GetTribeMembersOutputSchema, type GetTribeMembersInput, type GetTribeMembersOutput } from '@/lib/types';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();
const adminAuth = getAuth();

const getTribeMembersFlow = ai.defineFlow(
  {
    name: 'getTribeMembersFlow',
    inputSchema: GetTribeMembersInputSchema,
    outputSchema: GetTribeMembersOutputSchema,
  },
  async ({ tribeId, idToken }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new Error('User not authenticated. Invalid token.');
    }
    const currentUserId = decodedToken.uid;

    try {
      const tribeRef = db.collection('tribes').doc(tribeId);
      const tribeDoc = await tribeRef.get();

      if (!tribeDoc.exists) {
        throw new Error('Tribe not found.');
      }
      
      const tribeData = tribeDoc.data();
      const memberIds = tribeData?.members || [];

      // Security check: Ensure the requesting user is a member of the tribe
      if (!memberIds.includes(currentUserId)) {
          throw new Error('You are not a member of this tribe.');
      }

      if (memberIds.length === 0) {
        return [];
      }

      const usersSnapshot = await db.collection('users').where('__name__', 'in', memberIds).get();
      
      const members = await Promise.all(usersSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Fetch tutorial answers for each member
        const tutorialDocRef = db.collection('user_tutorials').doc(doc.id);
        const tutorialDoc = await tutorialDocRef.get();
        const answers = tutorialDoc.exists ? tutorialDoc.data()?.answers || {} : {};

        return {
          uid: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          answers: answers,
          issue: data.issue || '',
          serviceProject: data.serviceProject || '',
        };
      }));

      return members;
    } catch (error) {
      console.error('Error fetching tribe members:', error);
      throw new Error('An unexpected error occurred while fetching tribe members.');
    }
  }
);


export async function getTribeMembers(input: GetTribeMembersInput): Promise<GetTribeMembersOutput> {
    return getTribeMembersFlow(input);
}
