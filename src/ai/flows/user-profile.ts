
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { 
  GetUserProfileInputSchema, 
  GetUserProfileOutputSchema, 
  UpdateUserProfileInputSchema, 
  UpdateUserProfileOutputSchema,
  type GetUserProfileInput,
  type GetUserProfileOutput,
  type UpdateUserProfileInput,
  type UpdateUserProfileOutput
} from '@/lib/types';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();

export async function getUserProfile(input: GetUserProfileInput): Promise<GetUserProfileOutput> {
  return getUserProfileFlow(input);
}

const getUserProfileFlow = ai.defineFlow(
  {
    name: 'getUserProfileFlow',
    inputSchema: GetUserProfileInputSchema,
    outputSchema: GetUserProfileOutputSchema,
  },
  async ({ idToken }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw new Error('User not authenticated. Invalid token.');
    }
    const user = { uid: decodedToken.uid };

    const userDocRef = db.collection('users').doc(user.uid);
    const docSnap = await userDocRef.get();

    if (!docSnap.exists) {
      return {};
    }

    return docSnap.data() as GetUserProfileOutput;
  }
);

export async function updateUserProfile(input: UpdateUserProfileInput): Promise<UpdateUserProfileOutput> {
  return updateUserProfileFlow(input);
}

const updateUserProfileFlow = ai.defineFlow(
  {
    name: 'updateUserProfileFlow',
    inputSchema: UpdateUserProfileInputSchema,
    outputSchema: UpdateUserProfileOutputSchema,
  },
  async ({ idToken, profile }) => {
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      return { success: false, message: 'User not authenticated. Invalid token.' };
    }
    const user = { uid: decodedToken.uid };

    const userDocRef = db.collection('users').doc(user.uid);

    try {
      await userDocRef.set(profile, { merge: true });
      return { success: true, message: 'Profile updated successfully.' };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, message: 'An unexpected error occurred while updating the profile.' };
    }
  }
);
