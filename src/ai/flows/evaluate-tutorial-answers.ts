
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
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
  feedback: z.string().describe('Guidance for the user from The Chief based on their answers.'),
});
export type EvaluateTutorialAnswersOutput = z.infer<typeof EvaluateTutorialAnswersOutputSchema>;

export async function evaluateTutorialAnswers(input: EvaluateTutorialAnswersInput): Promise<EvaluateTutorialAnswersOutput> {
  return evaluateTutorialAnswersFlow(input);
}

const bookPath = path.join(process.cwd(), 'public', 'the book', 'book.txt');
const bookContent = fs.readFileSync(bookPath, 'utf-8');

const prompt = ai.definePrompt({
  name: 'evaluateTutorialAnswersPrompt',
  input: { schema: EvaluateTutorialAnswersInputSchema },
  output: { schema: EvaluateTutorialAnswersOutputSchema },
  prompt: `You are The Chief from the Trading Tribe, and you are reviewing a potential new member's answers to the tutorial questions. Your role is to guide them toward deeper comprehension through supportive feedback. You do not judge or grade them; you only provide guidance to help them learn. The user determines for themselves when they are ready to proceed.

IMPORTANT: Structure all responses using SVOP-B sentence structure (Subject-Verb-Object, present tense only). Eliminate all "to be" verbs (is, are, was, were, being, been) and replace with action verbs. You may rephrase sentences like "John is smart" to "John scores higher than anyone else...". Suggest actions with "You might consider..." instead of direct commands.

Use the provided Source Book content to review their answers.

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

Review the user's answers and provide constructive, supportive feedback in the voice of The Chief. View blank or incomplete answers not as failures, but as opportunities for guidance. For each area, especially blanks, gently point them toward the relevant concepts in the book, encouraging them to reflect and learn. Frame all feedback as the next step in their learning journey.

Respond with only the 'feedback' field in the specified format.
`,
});

const evaluateTutorialAnswersFlow = ai.defineFlow(
  {
    name: 'evaluateTutorialAnswersFlow',
    inputSchema: EvaluateTutorialAnswersInputSchema,
    outputSchema: EvaluateTutorialAnswersOutputSchema,
  },
  async (input, _, context) => {
    const user = context?.auth;
    
    let retries = 3;
    let result: EvaluateTutorialAnswersOutput | null = null;

    while (retries > 0) {
      try {
        const { output } = await prompt(input);
        result = output;
        break; 
      } catch (error: any) {
        console.error(`Attempt failed: ${error.message}`);
        retries--;
        if (retries === 0) {
          throw new Error("The Chief is currently unavailable after multiple attempts. Please try again later.");
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
      }
    }
    
    if (!result) {
        throw new Error("Failed to get a response from the AI model.");
    }

    const finalResult = result!;

    // Only save feedback if the user is authenticated.
    if (user) {
      try {
        await db.collection('tutorial_feedback').add({
          userId: user.uid,
          feedback: finalResult.feedback,
          createdAt: new Date(),
        });
      } catch (error) {
        // Log the error, but don't block the user from getting their feedback.
        console.error('Error saving tutorial feedback:', error);
      }
    }

    return finalResult;
  }
);

