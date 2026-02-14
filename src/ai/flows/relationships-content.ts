'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { 
  GetRelationshipsContentOutputSchema,
  UpdateRelationshipsContentInputSchema,
  UpdateRelationshipsContentOutputSchema,
  type GetRelationshipsContentOutput,
  type UpdateRelationshipsContentInput,
  type UpdateRelationshipsContentOutput
} from '@/lib/types';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();
const ADMIN_LEVEL = 6;
const CONTENT_DOC_PATH = 'site_content/relationships';

const defaultContent = `This is a placeholder for the Relationships page content.

An administrator can edit this text to provide information about how the Trading Tribe views relationships, personal growth within partnerships, and related topics.

Some potential themes to explore here:
- How TTP (Trading Tribe Process) can be applied to relationships.
- The role of feelings and communication.
- Supporting your partner's growth journey.`;

// --- Get Flow ---
const getRelationshipsContentFlow = ai.defineFlow(
  {
    name: 'getRelationshipsContentFlow',
    outputSchema: GetRelationshipsContentOutputSchema,
  },
  async () => {
    const docSnap = await db.doc(CONTENT_DOC_PATH).get();
    if (!docSnap.exists || !docSnap.data()?.content) {
      await db.doc(CONTENT_DOC_PATH).set({ content: defaultContent });
      return { content: defaultContent };
    }
    return { content: docSnap.data()?.content };
  }
);

export async function getRelationshipsContent(): Promise<GetRelationshipsContentOutput> {
  return getRelationshipsContentFlow();
}

// --- Update Flow ---
const updateRelationshipsContentFlow = ai.defineFlow(
  {
    name: 'updateRelationshipsContentFlow',
    inputSchema: UpdateRelationshipsContentInputSchema,
    outputSchema: UpdateRelationshipsContentOutputSchema,
  },
  async ({ idToken, content }) => {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const adminUserDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (!adminUserDoc.exists || (adminUserDoc.data()?.currentUserLevel || 0) < ADMIN_LEVEL) {
        throw new Error('Permission denied. User is not an admin.');
      }
    } catch (error: any) {
      console.error('Admin authentication failed:', error.message);
      return { success: false, message: 'Admin authentication failed.' };
    }
    
    await db.doc(CONTENT_DOC_PATH).set({ content }, { merge: true });
    return { success: true, message: 'Content updated successfully.' };
  }
);

export async function updateRelationshipsContent(input: UpdateRelationshipsContentInput): Promise<UpdateRelationshipsContentOutput> {
  return updateRelationshipsContentFlow(input);
}
