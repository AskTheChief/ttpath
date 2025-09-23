'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
// import { getFirestore } from 'firebase-admin/firestore';
// import { initializeApp, getApps } from 'firebase-admin/app';
// import { credential } from 'firebase-admin';

// // Initialize Firebase Admin SDK if it hasn't been already.
// if (!getApps().length) {
//   initializeApp({
//     credential: credential.applicationDefault(),
//     projectId: process.env.FIREBASE_PROJECT_ID,
//   });
// }
// const db = getFirestore();

const ADMIN_EMAIL = 'your-admin-email@example.com';

const SubmitFeedbackInputSchema = z.object({
  feedback: z.string().describe('The user feedback text.'),
  email: z.string().optional().describe('The user\'s email address (optional).'),
});
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackInputSchema>;

const SubmitFeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type SubmitFeedbackOutput = z.infer<typeof SubmitFeedbackOutputSchema>;

async function sendEmailNotification(feedback: string, fromEmail?: string) {
  // In a real application, you would use an email sending service
  // like SendGrid, Mailgun, or a Firebase Extension like "Trigger Email".
  console.log('--- Sending Email Notification ---');
  console.log(`To: ${ADMIN_EMAIL}`);
  console.log(`From: ${fromEmail || 'anonymous'}`);
  console.log(`Subject: New Feedback Submitted`);
  console.log(`Body: ${feedback}`);
  console.log('---------------------------------');
  // This is a placeholder. Replace with actual email sending logic.
  return Promise.resolve();
}

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
      // // Save to Firestore
      // const feedbackRef = db.collection('feedback').doc();
      // await feedbackRef.set({
      //   ...input,
      //   createdAt: new Date(),
      // });

      // Send email notification
      await sendEmailNotification(input.feedback, input.email);

      return {success: true, message: 'Feedback submitted successfully!'};
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return {success: false, message: 'Failed to submit feedback.'};
    }
  }
);
