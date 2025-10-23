
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { GetMeetingReportsInputSchema, GetMeetingReportsOutputSchema, type GetMeetingReportsInput, type GetMeetingReportsOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();

const getMeetingReportsFlow = ai.defineFlow(
  {
    name: 'getMeetingReportsFlow',
    inputSchema: GetMeetingReportsInputSchema,
    outputSchema: GetMeetingReportsOutputSchema,
  },
  async ({ tribeId, idToken }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new Error('User not authenticated. Invalid token.');
    }
    const userId = decodedToken.uid;

    try {
      const reportsSnapshot = await db.collection('meeting_reports')
        .where('tribeId', '==', tribeId)
        .where('userId', '==', userId)
        .get();

      if (reportsSnapshot.empty) {
        return [];
      }

      const reports = reportsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          meetingId: data.meetingId,
          tribeId: data.tribeId,
          userId: data.userId,
          reportContent: data.reportContent,
          submittedAt: data.submittedAt.toDate().toISOString(),
        };
      });

      return reports;
    } catch (error) {
      console.error('Error fetching meeting reports:', error);
      throw new Error('An unexpected error occurred while fetching meeting reports.');
    }
  }
);


export async function getMeetingReports(input: GetMeetingReportsInput): Promise<GetMeetingReportsOutput> {
    return getMeetingReportsFlow(input);
}
