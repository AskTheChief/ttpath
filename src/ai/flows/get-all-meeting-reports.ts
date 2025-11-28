
'use server';

/**
 * @fileOverview A Genkit flow for fetching all meeting reports from all tribes.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();
const adminAuth = getAuth();

const AdminMeetingReportSchema = z.object({
  id: z.string(),
  reportContent: z.string(),
  submittedAt: z.string(),
  userId: z.string(),
  userName: z.string(),
  tribeId: z.string(),
  tribeName: z.string(),
});
export type AdminMeetingReport = z.infer<typeof AdminMeetingReportSchema>;

const GetAllMeetingReportsOutputSchema = z.array(AdminMeetingReportSchema);
export type GetAllMeetingReportsOutput = z.infer<typeof GetAllMeetingReportsOutputSchema>;


const getAllMeetingReportsFlow = ai.defineFlow(
  {
    name: 'getAllMeetingReportsFlow',
    outputSchema: GetAllMeetingReportsOutputSchema,
  },
  async () => {
    try {
      const reportsSnapshot = await db.collection('meeting_reports').orderBy('submittedAt', 'desc').get();
      if (reportsSnapshot.empty) {
        return [];
      }

      // Batch fetch users and tribes to optimize reads
      const userIds = [...new Set(reportsSnapshot.docs.map(doc => doc.data().userId))];
      const tribeIds = [...new Set(reportsSnapshot.docs.map(doc => doc.data().tribeId))];

      const usersPromise = db.collection('users').where('__name__', 'in', userIds).get();
      const tribesPromise = db.collection('tribes').where('__name__', 'in', tribeIds).get();
      
      const [usersSnapshot, tribesSnapshot] = await Promise.all([usersPromise, tribesPromise]);

      const usersMap = new Map<string, string>();
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        usersMap.set(doc.id, `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown User');
      });

      const tribesMap = new Map<string, string>();
      tribesSnapshot.forEach(doc => {
        tribesMap.set(doc.id, doc.data().name || 'Unknown Tribe');
      });
      
      const reports = reportsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          reportContent: data.reportContent,
          submittedAt: (data.submittedAt as Timestamp).toDate().toISOString(),
          userId: data.userId,
          userName: usersMap.get(data.userId) || 'Unknown User',
          tribeId: data.tribeId,
          tribeName: tribesMap.get(data.tribeId) || 'Unknown Tribe',
        };
      });
      
      return reports;
    } catch (error) {
      console.error('Error fetching all meeting reports:', error);
      throw new Error('An unexpected error occurred while fetching reports.');
    }
  }
);


export async function getAllMeetingReports(): Promise<GetAllMeetingReportsOutput> {
    return getAllMeetingReportsFlow();
}
