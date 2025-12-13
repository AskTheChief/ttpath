
'use server';

/**
 * @fileOverview A Genkit flow for sending a "Bug Finder" diploma email via Mailgun.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

const SendBugFinderDiplomaInputSchema = z.object({
  recipientEmail: z.string().email().describe("The email address to send the diploma to."),
  recipientName: z.string().optional().describe("The name of the recipient."),
  bugDescription: z.string().optional().describe("A brief description of the bug they found."),
});
export type SendBugFinderDiplomaInput = z.infer<typeof SendBugFinderDiplomaInputSchema>;

const SendBugFinderDiplomaOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendBugFinderDiplomaOutput = z.infer<typeof SendBugFinderDiplomaOutputSchema>;

const logoUrl = 'https://ttpath.net/logo/logo.png'; 

export async function sendBugFinderDiploma(input: SendBugFinderDiplomaInput): Promise<SendBugFinderDiplomaOutput> {
  return sendBugFinderDiplomaFlow(input);
}

const sendBugFinderDiplomaFlow = ai.defineFlow(
  {
    name: 'sendBugFinderDiplomaFlow',
    inputSchema: SendBugFinderDiplomaInputSchema,
    outputSchema: SendBugFinderDiplomaOutputSchema,
  },
  async ({ recipientEmail, recipientName, bugDescription }) => {
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
        from: `The Trading Tribe <bug-finders@${mailgunDomain}>`,
        to: recipientEmail,
        subject: 'Your Trading Tribe Bug Finder Certificate!',
        html: `
          <div style="font-family: 'Courier New', Courier, monospace; line-height: 1.6; color: #d1d5db; max-width: 800px; margin: auto; border: 10px solid #374151; padding: 50px; background-color: #111827; text-align: center;">
            <div style="padding-bottom: 20px;">
              <img src="${logoUrl}" alt="Trading Tribe Logo" style="width: 100px; height: 100px; margin: 0 auto; filter: grayscale(1) brightness(1.5);"/>
            </div>
            <h1 style="font-size: 40px; font-weight: bold; color: #6ee7b7; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Bug Squasher Award</h1>
            <p style="font-size: 20px; color: #9ca3af; margin-top: 40px;">This certificate is awarded to</p>
            <p style="font-family: 'Major Mono Display', monospace; font-size: 36px; color: #a78bfa; margin: 20px 0; border-bottom: 2px dashed #4b5563; display: inline-block; padding-bottom: 5px; line-height: 1.2;">
              ${recipientName || 'An Astute User'}
            </p>
            <p style="font-size: 20px; color: #9ca3af;">for outstanding contribution to the stability and integrity of the Tribe's systems.</p>
            <p style="font-size: 24px; font-weight: bold; color: #6ee7b7; margin: 20px 0;">Official Bug Squasher</p>
            ${bugDescription ? `<p style="font-size: 16px; color: #6b7280; margin-top: 20px;">For identifying the issue: "${bugDescription}"</p>` : ''}
            <div style="margin-top: 50px;">
              <p style="font-size: 14px; color: #4b5563;">Your keen eye helps us all. Thank you for your service.</p>
              <p style="font-size: 12px; color: #374151; margin-top: 30px;">Issued: ${new Date().toISOString()}</p>
            </div>
          </div>
        `,
      };

      const result = await mg.messages.create(mailgunDomain, messageData);
      console.log('Bug Finder diploma sent successfully:', result);
      return { success: true, message: `Bug Finder Certificate sent successfully to ${recipientEmail}.` };
    } catch (error: any) {
      console.error('Error sending Bug Finder diploma:', error);
      return { success: false, message: `Failed to send certificate. Error: ${error.message}` };
    }
  }
);
