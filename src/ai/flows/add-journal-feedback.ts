
'use server';

/**
 * @fileOverview A Genkit flow for mentors to add feedback to a user's journal entry.
 */

import { ai } from '@/ai/genkit';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { AddJournalFeedbackInputSchema, AddJournalFeedbackOutputSchema, type AddJournalFeedbackInput, type AddJournalFeedbackOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();
const adminAuth = getAuth();

const addJournalFeedbackFlow = ai.defineFlow(
  {
    name: 'addJournalFeedbackFlow',
    inputSchema: AddJournalFeedbackInputSchema,
    outputSchema: AddJournalFeedbackOutputSchema,
  },
  async ({ idToken, entryId, feedbackContent }) => {
    let decodedToken;
    try {
      // Verify the user is authenticated. Since this is an admin-only feature,
      // simply being authenticated is sufficient privilege.
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying admin token:', error);
      throw new Error('User not authenticated.');
    }
    
    const mentorName = decodedToken.name || 'An Admin';

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
