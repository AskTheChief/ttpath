
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { ManageApplicationInputSchema, ManageApplicationOutputSchema, type ManageApplicationInput, type ManageApplicationOutput, ApplicationSchema } from '@/lib/types';
import { z } from 'zod';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();

export async function manageApplication(input: ManageApplicationInput): Promise<ManageApplicationOutput> {
  return manageApplicationFlow(input);
}

const manageApplicationFlow = ai.defineFlow(
  {
    name: 'manageApplicationFlow',
    inputSchema: ManageApplicationInputSchema,
    outputSchema: ManageApplicationOutputSchema,
  },
  async (input) => {
    if (!input.idToken) {
      throw new Error('User not authenticated. Invalid token.');
    }
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(input.idToken);
    } catch (error) {
      throw new Error('User not authenticated. Invalid token.');
    }
    const user = { uid: decodedToken.uid };

    const { action, applicationId, tribeId, applicantId } = input;

    if (action === 'get') {
      try {
        const tribesSnapshot = await db.collection('tribes').where('chief', '==', user.uid).get();
        if (tribesSnapshot.empty) {
          return { success: true, applications: [] };
        }

        const tribeIds = tribesSnapshot.docs.map(doc => doc.id);
        const applicationsSnapshot = await db.collection('tribe_applications').where('tribeId', 'in', tribeIds).get();
        
        const applications = await Promise.all(applicationsSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const createdAt = data.createdAt;

          // Fetch applicant's user profile
          let applicantProfile: { name?: string, email?: string, phone?: string } = {};
          if (data.applicantId) {
            try {
              const userDoc = await db.collection('users').doc(data.applicantId).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                applicantProfile = {
                  name: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
                  email: userData?.email,
                  phone: userData?.phone,
                };
              }
            } catch (userError) {
              console.error(`Failed to fetch profile for applicant ${data.applicantId}:`, userError);
              // Continue without profile data if it fails
            }
          }
          
          return { 
            id: doc.id, 
            ...data,
            applicantName: applicantProfile.name || 'Unknown Applicant',
            applicantEmail: applicantProfile.email,
            applicantPhone: applicantProfile.phone,
            createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : createdAt,
          };
        }));

        return { success: true, applications: applications as z.infer<typeof ApplicationSchema>[] };
      } catch (error) {
        console.error('Error fetching applications:', error);
        return { success: false, message: 'Failed to fetch applications.' };
      }
    }

    if (!applicationId || !tribeId || !applicantId) {
        return { success: false, message: 'Missing required fields for this action.' };
    }

    const tribeRef = db.collection('tribes').doc(tribeId);
    const applicationRef = db.collection('tribe_applications').doc(applicationId);

    // Verify chief permission for approve/deny actions
    const tribeDoc = await tribeRef.get();
    if (!tribeDoc.exists || tribeDoc.data()?.chief !== user.uid) {
        return { success: false, message: 'You do not have permission to manage this application.' };
    }

    if (action === 'approve') {
      try {
        await tribeRef.update({
          members: FieldValue.arrayUnion(applicantId),
        });
        await applicationRef.delete();
        return { success: true };
      } catch (error) {
        console.error('Error approving application:', error);
        return { success: false, message: 'Failed to approve application.' };
      }
    }

    if (action === 'deny') {
      try {
        await applicationRef.delete();
        return { success: true };
      } catch (error) {
        console.error('Error denying application:', error);
        return { success: false, message: 'Failed to deny application.' };
      }
    }
    
    return { success: false, message: 'Invalid action.' };
  }
);
