'use server';

/**
 * @fileOverview A Genkit flow for Mentors to perform manual administrative actions on tribes.
 */

import { ai } from '@/ai/genkit';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { 
    AdminTribeActionInputSchema, 
    AdminTribeActionOutputSchema, 
    type AdminTribeActionInput, 
    type AdminTribeActionOutput 
} from '@/lib/types';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();
const ADMIN_LEVEL = 6;

const adminTribeActionFlow = ai.defineFlow(
  {
    name: 'adminTribeActionFlow',
    inputSchema: AdminTribeActionInputSchema,
    outputSchema: AdminTribeActionOutputSchema,
  },
  async ({ idToken, action, tribeId, targetUserId }) => {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const adminUserDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (!adminUserDoc.exists || (adminUserDoc.data()?.currentUserLevel || 0) < ADMIN_LEVEL) {
        throw new Error('Permission denied. Only Mentors can perform manual tribe admin.');
      }
    } catch (error: any) {
      console.error('Admin authentication failed:', error.message);
      return { success: false, message: 'Authorization failed.' };
    }

    try {
      const tribeRef = db.collection('tribes').doc(tribeId);
      const tribeDoc = await tribeRef.get();
      if (!tribeDoc.exists) throw new Error('Tribe not found.');

      const userRef = db.collection('users').doc(targetUserId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) throw new Error('Target user not found.');

      if (action === 'set_chief') {
        await db.runTransaction(async (transaction) => {
          transaction.update(tribeRef, { 
            chief: targetUserId,
            members: FieldValue.arrayUnion(targetUserId)
          });
          // Promote to Chief (5) if they are currently lower
          const userData = userDoc.data();
          if (Number(userData?.currentUserLevel || 0) < 5) {
            transaction.update(userRef, { currentUserLevel: 5 });
          }
        });
        return { success: true, message: 'Tribe Chief updated successfully.' };
      }

      if (action === 'add_member') {
        await db.runTransaction(async (transaction) => {
          transaction.update(tribeRef, { members: FieldValue.arrayUnion(targetUserId) });
          const userData = userDoc.data();
          if (Number(userData?.currentUserLevel || 0) < 4) {
            transaction.update(userRef, { currentUserLevel: 4 });
          }
        });
        return { success: true, message: 'Member added to tribe successfully.' };
      }

      if (action === 'remove_member') {
        await db.runTransaction(async (transaction) => {
          transaction.update(tribeRef, { members: FieldValue.arrayRemove(targetUserId) });
          // If they were chief, clear that too
          if (tribeDoc.data()?.chief === targetUserId) {
            transaction.update(tribeRef, { chief: FieldValue.delete() });
          }
        });
        return { success: true, message: 'Member removed from tribe.' };
      }

      return { success: false, message: 'Invalid action.' };

    } catch (error: any) {
      console.error('Error in adminTribeAction:', error);
      return { success: false, message: error.message || 'Operation failed.' };
    }
  }
);

export async function adminTribeAction(input: AdminTribeActionInput): Promise<AdminTribeActionOutput> {
    return adminTribeActionFlow(input);
}
