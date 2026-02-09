
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { EditJournalFeedbackInputSchema, EditJournalFeedbackOutputSchema, type EditJournalFeedbackInput, type EditJournalFeedbackOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();
const ADMIN_LEVEL = 6;

const editJournalFeedbackFlow = ai.defineFlow(
  {
    name: 'editJournalFeedbackFlow',
    inputSchema: EditJournalFeedbackInputSchema,
    outputSchema: EditJournalFeedbackOutputSchema,
  },
  async ({ idToken, entryId, feedbackId, newFeedbackContent, imageUrl, imageCredit }) => {
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

    let feedbackToEdit: any = null;
    const newFeedbackArray = feedbackArray.map((fb: any) => {
      if (fb.id === feedbackId) {
        feedbackToEdit = fb;

        const updatedFeedback: any = {
          id: fb.id,
          mentorId: fb.mentorId,
          mentorName: fb.mentorName,
          feedbackContent: newFeedbackContent,
          createdAt: fb.createdAt,
          updatedAt: Timestamp.now(),
          mentorLevel: fb.mentorLevel ?? 0,
        };

        if (imageUrl) {
          updatedFeedback.imageUrl = imageUrl;
          // Explicitly handle imageCredit, allowing an empty string to be saved to clear it.
          if (typeof imageCredit === 'string') {
            updatedFeedback.imageCredit = imageCredit;
          }
        }
        
        return updatedFeedback;
      }
      return fb;
    });


    if (!feedbackToEdit) {
      throw new Error('Feedback not found.');
    }

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userLevel = userDoc.data()?.currentUserLevel || 0;
    
    if (userLevel < ADMIN_LEVEL && feedbackToEdit.mentorId !== decodedToken.uid) {
      throw new Error('Permission denied. Only the author or a mentor can edit this feedback.');
    }

    await entryRef.update({
      feedback: newFeedbackArray,
    });
    
    return { success: true, message: 'Feedback updated successfully.' };
  }
);

export async function editJournalFeedback(input: EditJournalFeedbackInput): Promise<EditJournalFeedbackOutput> {
  return editJournalFeedbackFlow(input);
}
