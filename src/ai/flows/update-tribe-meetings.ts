
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, credential } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { UpdateTribeMeetingsInputSchema, UpdateTribeMeetingsOutputSchema, type UpdateTribeMeetingsInput, type UpdateTribeMeetingsOutput } from '@/lib/types';
import { z } from 'zod';


if (!getApps().length) {
  initializeApp({
    credential: credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = getFirestore();
const adminAuth = getAuth();


const updateTribeMeetingsFlow = ai.defineFlow(
  {
    name: 'updateTribeMeetingsFlow',
    inputSchema: UpdateTribeMeetingsInputSchema,
    outputSchema: UpdateTribeMeetingsOutputSchema,
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
      const { tribeId, meetings } = input;
      const tribeRef = db.collection('tribes').doc(tribeId);
      const tribeDoc = await tribeRef.get();

      if (!tribeDoc.exists) {
        return { success: false, message: 'Tribe not found.' };
      }

      const tribeData = tribeDoc.data();
      if (tribeData?.chief !== user.uid) {
        return { success: false, message: 'Only the tribe chief can manage meetings.' };
      }

      // Convert meeting dates from string to Firestore Timestamps
      const meetingsWithTimestamps = meetings.map(meeting => ({
        ...meeting,
        date: new Date(meeting.date),
      }));

      await tribeRef.update({
        meetings: meetingsWithTimestamps,
      });

      return { success: true, message: 'Meetings updated successfully.' };
    } catch (error) {
      console.error('Error updating meetings in Firestore:', error);
      return { success: false, message: 'An unexpected error occurred while updating meetings.' };
    }
  }
);


export async function updateTribeMeetings(input: UpdateTribeMeetingsInput): Promise<UpdateTribeMeetingsOutput> {
    return updateTribeMeetingsFlow(input);
}
