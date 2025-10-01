
'use server';

/**
 * @fileOverview A Genkit flow for creating a new Tribe.
 *
 * - createTribe - A function that allows an authenticated user to create a new Tribe.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, credential } from 'firebase-admin/app';
import { CreateTribeInputSchema, CreateTribeOutputSchema, type CreateTribeInput, type CreateTribeOutput } from '@/lib/types';


// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

const createTribeFlow = ai.defineFlow(
  {
    name: 'createTribeFlow',
    inputSchema: CreateTribeInputSchema,
    outputSchema: CreateTribeOutputSchema,
  },
  async (input, _, context) => {
    // Get the authenticated user from the context.
    const user = context?.auth;
    if (!user) {
      throw new Error('User not authenticated. You must be logged in to create a tribe.');
    }

    try {
      const { name, location, lat, lng } = input;

      if (lat === undefined || lng === undefined) {
        throw new Error('Could not determine coordinates for the provided location.');
      }

      // Create a new document in the 'tribes' collection.
      const tribeRef = db.collection('tribes').doc();
      await tribeRef.set({
        name: name,
        location: location,
        lat: lat,
        lng: lng,
        chief: user.uid, // The user creating the tribe is the chief.
        members: [user.uid], // The chief is automatically a member.
        createdAt: Timestamp.now(),
      });
      // Return a successful response with the new tribe's ID.
      return { success: true, tribeId: tribeRef.id };
    } catch (error) {
      console.error('Error creating tribe in Firestore:', error);
      // Return a failure response.
      return { success: false };
    }
  }
);


export async function createTribe(input: CreateTribeInput): Promise<CreateTribeOutput> {
    return createTribeFlow(input);
}
