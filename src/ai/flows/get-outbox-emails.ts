
'use server';

/**
 * @fileOverview A Genkit flow for retrieving outbound emails from the Firestore outbox.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();

const OutboundEmailSchema = z.object({
  id: z.string(),
  recipientEmail: z.string(),
  recipientName: z.string().optional(),
  subject: z.string(),
  body: z.string(),
  sentAt: z.string(),
});
export type OutboundEmail = z.infer<typeof OutboundEmailSchema>;

const GetOutboxEmailsOutputSchema = z.array(OutboundEmailSchema);
export type GetOutboxEmailsOutput = z.infer<typeof GetOutboxEmailsOutputSchema>;

export async function getOutboxEmails(): Promise<GetOutboxEmailsOutput> {
  return getOutboxEmailsFlow();
}

const getOutboxEmailsFlow = ai.defineFlow(
  {
    name: 'getOutboxEmailsFlow',
    outputSchema: GetOutboxEmailsOutputSchema,
  },
  async () => {
    try {
      const emailsSnapshot = await db.collection('outbound_emails').orderBy('sentAt', 'desc').get();
      if (emailsSnapshot.empty) {
        return [];
      }

      const emails = emailsSnapshot.docs.map(doc => {
        const data = doc.data();
        const sentAt = data.sentAt as Timestamp;
        return {
          id: doc.id,
          recipientEmail: data.recipientEmail || 'Unknown Recipient',
          recipientName: data.recipientName,
          subject: data.subject || 'No Subject',
          body: data.body || 'No content.',
          sentAt: sentAt.toDate().toISOString(),
        };
      });

      return emails;
    } catch (error) {
      console.error('Error fetching outbound emails:', error);
      throw new Error('An unexpected error occurred while fetching the outbox.');
    }
  }
);
