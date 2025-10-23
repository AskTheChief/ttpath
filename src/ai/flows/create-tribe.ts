
'use server';

/**
 * @fileOverview A Genkit flow for creating a new Tribe.
 *
 * - createTribe - A function that allows an authenticated user to create a new Tribe.
 */

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { CreateTribeInputSchema, CreateTribeOutputSchema, type CreateTribeInput, type CreateTribeOutput } from '@/lib/types';


// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();

const createTribeFlow = ai.defineFlow(
  {
    name: 'createTribeFlow',
    inputSchema: CreateTribeInputSchema,
    outputSchema: CreateTribeOutputSchema,
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
      const { name, location, lat, lng } = input;

      if (lat === undefined || lng === undefined) {
        throw new Error('Could not determine coordinates for the provided location.');
      }

      const tribeRef = db.collection('tribes').doc();
      const userRef = db.collection('users').doc(user.uid);

      // Use a transaction to ensure atomicity
      await db.runTransaction(async (transaction) => {
        // Create the new tribe
        transaction.set(tribeRef, {
          name: name,
          location: location,
          lat: lat,
          lng: lng,
          chief: user.uid, // The user creating the tribe is the chief.
          members: [user.uid], // The chief is automatically a member.
          createdAt: Timestamp.now(),
        });
        
        // Update the user's level to 5 (Chief)
        transaction.update(userRef, { currentUserLevel: 5 });
      });

      // Return a successful response with the new tribe's ID.
      return { success: true, tribeId: tribeRef.id };
    } catch (error) {
      console.error('Error creating tribe in Firestore:', error);
      // Return a failure response.
      return { success: false, message: 'An unexpected error occurred while creating the tribe.' };
    }
  }
);


export async function createTribe(input: CreateTribeInput): Promise<CreateTribeOutput> {
    return createTribeFlow(input);
}
