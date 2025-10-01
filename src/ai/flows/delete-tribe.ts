
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, credential } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { DeleteTribeInputSchema, DeleteTribeOutputSchema, type DeleteTribeInput, type DeleteTribeOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();
const adminAuth = getAuth();

const deleteTribeFlow = ai.defineFlow(
  {
    name: 'deleteTribeFlow',
    inputSchema: DeleteTribeInputSchema,
    outputSchema: DeleteTribeOutputSchema,
  },
  async (input) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(input.idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      return { success: false, message: 'User not authenticated. Invalid token.' };
    }
    const user = { uid: decodedToken.uid };
    
    try {
      const { tribeId } = input;
      const tribeRef = db.collection('tribes').doc(tribeId);
      const tribeDoc = await tribeRef.get();

      if (!tribeDoc.exists) {
        return { success: false, message: 'Tribe not found.' };
      }

      const tribeData = tribeDoc.data();
      if (tribeData?.chief !== user.uid) {
        return { success: false, message: 'Only the tribe chief can delete this tribe.' };
      }

      await tribeRef.delete();

      return { success: true, message: 'Tribe deleted successfully.' };
    } catch (error) {
      console.error('Error deleting tribe in Firestore:', error);
      return { success: false, message: 'An unexpected error occurred.' };
    }
  }
);


export async function deleteTribe(input: DeleteTribeInput): Promise<DeleteTribeOutput> {
    return deleteTribeFlow(input);
}
