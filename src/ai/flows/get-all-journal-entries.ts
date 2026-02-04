
'use server';

/**
 * @fileOverview A Genkit flow for fetching all journal entries for the admin/mentor dashboard.
 */

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { GetAllJournalEntriesOutputSchema, type GetAllJournalEntriesOutput } from '@/lib/types';


if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

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

    // 1. Get all unique user IDs
    const userIds = [...new Set(entriesSnapshot.docs.map(doc => doc.data().userId))].filter(Boolean);

    // 2. Fetch all corresponding users in one go
    const usersMap = new Map<string, string>();
    if (userIds.length > 0) {
      // Note: Firestore 'in' queries are limited to 30 items. 
      // For a larger scale app, this would need to be chunked into multiple queries.
      const usersSnapshot = await db.collection('users').where('__name__', 'in', userIds).get();
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        usersMap.set(doc.id, name || 'Unknown User');
      });
    }
    
    // 3. Map entries and enrich with correct user name
    return entriesSnapshot.docs.map(doc => {
      const data = doc.data();
      const userName = usersMap.get(data.userId) || data.userName || 'Anonymous';
      
      return {
        id: doc.id,
        userId: data.userId,
        userName: userName, // Use the fetched name
        entryContent: data.entryContent,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
        feedback: (data.feedback || []).map((f: any) => ({
          ...f,
          createdAt: (f.createdAt as Timestamp).toDate().toISOString(),
          updatedAt: f.updatedAt ? (f.updatedAt as Timestamp).toDate().toISOString() : undefined,
        }))
      };
    }) as GetAllJournalEntriesOutput;
  }
);
export async function getAllJournalEntries(): Promise<GetAllJournalEntriesOutput> {
    return getAllJournalEntriesFlow();
}
