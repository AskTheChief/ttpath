
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
    
    // 3. Map entries and enrich with user name, and repair data if needed.
    const allEntries = await Promise.all(entriesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        let needsUpdate = false;
        
        // This is the read-repair logic for feedback without IDs
        const feedbackWithIds = (data.feedback || []).map((f: any) => {
            if (f.id) {
                return f;
            }
            needsUpdate = true;
            return {
                ...f,
                id: db.collection('journal_entries').doc().id, // Give it a real, unique ID
            };
        });

        if (needsUpdate) {
            try {
                await doc.ref.update({ feedback: feedbackWithIds });
            } catch (e) {
                console.error(`Failed to repair feedback IDs for entry ${doc.id}`, e);
                // Continue even if repair fails for some reason
            }
        }
        
        const finalFeedback = (needsUpdate ? feedbackWithIds : (data.feedback || [])).map((f: any) => {
            const createdAt = f.createdAt;
            const updatedAt = f.updatedAt;
            return {
                id: f.id, // This is now guaranteed to exist
                mentorId: f.mentorId,
                mentorName: f.mentorName,
                feedbackContent: f.feedbackContent,
                createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : (createdAt || new Date().toISOString()),
                updatedAt: updatedAt?.toDate ? updatedAt.toDate().toISOString() : undefined,
            };
        });

        const userName = usersMap.get(data.userId) || data.userName || 'Anonymous';
        return {
            id: doc.id,
            userId: data.userId,
            userName: userName,
            entryContent: data.entryContent,
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
            feedback: finalFeedback,
            imageUrl: data.imageUrl,
            isManualEntry: data.isManualEntry,
        };
    }));

    return allEntries as GetAllJournalEntriesOutput;
  }
);
export async function getAllJournalEntries(): Promise<GetAllJournalEntriesOutput> {
    return getAllJournalEntriesFlow();
}
