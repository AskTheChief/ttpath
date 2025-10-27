
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getFirestore} from 'firebase-admin/firestore';
import {initializeApp, getApps, App} from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();

const SaveQAndAInputSchema = z.object({
  question: z.string(),
  answer: z.string(),
  userId: z.string().optional(),
  userName: z.string().optional(),
});
export type SaveQAndAInput = z.infer<typeof SaveQAndAInputSchema>;

const SaveQAndAOutputSchema = z.object({
  success: z.boolean(),
});
export type SaveQAndAOutput = z.infer<typeof SaveQAndAOutputSchema>;

export async function saveQAndA(input: SaveQAndAInput): Promise<SaveQAndAOutput> {
  return saveQAndAFlow(input);
}

const saveQAndAFlow = ai.defineFlow(
  {
    name: 'saveQAndAFlow',
    inputSchema: SaveQAndAInputSchema,
    outputSchema: SaveQAndAOutputSchema,
  },
  async input => {
    try {
      const chatSessionRef = db.collection('chat_sessions').doc();
      await chatSessionRef.set({
        ...input,
        createdAt: new Date(),
      });
      return {success: true};
    } catch (error) {
      console.error('Error saving chat session to Firestore:', error);
      return {success: false};
    }
  }
);
