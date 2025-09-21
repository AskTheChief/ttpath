'use server';

import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  try {
    initializeApp({
      credential: credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } catch (e) {
    console.error('Firebase Admin SDK initialization error:', e);
  }
}
const db = getFirestore();

const SubmitFeedbackInputSchema = z.object({
  feedback: z.string().describe('The user feedback text.'),
  email: z.string().optional().describe("The user's email address (optional)."),
});
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackInputSchema>;

const SubmitFeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type SubmitFeedbackOutput = z.infer<typeof SubmitFeedbackOutputSchema>;

export async function submitFeedback(input: SubmitFeedbackInput): Promise<SubmitFeedbackOutput> {
  try {
    // Validate input against the Zod schema
    const validatedInput = SubmitFeedbackInputSchema.parse(input);

    // Save to Firestore
    const feedbackRef = db.collection('feedback').doc();
    await feedbackRef.set({
      ...validatedInput,
      createdAt: new Date(),
    });

    // The "Trigger Email" extension will handle sending the email.
    // No need for email logic here.

    return { success: true, message: 'Feedback submitted successfully!' };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    if (error instanceof z.ZodError) {
      return { success: false, message: 'Invalid input.' };
    }
    return { success: false, message: 'Failed to submit feedback.' };
  }
}
