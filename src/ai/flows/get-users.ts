
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, DocumentData, DocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { SystemUserSchema, type SystemUser } from '@/lib/types';
import { z } from 'genkit';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const GetUsersOutputSchema = z.array(SystemUserSchema);

const mapDocToUser = (doc: DocumentSnapshot<DocumentData>): SystemUser => {
    const data = doc.data() || {};
    
    let createdAtStr: string | undefined;
    if (data.createdAt) {
        if (data.createdAt instanceof Timestamp) {
            createdAtStr = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === 'string') {
            createdAtStr = data.createdAt;
        } else if (data.createdAt.seconds) {
            createdAtStr = new Date(data.createdAt.seconds * 1000).toISOString();
        }
    }

    let lastActiveAtStr: string | undefined;
    if (data.lastActiveAt) {
        if (data.lastActiveAt instanceof Timestamp) {
            lastActiveAtStr = data.lastActiveAt.toDate().toISOString();
        } else if (typeof data.lastActiveAt === 'string') {
            lastActiveAtStr = data.lastActiveAt;
        } else if (data.lastActiveAt.seconds) {
            lastActiveAtStr = new Date(data.lastActiveAt.seconds * 1000).toISOString();
        }
    }

    return {
      uid: doc.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      currentUserLevel: data.currentUserLevel,
      myAccountVisits: data.myAccountVisits,
      issue: data.issue,
      serviceProject: data.serviceProject,
      emailsSent: data.emailsSent,
      createdAt: createdAtStr,
      lastActiveAt: lastActiveAtStr,
    };
};

const getUsersFlow = ai.defineFlow(
  {
    name: 'getUsersFlow',
    outputSchema: GetUsersOutputSchema,
  },
  async () => {
    try {
      const usersSnapshot = await db.collection('users').orderBy('lastName', 'asc').get();
      return usersSnapshot.docs.map(mapDocToUser);
    } catch (error) {
      console.error('Error getting users with ordering, falling back:', error);
      try {
        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs.map(mapDocToUser);
        return users.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
      } catch (fallbackError) {
          console.error('Error getting users on fallback:', fallbackError);
          return [];
      }
    }
  }
);

export async function getUsers(): Promise<SystemUser[]> {
  return getUsersFlow();
}
