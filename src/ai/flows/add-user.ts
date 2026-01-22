'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  AddUserInputSchema,
  AddUserOutputSchema,
  type AddUserInput,
  type AddUserOutput,
} from '@/lib/types';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();
const adminAuth = getAuth();
const ADMIN_LEVEL = 6;

export async function addUser(input: AddUserInput): Promise<AddUserOutput> {
  return addUserFlow(input);
}

const addUserFlow = ai.defineFlow(
  {
    name: 'addUserFlow',
    inputSchema: AddUserInputSchema,
    outputSchema: AddUserOutputSchema,
  },
  async ({ idToken, ...userData }) => {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const adminUserDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (!adminUserDoc.exists() || (adminUserDoc.data()?.currentUserLevel || 0) < ADMIN_LEVEL) {
        throw new Error('Permission denied. User is not an admin.');
      }
    } catch (error: any) {
      console.error('Admin authentication failed:', error.message);
      return { 
        success: false, 
        message: 'Admin authentication failed.',
      };
    }

    try {
      // Check for existing user with the same email
      const usersRef = db.collection('users');
      const existingUserQuery = await usersRef.where('email', '==', userData.email).limit(1).get();

      if (!existingUserQuery.empty) {
        return {
          success: false,
          message: 'A user with this email address already exists.',
        };
      }

      // No Auth user is created, just the Firestore document.
      const newUserRef = db.collection('users').doc();
      await newUserRef.set({
        ...userData,
        createdAt: new Date(), // Add a creation timestamp
      });

      return {
        success: true,
        message: 'User added successfully.',
        userId: newUserRef.id,
      };

    } catch (error: any) {
      console.error('Error adding user:', error);
      return { 
        success: false, 
        message: `An unexpected error occurred: ${error.message}`,
      };
    }
  }
);
