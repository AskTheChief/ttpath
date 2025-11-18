
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { GetMeetingReportsInputSchema, GetMeetingReportsOutputSchema, type GetMeetingReportsInput, type GetMeetingReportsOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
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
      // Fetch the requesting user's profile to check their level
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userLevel = userDoc.exists ? userDoc.data()?.currentUserLevel || 1 : 1;

      const tribeRef = db.collection('tribes').doc(tribeId);
      const tribeDoc = await tribeRef.get();
      if (!tribeDoc.exists) {
          throw new Error("Tribe not found.");
      }
      
      const tribeData = tribeDoc.data()!;

      // Security Check: User must be a member of the tribe OR a mentor (level 6+)
      if (userLevel < 6) {
        if (!(tribeData.members || []).includes(userId)) {
            throw new Error("You are not a member of this tribe and cannot view its reports.");
        }
      }

      const reportsSnapshot = await db.collection('meeting_reports')
        .where('tribeId', '==', tribeId)
        .get();

      if (reportsSnapshot.empty) {
        return [];
      }
      
      const userIds = [...new Set(reportsSnapshot.docs.map(doc => doc.data().userId))];
      const usersMap = new Map<string, string>();
      
      if (userIds.length > 0) {
        const usersSnapshot = await db.collection('users').where('__name__', 'in', userIds).get();
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            usersMap.set(doc.id, `${data.firstName || ''} ${data.lastName || ''}`.trim());
        });
      }
      
      const reports = reportsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          meetingId: data.meetingId,
          tribeId: data.tribeId,
          userId: data.userId,
          userName: usersMap.get(data.userId) || 'Unknown User',
          reportContent: data.reportContent,
          submittedAt: data.submittedAt.toDate().toISOString(),
        };
      });

      // Sort reports in code to avoid needing a composite index
      reports.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

      return reports;
    } catch (error: any) {
      console.error('Error fetching meeting reports:', error);
      throw new Error(error.message || 'An unexpected error occurred while fetching meeting reports.');
    }
  }
);


export async function getMeetingReports(input: GetMeetingReportsInput): Promise<GetMeetingReportsOutput> {
    return getMeetingReportsFlow(input);
}
