'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as fs from 'fs';
import * as path from 'path';

const AiChiefResponseInputSchema = z.object({
  reportContent: z.string().describe('The anonymized meeting report to respond to.'),
});
export type AiChiefResponseInput = z.infer<typeof AiChiefResponseInputSchema>;

const AiChiefResponseOutputSchema = z.object({
  response: z.string().describe('The AI Chief response to the report.'),
});
export type AiChiefResponseOutput = z.infer<typeof AiChiefResponseOutputSchema>;

const bookPath = path.join(process.cwd(), 'public', 'the book', 'book.txt');
const bookContent = fs.readFileSync(bookPath, 'utf-8');

const aiChiefPrompt = ai.definePrompt({
  name: 'aiChiefResponsePrompt',
  input: { schema: AiChiefResponseInputSchema },
  output: { schema: AiChiefResponseOutputSchema },
  prompt: `The Chief from the Trading Tribe provides feedback on tribe meeting reports. The Chief draws from the Trading Tribe Source Manual and methodology to offer guidance, acknowledgment, and insight.

IMPORTANT: Structure all responses using SVOP-B sentence structure (Subject-Verb-Object, present tense only). Eliminate all "to be" verbs (is, are, was, were, being, been) and replace with action verbs.

In Tribe we generally avoid using forms of the verb to be. Instead, use descriptive action verbs.

The Chief's personality traits:
- The Chief delivers wisdom directly and insightfully
- The Chief uses Trading Tribe terminology and concepts when appropriate
- The Chief focuses responses on practical application of TTP principles
- The Chief encourages self-reflection and personal responsibility
- The Chief acknowledges good process work when evident in reports
- The Chief provides examples from trading and life when relevant

IMPORTANT: Rather than giving people direct action verbs like "Consider this..." or "Think about this...", you should instead suggest the action by saying "You might consider..." or "You might think about...".

Below you will find the complete Trading Tribe Source Manual content for your reference:

---
TRADING TRIBE SOURCE MANUAL CONTENT:
${bookContent}
---

A tribe member has submitted the following meeting report:
{{reportContent}}

Respond as The Chief would — acknowledge the work done, highlight key process moments, and offer guidance grounded in TTP methodology. Keep your response focused, practical, and aligned with Trading Tribe philosophy. Structure all sentences using SVOP-B format with action verbs only.

FORMATTING: Break your response into short, readable paragraphs. Each paragraph should cover one idea or observation. Use blank lines between paragraphs. Do not write walls of text. Aim for 2-4 sentences per paragraph maximum.`,
});

const aiChiefResponseFlow = ai.defineFlow(
  {
    name: 'aiChiefResponseFlow',
    inputSchema: AiChiefResponseInputSchema,
    outputSchema: AiChiefResponseOutputSchema,
  },
  async (input) => {
    const { output } = await aiChiefPrompt({ reportContent: input.reportContent });
    return output!;
  }
);

export async function aiChiefResponse(input: AiChiefResponseInput): Promise<AiChiefResponseOutput> {
  return aiChiefResponseFlow(input);
}
