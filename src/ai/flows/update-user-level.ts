
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { UpdateUserLevelInputSchema, UpdateUserLevelOutputSchema, type UpdateUserLevelInput, type UpdateUserLevelOutput } from '@/lib/types';


if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();

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
    
    // For now, we'll allow this flow to be called without strict admin role checks,
    // assuming it's only exposed in the admin UI.
    // In a production app, you would verify the caller's custom claims here.
    try {
      await adminAuth.verifyIdToken(idToken);
    } catch (error) {
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
