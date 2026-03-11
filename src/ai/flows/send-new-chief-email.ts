'use server';

/**
 * @fileOverview A Genkit flow for notifying a user they have been approved as a Tribe Chief.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

const SendNewChiefEmailInputSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string(),
  tribeName: z.string(),
});
export type SendNewChiefEmailInput = z.infer<typeof SendNewChiefEmailInputSchema>;

const SendNewChiefEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendNewChiefEmailOutput = z.infer<typeof SendNewChiefEmailOutputSchema>;

export async function sendNewChiefEmail(input: SendNewChiefEmailInput): Promise<SendNewChiefEmailOutput> {
  return sendNewChiefEmailFlow(input);
}

const sendNewChiefEmailFlow = ai.defineFlow(
  {
    name: 'sendNewChiefEmailFlow',
    inputSchema: SendNewChiefEmailInputSchema,
    outputSchema: SendNewChiefEmailOutputSchema,
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
      
      const dashboardUrl = `https://ttpath.net/my-tribe?view=chief-dashboard`;
      const textBody = `Hello ${recipientName},\n\nA Mentor accepts your application. You now lead "${tribeName}" as its Chief.\n\nYou access your Chief Dashboard through your My Account portal:\n${dashboardUrl}\n\n- The TTpath Team`;
      const htmlBody = `
          <p>Hello ${recipientName},</p>
          <p>A Mentor accepts your application. You now lead "${tribeName}" as its Chief.</p>
          <p>You access your Chief Dashboard through your My Account portal.</p>
          <p><a href="${dashboardUrl}" style="padding: 10px 15px; background-color: #14532d; color: #ffffff; text-decoration: none; border-radius: 5px;">Go to My Account</a></p>
          <br>
          <p>- The TTpath Team</p>
      `;

      const messageData = {
        from: `TTpath Notifier <info@${mailgunDomain}>`,
        to: recipientEmail,
        subject: `Your Journey Continues: You Now Lead "${tribeName}"`,
        text: textBody,
        html: htmlBody,
      };

      await mg.messages.create(mailgunDomain, messageData);
      return { success: true, message: `New chief notification sent to ${recipientEmail}.` };
    } catch (error: any) {
      console.error('Error sending new chief email:', error);
      return { success: false, message: `Failed to send notification. Error: ${error.message}` };
    }
  }
);
