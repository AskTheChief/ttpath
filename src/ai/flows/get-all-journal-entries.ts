'use server';

/**
 * @fileOverview A Genkit flow for fetching all journal entries for the admin/mentor dashboard.
 */

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { GetAllJournalEntriesOutputSchema, type GetAllJournalEntriesOutput, type JournalEntry, type JournalFeedback } from '@/lib/types';


if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

// Helper function to safely convert various date formats to an ISO string
const safeToISOString = (dateInput: any): string | undefined => {
    if (!dateInput) return undefined;
    try {
        if (dateInput.toDate) return dateInput.toDate().toISOString(); // Firestore Timestamp
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) return date.toISOString();
    } catch (e) {
        return undefined;
    }
    return undefined;
};


const getAllJournalEntriesFlow = ai.defineFlow(
  {
    name: 'getAllJournalEntriesFlow',
    outputSchema: GetAllJournalEntriesOutputSchema,
  },
  async () => {
    const entriesSnapshot = await db.collection('journal_entries')
      .orderBy('createdAt', 'desc')
      .get();
      
    if (entriesSnapshot.empty) {
      return [];
    }

    const userIds = [...new Set(entriesSnapshot.docs.map(doc => doc.data()?.userId).filter(Boolean))];

    const usersMap = new Map<string, { name: string, level: number }>();
    if (userIds.length > 0) {
      const usersSnapshot = await db.collection('users').where('__name__', 'in', userIds).get();
      usersSnapshot.forEach(doc => {
        const userData = doc.data() || {};
        const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown User';
        const level = typeof userData.currentUserLevel === 'number' ? userData.currentUserLevel : 1;
        usersMap.set(doc.id, { name, level });
      });
    }
    
    const allEntries: JournalEntry[] = [];

    for (const doc of entriesSnapshot.docs) {
        const data = doc.data() || {};
        const docId = doc.id;

        const createdAt = safeToISOString(data.createdAt);
        if (!createdAt) {
            console.warn(`Skipping entry ${docId} due to missing or invalid 'createdAt' field.`);
            continue;
        }

        const feedbackArray: JournalFeedback[] = (Array.isArray(data.feedback) ? data.feedback : [])
            .map((f: any) => {
                if (!f || typeof f !== 'object') return null;

                const feedbackCreatedAt = safeToISOString(f.createdAt);
                if (!f.id || !f.feedbackContent || !feedbackCreatedAt) {
                    console.warn(`Skipping invalid feedback object in entry ${docId}.`);
                    return null;
                }

                return {
                    id: String(f.id),
                    mentorId: String(f.mentorId || ''),
                    mentorName: String(f.mentorName || 'A Mentor'),
                    mentorLevel: typeof f.mentorLevel === 'number' ? f.mentorLevel : undefined,
                    feedbackContent: String(f.feedbackContent),
                    createdAt: feedbackCreatedAt,
                    updatedAt: safeToISOString(f.updatedAt),
                    imageUrl: typeof f.imageUrl === 'string' && f.imageUrl.startsWith('http') ? f.imageUrl : undefined,
                    imageCredit: typeof f.imageCredit === 'string' ? f.imageCredit : undefined,
                    caption: typeof f.caption === 'string' ? f.caption : undefined,
                };
            })
            .filter((f): f is JournalFeedback => f !== null);

        const isManual = data.isManualEntry === true;
        const userId = String(data.userId || '');
        const userData = usersMap.get(userId);
        const userName = isManual ? String(data.userName || 'Contributor') : (userData?.name || String(data.userName || 'Anonymous'));
        const userLevel = isManual ? 0 : (userData?.level ?? (typeof data.userLevel === 'number' ? data.userLevel : 1));

        allEntries.push({
            id: docId,
            userId,
            userName,
            userLevel: typeof userLevel === 'number' ? userLevel : undefined,
            subject: typeof data.subject === 'string' ? data.subject : undefined,
            entryContent: String(data.entryContent || ''),
            createdAt: createdAt,
            updatedAt: safeToISOString(data.updatedAt),
            feedback: feedbackArray.length > 0 ? feedbackArray : undefined,
            imageUrl: typeof data.imageUrl === 'string' && data.imageUrl.startsWith('http') ? data.imageUrl : undefined,
            isManualEntry: isManual,
            isAnonymizedReport: data.isAnonymizedReport === true ? true : undefined,
            caption: typeof data.caption === 'string' ? data.caption : undefined,
            recipient: typeof data.recipient === 'string' ? data.recipient : undefined,
        });
    }

    return allEntries;
  }
);
export async function getAllJournalEntries(): Promise<GetAllJournalEntriesOutput> {
    return getAllJournalEntriesFlow();
}
