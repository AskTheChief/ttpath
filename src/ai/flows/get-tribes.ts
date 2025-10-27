
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { GetTribesInputSchema, GetTribesOutputSchema, type GetTribesInput, type GetTribesOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();

export async function getTribes(input: GetTribesInput): Promise<GetTribesOutput> {
  return getTribesFlow(input);
}

const getTribesFlow = ai.defineFlow(
  {
    name: 'getTribesFlow',
    inputSchema: GetTribesInputSchema,
    outputSchema: GetTribesOutputSchema,
  },
  async () => {
    try {
      const tribesSnapshot = await db.collection('tribes').get();
      const tribes = tribesSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Ensure meetings and their dates are serializable
        const meetings = (data.meetings || []).map((meeting: any) => {
          const meetingDate = meeting.date;
          return {
            ...meeting,
            // Convert Firestore Timestamp to ISO string if it's a Timestamp object
            date: meetingDate?.toDate ? meetingDate.toDate().toISOString() : meetingDate,
          };
        });

        return {
          id: doc.id,
          name: data.name,
          location: data.location,
          lat: data.lat,
          lng: data.lng,
          chief: data.chief,
          members: data.members,
          meetings: meetings,
        };
      });
      return tribes;
    } catch (error) {
      console.error('Error getting tribes:', error);
      return [];
    }
  }
);
