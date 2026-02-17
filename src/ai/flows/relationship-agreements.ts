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
      
      const docRef = db.collection('relationship_agreements').doc(userId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        return { agreedTitles: docSnap.data()?.agreedTitles || [] };
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
      
      const docRef = db.collection('relationship_agreements').doc(userId);
      
      if (agreed) {
        await docRef.set({
          agreedTitles: FieldValue.arrayUnion(title)
        }, { merge: true });
      } else {
        await docRef.set({
          agreedTitles: FieldValue.arrayRemove(title)
        }, { merge: true });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error toggling relationship agreement:', error);
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
