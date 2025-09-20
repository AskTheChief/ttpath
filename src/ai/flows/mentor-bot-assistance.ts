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

const MentorBotAssistanceInputSchema = z.object({
  question: z.string().describe('The user\u2019s question for the mentor bot.'),
});
export type MentorBotAssistanceInput = z.infer<typeof MentorBotAssistanceInputSchema>;

const MentorBotAssistanceOutputSchema = z.object({
  answer: z.string().describe('The mentor bot\u2019s answer to the user\u2019s question.'),
});
export type MentorBotAssistanceOutput = z.infer<typeof MentorBotAssistanceOutputSchema>;

export async function mentorBotAssistance(input: MentorBotAssistanceInput): Promise<MentorBotAssistanceOutput> {
  return mentorBotAssistanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'mentorBotAssistancePrompt',
  input: {schema: MentorBotAssistanceInputSchema},
  output: {schema: MentorBotAssistanceOutputSchema},
  prompt: `You are a helpful mentor bot named "Chief" for The Trading Tribe, a community focused on personal growth and trading.
  A user has asked the following question:
  {{question}}
  Answer the question clearly and concisely, providing guidance and support to the user.
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
    return output!;
  }
);
