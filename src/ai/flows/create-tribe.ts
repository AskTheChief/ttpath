
'use server';

/**
 * @fileOverview A Genkit flow for creating a new Tribe.
 *
 * - createTribe - A function that allows an authenticated user to create a new Tribe.
 * - CreateTribeInput - The input type for the createTribe function.
 * - CreateTribeOutput - The return type for the createTribe function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, credential } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

// Define the input schema for creating a tribe.
export const CreateTribeInputSchema = z.object({
  name: z.string().describe("The desired name for the new Tribe."),
  location: z.string().describe("The city and state of the tribe (e.g., 'New York, NY')."),
  lat: z.number().describe("The latitude of the tribe location."),
  lng: z.number().describe("The longitude of the tribe location."),
});
export type CreateTribeInput = z.infer<typeof CreateTribeInputSchema>;

// Define the output schema.
export const CreateTribeOutputSchema = z.object({
  success: z.boolean(),
  tribeId: z.string().optional(),
});
export type CreateTribeOutput = z.infer<typeof CreateTribeOutputSchema>;


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
