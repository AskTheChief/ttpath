
'use server';

/**
 * @fileOverview Genkit flows for managing user journal entries.
 */

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { 
    JournalEntrySchema, 
    JournalEntry,
    SaveJournalEntryInputSchema,
    SaveJournalEntryOutputSchema,
    type SaveJournalEntryInput,
    type SaveJournalEntryOutput
} from '@/lib/types';
import { z } from 'zod';


if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();
const ADMIN_LEVEL = 6;


// --- SAVE JOURNAL ENTRY ---
const saveJournalEntryFlow = ai.defineFlow(
  {
    name: 'saveJournalEntryFlow',
    inputSchema: SaveJournalEntryInputSchema,
    outputSchema: SaveJournalEntryOutputSchema,
  },
  async ({ idToken, entryContent, entryId, imageUrl, subject, caption }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      throw new Error('User not authenticated.');
    }
    const userId = decodedToken.uid;
    
    // Fetch user's name from their Firestore profile
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userName = userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'Anonymous';

    
    const docRef = entryId ? db.collection('journal_entries').doc(entryId) : db.collection('journal_entries').doc();
    
    const dataToSave: any = {
        userId,
        userName,
        entryContent,
        updatedAt: Timestamp.now(),
    };

    if (subject !== undefined) { dataToSave.subject = subject; }
    if (caption !== undefined) { dataToSave.caption = caption; }

    if (imageUrl) {
        dataToSave.imageUrl = imageUrl;
    } else if (imageUrl === '') {
        dataToSave.imageUrl = FieldValue.delete();
    }

    if (!entryId) {
        dataToSave.createdAt = Timestamp.now();
    }

    await docRef.set(dataToSave, { merge: true });
    
    return { success: true, entryId: docRef.id };
  }
);
export async function saveJournalEntry(input: SaveJournalEntryInput): Promise<SaveJournalEntryOutput> {
  return saveJournalEntryFlow(input);
}


// --- GET JOURNAL ENTRIES ---

const GetJournalEntriesInputSchema = z.object({
  idToken: z.string(),
});
export type GetJournalEntriesInput = z.infer<typeof GetJournalEntriesInputSchema>;

const GetJournalEntriesOutputSchema = z.array(JournalEntrySchema);
export type GetJournalEntriesOutput = z.infer<typeof GetJournalEntriesOutputSchema>;


const getJournalEntriesFlow = ai.defineFlow(
  {
    name: 'getJournalEntriesFlow',
    inputSchema: GetJournalEntriesInputSchema,
    outputSchema: GetJournalEntriesOutputSchema,
  },
  async ({ idToken }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      throw new Error('User not authenticated.');
    }
    const userId = decodedToken.uid;

    const snapshot = await db.collection('journal_entries')
      .where('userId', '==', userId)
      .get();
      
    if (snapshot.empty) {
      return [];
    }
    
    const entries = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let needsUpdate = false;
        
        const feedbackWithIds = (data.feedback || []).map((f: any) => {
            if (f.id) {
                return f;
            }
            needsUpdate = true;
            return {
                ...f,
                id: db.collection('journal_entries').doc().id,
            };
        });

        if (needsUpdate) {
            await doc.ref.update({ feedback: feedbackWithIds });
        }

        const finalFeedback = (needsUpdate ? feedbackWithIds : (data.feedback || [])).map((f: any) => ({
            id: f.id,
            mentorId: f.mentorId,
            mentorName: f.mentorName,
            feedbackContent: f.feedbackContent,
            createdAt: f.createdAt?.toDate ? f.createdAt.toDate().toISOString() : (f.createdAt || new Date().toISOString()),
            updatedAt: f.updatedAt?.toDate ? f.updatedAt.toDate().toISOString() : undefined,
            caption: f.caption || undefined,
        }));

        return {
            id: doc.id,
            ...data,
            subject: data.subject || undefined,
            caption: data.caption || undefined,
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
            feedback: finalFeedback,
        } as JournalEntry;
    }));

    // Sort in memory to avoid needing a composite index
    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
);
export async function getJournalEntries(input: GetJournalEntriesInput): Promise<GetJournalEntriesOutput> {
    return getJournalEntriesFlow(input);
}

// --- DELETE JOURNAL ENTRY ---
const DeleteJournalEntryInputSchema = z.object({
  idToken: z.string(),
  entryId: z.string(),
});
type DeleteJournalEntryInput = z.infer<typeof DeleteJournalEntryInputSchema>;

const DeleteJournalEntryOutputSchema = z.object({
    success: z.boolean(),
});
type DeleteJournalEntryOutput = z.infer<typeof DeleteJournalEntryOutputSchema>;

const deleteJournalEntryFlow = ai.defineFlow(
  {
    name: 'deleteJournalEntryFlow',
    inputSchema: DeleteJournalEntryInputSchema,
    outputSchema: DeleteJournalEntryOutputSchema,
  },
  async ({ idToken, entryId }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      throw new Error('User not authenticated.');
    }
    const userId = decodedToken.uid;
    
    const docRef = db.collection('journal_entries').doc(entryId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
        throw new Error('Entry not found.');
    }
    
    const userDoc = await db.collection('users').doc(userId).get();
    const userLevel = userDoc.data()?.currentUserLevel || 0;
    
    if (docSnap.data()?.userId !== userId && userLevel < ADMIN_LEVEL) {
        throw new Error('Permission denied. You are not the author or a mentor.');
    }

    await docRef.delete();
    
    return { success: true };
  }
);
export async function deleteJournalEntry(input: DeleteJournalEntryInput): Promise<DeleteJournalEntryOutput> {
    return deleteJournalEntryFlow(input);
}
