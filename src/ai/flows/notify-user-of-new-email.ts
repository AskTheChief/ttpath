
'use server';

/**
 * @fileOverview A Genkit flow for notifying a user about a new email received in-app.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();

const NotifyUserInputSchema = z.object({
  recipientEmail: z.string().email(),
  subject: z.string(),
  sender: z.string(),
});
export type NotifyUserInput = z.infer<typeof NotifyUserInputSchema>;

const NotifyUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type NotifyUserOutput = z.infer<typeof NotifyUserOutputSchema>;

export async function notifyUserOfNewEmail(input: NotifyUserInput): Promise<NotifyUserOutput> {
  return notifyUserOfNewEmailFlow(input);
}

const notifyUserOfNewEmailFlow = ai.defineFlow(
  {
    name: 'notifyUserOfNewEmailFlow',
    inputSchema: NotifyUserInputSchema,
    outputSchema: NotifyUserOutputSchema,
  },
  async ({ recipientEmail, subject, sender }) => {
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (!mailgunApiKey || !mailgunDomain) {
      const errorMessage = 'Mailgun environment variables are not set for notifications.';
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }
    
    try {
        // Find the user by their email
        const usersRef = db.collection('users');
        const userQuery = await usersRef.where('email', '==', recipientEmail).limit(1).get();

        if (userQuery.empty) {
            return { success: false, message: `No user found with email ${recipientEmail}. Cannot notify.` };
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        const userName = userData.firstName || 'Member';
        
        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({ username: 'api', key: mailgunApiKey });

        const messageData = {
            from: `TTpath Notifier <notifications@${mailgunDomain}>`,
            to: recipientEmail,
            subject: 'You have a new message on TTpath',
            html: `
                <p>Hello ${userName},</p>
                <p>You have received a new message in your TTpath inbox regarding: <strong>${subject}</strong> from <strong>${sender}</strong>.</p>
                <p>Please log in to your account to view the message.</p>
                <p><a href="https://ttpath.net/my-tribe?view=email" style="padding: 10px 15px; background-color: #14532d; color: #ffffff; text-decoration: none; border-radius: 5px;">View My Inbox</a></p>
                <br>
                <p>- The TTpath Team</p>
            `,
        };

        await mg.messages.create(mailgunDomain, messageData);
        return { success: true, message: `Notification sent to ${recipientEmail}.` };
    } catch (error: any) {
        console.error('Error sending new message notification:', error);
        return { success: false, message: `Failed to send notification. Error: ${error.message}` };
    }
  }
);
