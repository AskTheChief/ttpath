
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { DeleteUserInputSchema, DeleteUserOutputSchema, type DeleteUserInput, type DeleteUserOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();
const adminAuth = getAuth();

export async function deleteUser(input: DeleteUserInput): Promise<DeleteUserOutput> {
  return deleteUserFlow(input);
}

const deleteUserFlow = ai.defineFlow(
  {
    name: 'deleteUserFlow',
    inputSchema: DeleteUserInputSchema,
    outputSchema: DeleteUserOutputSchema,
  },
  async ({ idToken, targetUserId }) => {
    
    try {
      await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      return { success: false, message: 'Admin authentication failed.' };
    }

    try {
        // We will only delete Firestore data, not the auth credential.
        // await adminAuth.deleteUser(targetUserId);

        const userDocRef = db.collection('users').doc(targetUserId);
        const userTutorialsDocRef = db.collection('user_tutorials').doc(targetUserId);
        
        const writeBatch = db.batch();
        writeBatch.delete(userDocRef);
        writeBatch.delete(userTutorialsDocRef);
        
        const memberOfTribesSnapshot = await db.collection('tribes').where('members', 'array-contains', targetUserId).get();
        memberOfTribesSnapshot.forEach(doc => {
            writeBatch.update(doc.ref, { members: FieldValue.arrayRemove(targetUserId) });
        });

        const chiefOfTribesSnapshot = await db.collection('tribes').where('chief', '==', targetUserId).get();
        chiefOfTribesSnapshot.forEach(doc => {
            writeBatch.delete(doc.ref);
        });

        await writeBatch.commit();
      
        return { success: true, message: 'User data deleted successfully.' };

    } catch (error: any) {
      console.error('Error deleting user data:', error);
      return { success: false, message: error.message || 'Failed to delete user data.' };
    }
  }
);
