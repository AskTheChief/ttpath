
'use server';

/**
 * @fileOverview A Genkit flow for resending diplomas to all qualified users.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { sendDiplomaEmail, SendDiplomaEmailInput } from './send-diploma-email';
import { User, getUsers } from './get-users';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const ResendAllDiplomasOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  sentCount: z.number(),
});
export type ResendAllDiplomasOutput = z.infer<typeof ResendAllDiplomasOutputSchema>;

export async function resendAllDiplomas(): Promise<ResendAllDiplomasOutput> {
  return resendAllDiplomasFlow();
}

const resendAllDiplomasFlow = ai.defineFlow(
  {
    name: 'resendAllDiplomasFlow',
    outputSchema: ResendAllDiplomasOutputSchema,
  },
  async () => {
    let sentCount = 0;
    try {
      const allUsers = await getUsers();
      
      const qualifiedUsers = allUsers.filter(user => 
        (user.currentUserLevel || 0) >= 3 && user.email && user.firstName
      );

      if (qualifiedUsers.length === 0) {
        return { success: true, message: 'No qualified users found to send diplomas to.', sentCount: 0 };
      }

      const emailPromises = qualifiedUsers.map(user => {
        const input: SendDiplomaEmailInput = {
            recipientEmail: user.email!,
            recipientName: `${user.firstName} ${user.lastName || ''}`.trim(),
        };
        // We don't await here to send emails in parallel
        return sendDiplomaEmail(input).then(result => {
            if (result.success) {
                sentCount++;
            } else {
                console.warn(`Failed to send diploma to ${user.email}: ${result.message}`);
            }
            return result;
        });
      });

      await Promise.all(emailPromises);
      
      return { 
        success: true, 
        message: `Diploma resend process completed. Sent ${sentCount} of ${qualifiedUsers.length} diplomas.`,
        sentCount,
      };

    } catch (error: any) {
      console.error('Error resending all diplomas:', error);
      return { 
        success: false, 
        message: `An unexpected error occurred: ${error.message}`,
        sentCount,
       };
    }
  }
);
