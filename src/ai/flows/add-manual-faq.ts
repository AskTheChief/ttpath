'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { AddManualFaqInputSchema, AddManualFaqOutputSchema, type AddManualFaqInput, type AddManualFaqOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();
const ADMIN_LEVEL = 6; // Mentor level

const addManualFaqFlow = ai.defineFlow(
  {
    name: 'addManualFaqFlow',
    inputSchema: AddManualFaqInputSchema,
    outputSchema: AddManualFaqOutputSchema,
  },
  async ({ idToken, contributorName, question, answer, imageUrl, answerImageUrl, answerImageCredit }) => {
    let mentorToken;
    let mentorData;
    try {
      mentorToken = await adminAuth.verifyIdToken(idToken);
      const mentorUserDoc = await db.collection('users').doc(mentorToken.uid).get();
      if (!mentorUserDoc.exists || (mentorUserDoc.data()?.currentUserLevel || 0) < ADMIN_LEVEL) {
        throw new Error('Permission denied. User is not a mentor.');
      }
      mentorData = mentorUserDoc.data();
    } catch (error: any) {
      console.error('Error verifying mentor token:', error);
      return { success: false, message: 'User not authorized.' };
    }

    try {
      // 1. Create the Journal Entry (The Question)
      const entryRef = db.collection('journal_entries').doc();
      const entryData: any = {
        // We'll associate this with the mentor who created it, but display the contributor's name
        userId: mentorToken.uid,
        userName: contributorName,
        userLevel: 0, // Level 0 signifies a non-user contributor
        entryContent: question,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isManualEntry: true, // Flag to identify these entries
      };

      if (imageUrl) {
        entryData.imageUrl = imageUrl;
      }

      await entryRef.set(entryData);

      // 2. Add the Feedback (The Answer)
      const feedbackId = db.collection('journal_entries').doc().id;
      const newFeedback: any = {
        id: feedbackId,
        mentorId: mentorToken.uid,
        mentorName: mentorToken.name || 'A Mentor',
        mentorLevel: mentorData?.currentUserLevel || 0,
        feedbackContent: answer,
        createdAt: Timestamp.now(),
      };

      if (answerImageUrl) {
        newFeedback.imageUrl = answerImageUrl;
      }
      if (answerImageCredit) {
        newFeedback.imageCredit = answerImageCredit;
      }

      await entryRef.update({
        feedback: FieldValue.arrayUnion(newFeedback),
      });

      return { success: true, message: 'FAQ entry added successfully.' };
    } catch (error: any) {
      console.error('Error creating manual FAQ:', error);
      return { success: false, message: 'An unexpected error occurred.' };
    }
  }
);

export async function addManualFaq(input: AddManualFaqInput): Promise<AddManualFaqOutput> {
  return addManualFaqFlow(input);
}
