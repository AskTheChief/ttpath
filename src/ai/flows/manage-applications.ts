
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
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

async function getApplications(userId: string, appType: 'join_tribe' | 'new_tribe' | 'new_mentor' | 'my_pending', idToken: string) {
    try {
        let applicationsSnapshot;

        if (appType === 'join_tribe') {
            const tribesSnapshot = await db.collection('tribes').where('chief', '==', userId).get();
            if (tribesSnapshot.empty) {
                return [];
            }
            const tribeIds = tribesSnapshot.docs.map(doc => doc.id);
            applicationsSnapshot = await db.collection('tribe_applications')
                .where('tribeId', 'in', tribeIds)
                .where('status', '==', 'pending')
                .where('type', '==', 'join_tribe')
                .get();
        } else if (appType === 'my_pending') {
            applicationsSnapshot = await db.collection('tribe_applications')
                .where('applicantId', '==', userId)
                .where('status', '==', 'pending')
                .get();
        } else { // new_tribe or new_mentor
            // For now, any mentor can see all new tribe and mentor applications.
            applicationsSnapshot = await db.collection('tribe_applications')
                .where('status', '==', 'pending')
                .where('type', '==', appType)
                .get();
        }

        if (applicationsSnapshot.empty) {
            return [];
        }

        const applications = await Promise.all(applicationsSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const createdAt = data.createdAt;

            let applicantProfile: { name?: string, email?: string, phone?: string, issue?: string, serviceProject?: string } = {};
            if (data.applicantId) {
                const userDoc = await db.collection('users').doc(data.applicantId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    applicantProfile = {
                        name: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
                        email: userData?.email,
                        phone: userData?.phone,
                        issue: userData?.issue,
                        serviceProject: userData?.serviceProject,
                    };
                }
            }

            return {
                id: doc.id,
                ...data,
                applicantName: applicantProfile.name || 'Unknown Applicant',
                applicantEmail: applicantProfile.email,
                applicantPhone: applicantProfile.phone,
                issue: applicantProfile.issue,
                serviceProject: applicantProfile.serviceProject,
                createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : createdAt,
            };
        }));
        return applications as z.infer<typeof ApplicationSchema>[];

    } catch (error) {
        console.error(`Error fetching ${appType} applications:`, error);
        throw new Error(`Failed to fetch ${appType} applications.`);
    }
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

    const { action, applicationId, applicantId, type } = input;
    const tribeId = input.tribeId;

    if (action === 'get') {
        try {
            const applications = await getApplications(user.uid, type, input.idToken);
            return { success: true, applications: applications };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    if (!applicationId) {
        return { success: false, message: 'Missing application ID.' };
    }

    const applicationRef = db.collection('tribe_applications').doc(applicationId);
    const appDoc = await applicationRef.get();
    if (!appDoc.exists) {
      return { success: false, message: 'Application not found.' };
    }
    const appData = appDoc.data()!;


    if (action === 'withdraw') {
        if (appData.applicantId !== user.uid) {
            return { success: false, message: 'You can only withdraw your own application.' };
        }
        await applicationRef.delete();
        return { success: true, message: 'Application withdrawn.' };
    }


    if (!applicantId) {
        return { success: false, message: 'Missing applicantId for this action.' };
    }
    const applicantUserRef = db.collection('users').doc(applicantId);


    if (type === 'join_tribe') {
        if (!tribeId) return { success: false, message: 'Tribe ID is required for joining a tribe.' };
        const tribeRef = db.collection('tribes').doc(tribeId);
        const tribeDoc = await tribeRef.get();
        if (!tribeDoc.exists || tribeDoc.data()?.chief !== user.uid) {
            return { success: false, message: 'You do not have permission to manage this application.' };
        }
        
        if (action === 'approve') {
            await db.runTransaction(async (transaction) => {
                transaction.update(tribeRef, { members: FieldValue.arrayUnion(applicantId) });
                transaction.update(applicantUserRef, { currentUserLevel: 4 }); // Member
                transaction.delete(applicationRef);
            });
            return { success: true };
        }

    } else if (type === 'new_tribe') {
        if (action === 'approve') {
            const newTribeRef = db.collection('tribes').doc();
            await db.runTransaction(async (transaction) => {
                transaction.set(newTribeRef, {
                    name: appData.tribeName,
                    location: appData.location,
                    lat: appData.lat,
                    lng: appData.lng,
                    chief: applicantId,
                    members: [applicantId],
                    createdAt: Timestamp.now(),
                });
                transaction.update(applicantUserRef, { currentUserLevel: 5 });
                transaction.delete(applicationRef);
            });
            return { success: true };
        }
    } else if (type === 'new_mentor') {
         if (action === 'approve') {
            await db.runTransaction(async (transaction) => {
                transaction.update(applicantUserRef, { currentUserLevel: 6 }); // Promote to Mentor
                transaction.delete(applicationRef);
            });
            return { success: true };
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
    
    return { success: false, message: 'Invalid action or type.' };
  }
);
