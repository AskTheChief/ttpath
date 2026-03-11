'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { format } from 'date-fns';

const SendMeetingReportReminderInputSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string(),
  tribeName: z.string(),
  meetingDate: z.string(), // ISO string
  nagLevel: z.enum(['gentle', 'medium', 'nagging']),
});
export type SendMeetingReportReminderInput = z.infer<typeof SendMeetingReportReminderInputSchema>;

const SendMeetingReportReminderOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendMeetingReportReminderOutput = z.infer<typeof SendMeetingReportReminderOutputSchema>;

export async function sendMeetingReportReminder(input: SendMeetingReportReminderInput): Promise<SendMeetingReportReminderOutput> {
  return sendMeetingReportReminderFlow(input);
}

const sendMeetingReportReminderFlow = ai.defineFlow(
  {
    name: 'sendMeetingReportReminderFlow',
    inputSchema: SendMeetingReportReminderInputSchema,
    outputSchema: SendMeetingReportReminderOutputSchema,
  },
  async ({ recipientEmail, recipientName, tribeName, meetingDate, nagLevel }) => {
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (!mailgunApiKey || !mailgunDomain) {
      const errorMessage = 'Mailgun environment variables are not set.';
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    const formattedDate = format(new Date(meetingDate), 'PPP');
    const reportUrl = `https://ttpath.net/my-tribe?view=my-tribe`;

    let subject = '';
    let textBody = '';
    let htmlBody = '';

    switch (nagLevel) {
      case 'gentle':
        subject = `A Gentle Reminder for Your Meeting Report`;
        textBody = `Hello ${recipientName},\n\nYou might consider submitting your report for the "${tribeName}" meeting on ${formattedDate}.\n\nYou submit reports in your My Account portal:\n${reportUrl}\n\n- The TTpath Team`;
        htmlBody = `
          <p>Hello ${recipientName},</p>
          <p>You might consider submitting your report for the "<strong>${tribeName}</strong>" meeting on <strong>${formattedDate}</strong>.</p>
          <p>You submit reports in your My Account portal.</p>
          <p><a href="${reportUrl}" style="padding: 10px 15px; background-color: #14532d; color: #ffffff; text-decoration: none; border-radius: 5px;">Submit Report</a></p>
          <br>
          <p>- The TTpath Team</p>
        `;
        break;
      case 'medium':
        subject = `Your Meeting Report is Pending`;
        textBody = `Hello ${recipientName},\n\nYour report for the "${tribeName}" meeting on ${formattedDate} is pending. You commit to your Tribe to send reports.\n\nYou submit reports in your My Account portal:\n${reportUrl}\n\n- The TTpath Team`;
        htmlBody = `
          <p>Hello ${recipientName},</p>
          <p>Your report for the "<strong>${tribeName}</strong>" meeting on <strong>${formattedDate}</strong> is pending. You commit to your Tribe to send reports.</p>
          <p>You submit reports in your My Account portal.</p>
          <p><a href="${reportUrl}" style="padding: 10px 15px; background-color: #14532d; color: #ffffff; text-decoration: none; border-radius: 5px;">Submit Report</a></p>
          <br>
          <p>- The TTpath Team</p>
        `;
        break;
      case 'nagging':
        subject = `ACTION REQUIRED: Your Meeting Report is Overdue`;
        textBody = `Hello ${recipientName},\n\nYour report for the "${tribeName}" meeting on ${formattedDate} is now overdue. Submitting reports is a key part of tribe accountability.\n\nYou submit your report in your My Account portal now:\n${reportUrl}\n\n- The TTpath Team`;
        htmlBody = `
          <p>Hello ${recipientName},</p>
          <p>Your report for the "<strong>${tribeName}</strong>" meeting on <strong>${formattedDate}</strong> is now overdue. Submitting reports is a key part of tribe accountability.</p>
          <p>You submit your report in your My Account portal now.</p>
          <p><a href="${reportUrl}" style="padding: 10px 15px; background-color: #b91c1c; color: #ffffff; text-decoration: none; border-radius: 5px;">Submit Overdue Report</a></p>
          <br>
          <p>- The TTpath Team</p>
        `;
        break;
    }

    try {
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({ username: 'api', key: mailgunApiKey });
      
      const messageData = {
        from: `TTpath Notifier <reminders@${mailgunDomain}>`,
        to: recipientEmail,
        subject,
        text: textBody,
        html: htmlBody,
      };

      await mg.messages.create(mailgunDomain, messageData);
      return { success: true, message: `Reminder sent to ${recipientEmail}.` };
    } catch (error: any) {
      console.error('Error sending report reminder email:', error);
      return { success: false, message: `Failed to send reminder. Error: ${error.message}` };
    }
  }
);
