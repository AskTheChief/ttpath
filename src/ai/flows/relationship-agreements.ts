'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { 
    GetRelationshipAgreementsInputSchema, 
    GetRelationshipAgreementsOutputSchema, 
    ToggleRelationshipAgreementInputSchema, 
    ToggleRelationshipAgreementOutputSchema,
    type GetRelationshipAgreementsInput,
    type GetRelationshipAgreementsOutput,
    type ToggleRelationshipAgreementInput,
    type ToggleRelationshipAgreementOutput
} from '@/lib/types';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();

/**
 * @fileOverview Flows for managing a user's embraced customs (formerly relationship agreements).
 * Now stores data directly in the user's document in the 'users' collection.
 */

const getRelationshipAgreementsFlow = ai.defineFlow(
  {
    name: 'getRelationshipAgreementsFlow',
    inputSchema: GetRelationshipAgreementsInputSchema,
    outputSchema: GetRelationshipAgreementsOutputSchema,
  },
  async ({ idToken }) => {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const userId = decodedToken.uid;
      
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();

      if (userSnap.exists) {
        return { agreedTitles: userSnap.data()?.embracedCustoms || [] };
      }
      
      return { agreedTitles: [] };
    } catch (error) {
      console.error('Error getting relationship agreements:', error);
      return { agreedTitles: [] };
    }
  }
);

const toggleRelationshipAgreementFlow = ai.defineFlow(
  {
    name: 'toggleRelationshipAgreementFlow',
    inputSchema: ToggleRelationshipAgreementInputSchema,
    outputSchema: ToggleRelationshipAgreementOutputSchema,
  },
  async ({ idToken, title, agreed }) => {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const userId = decodedToken.uid;
      
      const userRef = db.collection('users').doc(userId);
      
      if (agreed) {
        await userRef.update({
          embracedCustoms: FieldValue.arrayUnion(title)
        });
      } else {
        await userRef.update({
          embracedCustoms: FieldValue.arrayRemove(title)
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error toggling relationship agreement:', error);
      // If document doesn't exist yet, we should use set instead of update
      if (error.code === 5 || error.message.includes('NOT_FOUND')) {
          try {
              const decodedToken = await adminAuth.verifyIdToken(idToken);
              const userId = decodedToken.uid;
              const userRef = db.collection('users').doc(userId);
              await userRef.set({
                  embracedCustoms: agreed ? [title] : []
              }, { merge: true });
              return { success: true };
          } catch (retryError: any) {
              return { success: false, message: retryError.message };
          }
      }
      return { success: false, message: error.message };
    }
  }
);

export async function getRelationshipAgreements(input: GetRelationshipAgreementsInput): Promise<GetRelationshipAgreementsOutput> {
  return getRelationshipAgreementsFlow(input);
}

export async function toggleRelationshipAgreement(input: ToggleRelationshipAgreementInput): Promise<ToggleRelationshipAgreementOutput> {
  return toggleRelationshipAgreementFlow(input);
}
