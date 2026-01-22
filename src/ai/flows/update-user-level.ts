
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { UpdateUserLevelInputSchema, UpdateUserLevelOutputSchema, type UpdateUserLevelInput, type UpdateUserLevelOutput } from '@/lib/types';


if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();
const adminAuth = getAuth();
const ADMIN_LEVEL = 6;

export async function updateUserLevel(input: UpdateUserLevelInput): Promise<UpdateUserLevelOutput> {
  return updateUserLevelFlow(input);
}

const updateUserLevelFlow = ai.defineFlow(
  {
    name: 'updateUserLevelFlow',
    inputSchema: UpdateUserLevelInputSchema,
    outputSchema: UpdateUserLevelOutputSchema,
  },
  async ({ idToken, targetUserId, newLevel }) => {
    
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
      const adminUserDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (!adminUserDoc.exists() || (adminUserDoc.data()?.currentUserLevel || 0) < ADMIN_LEVEL) {
        throw new Error('Permission denied. User is not an admin.');
      }
    } catch (error: any) {
      console.error('Admin authentication failed:', error.message);
      return { success: false, message: 'Admin authentication failed.' };
    }

    try {
      const userRef = db.collection('users').doc(targetUserId);
      await userRef.update({ currentUserLevel: newLevel });
      return { success: true, message: 'User level updated successfully.' };
    } catch (error: any) {
      console.error('Error updating user level:', error);
      return { success: false, message: error.message || 'Failed to update user level.' };
    }
  }
);
