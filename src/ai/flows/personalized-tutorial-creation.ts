'use server';

/**
 * @fileOverview Generates a personalized tutorial based on the user's level of understanding.
 *
 * - generatePersonalizedTutorial - A function that generates the personalized tutorial.
 * - PersonalizedTutorialInput - The input type for the generatePersonalizedTutorial function.
 * - PersonalizedTutorialOutput - The return type for the generatePersonalizedTutorial function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedTutorialInputSchema = z.object({
  topic: z.string().describe('The topic of the tutorial.'),
  understandingLevel: z
    .string()
    .describe(
      'The user provided level of understanding of the tutorial topic.  Should be a short sentence.'
    ),
  userNeed: z.string().describe('A specific need or goal the user has regarding the topic.'),
});
export type PersonalizedTutorialInput = z.infer<typeof PersonalizedTutorialInputSchema>;

const PersonalizedTutorialOutputSchema = z.object({
  tutorialContent: z.string().describe('The personalized tutorial content.'),
});
export type PersonalizedTutorialOutput = z.infer<typeof PersonalizedTutorialOutputSchema>;

export async function generatePersonalizedTutorial(
  input: PersonalizedTutorialInput
): Promise<PersonalizedTutorialOutput> {
  return personalizedTutorialFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedTutorialPrompt',
  input: {schema: PersonalizedTutorialInputSchema},
  output: {schema: PersonalizedTutorialOutputSchema},
  prompt: `You are an expert tutor, skilled at creating personalized tutorials.

  Based on the user's current level of understanding and specific needs, create a tutorial on the given topic.  Tailor the tutorial to focus on how the user can achieve their stated need.

  Topic: {{{topic}}}
  User's Level of Understanding: {{{understandingLevel}}}
  User's Need: {{{userNeed}}}

  Tutorial:`,
});

const personalizedTutorialFlow = ai.defineFlow(
  {
    name: 'personalizedTutorialFlow',
    inputSchema: PersonalizedTutorialInputSchema,
    outputSchema: PersonalizedTutorialOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
