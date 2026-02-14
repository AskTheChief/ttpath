
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

// Helper function to safely convert various date formats to an ISO string
const safeToISOString = (dateInput: any): string => {
    if (!dateInput) return new Date().toISOString(); // Default to now if missing
    if (dateInput.toDate) return dateInput.toDate().toISOString(); // Firestore Timestamp
    if (typeof dateInput === 'string') {
        // Check if it's a valid date string before returning
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
    }
    if (typeof dateInput === 'number') return new Date(dateInput).toISOString(); // JS Milliseconds
    return new Date().toISOString(); // Fallback for any other invalid format
};

// Helper for optional dates
const safeToISOStringOptional = (dateInput: any): string | undefined => {
    if (!dateInput) return undefined;
    if (dateInput.toDate) return dateInput.toDate().toISOString(); // Firestore Timestamp
    if (typeof dateInput === 'string') {
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
    }
    if (typeof dateInput === 'number') return new Date(dateInput).toISOString();
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

    const userIds = [...new Set(entriesSnapshot.docs.map(doc => doc.data().userId))].filter(Boolean);

    const usersMap = new Map<string, { name: string, level: number }>();
    if (userIds.length > 0) {
      const usersSnapshot = await db.collection('users').where('__name__', 'in', userIds).get();
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        usersMap.set(doc.id, { name: name || 'Unknown User', level: userData.currentUserLevel || 1 });
      });
    }
    
    const allEntries = await Promise.all(entriesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        let needsUpdate = false;
        
        const feedbackWithIds = (data.feedback || []).map((f: any) => {
            if (f && f.id) {
                return f;
            }
            needsUpdate = true;
            return {
                ...f,
                id: db.collection('journal_entries').doc().id,
            };
        });

        if (needsUpdate) {
            try {
                await doc.ref.update({ feedback: feedbackWithIds });
            } catch (e) {
                console.error(`Failed to repair feedback IDs for entry ${doc.id}`, e);
            }
        }
        
        const finalFeedback = (needsUpdate ? feedbackWithIds : (data.feedback || []))
          .filter((f: any) => f && f.id && typeof f.feedbackContent === 'string') // Ensure feedback is valid
          .map((f: any) => {
            return {
                id: String(f.id),
                mentorId: String(f.mentorId || ''),
                mentorName: String(f.mentorName || 'A Mentor'),
                mentorLevel: typeof f.mentorLevel === 'number' ? f.mentorLevel : undefined,
                feedbackContent: String(f.feedbackContent),
                createdAt: safeToISOString(f.createdAt),
                updatedAt: safeToISOStringOptional(f.updatedAt),
                imageUrl: (typeof f.imageUrl === 'string' && f.imageUrl.trim()) ? f.imageUrl : undefined,
                imageCredit: (typeof f.imageCredit === 'string' && f.imageCredit.trim()) ? f.imageCredit : undefined,
                caption: (typeof f.caption === 'string' && f.caption.trim()) ? f.caption : undefined,
            };
        });
        
        const isManual = data.isManualEntry === true;
        const userData = usersMap.get(data.userId);

        const userName = isManual ? String(data.userName || 'Contributor') : (userData?.name || String(data.userName || 'Anonymous'));
        const userLevel = isManual ? 0 : (userData?.level || data.userLevel || 1);
        
        return {
            id: doc.id,
            userId: String(data.userId || ''),
            userName: userName,
            userLevel: typeof userLevel === 'number' ? userLevel : undefined,
            subject: (typeof data.subject === 'string' && data.subject.trim()) ? data.subject : undefined,
            entryContent: String(data.entryContent || ''),
            createdAt: safeToISOString(data.createdAt),
            updatedAt: safeToISOStringOptional(data.updatedAt),
            feedback: finalFeedback,
            imageUrl: (typeof data.imageUrl === 'string' && data.imageUrl.trim()) ? data.imageUrl : undefined,
            isManualEntry: isManual,
            caption: (typeof data.caption === 'string' && data.caption.trim()) ? data.caption : undefined,
        };
    }));

    return allEntries as GetAllJournalEntriesOutput;
  }
);
export async function getAllJournalEntries(): Promise<GetAllJournalEntriesOutput> {
    return getAllJournalEntriesFlow();
}

