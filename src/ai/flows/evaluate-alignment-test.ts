
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as fs from 'fs';
import * as path from 'path';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();

const EvaluateAlignmentTestInputSchema = z.object({
  answers: z.record(z.string()).describe("A dictionary of questions and the user's answers."),
  idToken: z.string().describe("The user's Firebase ID token for authentication."),
});
export type EvaluateAlignmentTestInput = z.infer<typeof EvaluateAlignmentTestInputSchema>;

const EvaluateAlignmentTestOutputSchema = z.object({
  feedback: z.string().describe('Guidance for the user from The Chief based on their answers.'),
});
export type EvaluateAlignmentTestOutput = z.infer<typeof EvaluateAlignmentTestOutputSchema>;

export async function evaluateAlignmentTest(input: EvaluateAlignmentTestInput): Promise<EvaluateAlignmentTestOutput> {
  return evaluateAlignmentTestFlow(input);
}

const bookPath = path.join(process.cwd(), 'public', 'the book', 'book.txt');
const bookContent = fs.readFileSync(bookPath, 'utf-8');

const prompt = ai.definePrompt({
  name: 'evaluateAlignmentTestPrompt',
  input: { schema: z.object({ answers: EvaluateAlignmentTestInputSchema.shape.answers }) },
  output: { schema: EvaluateAlignmentTestOutputSchema },
  prompt: `You are The Chief from the Trading Tribe, and you are reviewing a potential new member's answers to the alignment test questions. Your role is to guide them toward deeper comprehension through supportive feedback. You do not judge or grade them; you only provide guidance to help them learn. The user determines for themselves when they are ready to proceed.

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

const evaluateAlignmentTestFlow = ai.defineFlow(
  {
    name: 'evaluateAlignmentTestFlow',
    inputSchema: EvaluateAlignmentTestInputSchema,
    outputSchema: EvaluateAlignmentTestOutputSchema,
  },
  async (input) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(input.idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new Error('User not authenticated. Invalid token.');
    }
    const user = { uid: decodedToken.uid };
    
    let retries = 3;
    let result: EvaluateAlignmentTestOutput | null = null;

    while (retries > 0) {
      try {
        const { output } = await prompt({ answers: input.answers });
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

    // Save feedback to the user's document.
    try {
      const userTutorialDocRef = db.collection('user_tutorials').doc(user.uid);
      await userTutorialDocRef.set({
        latestFeedback: {
          feedback: finalResult.feedback,
          createdAt: FieldValue.serverTimestamp(),
        }
      }, { merge: true });
    } catch (error) {
      // Log the error, but don't block the user from getting their feedback.
      console.error('Error saving alignment test feedback to user document:', error);
    }

    return finalResult;
  }
);
