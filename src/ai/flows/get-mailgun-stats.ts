'use server';

/**
 * @fileOverview A Genkit flow for retrieving email statistics from the Mailgun API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';

const mailgunApiKey = process.env.MAILGUN_API_KEY;
const mailgunDomain = process.env.MAILGUN_DOMAIN;

const GetMailgunStatsInputSchema = z.object({}).describe("Fetches overarching Mailgun Domain Statistics.");
export type GetMailgunStatsInput = z.infer<typeof GetMailgunStatsInputSchema>;

const GetMailgunStatsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  stats: z.object({
    accepted: z.number().default(0),
    delivered: z.number().default(0),
    opened: z.number().default(0),
    clicked: z.number().default(0),
    failed: z.number().default(0),
  }).optional()
});

export type GetMailgunStatsOutput = z.infer<typeof GetMailgunStatsOutputSchema>;

export async function getMailgunStats(): Promise<GetMailgunStatsOutput> {
  return getMailgunStatsFlow({});
}

const getMailgunStatsFlow = ai.defineFlow(
  {
    name: 'getMailgunStatsFlow',
    inputSchema: GetMailgunStatsInputSchema,
    outputSchema: GetMailgunStatsOutputSchema,
  },
  async () => {
    try {
      if (!mailgunApiKey || !mailgunDomain) {
        return { success: false, message: 'Mailgun API key or domain is missing from environment variables.' };
      }

      // Encode API key for Basic Auth
      const auth = Buffer.from(`api:${mailgunApiKey}`).toString('base64');
      
      // Fetch stats for all time (or you can pass start/end date params)
      // Using /stats/total to get aggregate counts
      const url = `https://api.mailgun.net/v3/${mailgunDomain}/stats/total?event=accepted&event=delivered&event=failed&event=opened&event=clicked`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Mailgun API Error:", response.status, errorText);
        return { success: false, message: `Mailgun API returned ${response.status}: ${errorText}` };
      }

      const data = await response.json() as any;

      // The API returns an array of stats objects under 'stats'. We sum them up if necessary, though /total usually returns one aggregate object if no resolution is specified.
      
      let accepted = 0;
      let delivered = 0;
      let opened = 0;
      let clicked = 0;
      let failed = 0;

      if (data.stats && Array.isArray(data.stats) && data.stats.length > 0) {
        // The /stats/total endpoint returns an array where each object has a 'time' and 'accepted', 'delivered', etc. objects
        const latestStats = data.stats[0]; 
        
        accepted = latestStats.accepted?.total || 0;
        delivered = latestStats.delivered?.total || 0;
        opened = latestStats.opened?.total || 0;
        clicked = latestStats.clicked?.total || 0;
        failed = latestStats.failed?.total || 0;
      }

      return {
        success: true,
        stats: {
          accepted,
          delivered,
          opened,
          clicked,
          failed
        }
      };

    } catch (error: any) {
      console.error('Error fetching Mailgun Stats:', error);
      return { success: false, message: error.message || 'An unexpected error occurred while fetching Mailgun statistics.' };
    }
  }
);
