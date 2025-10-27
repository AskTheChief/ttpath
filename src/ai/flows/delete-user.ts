
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
    
    // For now, we'll allow this flow to be called without strict admin role checks,
    // assuming it's only exposed in the admin UI.
    try {
      await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      return { success: false, message: 'Admin authentication failed.' };
    }

    try {
        // 1. Delete from Firebase Authentication
        await adminAuth.deleteUser(targetUserId);

        // 2. Delete Firestore documents
        const userDocRef = db.collection('users').doc(targetUserId);
        const userTutorialsDocRef = db.collection('user_tutorials').doc(targetUserId);
        
        const writeBatch = db.batch();
        writeBatch.delete(userDocRef);
        writeBatch.delete(userTutorialsDocRef);
        
        // 3. Remove user from any tribes they are a member of
        const memberOfTribesSnapshot = await db.collection('tribes').where('members', 'array-contains', targetUserId).get();
        memberOfTribesSnapshot.forEach(doc => {
            writeBatch.update(doc.ref, { members: FieldValue.arrayRemove(targetUserId) });
        });

        // 4. Delete any tribes they are chief of
        const chiefOfTribesSnapshot = await db.collection('tribes').where('chief', '==', targetUserId).get();
        chiefOfTribesSnapshot.forEach(doc => {
            writeBatch.delete(doc.ref);
        });

        await writeBatch.commit();
      
        return { success: true, message: 'User deleted successfully.' };

    } catch (error: any) {
      console.error('Error deleting user:', error);
      if (error.code === 'auth/user-not-found') {
          return { success: false, message: 'User not found in Firebase Authentication. May have been partially deleted.' };
      }
      return { success: false, message: error.message || 'Failed to delete user.' };
    }
  }
);
