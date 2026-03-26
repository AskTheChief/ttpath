'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnonymizeReportInputSchema = z.object({
  reportContent: z.string().describe('The original meeting report text containing personal information.'),
});
export type AnonymizeReportInput = z.infer<typeof AnonymizeReportInputSchema>;

const AnonymizeReportOutputSchema = z.object({
  anonymizedContent: z.string().describe('The report with all personal information removed.'),
});
export type AnonymizeReportOutput = z.infer<typeof AnonymizeReportOutputSchema>;

const anonymizePrompt = ai.definePrompt({
  name: 'anonymizeReportPrompt',
  input: { schema: AnonymizeReportInputSchema },
  output: { schema: AnonymizeReportOutputSchema },
  prompt: `You are a text anonymizer for Trading Tribe meeting reports. Your job is to remove all personally identifiable information (PII) while preserving the content, meaning, and emotional substance of the report.

REMOVE or replace:
- First names, last names, nicknames, initials
- Email addresses, phone numbers, physical addresses
- Company names, employer names, specific job titles that could identify someone
- Locations that could identify someone (specific cities/neighborhoods — general regions are OK)
- Any other details that could identify a specific individual

REPLACE names with generic labels like "a tribe member", "another member", "the chief", "a participant", etc. If multiple people are mentioned, use "Member A", "Member B", etc. to keep them distinct.

PRESERVE:
- The full substance and meaning of the report
- Emotional content, feelings, experiences described
- Trading Tribe terminology and process descriptions
- The structure and flow of the text
- General themes and lessons

Do NOT summarize. Do NOT shorten. Do NOT add commentary. Return the full report text with only PII replaced.

Original report:
{{reportContent}}`,
});

const anonymizeReportFlow = ai.defineFlow(
  {
    name: 'anonymizeReportFlow',
    inputSchema: AnonymizeReportInputSchema,
    outputSchema: AnonymizeReportOutputSchema,
  },
  async (input) => {
    const { output } = await anonymizePrompt({ reportContent: input.reportContent });
    return output!;
  }
);

export async function anonymizeReport(input: AnonymizeReportInput): Promise<AnonymizeReportOutput> {
  return anonymizeReportFlow(input);
}
