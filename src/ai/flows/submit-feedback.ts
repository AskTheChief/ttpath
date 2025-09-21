'use server';
/**
 * @fileOverview A Genkit flow for submitting user feedback to Firestore.
 *
 * - submitFeedback - A function that takes user feedback and stores it.
 * - SubmitFeedbackInput - The input type for the submitFeedback function.
 * - SubmitFeedbackOutput - The return type for the submitFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getFirestore} from 'firebase-admin/firestore';
import {initializeApp, getApps, App} from 'firebase-admin/app';
import {credential} from 'firebase-admin';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

const SubmitFeedbackInputSchema = z.object({
  feedback: z.string().describe('The user’s feedback text.'),
  email: z.string().optional().describe('The user’s email (optional).'),
});
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackInputSchema>;

const SubmitFeedbackOutputSchema = z.object({
  success: z.boolean().describe('Whether the feedback was submitted successfully.'),
  message: z.string().describe('A message indicating the result.'),
});
export type SubmitFeedbackOutput = z.infer<typeof SubmitFeedbackOutputSchema>;

export async function submitFeedback(input: SubmitFeedbackInput): Promise<SubmitFeedbackOutput> {
  return submitFeedbackFlow(input);
}

const submitFeedbackFlow = ai.defineFlow(
  {
    name: 'submitFeedbackFlow',
    inputSchema: SubmitFeedbackInputSchema,
    outputSchema: SubmitFeedbackOutputSchema,
  },
  async input => {
    try {
      const feedbackRef = db.collection('feedback').doc();
      await feedbackRef.set({
        ...input,
        createdAt: new Date(),
      });
      return {success: true, message: 'Feedback submitted successfully!'};
    } catch (error) {
      console.error('Error submitting feedback to Firestore:', error);
      return {success: false, message: 'Failed to submit feedback.'};
    }
  }
);
