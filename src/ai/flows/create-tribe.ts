
'use server';

/**
 * @fileOverview A Genkit flow for creating a new Tribe application.
 *
 * - createTribe - A function that allows an authenticated user to apply to create a new Tribe.
 */

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { CreateTribeInputSchema, CreateTribeOutputSchema, type CreateTribeInput, type CreateTribeOutput } from '@/lib/types';


// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
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
      
      const userTutorialDoc = await db.collection('user_tutorials').doc(user.uid).get();
      const answers = userTutorialDoc.exists ? userTutorialDoc.data()?.answers || {} : {};

      // Create an application instead of a tribe directly
      const applicationRef = db.collection('tribe_applications').doc();
      await applicationRef.set({
        type: 'new_tribe',
        tribeName: name,
        location: location,
        lat: lat,
        lng: lng,
        applicantId: user.uid,
        answers: answers,
        status: 'pending',
        createdAt: Timestamp.now(),
      });

      // Return a successful response.
      return { success: true, message: "Your application to create a tribe has been submitted for review by a mentor." };
    } catch (error) {
      console.error('Error creating tribe application in Firestore:', error);
      // Return a failure response.
      return { success: false, message: 'An unexpected error occurred while submitting your application.' };
    }
  }
);


export async function createTribe(input: CreateTribeInput): Promise<CreateTribeOutput> {
    return createTribeFlow(input);
}
