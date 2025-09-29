'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

const GetTribesInputSchema = z.object({});
export type GetTribesInput = z.infer<typeof GetTribesInputSchema>;

const GetTribesOutputSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
  })
);
export type GetTribesOutput = z.infer<typeof GetTribesOutputSchema>;

export async function getTribes(input: GetTribesInput): Promise<GetTribesOutput> {
  return getTribesFlow(input);
}

const getTribesFlow = ai.defineFlow(
  {
    name: 'getTribesFlow',
    inputSchema: GetTribesInputSchema,
    outputSchema: GetTribesOutputSchema,
  },
  async () => {
    try {
      const tribesSnapshot = await db.collection('tribes').get();
      const tribes = tribesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));
      return tribes;
    } catch (error) {
      console.error('Error getting tribes:', error);
      return [];
    }
  }
);
