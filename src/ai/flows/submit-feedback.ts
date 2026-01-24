
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const SubmitFeedbackInputSchema = z.object({
  feedback: z.string().describe('The user feedback text.'),
  email: z.string().optional().describe('The user\'s email address (optional).'),
  userId: z.string().optional().describe('The user\'s ID (optional).'),
  userName: z.string().optional().describe('The user\'s name (optional).'),
});
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackInputSchema>;

const SubmitFeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type SubmitFeedbackOutput = z.infer<typeof SubmitFeedbackOutputSchema>;

async function sendEmailNotification(feedback: string, fromEmail?: string, fromName?: string) {
  const mailgunApiKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;
  const recipientEmails = process.env.FEEDBACK_RECIPIENT_EMAIL;

  if (!mailgunApiKey || !mailgunDomain || !recipientEmails) {
    console.error(
      'Mailgun environment variables not set. Skipping email notification.'
    );
    return;
  }

  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({ username: 'api', key: mailgunApiKey });

  const toEmails = recipientEmails.split(',').map(email => email.trim());

  const fromUser = fromName ? `${fromName} (${fromEmail || 'no email'})` : fromEmail || 'Anonymous';

  const messageData = {
    from: `TTpath Feedback Bot <info@${mailgunDomain}>`,
    to: toEmails,
    subject: 'New Feedback Submitted',
    text: `You have received new feedback:\n\n${feedback}\n\nFrom: ${fromUser}`,
  };

  try {
    const msg = await mg.messages.create(mailgunDomain, messageData);
    console.log('Email notification sent successfully:', msg);
  } catch (error) {
    console.error('Error sending email notification:', error);
    // We don't want to throw an error here, as it would cause the entire
    // feedback submission to fail. It's better to log the error and move on.
  }
}

export async function submitFeedback(
  input: SubmitFeedbackInput
): Promise<SubmitFeedbackOutput> {
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
      // Save to Firestore
      const feedbackRef = db.collection('feedback').doc();
      await feedbackRef.set({
        ...input,
        createdAt: new Date(),
      });

      // Send email notification
      await sendEmailNotification(input.feedback, input.email, input.userName);

      return { success: true, message: 'Feedback submitted successfully!' };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return { success: false, message: 'Failed to submit feedback.' };
    }
  }
);
