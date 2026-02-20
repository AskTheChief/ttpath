
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { NotifyFaqAuthorInputSchema, NotifyFaqAuthorOutputSchema, type NotifyFaqAuthorInput, type NotifyFaqAuthorOutput } from '@/lib/types';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();
const ADMIN_LEVEL = 6;

export async function notifyFaqAuthor(input: NotifyFaqAuthorInput): Promise<NotifyFaqAuthorOutput> {
  return notifyFaqAuthorFlow(input);
}

const notifyFaqAuthorFlow = ai.defineFlow(
  {
    name: 'notifyFaqAuthorFlow',
    inputSchema: NotifyFaqAuthorInputSchema,
    outputSchema: NotifyFaqAuthorOutputSchema,
  },
  async ({ idToken, entryId, recipientEmail: directEmail }) => {
    let mentorToken;
    try {
      mentorToken = await adminAuth.verifyIdToken(idToken);
      const mentorUserDoc = await db.collection('users').doc(mentorToken.uid).get();
      if (!mentorUserDoc.exists || (mentorUserDoc.data()?.currentUserLevel || 0) < ADMIN_LEVEL) {
        throw new Error('Permission denied. User is not a mentor.');
      }
    } catch (error: any) {
      console.error('Error verifying mentor token:', error);
      return { success: false, message: 'User not authorized.' };
    }

    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (!mailgunApiKey || !mailgunDomain) {
      const errorMessage = 'Mailgun environment variables are not set.';
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }
    
    try {
        const entryRef = db.collection('journal_entries').doc(entryId);
        const entryDoc = await entryRef.get();

        if (!entryDoc.exists) {
            return { success: false, message: 'Forum entry not found.' };
        }
        const entryData = entryDoc.data()!;

        let recipientEmail: string | undefined = directEmail;
        let recipientName = 'Contributor';

        if (recipientEmail) {
            // If an email is provided directly, we can use the name from the manual entry
            if (entryData.isManualEntry) {
                recipientName = entryData.userName || 'Contributor';
            }
        } else { // Fallback to existing logic if no direct email is provided
            const authorId = entryData.userId;

            if (entryData.isManualEntry || !authorId) {
                return { success: false, message: 'Cannot notify this entry without a specified email address.' };
            }

            const authorDoc = await db.collection('users').doc(authorId).get();
            if (!authorDoc.exists) {
                return { success: false, message: `Author profile (ID: ${authorId}) not found.` };
            }

            const authorData = authorDoc.data()!;
            recipientEmail = authorData.email;
            recipientName = authorData.firstName || 'Member';
        }

        if (!recipientEmail) {
            return { success: false, message: `A recipient email address could not be found.` };
        }
        
        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({ username: 'api', key: mailgunApiKey });

        const forumUrl = `https://ttpath.net/faq#faq-${entryId}`;

        const messageData = {
            from: `TTpath Notifier <notifications@${mailgunDomain}>`,
            to: recipientEmail,
            subject: 'A mentor has responded to your question in The Forum',
            html: `
                <p>Hello ${recipientName},</p>
                <p>A mentor has provided feedback on a question you asked in The Forum on TTpath.</p>
                <p>You can view the answer by clicking the link below:</p>
                <p><a href="${forumUrl}" style="padding: 10px 15px; background-color: #14532d; color: #ffffff; text-decoration: none; border-radius: 5px;">View Your Answer</a></p>
                <br>
                <p>- The TTpath Team</p>
            `,
        };

        await mg.messages.create(mailgunDomain, messageData);
        return { success: true, message: `Notification sent to ${recipientEmail}.` };
    } catch (error: any) {
        console.error('Error sending forum notification:', error);
        return { success: false, message: `Failed to send notification. Error: ${error.message}` };
    }
  }
);
