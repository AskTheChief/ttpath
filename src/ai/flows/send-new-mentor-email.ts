'use server';

/**
 * @fileOverview A Genkit flow for notifying a user they have been approved as a Mentor.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

const SendNewMentorEmailInputSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string(),
});
export type SendNewMentorEmailInput = z.infer<typeof SendNewMentorEmailInputSchema>;

const SendNewMentorEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendNewMentorEmailOutput = z.infer<typeof SendNewMentorEmailOutputSchema>;

export async function sendNewMentorEmail(input: SendNewMentorEmailInput): Promise<SendNewMentorEmailOutput> {
  return sendNewMentorEmailFlow(input);
}

const sendNewMentorEmailFlow = ai.defineFlow(
  {
    name: 'sendNewMentorEmailFlow',
    inputSchema: SendNewMentorEmailInputSchema,
    outputSchema: SendNewMentorEmailOutputSchema,
  },
  async ({ recipientEmail, recipientName }) => {
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
      
      const dashboardUrl = `https://ttpath.net/my-tribe?view=mentor-dashboard`;
      const textBody = `Hello ${recipientName},\n\nYour application receives approval. You now carry the role of Mentor.\n\nYou access your Mentor Dashboard through your My Account portal:\n${dashboardUrl}\n\n- The TTpath Team`;
      const htmlBody = `
          <p>Hello ${recipientName},</p>
          <p>Your application receives approval. You now carry the role of Mentor.</p>
          <p>You access your Mentor Dashboard through your My Account portal.</p>
          <p><a href="${dashboardUrl}" style="padding: 10px 15px; background-color: #14532d; color: #ffffff; text-decoration: none; border-radius: 5px;">Go to My Account</a></p>
          <br>
          <p>- The TTpath Team</p>
      `;

      const messageData = {
        from: `TTpath Notifier <info@${mailgunDomain}>`,
        to: recipientEmail,
        subject: `Your Journey Continues: You Now Mentor Others`,
        text: textBody,
        html: htmlBody,
      };

      await mg.messages.create(mailgunDomain, messageData);
      return { success: true, message: `New mentor notification sent to ${recipientEmail}.` };
    } catch (error: any) {
      console.error('Error sending new mentor email:', error);
      return { success: false, message: `Failed to send notification. Error: ${error.message}` };
    }
  }
);
