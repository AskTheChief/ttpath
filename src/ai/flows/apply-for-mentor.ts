
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { ApplyForMentorInputSchema, ApplyForMentorOutputSchema, type ApplyForMentorInput, type ApplyForMentorOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();

export async function applyForMentor(input: ApplyForMentorInput): Promise<ApplyForMentorOutput> {
    return applyForMentorFlow(input);
}

const applyForMentorFlow = ai.defineFlow(
  {
    name: 'applyForMentorFlow',
    inputSchema: ApplyForMentorInputSchema,
    outputSchema: ApplyForMentorOutputSchema,
  },
  async ({ idToken }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      return { success: false, message: 'Authentication failed.' };
    }

    const applicantId = decodedToken.uid;

    // Check if user is a chief
    const userDoc = await db.collection('users').doc(applicantId).get();
    if (!userDoc.exists() || (userDoc.data()?.currentUserLevel || 0) < 5) {
        return { success: false, message: 'Only Tribe Chiefs can apply to be a mentor.' };
    }

    // Check for existing pending application
    const existingAppQuery = await db.collection('tribe_applications')
        .where('applicantId', '==', applicantId)
        .where('type', '==', 'new_mentor')
        .where('status', '==', 'pending')
        .limit(1)
        .get();

    if (!existingAppQuery.empty) {
        return { success: false, message: 'You already have a pending mentor application.' };
    }

    try {
      const userTutorialDoc = await db.collection('user_tutorials').doc(applicantId).get();
      const answers = userTutorialDoc.exists ? userTutorialDoc.data()?.answers || {} : {};

      const applicationRef = db.collection('tribe_applications').doc();
      await applicationRef.set({
        type: 'new_mentor',
        applicantId: applicantId,
        answers: answers,
        status: 'pending',
        createdAt: Timestamp.now(),
      });

      return { success: true, message: 'Your application to become a mentor has been submitted.' };
    } catch (error: any) {
      console.error('Error creating mentor application:', error);
      return { success: false, message: error.message || 'An error occurred while submitting your application.' };
    }
  }
);
