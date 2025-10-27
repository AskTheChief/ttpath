
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { JoinTribeInputSchema, JoinTribeOutputSchema, type JoinTribeInput, type JoinTribeOutput } from '@/lib/types';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();

async function sendNewApplicationEmail(chiefId: string, applicantId: string, tribeName: string) {
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (!mailgunApiKey || !mailgunDomain) {
        console.error('Mailgun environment variables not set. Skipping email notification.');
        return;
    }

    try {
        const [chiefDoc, applicantDoc] = await Promise.all([
            db.collection('users').doc(chiefId).get(),
            db.collection('users').doc(applicantId).get()
        ]);

        if (!chiefDoc.exists || !chiefDoc.data()?.email) {
            console.error(`Chief ${chiefId} not found or has no email.`);
            return;
        }

        const chiefEmail = chiefDoc.data()?.email;
        const applicantName = applicantDoc.exists ? `${applicantDoc.data()?.firstName} ${applicantDoc.data()?.lastName}` : 'A new applicant';

        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({ username: 'api', key: mailgunApiKey });

        const messageData = {
            from: `ttpath Notifier <noreply@${mailgunDomain}>`,
            to: chiefEmail,
            subject: `New Application for Your Tribe: ${tribeName}`,
            text: `Hello Chief,\n\nYou have received a new application from ${applicantName} to join your tribe, "${tribeName}".\n\nPlease log in to your account to review the application.\n\n- The ttpath Team`,
        };

        await mg.messages.create(mailgunDomain, messageData);
        console.log(`New application email sent to ${chiefEmail}`);
    } catch (error) {
        console.error('Error sending new application email:', error);
        // Do not throw, as the main flow should still succeed.
    }
}


export async function joinTribe(input: JoinTribeInput): Promise<JoinTribeOutput> {
  return joinTribeFlow(input);
}

const joinTribeFlow = ai.defineFlow(
  {
    name: 'joinTribeFlow',
    inputSchema: JoinTribeInputSchema,
    outputSchema: JoinTribeOutputSchema,
  },
  async (input) => {
    if (!input.idToken) {
        throw new Error('Authentication token is missing.');
    }

    let decodedToken;
    try {
        decodedToken = await adminAuth.verifyIdToken(input.idToken);
    } catch (error) {
        console.error('Error verifying ID token:', error);
        throw new Error('User not authenticated. Invalid token.');
    }
    const user = { uid: decodedToken.uid };
    
    try {
      const tribeRef = db.collection('tribes').doc(input.tribeId);
      const tribeDoc = await tribeRef.get();

      if (!tribeDoc.exists) {
        throw new Error('Tribe not found.');
      }

      const tribeData = tribeDoc.data();
      const hasMembers = tribeData?.members && tribeData.members.length > 0;
      const chiefId = tribeData?.chief;

      if (!hasMembers) {
        const userRef = db.collection('users').doc(user.uid);
        // If tribe has no members, make the applicant the new chief and update their level.
        await db.runTransaction(async (transaction) => {
          transaction.update(tribeRef, {
            chief: user.uid,
            members: FieldValue.arrayUnion(user.uid),
          });
          transaction.update(userRef, { currentUserLevel: 5 }); // Level 5 for Chief
        });
        return { success: true };
      } else {
        // If tribe has members, create an application.
        const applicationRef = db.collection('tribe_applications').doc();
        await applicationRef.set({
          type: 'join_tribe',
          tribeId: input.tribeId,
          applicantId: user.uid,
          answers: input.answers,
          status: 'pending',
          createdAt: Timestamp.now(),
        });

        // Send email notification to the chief
        if (chiefId) {
            await sendNewApplicationEmail(chiefId, user.uid, tribeData?.name || 'Your Tribe');
        }

        return { success: true };
      }
    } catch (error) {
      console.error('Error joining tribe:', error);
      return { success: false, message: 'An unexpected error occurred while trying to join the tribe.' };
    }
  }
);
