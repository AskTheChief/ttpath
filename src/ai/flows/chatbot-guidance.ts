'use server';

/**
 * @fileOverview A Genkit flow for providing chatbot guidance to users, answering questions about the platform.
 *
 * - chatbotGuidance - A function that takes a user's question and returns an answer from the chatbot.
 * - ChatbotGuidanceInput - The input type for the chatbotGuidance function.
 * - ChatbotGuidanceOutput - The return type for the chatbotGuidance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatbotGuidanceInputSchema = z.object({
  question: z.string().describe('The user’s question for the chatbot.'),
});
export type ChatbotGuidanceInput = z.infer<typeof ChatbotGuidanceInputSchema>;

const ChatbotGuidanceOutputSchema = z.object({
  answer: z.string().describe('The chatbot’s answer to the user’s question.'),
});
export type ChatbotGuidanceOutput = z.infer<typeof ChatbotGuidanceOutputSchema>;

export async function chatbotGuidance(input: ChatbotGuidanceInput): Promise<ChatbotGuidanceOutput> {
  return chatbotGuidanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatbotGuidancePrompt',
  input: {schema: ChatbotGuidanceInputSchema},
  output: {schema: ChatbotGuidanceOutputSchema},
  prompt: `You are a helpful chatbot named \"Chief\" for The Trading Tribe, a community focused on personal growth and trading.
  A user has asked the following question about the platform and how to advance:
  {{question}}
  Answer the question clearly and concisely, providing guidance and support to the user.
`,
});

const chatbotGuidanceFlow = ai.defineFlow(
  {
    name: 'chatbotGuidanceFlow',
    inputSchema: ChatbotGuidanceInputSchema,
    outputSchema: ChatbotGuidanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
