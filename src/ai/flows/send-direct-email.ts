
'use server';

/**
 * @fileOverview A Genkit flow for sending a direct email via Mailgun.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { SendDirectEmailInputSchema, SendDirectEmailOutputSchema, type SendDirectEmailInput, type SendDirectEmailOutput } from '@/lib/types';

export async function sendDirectEmail(input: SendDirectEmailInput): Promise<SendDirectEmailOutput> {
  return sendDirectEmailFlow(input);
}

const sendDirectEmailFlow = ai.defineFlow(
  {
    name: 'sendDirectEmailFlow',
    inputSchema: SendDirectEmailInputSchema,
    outputSchema: SendDirectEmailOutputSchema,
  },
  async ({ recipientEmail, subject, body }) => {
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
        from: `TTpath <info@${mailgunDomain}>`,
        to: recipientEmail,
        subject: subject,
        html: body,
        'h:Reply-To': `replies@${mailgunDomain}`,
      };

      const result = await mg.messages.create(mailgunDomain, messageData);
      console.log('Direct email sent successfully:', result);
      return { success: true, message: `Email sent successfully to ${recipientEmail}.` };
    } catch (error: any) {
      console.error('Error sending direct email:', error);
      return { success: false, message: `Failed to send email. Error: ${error.message}` };
    }
  }
);
