
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();

const UserSchema = z.object({
  uid: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currentUserLevel: z.number().optional(),
  createdAt: z.string().optional(),
  lastLoginAt: z.string().optional(),
  myAccountVisits: z.number().optional(),
  issue: z.string().optional(),
  serviceProject: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

const GetUsersOutputSchema = z.array(UserSchema);
export type GetUsersOutput = z.infer<typeof GetUsersOutputSchema>;

export async function getUsers(): Promise<GetUsersOutput> {
  return getUsersFlow();
}

// Helper function to map Firestore doc to User object with correct date formats
const mapDocToUser = (doc: DocumentSnapshot<DocumentData>): User => {
    const data = doc.data() || {};
    
    // Robustly convert Firestore Timestamps to ISO strings.
    const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
      ? data.createdAt.toDate().toISOString() 
      : undefined;
      
    const lastLoginAt = data.lastLoginAt && typeof data.lastLoginAt.toDate === 'function' 
      ? data.lastLoginAt.toDate().toISOString() 
      : undefined;

    return {
      uid: doc.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      currentUserLevel: data.currentUserLevel,
      createdAt: createdAt,
      lastLoginAt: lastLoginAt,
      myAccountVisits: data.myAccountVisits,
      issue: data.issue,
      serviceProject: data.serviceProject,
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
      // If ordering by lastName fails (e.g., if the field doesn't exist on some docs),
      // fetch without ordering as a fallback.
      try {
        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs.map(mapDocToUser);
        // Manual sort as a fallback
        return users.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
      } catch (fallbackError) {
          console.error('Error getting users on fallback:', fallbackError);
          return [];
      }
    }
  }
);
