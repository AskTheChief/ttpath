
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
      const tribeRef = db.collection('tribes').doc(tribeId);
      const tribeDoc = await tribeRef.get();
      if (!tribeDoc.exists || !(tribeDoc.data()?.members || []).includes(userId)) {
          throw new Error("You are not a member of this tribe and cannot view its reports.");
      }

      const reportsSnapshot = await db.collection('meeting_reports')
        .where('tribeId', '==', tribeId)
        .orderBy('submittedAt', 'desc')
        .get();

      if (reportsSnapshot.empty) {
        return [];
      }
      
      const userIds = [...new Set(reportsSnapshot.docs.map(doc => doc.data().userId))];
      const usersMap = new Map<string, string>();
      
      // Fetch users one by one to avoid query limits
      for (const uid of userIds) {
        try {
          const userDoc = await db.collection('users').doc(uid).get();
          if (userDoc.exists) {
            const data = userDoc.data();
            usersMap.set(uid, `${data.firstName || ''} ${data.lastName || ''}`.trim());
          }
        } catch (userError) {
          console.error(`Failed to fetch user document for UID: ${uid}`, userError);
          // Continue even if one user lookup fails
        }
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
