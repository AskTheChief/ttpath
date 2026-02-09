'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();
const ADMIN_LEVEL = 6; // Mentor level

export const AddManualFaqInputSchema = z.object({
  idToken: z.string(),
  contributorName: z.string(),
  question: z.string(),
  answer: z.string(),
  imageUrl: z.string().url().optional(),
});
export type AddManualFaqInput = z.infer<typeof AddManualFaqInputSchema>;

export const AddManualFaqOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type AddManualFaqOutput = z.infer<typeof AddManualFaqOutputSchema>;

const addManualFaqFlow = ai.defineFlow(
  {
    name: 'addManualFaqFlow',
    inputSchema: AddManualFaqInputSchema,
    outputSchema: AddManualFaqOutputSchema,
  },
  async ({ idToken, contributorName, question, answer, imageUrl }) => {
    let mentorToken;
    try {
      mentorToken = await adminAuth.verifyIdToken(idToken);
      const mentorUserDoc = await db.collection('users').doc(mentorToken.uid).get();
      if (!mentorUserDoc.exists || (mentorUserDoc.data()?.currentUserLevel || 0) < ADMIN_LEVEL) {
        throw new Error('Permission denied. User is not a mentor.');
      }
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
      const newFeedback = {
        id: feedbackId,
        mentorId: mentorToken.uid,
        mentorName: mentorToken.name || 'A Mentor',
        feedbackContent: answer,
        createdAt: Timestamp.now(),
      };

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
