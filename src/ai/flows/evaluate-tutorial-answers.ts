
'use server';

/**
 * @fileOverview A Genkit flow for evaluating a user's tutorial answers.
 *
 * - evaluateTutorialAnswers - A function that takes a user's answers and returns an evaluation.
 * - EvaluateTutorialAnswersInput - The input type for the evaluateTutorialAnswers function.
 * - EvaluateTutorialAnswersOutput - The return type for the evaluateTutorialAnswers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as fs from 'fs';
import * as path from 'path';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();

const EvaluateTutorialAnswersInputSchema = z.object({
  answers: z.record(z.string()).describe("A dictionary of questions and the user's answers."),
});
export type EvaluateTutorialAnswersInput = z.infer<typeof EvaluateTutorialAnswersInputSchema>;

const EvaluateTutorialAnswersOutputSchema = z.object({
  passed: z.boolean().describe('Whether the user passed the evaluation.'),
  feedback: z.string().describe('Feedback for the user from The Chief.'),
});
export type EvaluateTutorialAnswersOutput = z.infer<typeof EvaluateTutorialAnswersOutputSchema>;

export async function evaluateTutorialAnswers(input: EvaluateTutorialAnswersInput): Promise<EvaluateTutorialAnswersOutput> {
  return evaluateTutorialAnswersFlow(input);
}

// Read the book content from the file system.
const bookPath = path.join(process.cwd(), 'public', 'the book', 'book.txt');
const bookContent = fs.readFileSync(bookPath, 'utf-8');

const prompt = ai.definePrompt({
  name: 'evaluateTutorialAnswersPrompt',
  input: {schema: EvaluateTutorialAnswersInputSchema},
  output: {schema: EvaluateTutorialAnswersOutputSchema},
  prompt: `You are The Chief from the Trading Tribe, and you are reviewing a potential new member's answers to the tutorial questions. Your role is to determine if the user shows a genuine willingness to learn and has made a serious effort to understand the material in the Source Book. They do not need to be perfect, but they need to demonstrate effort.

IMPORTANT: Structure all responses using SVOP-B sentence structure (Subject-Verb-Object, present tense only). Eliminate all "to be" verbs (is, are, was, were, being, been) and replace with action verbs. You may rephrase sentences like "John is smart" to "John scores higher than anyone else...". Suggest actions with "You might consider..." instead of direct commands.

Use the provided Source Book content to evaluate their answers.

---
SOURCE BOOK CONTENT:
${bookContent}
---

Here are the user's answers:
{{#each answers}}
Question: {{@key}}
Answer: {{this}}
---
{{/each}}

Review the user's answers. 

1.  **Determine Passage:** Decide if the user's answers, as a whole, demonstrate a serious attempt to engage with the material. Set the 'passed' field to true or false.
2.  **Provide Feedback:** Write constructive feedback for the user in the voice of The Chief.
    *   If they pass, congratulate them and offer a short piece of encouragement.
    *   If they fail, explain gently which areas they might need to review. Point them toward concepts in the book without giving them the direct answers. Encourage them to try again. Your feedback should help them learn.

Respond with the 'passed' and 'feedback' fields in the specified format.
`,
});

const evaluateTutorialAnswersFlow = ai.defineFlow(
  {
    name: 'evaluateTutorialAnswersFlow',
    inputSchema: EvaluateTutorialAnswersInputSchema,
    outputSchema: EvaluateTutorialAnswersOutputSchema,
  },
  async (input, context) => {
    const {output} = await prompt(input);
    const result = output!;

    // Save the feedback to Firestore
    const user = context?.auth;
    if (user && result) {
      try {
        await db.collection('tutorial_feedback').add({
          userId: user.uid,
          passed: result.passed,
          feedback: result.feedback,
          createdAt: new Date(),
        });
      } catch (error) {
        console.error('Error saving tutorial feedback:', error);
        // We don't want to fail the whole flow if this fails, just log it.
      }
    }

    return result;
  }
);
