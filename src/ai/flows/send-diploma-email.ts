
'use server';

/**
 * @fileOverview A Genkit flow for sending a diploma email via Mailgun.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

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

// Read and Base64 encode the SVG logo
const logoPath = path.join(process.cwd(), 'public', 'logo', 'logo.svg');
const logoSvg = fs.readFileSync(logoPath, 'utf8');
const logoBase64 = Buffer.from(logoSvg).toString('base64');
const logoDataUri = `data:image/svg+xml;base64,${logoBase64}`;


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
          <div style="font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #333; max-width: 800px; margin: auto; border: 10px solid #c9b037; padding: 50px; background-color: #f3f2f1; text-align: center;">
            <div style="padding-bottom: 20px;">
              <img src="${logoDataUri}" alt="Trading Tribe Logo" style="width: 150px; height: 150px; margin: 0 auto;"/>
            </div>
            <h1 style="font-size: 50px; font-weight: bold; color: #2a433a; margin: 0;">Certificate of Graduation</h1>
            <p style="font-size: 25px; color: #555; margin-top: 40px;">This certifies that</p>
            <p style="font-family: 'Garamond', serif; font-size: 40px; font-weight: bold; color: #c9b037; margin: 20px 0; border-bottom: 2px solid #c9b037; display: inline-block; padding-bottom: 5px;">
              ${recipientName || 'Valued Member'}
            </p>
            <p style="font-size: 25px; color: #555;">has successfully completed all requirements to become a</p>
            <p style="font-size: 30px; font-weight: bold; color: #2a433a; margin: 20px 0;">Graduate</p>
            <p style="font-size: 20px; color: #555;">on The Trading Tribe Path.</p>
            <div style="margin-top: 50px;">
              <p style="font-size: 16px; color: #777;">Your journey continues. You may now join a tribe or apply to start your own.</p>
              <p style="font-size: 14px; color: #aaa; margin-top: 30px;">Issued on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
