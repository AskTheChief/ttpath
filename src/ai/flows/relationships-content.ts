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

const defaultContent = `The Trading Tribe Process (TTP) provides a powerful framework for personal growth that extends into all areas of life, including our most intimate relationships. When partners commit to supporting each other through TTP, they create a shared space for deep connection, emotional honesty, and mutual growth.

**Feelings in Relationships**

In a relationship, unexpressed feelings can build up and create distance. TTP encourages both partners to take responsibility for their own feelings and to communicate them openly. By creating a safe space to share emotions—both positive and challenging—partners can dissolve judgments and misunderstandings before they take root. Acknowledging each other's feelings, without trying to "fix" them, is a fundamental act of support.

**Supporting Your Partner's Growth**

Supporting your partner means more than just offering encouragement. It means being willing to be a "receiver" for them, holding space for them to experience their feelings fully. It also means committing to your own work, as your personal growth directly impacts the health of the relationship. When both individuals are dedicated to the process, the relationship itself becomes a catalyst for transformation.

**Common Relationship Rocks**

Just like in trading, we can carry "rocks" in our relationships—unresolved issues or patterns of behavior that weigh us down. These might include:

- Blaming your partner for your feelings.
- Avoiding difficult conversations.
- Carrying resentments from past events.
- Trying to control your partner's behavior or feelings.

Through TTP, partners can learn to identify these rocks and work together to dissolve them, lightening the load for both individuals and for the relationship as a whole. The goal is not to have a "perfect" relationship, but an honest and evolving one.`;

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
