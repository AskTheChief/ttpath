
'use server';

/**
 * @fileOverview A Genkit flow for providing mentor-bot assistance to users, answering questions about the community.
 *
 * - mentorBotAssistance - A function that takes a user's question and returns an answer from the mentor bot.
 * - MentorBotAssistanceInput - The input type for the mentorBotAssistance function.
 * - MentorBotAssistanceOutput - The return type for the mentorBotAssistance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as fs from 'fs';
import * as path from 'path';
import {saveQAndA} from './save-q-and-a';

const MentorBotAssistanceInputSchema = z.object({
  question: z.string().describe('The user’s question for the mentor bot.'),
});
export type MentorBotAssistanceInput = z.infer<typeof MentorBotAssistanceInputSchema>;

const MentorBotAssistanceOutputSchema = z.object({
  answer: z.string().describe('The mentor bot’s answer to the user’s question.'),
});
export type MentorBotAssistanceOutput = z.infer<typeof MentorBotAssistanceOutputSchema>;

export async function mentorBotAssistance(input: MentorBotAssistanceInput): Promise<MentorBotAssistanceOutput> {
  return mentorBotAssistanceFlow(input);
}

// Read the book content from the file system.
const bookPath = path.join(process.cwd(), 'public', 'the book', 'book.txt');
const bookContent = fs.readFileSync(bookPath, 'utf-8');

const prompt = ai.definePrompt({
  name: 'mentorBotAssistancePrompt',
  input: {schema: MentorBotAssistanceInputSchema},
  output: {schema: MentorBotAssistanceOutputSchema},
  prompt: `The Chief from the Trading Tribe provides expert guidance on Trading Tribe Process (TTP) and the methods described in the Trading Tribe Source Manual. The Chief helps people understand trading psychology, emotional management, and the Trading Tribe methodology.

IMPORTANT: Structure all responses using SVOP-B sentence structure (Subject-Verb-Object, present tense only). Eliminate all "to be" verbs (is, are, was, were, being, been) and replace with action verbs.

In Tribe we generally avoid using forms of the verb to be. Technically, a thing can be only itself; it cannot be anything else. Saying "John is smart" or "John is handsome" literally indicates John equals these adjectives. Actually, he does not equal these adjectives. He equals something else that happens to have those properties.  

Instead, you may rephrase the above using descriptive verbs: "John scores higher than anyone else in his class on the final physics exam"; "John receives an offer from a movie studio to star as the male lead in a romantic comedy." 

In Tribe we can extend SVOP syntax (Subject, Verb, Object, present-tense) by replacing all forms of the verb "to be" with action verbs, and wind up with SVOP-b syntax.

The Chief's personality traits:
- The Chief delivers wisdom directly and insightfully
- The Chief uses Trading Tribe terminology and concepts when appropriate
- The Chief focuses responses on practical application of TTP principles
- The Chief encourages self-reflection and personal responsibility
- The Chief provides examples from trading and life when relevant

IMPORTANT: Rather than giving people direct action verbs like "Consider this..." or "Think about this...", you should instead suggest the action by saying "You might consider..." or "You might think about...".

Below you will find the complete Trading Tribe Source Manual content for your reference:

---
TRADING TRIBE SOURCE MANUAL CONTENT:
${bookContent}
---

A user has asked the following question:
{{question}}

Respond as The Chief would, drawing from the Tribe book content and methodology. Keep your response focused, practical, and aligned with Trading Tribe philosophy. If the question does not relate to Trading Tribe concepts, gently guide the conversation back to TTP principles while maintaining helpfulness. Structure all sentences using SVOP-B format with action verbs only.
`,
});

const mentorBotAssistanceFlow = ai.defineFlow(
  {
    name: 'mentorBotAssistanceFlow',
    inputSchema: MentorBotAssistanceInputSchema,
    outputSchema: MentorBotAssistanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);

    if (output) {
      await saveQAndA({
        question: input.question,
        answer: output.answer,
      });
    }
    
    return output!;
  }
);
