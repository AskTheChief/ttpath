'use server';

/**
 * @fileOverview A Genkit flow for retrieving inbound emails from Firestore for a specific user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { InboundEmailSchema, type InboundEmail } from '@/lib/types';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const GetInboundEmailsInputSchema = z.object({
  recipientEmail: z.string().email().optional().describe("The email address of the user whose inbox should be fetched."),
});
export type GetInboundEmailsInput = z.infer<typeof GetInboundEmailsInputSchema>;

const GetInboundEmailsOutputSchema = z.array(InboundEmailSchema);

export async function getInboundEmails(input: GetInboundEmailsInput): Promise<InboundEmail[]> {
  return getInboundEmailsFlow(input);
}

const getInboundEmailsFlow = ai.defineFlow(
  {
    name: 'getInboundEmailsFlow',
    inputSchema: GetInboundEmailsInputSchema,
    outputSchema: GetInboundEmailsOutputSchema,
  },
  async ({ recipientEmail }) => {
    try {
      let query = db.collection('inbound_emails').orderBy('receivedAt', 'desc');

      if (recipientEmail) {
        query = query.where('recipient', '==', recipientEmail);
      }

      const emailsSnapshot = await query.get();

      if (emailsSnapshot.empty) {
        return [];
      }

      const emails = emailsSnapshot.docs.map(doc => {
        const data = doc.data();
        const receivedAt = data.receivedAt as Timestamp;
        return {
          id: doc.id,
          from: data.from || 'Unknown Sender',
          to: data.to || data.recipient || 'Unknown Recipient',
          subject: data.subject || 'No Subject',
          body: data['body-plain'] || 'No content.',
          receivedAt: receivedAt.toDate().toISOString(),
        };
      });

      return emails;
    } catch (error) {
      console.error('Error fetching inbound emails:', error);
      throw new Error('An unexpected error occurred while fetching the inbox.');
    }
  }
);
