
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
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

// Define the input schema for creating a tribe. Only the name is needed from the client.
const CreateTribeInputSchema = z.object({
  name: z.string().describe("The desired name for the new Tribe."),
});
export type CreateTribeInput = z.infer<typeof CreateTribeInputSchema>;

// Define the output schema.
const CreateTribeOutputSchema = z.object({
  success: z.boolean(),
  tribeId: z.string().optional(),
});
export type CreateTribeOutput = z.infer<typeof CreateTribeOutputSchema>;

// This is the main function that will be called from the frontend.
export async function createTribe(
  input: CreateTribeInput
): Promise<CreateTribeOutput> {
  // It calls the Genkit flow, which handles the actual logic.
  return createTribeFlow(input);
}

// Define the Genkit flow.
const createTribeFlow = ai.defineFlow(
  {
    name: 'createTribeFlow',
    inputSchema: CreateTribeInputSchema,
    outputSchema: CreateTribeOutputSchema,
  },
  // The flow function receives the input and the flow's context.
  // The context contains authentication information.
  async (input, _, context) => {
    // Get the authenticated user from the context.
    const user = context?.auth;
    if (!user) {
      throw new Error('User not authenticated. You must be logged in to create a tribe.');
    }

    try {
      // Create a new document in the 'tribes' collection.
      const tribeRef = db.collection('tribes').doc();
      await tribeRef.set({
        name: input.name,
        chief: user.uid, // The user creating the tribe is the chief.
        members: [user.uid], // The chief is automatically a member.
        createdAt: new Date(),
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
