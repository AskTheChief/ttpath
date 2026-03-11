
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
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();
const ADMIN_LEVEL = 6;

const addJournalFeedbackFlow = ai.defineFlow(
  {
    name: 'addJournalFeedbackFlow',
    inputSchema: AddJournalFeedbackInputSchema,
    outputSchema: AddJournalFeedbackOutputSchema,
  },
  async ({ idToken, entryId, feedbackContent, imageUrl, imageCredit, caption }) => {
    let decodedToken;
    let mentorDoc;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
      mentorDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (!mentorDoc.exists || Number(mentorDoc.data()?.currentUserLevel || 0) < ADMIN_LEVEL) {
        throw new Error('Permission denied. User is not an admin.');
      }
    } catch (error: any) {
      console.error('Error verifying admin token:', error);
      throw new Error('User not authorized.');
    }
    
    const mentorName = decodedToken.name || 'An Admin';

    const entryRef = db.collection('journal_entries').doc(entryId);
    
    const feedbackId = db.collection('journal_entries').doc().id;

    const newFeedback: any = {
      id: feedbackId,
      mentorId: decodedToken.uid,
      mentorName: mentorName,
      mentorLevel: Number(mentorDoc.data()?.currentUserLevel || 0),
      feedbackContent: feedbackContent,
      createdAt: Timestamp.now(),
    };

    if (imageUrl) newFeedback.imageUrl = imageUrl;
    if (imageCredit) newFeedback.imageCredit = imageCredit;
    if (caption) newFeedback.caption = caption;


    await entryRef.update({
      feedback: FieldValue.arrayUnion(newFeedback)
    });
    
    return { success: true, message: 'Feedback added successfully.' };
  }
);

export async function addJournalFeedback(input: AddJournalFeedbackInput): Promise<AddJournalFeedbackOutput> {
  return addJournalFeedbackFlow(input);
}
