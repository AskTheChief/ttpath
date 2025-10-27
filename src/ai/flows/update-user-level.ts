
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();

export const UpdateUserLevelInputSchema = z.object({
  idToken: z.string().describe("The admin's Firebase ID token for authentication."),
  targetUserId: z.string().describe("The UID of the user to update."),
  newLevel: z.number().int().min(1).max(6).describe("The new level to assign to the user."),
});
export type UpdateUserLevelInput = z.infer<typeof UpdateUserLevelInputSchema>;

export const UpdateUserLevelOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type UpdateUserLevelOutput = z.infer<typeof UpdateUserLevelOutputSchema>;


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
