'use client';

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

async function sendNewApplicationEmail(chiefId: string, applicantId: string, tribeName: string, embracedCustoms: string[]) {
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
        const applicantData = applicantDoc.data();
        const applicantName = applicantDoc.exists ? `${applicantData?.firstName} ${applicantData?.lastName}` : 'A new applicant';
        
        const customsList = embracedCustoms.length > 0 
            ? embracedCustoms.map(c => `• ${c}`).join('\n') 
            : 'None';

        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({ username: 'api', key: mailgunApiKey });

        const dashboardUrl = `https://ttpath.net/my-tribe?view=chief-dashboard`;

        const textBody = `Hello Chief,\n\nYou have received a new application from ${applicantName} to join your tribe, "${tribeName}".\n\nEmbraced Customs:\n${customsList}\n\nPlease log in to your account to review the application:\n${dashboardUrl}\n\n- The TTpath Team`;
        const htmlBody = `
            <div style="font-family: sans-serif; color: #333;">
                <p>Hello Chief,</p>
                <p>You have received a new application from <strong>${applicantName}</strong> to join your tribe, "<strong>${tribeName}</strong>".</p>
                <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #dcfce7; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #166534;">Embraced Customs:</h4>
                    <p style="margin-bottom: 0;">${embracedCustoms.length > 0 ? embracedCustoms.join(', ') : 'No customs embraced yet.'}</p>
                </div>
                <p>Please click the link below to review the application in your Chief Dashboard.</p>
                <p><a href="${dashboardUrl}" style="display: inline-block; padding: 10px 15px; background-color: #14532d; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Application</a></p>
                <p style="font-size: 12px; color: #666;">If the button does not work, copy and paste this link into your browser: ${dashboardUrl}</p>
                <br>
                <p>- The TTpath Team</p>
            </div>
        `;

        const messageData = {
            from: `TTpath Notifier <info@${mailgunDomain}>`,
            to: chiefEmail,
            subject: `New Application for Your Tribe: ${tribeName}`,
            text: textBody,
            html: htmlBody,
        };

        await mg.messages.create(mailgunDomain, messageData);
        console.log(`New application email sent to ${chiefEmail}`);
    } catch (error) {
        console.error('Error sending new application email:', error);
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
    let applicantData;
    try {
        decodedToken = await adminAuth.verifyIdToken(input.idToken);
        const applicantSnap = await db.collection('users').doc(decodedToken.uid).get();
        applicantData = applicantSnap.data();
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
      const embracedCustoms = applicantData?.embracedCustoms || [];

      if (!hasMembers) {
        const userRef = db.collection('users').doc(user.uid);
        await db.runTransaction(async (transaction) => {
          transaction.update(tribeRef, {
            chief: user.uid,
            members: FieldValue.arrayUnion(user.uid),
          });
          transaction.update(userRef, { currentUserLevel: 5 }); 
        });
        return { success: true };
      } else {
        const applicationRef = db.collection('tribe_applications').doc();
        await applicationRef.set({
          type: 'join_tribe',
          tribeId: input.tribeId,
          applicantId: user.uid,
          answers: input.answers || {},
          embracedCustoms: embracedCustoms,
          status: 'pending',
          createdAt: Timestamp.now(),
        });

        if (chiefId) {
            await sendNewApplicationEmail(chiefId, user.uid, tribeData?.name || 'Your Tribe', embracedCustoms);
        }

        return { success: true };
      }
    } catch (error) {
      console.error('Error joining tribe:', error);
      return { success: false, message: 'An unexpected error occurred while trying to join the tribe.' };
    }
  }
);
