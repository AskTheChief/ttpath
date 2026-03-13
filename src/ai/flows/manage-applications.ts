'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { ManageApplicationInputSchema, ManageApplicationOutputSchema, type ManageApplicationInput, type ManageApplicationOutput, ApplicationSchema } from '@/lib/types';
import { z } from 'zod';
import { sendNewMemberEmail } from './send-new-member-email';
import { sendNewChiefEmail } from './send-new-chief-email';
import { sendNewMentorEmail } from './send-new-mentor-email';

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
            const userDoc = await db.collection('users').doc(userId).get();
            const userLevel = userDoc.data()?.currentUserLevel || 0;

            if (userLevel >= 6) {
                // Mentors see all join_tribe applications
                applicationsSnapshot = await db.collection('tribe_applications')
                    .where('status', '==', 'pending')
                    .where('type', '==', 'join_tribe')
                    .get();
            } else {
                // Chiefs only see apps for their tribes
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
            }
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

            const parseTimestamp = (ts: any) => {
                if (!ts) return ts;
                if (typeof ts === 'string') return ts;
                if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
                if (typeof ts._seconds === 'number') return new Date(ts._seconds * 1000).toISOString();
                if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000).toISOString();
                return ts;
            };

            let applicantProfile: { name?: string, email?: string, phone?: string, issue?: string, serviceProject?: string } = {};
            if (data.applicantId) {
                const userDoc = await db.collection('users').doc(data.applicantId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data()!;
                    applicantProfile = {
                        name: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
                        email: userData?.email,
                        phone: userData?.phone,
                        issue: userData?.issue,
                        serviceProject: userData?.serviceProject,
                    };
                }
            }

            let tribeName = data.tribeName;
            if (!tribeName && data.tribeId) {
                const tribeDoc = await db.collection('tribes').doc(data.tribeId).get();
                tribeName = tribeDoc.exists ? tribeDoc.data()?.name : 'Unknown Tribe';
            }

            return {
                id: doc.id,
                ...data,
                tribeName: tribeName,
                applicantName: applicantProfile.name || 'Unknown Applicant',
                applicantEmail: applicantProfile.email,
                applicantPhone: applicantProfile.phone,
                issue: applicantProfile.issue,
                serviceProject: applicantProfile.serviceProject,
                createdAt: parseTimestamp(data.createdAt),
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
    let userLevel = 0;
    try {
      decodedToken = await adminAuth.verifyIdToken(input.idToken);
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      userLevel = userDoc.data()?.currentUserLevel || 0;
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

    if (action === 'deny') {
      try {
        await applicationRef.delete();
        return { success: true };
      } catch (error) {
        console.error('Error denying application:', error);
        return { success: false, message: 'Failed to deny application.' };
      }
    }


    if (!applicantId) {
        return { success: false, message: 'Missing applicantId for this action.' };
    }
    const applicantUserRef = db.collection('users').doc(applicantId);
    const applicantUserDoc = await applicantUserRef.get();
    if (!applicantUserDoc.exists) {
        return { success: false, message: 'Applicant user profile not found.'};
    }
    const applicantData = applicantUserDoc.data()!;


    if (action === 'approve') {
        if (!applicantData.email) {
            console.error(`Applicant ${applicantId} is missing an email address.`);
            // Continue without sending email, but log the error
        }
        const applicantName = `${applicantData.firstName || ''} ${applicantData.lastName || ''}`.trim() || 'New Member';

        if (type === 'join_tribe') {
            if (!tribeId) return { success: false, message: 'Tribe ID is required for joining a tribe.' };
            const tribeRef = db.collection('tribes').doc(tribeId);
            const tribeDoc = await tribeRef.get();
            
            // Mentors can approve any join application
            if (!tribeDoc.exists || (tribeDoc.data()?.chief !== user.uid && userLevel < 6)) {
                return { success: false, message: 'You do not have permission to manage this application.' };
            }
            
            await db.runTransaction(async (transaction) => {
                transaction.update(tribeRef, { members: FieldValue.arrayUnion(applicantId) });
                transaction.update(applicantUserRef, { currentUserLevel: 4 }); // Member
                transaction.delete(applicationRef);
            });
            
            if (applicantData.email) {
                await sendNewMemberEmail({
                    recipientEmail: applicantData.email,
                    recipientName: applicantName,
                    tribeName: tribeDoc.data()?.name || 'your new tribe',
                });
            }
            return { success: true };

        } else if (type === 'new_tribe') {
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
            
            if (applicantData.email) {
                await sendNewChiefEmail({
                    recipientEmail: applicantData.email,
                    recipientName: applicantName,
                    tribeName: appData.tribeName,
                });
            }
            return { success: true };

        } else if (type === 'new_mentor') {
             await db.runTransaction(async (transaction) => {
                transaction.update(applicantUserRef, { currentUserLevel: 6 }); // Promote to Mentor
                transaction.delete(applicationRef);
            });

            if (applicantData.email) {
                await sendNewMentorEmail({
                    recipientEmail: applicantData.email,
                    recipientName: applicantName,
                });
            }
        }
    }

    return { success: false, message: 'Invalid action or type.' };

  }
);
