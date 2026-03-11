
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { DeleteJournalFeedbackInputSchema, DeleteJournalFeedbackOutputSchema, type DeleteJournalFeedbackInput, type DeleteJournalFeedbackOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();
const ADMIN_LEVEL = 6;

const deleteJournalFeedbackFlow = ai.defineFlow(
  {
    name: 'deleteJournalFeedbackFlow',
    inputSchema: DeleteJournalFeedbackInputSchema,
    outputSchema: DeleteJournalFeedbackOutputSchema,
  },
  async ({ idToken, entryId, feedbackId }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error: any) {
      console.error('Error verifying admin token:', error);
      throw new Error('User not authorized.');
    }

    const entryRef = db.collection('journal_entries').doc(entryId);
    const entryDoc = await entryRef.get();

    if (!entryDoc.exists) {
        throw new Error('Journal entry not found.');
    }

    const entryData = entryDoc.data()!;
    const feedbackArray = entryData.feedback || [];
    const feedbackToDelete = feedbackArray.find((fb: any) => fb.id === feedbackId);

    if (!feedbackToDelete) {
        throw new Error('Feedback not found.');
    }
    
    // Check permissions
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userLevel = userDoc.data()?.currentUserLevel || 0;
    if (userLevel < ADMIN_LEVEL && feedbackToDelete.mentorId !== decodedToken.uid) {
        throw new Error('Permission denied. Only the author or a mentor can delete this feedback.');
    }

    await entryRef.update({
      feedback: FieldValue.arrayRemove(feedbackToDelete),
    });
    
    return { success: true, message: 'Feedback deleted successfully.' };
  }
);

export async function deleteJournalFeedback(input: DeleteJournalFeedbackInput): Promise<DeleteJournalFeedbackOutput> {
  return deleteJournalFeedbackFlow(input);
}
