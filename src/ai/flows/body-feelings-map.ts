
'use server';

/**
 * @fileOverview Genkit flows for saving and retrieving user feelings for the Body Feelings Map.
 *
 * - getFeelings - Fetches the feelings for the authenticated user.
 * - saveFeelings - Saves the feelings for the authenticated user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();

// Define the schema for a single feeling
const FeelingSchema = z.object({
  id: z.number(),
  feelingName: z.string(),
  sensation: z.string(),
  rating: z.number().min(-10).max(10),
  x: z.number(),
  y: z.number(),
});
export type Feeling = z.infer<typeof FeelingSchema>;

// Input schema for saving feelings
const SaveFeelingsInputSchema = z.object({
  idToken: z.string(),
  feelings: z.array(FeelingSchema),
});
export type SaveFeelingsInput = z.infer<typeof SaveFeelingsInputSchema>;

const SaveFeelingsOutputSchema = z.object({
  success: z.boolean(),
});
export type SaveFeelingsOutput = z.infer<typeof SaveFeelingsOutputSchema>;


// Input schema for getting feelings
const GetFeelingsInputSchema = z.object({
  idToken: z.string(),
});
export type GetFeelingsInput = z.infer<typeof GetFeelingsInputSchema>;

const GetFeelingsOutputSchema = z.array(FeelingSchema);
export type GetFeelingsOutput = z.infer<typeof GetFeelingsOutputSchema>;


// Function to standardize feeling names (e.g., capitalize first letter)
const standardizeFeelingName = (name: string): string => {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

// Flow for saving feelings
const saveFeelingsFlow = ai.defineFlow(
  {
    name: 'saveFeelingsFlow',
    inputSchema: SaveFeelingsInputSchema,
    outputSchema: SaveFeelingsOutputSchema,
  },
  async ({ idToken, feelings }) => {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const userId = decodedToken.uid;
      
      // Standardize feeling names before saving
      const standardizedFeelings = feelings.map(f => ({
        ...f,
        feelingName: standardizeFeelingName(f.feelingName),
      }));

      const docRef = db.collection('body_feelings_maps').doc(userId);
      await docRef.set({ feelings: standardizedFeelings });

      return { success: true };
    } catch (error) {
      console.error('Error saving feelings:', error);
      return { success: false };
    }
  }
);

// Flow for getting feelings
const getFeelingsFlow = ai.defineFlow(
  {
    name: 'getFeelingsFlow',
    inputSchema: GetFeelingsInputSchema,
    outputSchema: GetFeelingsOutputSchema,
  },
  async ({ idToken }) => {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const userId = decodedToken.uid;
      
      const docRef = db.collection('body_feelings_maps').doc(userId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        return docSnap.data()?.feelings || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting feelings:', error);
      return [];
    }
  }
);


export async function saveFeelings(input: SaveFeelingsInput): Promise<SaveFeelingsOutput> {
  return saveFeelingsFlow(input);
}

export async function getFeelings(input: GetFeelingsInput): Promise<GetFeelingsOutput> {
    return getFeelingsFlow(input);
}
