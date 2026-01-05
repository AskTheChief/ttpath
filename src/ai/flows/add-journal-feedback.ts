
'use server';

/**
 * @fileOverview A Genkit flow for mentors to add feedback to a user's journal entry.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();
const adminAuth = getAuth();

export const AddJournalFeedbackInputSchema = z.object({
  idToken: z.string(),
  entryId: z.string(),
  feedbackContent: z.string(),
});
export type AddJournalFeedbackInput = z.infer<typeof AddJournalFeedbackInputSchema>;

export const AddJournalFeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type AddJournalFeedbackOutput = z.infer<typeof AddJournalFeedbackOutputSchema>;

const addJournalFeedbackFlow = ai.defineFlow(
  {
    name: 'addJournalFeedbackFlow',
    inputSchema: AddJournalFeedbackInputSchema,
    outputSchema: AddJournalFeedbackOutputSchema,
  },
  async ({ idToken, entryId, feedbackContent }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
      const userRecord = await adminAuth.getUser(decodedToken.uid);
      const userLevel = userRecord.customClaims?.level || 0;
      if (userLevel < 6) { // Only Mentors can add feedback
        throw new Error('You do not have permission to add feedback.');
      }
    } catch (error) {
      console.error('Error verifying mentor token:', error);
      throw new Error('User not authenticated or does not have mentor privileges.');
    }
    
    const mentorName = decodedToken.name || 'A Mentor';

    const entryRef = db.collection('journal_entries').doc(entryId);

    await entryRef.update({
      feedback: FieldValue.arrayUnion({
        mentorId: decodedToken.uid,
        mentorName: mentorName,
        feedbackContent: feedbackContent,
        createdAt: Timestamp.now(),
      })
    });
    
    return { success: true, message: 'Feedback added successfully.' };
  }
);

export async function addJournalFeedback(input: AddJournalFeedbackInput): Promise<AddJournalFeedbackOutput> {
  return addJournalFeedbackFlow(input);
}
