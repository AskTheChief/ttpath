
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { SubmitMeetingReportInputSchema, SubmitMeetingReportOutputSchema, type SubmitMeetingReportInput, type SubmitMeetingReportOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();
const adminAuth = getAuth();

const submitMeetingReportFlow = ai.defineFlow(
  {
    name: 'submitMeetingReportFlow',
    inputSchema: SubmitMeetingReportInputSchema,
    outputSchema: SubmitMeetingReportOutputSchema,
  },
  async ({ tribeId, meetingId, reportContent, idToken }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      return { success: false, message: 'User not authenticated. Invalid token.' };
    }
    const userId = decodedToken.uid;

    try {
      const reportRef = db.collection('meeting_reports').doc();
      await reportRef.set({
        tribeId,
        meetingId,
        reportContent,
        userId,
        submittedAt: Timestamp.now(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error submitting meeting report:', error);
      return { success: false, message: 'An unexpected error occurred while submitting the report.' };
    }
  }
);

export async function submitMeetingReport(input: SubmitMeetingReportInput): Promise<SubmitMeetingReportOutput> {
    return submitMeetingReportFlow(input);
}
