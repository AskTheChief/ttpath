
'use server';

/**
 * @fileOverview A Genkit flow for saving inbound emails from Mailgun to Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { notifyUserOfNewEmail } from './notify-user-of-new-email';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const SaveInboundEmailInputSchema = z.record(z.string()).describe("A key-value map of the inbound email data from Mailgun.");
export type SaveInboundEmailInput = z.infer<typeof SaveInboundEmailInputSchema>;

const SaveInboundEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type SaveInboundEmailOutput = z.infer<typeof SaveInboundEmailOutputSchema>;


export async function saveInboundEmail(input: SaveInboundEmailInput): Promise<SaveInboundEmailOutput> {
  return saveInboundEmailFlow(input);
}


const saveInboundEmailFlow = ai.defineFlow(
  {
    name: 'saveInboundEmailFlow',
    inputSchema: SaveInboundEmailInputSchema,
    outputSchema: SaveInboundEmailOutputSchema,
  },
  async (emailData) => {
    try {
      const docRef = db.collection('inbound_emails').doc();
      
      const dataToSave = {
        ...emailData,
        receivedAt: Timestamp.now(),
      };
      
      await docRef.set(dataToSave);
      
      console.log(`Successfully saved inbound email ${docRef.id} from ${emailData.from}`);
      
      // After saving, trigger the notification flow. Don't block completion for this.
      if (emailData.recipient) {
        notifyUserOfNewEmail({
          recipientEmail: emailData.recipient,
          subject: emailData.subject,
          sender: emailData.from,
        }).catch(err => {
            // Log the error but don't fail the main flow
            console.error(`Failed to send notification for email ${docRef.id}:`, err);
        });
      }

      return { success: true, message: `Email ${docRef.id} saved.` };

    } catch (error: any) {
      console.error('Error saving inbound email to Firestore:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }
);
