
'use server';

/**
 * @fileOverview A Genkit flow for fetching all journal entries for the admin/mentor dashboard.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { JournalEntrySchema } from '@/lib/types';


if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();

export const GetAllJournalEntriesOutputSchema = z.array(JournalEntrySchema);
export type GetAllJournalEntriesOutput = z.infer<typeof GetAllJournalEntriesOutputSchema>;

const getAllJournalEntriesFlow = ai.defineFlow(
  {
    name: 'getAllJournalEntriesFlow',
    outputSchema: GetAllJournalEntriesOutputSchema,
  },
  async () => {
    const snapshot = await db.collection('journal_entries')
      .orderBy('createdAt', 'desc')
      .get();
      
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        entryContent: data.entryContent,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
        feedback: (data.feedback || []).map((f: any) => ({
          ...f,
          createdAt: (f.createdAt as Timestamp).toDate().toISOString(),
        }))
      };
    }) as GetAllJournalEntriesOutput;
  }
);
export async function getAllJournalEntries(): Promise<GetAllJournalEntriesOutput> {
    return getAllJournalEntriesFlow();
}
