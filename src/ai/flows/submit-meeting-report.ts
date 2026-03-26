
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { SubmitMeetingReportInputSchema, SubmitMeetingReportOutputSchema, type SubmitMeetingReportInput, type SubmitMeetingReportOutput } from '@/lib/types';
import { anonymizeReport } from './anonymize-report';
import { aiChiefResponse } from './ai-chief-response';

if (!getApps().length) {
  initializeApp();
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
      const submittedAt = Timestamp.now();
      await reportRef.set({
        tribeId,
        meetingId,
        reportContent,
        userId,
        submittedAt,
      });

      // Anonymize and post to forum (fire-and-forget — don't block the user)
      (async () => {
        try {
          const { anonymizedContent } = await anonymizeReport({ reportContent });
          const { response: chiefResponse } = await aiChiefResponse({ reportContent: anonymizedContent });

          const entryRef = db.collection('journal_entries').doc();
          await entryRef.set({
            userId: 'anonymized-tribe-member',
            userName: 'Tribe Member',
            userLevel: 4,
            entryContent: anonymizedContent,
            subject: 'Tribe Meeting Report',
            recipient: 'Forum',
            isAnonymizedReport: true,
            sourceReportId: reportRef.id,
            sourceTribeId: tribeId,
            createdAt: submittedAt,
            updatedAt: Timestamp.now(),
            feedback: [{
              id: db.collection('journal_entries').doc().id,
              mentorId: 'ai-chief',
              mentorName: 'AI Chief',
              mentorLevel: 7,
              feedbackContent: chiefResponse,
              createdAt: Timestamp.now(),
            }],
          });

          await db.collection('processed_reports').doc(reportRef.id).set({
            processedAt: Timestamp.now(),
            journalEntryId: entryRef.id,
          });

          console.log(`Report ${reportRef.id} anonymized and posted to forum as ${entryRef.id}`);
        } catch (err) {
          console.error(`Failed to anonymize/post report ${reportRef.id}:`, err);
        }
      })();

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
