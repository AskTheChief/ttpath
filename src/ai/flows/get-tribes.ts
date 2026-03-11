'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { GetTribesInputSchema, GetTribesOutputSchema, type GetTribesInput, type GetTribesOutput } from '@/lib/types';

if (!getApps().length) {
  initializeApp();
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
      
      // Fetch all unique member IDs to resolve names
      const allMemberIds = new Set<string>();
      tribesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        (data.members || []).forEach((id: string) => allMemberIds.add(id));
        if (data.chief) allMemberIds.add(data.chief);
      });

      const memberIdsArray = Array.from(allMemberIds);
      const userNamesMap = new Map<string, string>();

      // Batch fetch users in chunks of 30 (Firestore limit)
      if (memberIdsArray.length > 0) {
        for (let i = 0; i < memberIdsArray.length; i += 30) {
          const chunk = memberIdsArray.slice(i, i + 30);
          const usersSnapshot = await db.collection('users').where('__name__', 'in', chunk).get();
          usersSnapshot.forEach(uDoc => {
            const uData = uDoc.data();
            userNamesMap.set(uDoc.id, `${uData.firstName || ''} ${uData.lastName || ''}`.trim() || 'Unknown User');
          });
        }
      }

      const tribes = tribesSnapshot.docs.map(doc => {
        const data = doc.data();
        
        const parseTimestamp = (ts: any) => {
            if (!ts) return ts;
            if (typeof ts === 'string') return ts;
            if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
            if (typeof ts._seconds === 'number') return new Date(ts._seconds * 1000).toISOString();
            if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000).toISOString();
            return ts;
        };

        // Ensure meetings and their dates are serializable
        const meetings = (data.meetings || []).map((meeting: any) => {
          return {
            ...meeting,
            date: parseTimestamp(meeting.date),
          };
        });

        const memberNames = (data.members || []).map((id: string) => userNamesMap.get(id) || 'Unknown Member');
        const chiefName = data.chief ? userNamesMap.get(data.chief) : undefined;
        const isChiefValid = data.chief ? userNamesMap.has(data.chief) : false;

        return {
          id: doc.id,
          name: data.name,
          location: data.location,
          lat: data.lat,
          lng: data.lng,
          chief: data.chief,
          chiefName: chiefName,
          members: data.members || [],
          meetings: meetings,
          memberNames: memberNames,
          isChiefValid: isChiefValid,
        };
      });
      return tribes;
    } catch (error) {
      console.error('Error getting tribes:', error);
      return [];
    }
  }
);
