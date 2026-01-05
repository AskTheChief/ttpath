
'use server';

/**
 * @fileOverview Genkit flows for managing user journal entries.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { JournalEntrySchema, JournalEntry } from '@/lib/types';


if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();
const adminAuth = getAuth();


// --- SAVE JOURNAL ENTRY ---

const SaveJournalEntryInputSchema = z.object({
  idToken: z.string(),
  entryContent: z.string(),
  entryId: z.string().optional(), // Optional: for updating existing entries
});
export type SaveJournalEntryInput = z.infer<typeof SaveJournalEntryInputSchema>;

const SaveJournalEntryOutputSchema = z.object({
  success: z.boolean(),
  entryId: z.string(),
});
export type SaveJournalEntryOutput = z.infer<typeof SaveJournalEntryOutputSchema>;

const saveJournalEntryFlow = ai.defineFlow(
  {
    name: 'saveJournalEntryFlow',
    inputSchema: SaveJournalEntryInputSchema,
    outputSchema: SaveJournalEntryOutputSchema,
  },
  async ({ idToken, entryContent, entryId }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      throw new Error('User not authenticated.');
    }
    const userId = decodedToken.uid;
    const userName = decodedToken.name || 'Anonymous';
    
    const docRef = entryId ? db.collection('journal_entries').doc(entryId) : db.collection('journal_entries').doc();
    
    await docRef.set({
        userId,
        userName,
        entryContent,
        createdAt: entryId ? FieldValue.serverTimestamp() : Timestamp.now(), // Update timestamp only on create
        updatedAt: Timestamp.now(),
    }, { merge: true });
    
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
    
    const entries = snapshot.docs.map(doc => {
      const data = doc.data();
      const feedback = (data.feedback || []).map((f: any) => ({
          ...f,
          createdAt: (f.createdAt as Timestamp).toDate().toISOString(),
      }));

      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
        feedback: feedback,
      } as JournalEntry;
    });

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
    
    if (!docSnap.exists || docSnap.data()?.userId !== userId) {
        throw new Error('Permission denied or entry not found.');
    }

    await docRef.delete();
    
    return { success: true };
  }
);
export async function deleteJournalEntry(input: DeleteJournalEntryInput): Promise<DeleteJournalEntryOutput> {
    return deleteJournalEntryFlow(input);
}
