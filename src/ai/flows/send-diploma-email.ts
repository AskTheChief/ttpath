
'use server';

/**
 * @fileOverview A Genkit flow for sending a diploma email via Mailgun.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

const SendDiplomaEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe("The email address to send the diploma to."),
  recipientName: z.string().optional().describe("The name of the recipient."),
});
export type SendDiplomaEmailInput = z.infer<typeof SendDiplomaEmailInputSchema>;

const SendDiplomaEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendDiplomaEmailOutput = z.infer<typeof SendDiplomaEmailOutputSchema>;

export async function sendDiplomaEmail(input: SendDiplomaEmailInput): Promise<SendDiplomaEmailOutput> {
  return sendDiplomaEmailFlow(input);
}

const sendDiplomaEmailFlow = ai.defineFlow(
  {
    name: 'sendDiplomaEmailFlow',
    inputSchema: SendDiplomaEmailInputSchema,
    outputSchema: SendDiplomaEmailOutputSchema,
  },
  async ({ recipientEmail, recipientName }) => {
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (!mailgunApiKey || !mailgunDomain) {
      const errorMessage = 'Mailgun environment variables (MAILGUN_API_KEY, MAILGUN_DOMAIN) are not set.';
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    try {
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({ username: 'api', key: mailgunApiKey });

      const messageData = {
        from: `The Trading Tribe <diploma@${mailgunDomain}>`,
        to: recipientEmail,
        subject: 'Your Trading Tribe Path Diploma!',
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 10px solid #eee; padding: 20px;">
            <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">
              <h1 style="font-size: 28px; margin: 0;">The Trading Tribe</h1>
              <h2 style="font-size: 20px; margin: 10px 0; color: #555;">Certificate of Graduation</h2>
            </div>
            <div style="text-align: center; padding: 20px 0;">
              <p style="font-size: 16px;">This certifies that</p>
              <p style="font-size: 24px; font-weight: bold; color: hsl(145, 48%, 42%); margin: 10px 0;">${recipientName || 'Valued Member'}</p>
              <p style="font-size: 16px;">has successfully completed the requirements to become a</p>
              <p style="font-size: 22px; font-weight: bold; margin: 10px 0;">Graduate</p>
              <p style="font-size: 16px;">on The Trading Tribe Path.</p>
            </div>
            <div style="text-align: center; border-top: 2px solid #333; padding-top: 20px; margin-top: 20px;">
              <p style="font-size: 14px; color: #777;">Your journey continues. You may now join a tribe or apply to start your own.</p>
              <p style="font-size: 12px; color: #aaa; margin-top: 20px;">Issued on: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        `,
      };

      const result = await mg.messages.create(mailgunDomain, messageData);
      console.log('Diploma email sent successfully:', result);
      return { success: true, message: `Diploma email sent successfully to ${recipientEmail}.` };
    } catch (error: any) {
      console.error('Error sending diploma email:', error);
      return { success: false, message: `Failed to send diploma email. Error: ${error.message}` };
    }
  }
);
