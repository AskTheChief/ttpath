'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { anonymizeReport } from './anonymize-report';
import { aiChiefResponse } from './ai-chief-response';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const ProcessReportsOutputSchema = z.object({
  processed: z.number().describe('Number of reports processed.'),
  skipped: z.number().describe('Number of reports already processed.'),
  errors: z.number().describe('Number of reports that failed.'),
});
export type ProcessReportsOutput = z.infer<typeof ProcessReportsOutputSchema>;

const processReportsToForumFlow = ai.defineFlow(
  {
    name: 'processReportsToForumFlow',
    outputSchema: ProcessReportsOutputSchema,
  },
  async () => {
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    try {
      // Fetch all meeting reports
      const reportsSnapshot = await db.collection('meeting_reports')
        .orderBy('submittedAt', 'desc')
        .get();

      if (reportsSnapshot.empty) {
        return { processed: 0, skipped: 0, errors: 0 };
      }

      // Check which reports have already been processed
      const processedSnapshot = await db.collection('processed_reports').get();
      const processedIds = new Set(processedSnapshot.docs.map(doc => doc.id));

      for (const reportDoc of reportsSnapshot.docs) {
        // Skip already processed reports
        if (processedIds.has(reportDoc.id)) {
          skipped++;
          continue;
        }

        const reportData = reportDoc.data();
        const reportContent = reportData.reportContent;

        if (!reportContent || reportContent.trim().length === 0) {
          skipped++;
          continue;
        }

        try {
          // Step 1: Anonymize the report
          const { anonymizedContent } = await anonymizeReport({ reportContent });

          // Step 2: Generate AI Chief response
          const { response: chiefResponse } = await aiChiefResponse({ reportContent: anonymizedContent });

          // Step 3: Create a journal entry (forum post) with the anonymized content
          const entryRef = db.collection('journal_entries').doc();
          await entryRef.set({
            userId: 'anonymized-tribe-member',
            userName: 'Tribe Member',
            userLevel: 4, // Tribe Member level
            entryContent: anonymizedContent,
            subject: 'Tribe Meeting Report',
            recipient: 'Forum',
            isAnonymizedReport: true,
            sourceReportId: reportDoc.id,
            sourceTribeId: reportData.tribeId || null,
            createdAt: reportData.submittedAt || Timestamp.now(),
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

          // Step 4: Mark this report as processed
          await db.collection('processed_reports').doc(reportDoc.id).set({
            processedAt: Timestamp.now(),
            journalEntryId: entryRef.id,
          });

          processed++;
        } catch (err) {
          console.error(`Error processing report ${reportDoc.id}:`, err);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error in processReportsToForum:', error);
      throw new Error('Failed to process reports.');
    }

    return { processed, skipped, errors };
  }
);

export async function processReportsToForum(): Promise<ProcessReportsOutput> {
  return processReportsToForumFlow();
}
