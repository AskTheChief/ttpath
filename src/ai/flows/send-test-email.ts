
'use server';

/**
 * @fileOverview A Genkit flow for sending a test email via Mailgun.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

const SendTestEmailInputSchema = z.object({
  recipientEmail: z.string().email().describe("The email address to send the test email to."),
});
export type SendTestEmailInput = z.infer<typeof SendTestEmailInputSchema>;

const SendTestEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendTestEmailOutput = z.infer<typeof SendTestEmailOutputSchema>;

export async function sendTestEmail(input: SendTestEmailInput): Promise<SendTestEmailOutput> {
  return sendTestEmailFlow(input);
}

const sendTestEmailFlow = ai.defineFlow(
  {
    name: 'sendTestEmailFlow',
    inputSchema: SendTestEmailInputSchema,
    outputSchema: SendTestEmailOutputSchema,
  },
  async ({ recipientEmail }) => {
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
        from: `TTpath Test <test@${mailgunDomain}>`,
        to: recipientEmail,
        subject: 'This is a test email from your TTpath App',
        text: 'Reply to this email. If your Mailgun route is configured correctly, your reply will appear in the app\'s inbox.',
        'h:Reply-To': `replies@${mailgunDomain}`,
      };

      const result = await mg.messages.create(mailgunDomain, messageData);
      console.log('Test email sent successfully:', result);
      return { success: true, message: `Test email sent successfully to ${recipientEmail}.` };
    } catch (error: any) {
      console.error('Error sending test email:', error);
      return { success: false, message: `Failed to send test email. Error: ${error.message}` };
    }
  }
);
