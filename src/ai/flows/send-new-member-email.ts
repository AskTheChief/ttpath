'use server';

/**
 * @fileOverview A Genkit flow for notifying a user they have been accepted into a tribe.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

const SendNewMemberEmailInputSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string(),
  tribeName: z.string(),
});
export type SendNewMemberEmailInput = z.infer<typeof SendNewMemberEmailInputSchema>;

const SendNewMemberEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendNewMemberEmailOutput = z.infer<typeof SendNewMemberEmailOutputSchema>;

export async function sendNewMemberEmail(input: SendNewMemberEmailInput): Promise<SendNewMemberEmailOutput> {
  return sendNewMemberEmailFlow(input);
}

const sendNewMemberEmailFlow = ai.defineFlow(
  {
    name: 'sendNewMemberEmailFlow',
    inputSchema: SendNewMemberEmailInputSchema,
    outputSchema: SendNewMemberEmailOutputSchema,
  },
  async ({ recipientEmail, recipientName, tribeName }) => {
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (!mailgunApiKey || !mailgunDomain) {
      const errorMessage = 'Mailgun environment variables are not set.';
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    try {
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({ username: 'api', key: mailgunApiKey });
      
      const dashboardUrl = `https://ttpath.net/my-tribe?view=my-tribe`;
      const textBody = `Hello ${recipientName},\n\nThe Tribe Chief accepts your application. You now join the "${tribeName}".\n\nYou access your tribe's page through your My Account portal:\n${dashboardUrl}\n\n- The TTpath Team`;
      const htmlBody = `
          <p>Hello ${recipientName},</p>
          <p>The Tribe Chief accepts your application. You now join "${tribeName}".</p>
          <p>You access your tribe's page through your My Account portal.</p>
          <p><a href="${dashboardUrl}" style="padding: 10px 15px; background-color: #14532d; color: #ffffff; text-decoration: none; border-radius: 5px;">Go to My Account</a></p>
          <br>
          <p>- The TTpath Team</p>
      `;

      const messageData = {
        from: `TTpath Notifier <info@${mailgunDomain}>`,
        to: recipientEmail,
        subject: `Your Journey Continues: You Join "${tribeName}"`,
        text: textBody,
        html: htmlBody,
      };

      await mg.messages.create(mailgunDomain, messageData);
      return { success: true, message: `New member notification sent to ${recipientEmail}.` };
    } catch (error: any) {
      console.error('Error sending new member email:', error);
      return { success: false, message: `Failed to send notification. Error: ${error.message}` };
    }
  }
);
