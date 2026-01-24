
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
  initializeApp();
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
    try {
      // The security check for developer access is handled on the page itself.
      // This flow can now assume the caller is authorized.
      await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new Error('User not authenticated. Invalid token.');
    }

    try {
      const tribeRef = db.collection('tribes').doc(tribeId);
      const tribeDoc = await tribeRef.get();

      if (!tribeDoc.exists) {
        throw new Error('Tribe not found.');
      }
      
      const tribeData = tribeDoc.data();
      const memberIds = tribeData?.members || [];

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
    } catch (error: any) {
      console.error('Error fetching tribe members:', error);
      throw new Error(error.message || 'An unexpected error occurred while fetching tribe members.');
    }
  }
);


export async function getTribeMembers(input: GetTribeMembersInput): Promise<GetTribeMembersOutput> {
    return getTribeMembersFlow(input);
}
